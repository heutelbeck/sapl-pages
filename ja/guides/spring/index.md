---
layout: sapl
lang: ja
ref: spring-guide
title: "SAPL による Spring Security: SAPL ガイド"
description: "SAPL と属性ベースのアクセス制御で Spring Boot アプリケーションを保護します。メソッドレベルの認可、年齢制限、変換、obligation、policy set。"
permalink: /ja/guides/spring/
sitemap: false
robots: noindex,nofollow
---

## SAPL による Spring Boot メソッドセキュリティ

このガイドでは、SAPL を使って Spring Boot アプリケーションを保護する手順を説明します。JPA repository のメソッドに policy ベースの認可を追加し、年齢制限を適用する policy を書き、ユーザー属性に基づいてクエリ結果を変換およびフィルタリングし、obligation 用の constraint handler を実装します。

このガイドは Spring Boot の基本知識を前提としています。ABAC の概念と SAPL のアーキテクチャについては、[ドキュメント](https://sapl.io/docs/latest/)を参照してください。

完全なソースコードは [github.com/heutelbeck/sapl-tutorial-01-spring](https://github.com/heutelbeck/sapl-tutorial-01-spring) にあります。

## プロジェクト設定

まず、シンプルな Spring Boot アプリケーションを作成します。[Spring Initializr](https://start.spring.io/) を開き、次の依存関係を追加します。

* **Spring Web** (アプリケーションをテストするための REST API を提供するため)
* **Spring Data JPA** (アプリケーションのドメインモデルを開発するため)
* **H2 Database** (アプリケーションを支えるシンプルなインメモリデータベースとして)
* **Lombok** (ボイラープレートコードを一部削減するため)
* **Spring Boot DevTools** (開発プロセスを改善するため)

このチュートリアルでは、ビルドツールとして Maven、プログラミング言語として Java を使用します。

Initializr では Java 21 と Spring Boot 4.1.0 以降を選択してください。

Initializr の設定は、おおむね次のようになります。

![Spring Initializr](/assets/guides/spring/spring_initializr.webp)

"GENERATE" をクリックします。ブラウザーがプロジェクトテンプレートを ".zip" ファイルとしてダウンロードします。

プロジェクトを展開し、利用している IDE にインポートします。

### SAPL 依存関係の追加

SAPL は、SAPL モジュールのバージョン互換性を保つための bill of materials モジュールを提供しています。次のブロックを `pom.xml` に追加すると、各 SAPL 依存関係の `<version>` を宣言する必要がなくなります。

```xml
    <dependencyManagement>
        <dependencies>
            <dependency>
                <groupId>io.sapl</groupId>
                <artifactId>sapl-bom</artifactId>
                <version>4.1.1</version>
                <type>pom</type>
                <scope>import</scope>
            </dependency>
        </dependencies>
    </dependencyManagement>
```

SAPL を使うアプリケーションには Policy Decision Point (PDP) と、1 つ以上の Policy Enforcement Point (PEP) が必要です。PDP は認可判断を行います。PDP はアプリケーションに組み込むことも、専用サーバーとして実行してそのリモートサービスに判断を委譲することもできます。このチュートリアルでは、アプリケーションリソースに保存された policy からローカルで判断する埋め込み PDP を使用します。SAPL は Spring Security とも連携するため、Spring bean 上にアノテーションで PEP を宣言できます。次の starter 依存関係をプロジェクトに追加してください。

```xml
    <dependency>
        <groupId>io.sapl</groupId>
        <artifactId>sapl-spring-boot-starter</artifactId>
    </dependency>
```

リリース済みの SAPL バージョンは Maven Central から取得できます。未リリースのビルドでは、Central Portal snapshots repository を追加し、対応する `x.y.z-SNAPSHOT` バージョンを使用します。

この例では Spring Boot 4.1.0 と SAPL 4.1.1 を使用しています。Spring Boot と SAPL のバージョンは互いに結び付いていません。

Argon2 Password Encoder を使用するには、次の依存関係を追加します。

```xml
    <dependency>
        <groupId>org.bouncycastle</groupId>
        <artifactId>bcpkix-jdk18on</artifactId>
        <version>1.84</version>
    </dependency>
```

`policies` フォルダーを `src/main/resources` の下に作成し、そのフォルダー内に `pdp.json` という名前のファイルを作成します。

```json
{
    "algorithm": {
        "votingMode": "PRIORITY_DENY",
        "defaultDecision": "DENY",
        "errorHandling": "PROPAGATE"
    },
    "variables": {}
}
```

`algorithm` オブジェクトは、競合する policy 評価結果を解決するための combining algorithm を選択します。3 つのフィールドは互いに独立した関心事を制御します。

* `votingMode` は、permit と deny の両方の投票が存在するときに、どちらの decision type を優先するかを決めます。
* `defaultDecision` は、subscription に一致する policy がない場合のフォールバックです。
* `errorHandling` は、policy 評価エラーが発生したときの挙動を制御します (`PROPAGATE` はエラーを可視化し、`ABSTAIN` はそれらを黙って破棄します)。

この設定は意図的に制限的です。deny が優先され、デフォルトは deny で、エラーは伝播します。これは secure-by-default の姿勢です。アクセスを許可するには、明示的な permit policy を書きます。

埋め込み PDP の起動には、`policies` ディレクトリと `pdp.json` ファイルが必要です。これらがない場合、アプリケーションは起動時に失敗します。

`variables` プロパティを使用すると、Policy Information Point (PIP) の設定など、環境変数を定義できます。すべての policy は、これらの変数の内容にアクセスできます。

このファイルで基本的な Maven 設定は完了です。これでアプリケーションの実装を始められます。

## プロジェクトのドメイン

ドメインは、ユーザーが本の最低年齢要件を満たす場合にのみその本を閲覧できる図書館です。Spring Boot、JPA、Spring Security にすでに慣れている場合は、[SAPL による Repository メソッドの保護](#Method-Security)まで読み飛ばしてください。

### Book Entity と Repository の定義

まず、ID、名前、年齢レーティング、内容を含む book entity を定義します。Lombok アノテーションを使って getter、setter、constructor を生成できます。

```java
@Data
@Entity
@NoArgsConstructor
@AllArgsConstructor
public class Book {
    @Id
    Long id;
    String name;
    Integer ageRating;
    String content;
}
```

対応する repository interface を定義します。ここでは `findAll`、`findById`、`save` のみを含めます。

```java
public interface BookRepository {
    List<Book> findAll();
    Optional<Book> findById(Long id);
    Book save(Book entity);
}
```

Spring Data が interface の実装をインスタンス化できるように、対応する repository bean を定義します。

```java
@Repository
// Important: interface order matters for detecting SAPL annotations.
public interface JpaBookRepository extends BookRepository, ListCrudRepository<Book, Long>  { }
```

`ListCrudRepository` を `CrudRepository` の代わりに使用することで、`findAll()` は `List<Book>` を返し、`Iterable<Book>` は返しません。後でコレクションをフィルタリングするために書く constraint handler は、処理対象として認識できる container type を必要とします。

### REST Controller で Book を公開する

シンプルな REST controller を通じて book を公開します。Lombok の `@RequiredArgsConstructor` アノテーションは、repository の dependency injection 用 constructor を作成します。

```java
@RestController
@RequiredArgsConstructor
public class BookController {

    private final BookRepository repository;

    @GetMapping("/api/books")
    List<Book> findAll() {
        return repository.findAll();
    }

    @GetMapping("/api/books/{id}")
    Optional<Book> findById(@PathVariable Long id) {
        return repository.findById(id);
    }
}
```

### カスタム `LibraryUser` 実装を作成する

次に、`User` クラス (`org.springframework.security.core.userdetails` のもの) を拡張し、図書館ユーザーの生年月日を含むカスタム `LibraryUser` 実装を作成します。

```java
@ToString(callSuper = true)
@EqualsAndHashCode(callSuper = true)
public class LibraryUser extends User {

    @Getter
    private LocalDate birthday;

    public LibraryUser(String username, LocalDate birthday, String password) {
        super(username, password, true, true, true, true, List.of());
        this.birthday=birthday;
    }
}
```

カスタム `LibraryUser` クラスが security context に保存されるように、カスタム `LibraryUserDetailsService` を実装します。このチュートリアルでは、シンプルなインメモリ `UserDetailsService` で十分です。

```java
public class LibraryUserDetailsService implements UserDetailsService {

    Map<String, LibraryUser> users = new HashMap<>();

    public LibraryUserDetailsService(Collection<LibraryUser> users) {
        users.forEach(this::load);
    }

    public void load(LibraryUser user) {
        users.put(user.getUsername(), user);
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        var user = users.get(username);
        System.out.println("->"+user);
        if (user == null) {
            throw new UsernameNotFoundException("User not found");
        }
        return new LibraryUser(user.getUsername(), user.getBirthday(), user.getPassword());
    }
}
```

### Configuration Class を作成する

`SecurityConfiguration` クラスを作成し、Spring アノテーション `@Configuration` と `@EnableWebSecurity` を付けます。このクラスは、Spring Security のコンテキストで自動的に処理されるメソッドを提供します。

```java
@Configuration
@EnableWebSecurity
public class SecurityConfiguration {

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        var clearSiteData = new HeaderWriterLogoutHandler(new ClearSiteDataHeaderWriter(Directive.ALL));
        // @formatter:off
        return http.authorizeHttpRequests(requests -> requests.anyRequest().authenticated())
                   .formLogin(login -> login.defaultSuccessUrl("/api/books", true))
                   .logout(logout -> logout.permitAll()
                           .logoutSuccessUrl("/login")
                           .addLogoutHandler(clearSiteData))
                   .build();
        // @formatter:on
    }

    @Bean
    static PasswordEncoder passwordEncoder() {
        return Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8();
    }

    @Bean
    UserDetailsService userDetailsService(PasswordEncoder passwordEncoder) {
        return new LibraryUserDetailsService(DemoData.users(passwordEncoder));
    }
}
```

### アプリケーション起動時にテストデータを生成する

H2 と JPA のデフォルト設定では、揮発性のインメモリデータベースが作成されます。アプリケーションが起動するたびにデータベースをシードするため、`CommandLineRunner` を作成します。このクラスは application context が正常に読み込まれた後に一度実行されます。

```java
@Component
@RequiredArgsConstructor
public class DemoData implements CommandLineRunner {

    public static final String DEFAULT_RAW_PASSWORD = "password";

    private final BookRepository bookRepository;

    @Override
    public void run(String... args) {
        // @formatter:off
        bookRepository.save(new Book(1L, "Clifford: It's Pool Time!",                                  0, "*Woof*"));
        bookRepository.save(new Book(2L, "The Rescue Mission: (Pokemon: Kalos Reader #1)",             4, "Gotta catch 'em all!"));
        bookRepository.save(new Book(3L, "Dragonlance Chronicles Vol. 1: Dragons of Autumn Twilight",  9, "Some fantasy story."));
        bookRepository.save(new Book(4L, "The Three-Body Problem",                                    14, "Space is scary."));
        // @formatter:on
    }

    private static LocalDate birthdayForAgeInYears(int age) {
        return LocalDate.now().minusYears(age).minusDays(20);
    }

    public static Collection<LibraryUser> users(PasswordEncoder encoder) {
        var users = new LinkedList<LibraryUser>();
        // @formatter:off
        users.add(new LibraryUser("zoe",   birthdayForAgeInYears(17), encoder.encode(DEFAULT_RAW_PASSWORD)));
        users.add(new LibraryUser("bob",   birthdayForAgeInYears(10), encoder.encode(DEFAULT_RAW_PASSWORD)));
        users.add(new LibraryUser("alice", birthdayForAgeInYears(3),  encoder.encode(DEFAULT_RAW_PASSWORD)));
        // @formatter:on
        return users;
    }
}
```

アプリケーションドメインは完成したので、アプリケーションをテストできます。`mvn clean install` でビルドし、コマンドラインで `mvn spring-boot:run` を実行するか、IDE の run configuration で起動します。

アプリケーションが起動したら、<http://localhost:8080/api/books> に移動します。ブラウザーはログインページにリダイレクトします。上記のユーザーのいずれかでログインしてください。すべての book の一覧が表示されるはずです。

```json
[
    {
        "id"       : 1,
        "name"     : "Clifford: It's Pool Time!",
        "ageRating": 0,
        "content"  : "*Woof*"
    },
    {
        "id"       : 2,
        "name"     : "The Rescue Mission: (Pokemon: Kalos Reader #1)",
        "ageRating": 4,
        "content"  : "Gotta catch 'em all!"
    },
    {
        "id"       : 3,
        "name"     : "Dragonlance Chronicles Vol. 1: Dragons of Autumn Twilight",
        "ageRating": 9,
        "content"  : "Some fantasy story."
    },
    {
        "id"       : 4,
        "name"     : "The Three-Body Problem",
        "ageRating": 14,
        "content"  : "Space is scary."
    }
]
```

ここまで、このチュートリアルでは SAPL の機能をまだ使用しておらず、基本的な Spring Boot アプリケーションを作成しただけです。Spring Security への依存関係を明示的には追加していない点に注意してください。SAPL Spring integration は Spring Security への transitive dependency を持っており、それによってアプリケーションで Spring Security が有効になりました。

## SAPL による Repository メソッドの保護

### <a name="Method-Security"></a> Method Security の設定

SAPL は Spring Security の method security 機能を拡張します。個別の認可判断に対して SAPL method security を有効化するには、`@EnableSaplMethodSecurity` アノテーションを `SecurityConfiguration` クラスに追加します。

```java
@Configuration
@EnableWebSecurity
@EnableSaplMethodSecurity
public class SecurityConfiguration {
    ...
}
```

### 最初の PEP を追加する

SAPL Spring Boot integration は、アノテーションを使用して method や class に PEP を追加します。このチュートリアルでは `@PreEnforce` と `@PostEnforce` の 2 つの variant を使用します。アノテーションに応じて、PEP は method execution の前または後に実行されます。最初の例として、`@PreEnforce` を `findById` method に追加します。これは `BookRepository` interface の method です。

```java
public interface BookRepository {
    List<Book> findAll();

    @PreEnforce
    Optional<Book> findById(Long id);

    Book save(Book entity);
}
```

### Console Output を有効化する

`io.sapl.pdp.embedded.print-text-report=true` を `application.properties` ファイルに追加します。text report は各 PDP decision を、subscription、decision outcome、一致した policy document とともにログに出力します。機械可読な variant として `...print-json-report` を選ぶことも、attribute resolution を含む完全な evaluation trace として `...print-trace` を選ぶこともできます。`print-trace` は最も細かな説明であり、トラブルシューティングの最後の手段としてのみ推奨されます。

text report output は次のようになります。

```text
[...] : === PDP Decision ===
[...] : Timestamp      : 2026-05-18T12:37:50.445117683+02:00
[...] : Subscription Id: 75372bed-5eb6-5560-0d86-bcaf2f6f2ed1
[...] : Subscription   : { ... }
[...] : Decision       : PERMIT
[...] : PDP ID         : default
[...] : Documents:
[...] :   policy-name -> PERMIT
```

各 decision について、評価された document とその個別の outcome が表示されます。policy set の場合、sub-policy の結果は set name の下に一覧表示されます。評価中に policy が Policy Information Point から attribute を解決した場合、その値は document ごとの `Attributes:` ブロックに表示されます。decision に obligation や advice が存在する場合も一覧表示されます。

追加の debug output、たとえば起動時にどの policy document が読み込まれたかを確認するには、`logging.level.io.sapl=DEBUG` を `application.properties` で使用できます。

アプリケーションを再起動し、ログインして <http://localhost:8080/api/books/1> に移動します。次の文を含む error page が表示されるはずです。`There was an unexpected error (type=Forbidden, status=403).`

裏側で何が起きたかを確認するため、console を調べます。ログには次のような statement が含まれているはずです。

```text
[...] : === PDP Decision ===
[...] : Timestamp      : 2026-05-18T12:36:42.66151139+02:00
[...] : Subscription Id: ebd3533d-853e-3b48-de3e-0f2af18cc21a
[...] : Subscription   : { ... large JSON object ... }
[...] : Decision       : DENY
[...] : PDP ID         : default
```

ログには authorization subscription (大きな JSON object)、PDP が行った decision、timestamp、PDP identifier が含まれています。decision が `DENY` なのは、まだ policy が存在せず、combining algorithm のデフォルトが deny だからです。

subscription はログ内ではあまり読みやすくありません。subscription object の重要な部分を解きほぐすため、少し整形してみましょう。

```json
{
    "subject": {
        "authenticated": true,
        "authorities": [
            { "authority": "FACTOR_PASSWORD", "issuedAt": "2026-05-18T10:36:34.779859396Z" }
        ],
        "details": {
            "remoteAddress": "0:0:0:0:0:0:0:1",
            "sessionId": "BF0DB11C0B258C8E83E01D8367A2D323"
        },
        "name": "zoe",
        "principal": {
            "username": "zoe",
            "birthday": "2009-04-28",
            "accountNonExpired": true,
            "accountNonLocked": true,
            "authorities": [],
            "credentialsNonExpired": true,
            "enabled": true
        }
    },
    "action": {
        "http": {
            "method": "GET",
            "url": "http://localhost:8080/api/books/1",
            "scheme": "http",
            "host": "localhost",
            "port": 8080,
            "path": "/api/books/1",
            "contextPath": "",
            "applicationPath": "/api/books/1",
            "isSecure": false,
            "client": { "address": "0:0:0:0:0:0:0:1", "host": "0:0:0:0:0:0:0:1", "port": 54408 },
            "server": { "address": "0:0:0:0:0:0:0:1", "host": "localhost", "port": 8080 },
            "headers": { "host": ["localhost:8080"], "user-agent": ["curl/8.18.0"], "accept": ["*/*"], "cookie": ["JSESSIONID=..."] },
            "cookies": [ { "name": "JSESSIONID", "value": "..." } ],
            "characterEncoding": "UTF-8"
        },
        "java": {
            "name": "findById",
            "declaringTypeName": "io.sapl.tutorial.domain.BookRepository",
            "modifiers": ["public"],
            "instanceof": [ ... ],
            "arguments": [1]
        }
    },
    "resource": {
        "http": { ... },
        "java": { ... }
    }
}
```

Note: Spring Security 7 は、ユーザーが password でログインしたときに authentication へ `FACTOR_PASSWORD` authority を自動的に追加します。これは multi-factor authentication framework の一部です。

特別な設定をしない場合、subscription は大きく、かなり冗長な object になります。SAPL engine と Spring integration はアプリケーションの domain knowledge を持たないため、PEP は authorization subscription における subject、action、resource を適切に説明し得る情報を、見つけられる限り集めます。

デフォルトでは、PEP は `Authentication` object を Spring の `SecurityContext` から直接 JSON object に marshal し、それを `subject` にしようとします。これはほとんどの場合に妥当な approach であり、見てのとおり、`subject.principal.birthday` には先ほどカスタム `LibraryUser` クラスに定義した data が含まれていて、PDP から利用できます。

`action` object と `resource` object はほぼ同一です。domain knowledge がないため、PEP は application context から技術的な情報しか集められません。

まず action と、それに関連する Java 情報から始めましょう。PEP は、保護対象の class や method の名前と型を使って action を説明できます。たとえば、method name `findById` は action を説明する動詞として扱うことができ、argument `1` はその action の attribute になります。

同時に、argument `1` は resource の ID としても解釈できます。PEP はどの Java context value がアプリケーションに関連するかを知らないため、収集できるすべての情報を action と resource に追加します。

保護対象 method が HTTP request の一部として実行される場合、その request も action または resource を説明できます。たとえば、HTTP method `GET` は action を説明でき、URL は自然に resource を識別します。

この種の subscription object は無駄が多いものです。後で、subscription をカスタマイズして、より compact でアプリケーションドメインに合ったものにする方法を学びます。今はデフォルト設定のままにしておきます。

## 埋め込み PDP 用 SAPL Policy の保存

console log から、まだ policy が存在しないため、PDP が authorization subscription に一致する policy document を見つけられなかったことが分かります。埋め込み PDP では、policy はアプリケーションの resource と一緒に保存することも、host の filesystem 上のどこかに保存することもできます。アプリケーションリソース内の policy は、アプリケーションが build され起動された後は runtime において static です。filesystem 上の policy は PDP によって監視され、変更を runtime に反映できます。

埋め込み PDP のデフォルト設定は最初の option であるため、現在アプリケーションの policy は resource に埋め込まれています。

filesystem based policies を使用するには、`io.sapl.pdp.embedded.pdp-config-type = DIRECTORY` を `application.properties` ファイルに追加します。

`pdp.json` ファイルと policy は異なる folder に保存できます。`pdp.json` の場所は `io.sapl.pdp.embedded.config-path` で、policy の場所は `io.sapl.pdp.embedded.policies-path` で設定します。どちらの property も、ファイルを含む folder への有効な filesystem path を必要とします。

**Note:** path 内の `\` は `/` に置き換える必要があります。たとえば、`C:\Users` は `C:/Users` にします。

## SAPL Policy の作成

### 基本情報

保存される policy document は、いくつかの rule に従う必要があります。

- SAPL PDP は、suffix が `.sapl` の document のみを読み込みます。
- 各 document には、policy または policy set が正確に 1 つ含まれます。
- top-level policy と policy set は、すべての document 全体で一意の名前を持つ必要があります。
- すべての `.sapl` document は構文的に正しくなければなりません。そうでない場合、PDP は `pdp.json` 設定で指定された algorithm によって決まる default decision にフォールバックする可能性があります。

SAPL policy document には、次の最小要素が含まれます。

* document が policy を含むことを宣言する *keyword* `policy`。policy set については後で学びます。
* PDP が他の policy と区別できるようにする一意の policy *name*。
* *entitlement* keyword。`permit` または `deny` のいずれかで、policy が applicable で、その body が `true` に評価されたときに PDP が返す decision result を決定します。

その他の optional element は後で説明します。

### 最初の SAPL Policy: Permit All または Deny All

最も基本的な policy は、attribute を調べずにすべての action を permit または deny します。

"permit all" policy から始めます。`permit_all.sapl` ファイルを Maven プロジェクトの `resources/policies` folder に追加し、次の内容を入れます。

```sapl
policy "permit all" permit
```

上で説明したように、document は `policy` keyword で始まり、document が policy を含むことを示します。この keyword の後には、文字列として policy *name* が続きます。この場合は `"permit all"` です。policy name の後には *entitlement* が続き、この場合は `permit` です。

このガイドでは、この policy に rule を何も記述していません。そのため、すべての rule は満たされ、policy は PDP に対して、authorization subscription に含まれる attribute の詳細や PIP からの external attribute に関係なく、`permit` decision を返すよう伝えます。この種の policy は危険で、production system ではあまり実用的ではありません。しかし開発中には、認可に妨げられずに素早くテストできるため便利です。

アプリケーションを再起動し、任意のユーザーで authenticate して、もう一度 <http://localhost:8080/api/books/1> にアクセスします。

今度は book 1 の data が得られるはずです。

```json
{
    "id"        : 1,
    "name"      : "Clifford: It's Pool Time!",
    "ageRating" : 0,
    "content"   : "*Woof*"
}
```

ログは次のようになります。

```text
[...] : === PDP Decision ===
[...] : Subscription   : { ... }
[...] : Decision       : PERMIT
[...] : PDP ID         : default
[...] : Documents:
[...] :   permit all -> PERMIT
```

ログは、PDP が一致する policy document (`permit all`) を 1 つ見つけ、それが `PERMIT` に評価されたことを示しています。これは唯一の policy であり条件を持たないため、`"permit all"` policy は常に一致し、常にその entitlement を返します。

これが唯一の matching document であり `permit` を返すため、PDP は `PERMIT` を返します。その後、PEP は repository method の実行を許可します。

その横に "deny all" policy を作成します。`deny_all.sapl` ファイルを `resources/policies` folder に追加します。

```sapl
policy "deny all" deny
```

アプリケーションを再起動し、任意のユーザーで authenticate して、もう一度 <http://localhost:8080/api/books/1> にアクセスします。

アプリケーションはアクセスを拒否します。ログは両方の policy が一致したことを示しますが、`PRIORITY_DENY` combining algorithm により `deny` decision が優先されます。

```text
[...] : === PDP Decision ===
[...] : Subscription   : { ... }
[...] : Decision       : DENY
[...] : PDP ID         : default
[...] : Documents:
[...] :   permit all -> PERMIT
[...] :   deny all -> DENY
```

これは secure-by-default の挙動です。permit と deny の両方が存在する場合、deny が勝ちます。SAPL engine は競合する decision を解決するために、複数の combining algorithm を実装しています ([SAPL Documentation: Combining Algorithms](https://sapl.io/docs/latest/2_5_CombiningAlgorithms/) を参照)。

`pdp.json` の algorithm 設定にある 3 つのフィールドは、互いに独立した関心事を制御します。`votingMode` は permit と deny の優先順位を決め、`defaultDecision` は policy が一致しない場合のフォールバックで、`errorHandling` は evaluation error を伝播させるか黙って吸収するかを制御します。

`deny_all.sapl` を `deny_all.sapl.off` に、`permit_all.sapl` を `permit_all.sapl.off` に rename します。rename 後、再起動する前に `mvn clean compile` で rebuild してください。`clean` が必要なのは、通常の build では compiled resource が `target/` directory から削除されないためです。これがないと、古い `.sapl` ファイルが classpath に残り、PDP はそれらを読み込み続けます。PDP は suffix が `.sapl` の document だけを読み込み、一致する policy が残っていないため、book への access は拒否されるはずです。

policy evaluation 中に error が発生した場合、PDP は `INDETERMINATE` を返すこともあります。PEP は明示的な `PERMIT` 以外のすべての decision について access を拒否します。policy evaluation のさまざまな結果に関する追加情報は、[SAPL documentation](https://sapl.io/docs/latest/) にあります。

この section では、SAPL における PEP と PDP の相互作用、および PDP が複数 policy の outcome をどのように combine するかを学びました。次の step では、より実用的な policy の書き方と、policy が authorization subscription に *applicable* になる正確なタイミングを学びます。

### Domain-Specific Policy を作成する

まず、`@PreEnforce` PEP を `findAll` method に追加します。対象は `BookRepository` です。

```java
public interface BookRepository {

    @PreEnforce
    List<Book> findAll();

    @PreEnforce
    Optional<Book> findById(Long id);

    Book save(Book entity);
}
```

"Only Bob can see individual book entries" という自然言語の statement から policy を書いてみましょう。自然言語から始めるのは、SAPL に encode する前に意図した rule を明示できるため有用です。resources 配下の policies folder に policy document `permit_bob_for_books.sapl` を作成し、この statement を次のように SAPL policy document に変換します。

```sapl
policy "only bob may see individual book entries"
permit
    action.java.name == "findById" & action.java.declaringTypeName =~ ".*BookRepository$";
    subject.name == "bob";
```

ここで `mvn clean compile` で rebuild し (clean は以前に compile された `.sapl.off` ファイルを target directory から削除するために必要です)、再起動して Bob としてログインします。status 403 の error page が表示されるはずです。これは、login が `/api/books` に redirect し、それが `findAll` を呼び出し、その method に一致する policy がないためです。

次に、<http://localhost:8080/api/books/1> で個別の book に直接アクセスします。access は許可され、ログは次のようになります。

```text
[...] : === PDP Decision ===
[...] : Subscription   : { ... }
[...] : Decision       : PERMIT
[...] : PDP ID         : default
[...] : Documents:
[...] :   only bob may see individual book entries -> PERMIT
```

今度は <http://localhost:8080/logout> に移動してログアウトします。その後 Zoe としてログインし、<http://localhost:8080/api/books/1> にアクセスしてみます。

アプリケーションは access を拒否します。

```text
[...] : === PDP Decision ===
[...] : Subscription   : { ... }
[...] : Decision       : DENY
[...] : PDP ID         : default
```

PDP の decision-making process は、ここで違って見えるようになります。まず、`/api/books` への access 時、または login 成功後に applicable document がない理由を調べます。

policy を見ると、`permit` に続く condition には semicolon で区切られた 2 つの rule があります。最初の condition `action.java.name == "findById" & action.java.declaringTypeName =~ ".*BookRepository$"` は、この policy が与えられた authorization subscription に関連するかどうかを決める scoping rule として機能します。この最初の condition が `true` の場合にのみ、PDP は残りの condition を評価します。`"permit all"` の例で見たように、condition が存在しない場合、policy は常に apply されます。

この場合、*target expression* は subscription の action にある 2 つの attribute を調べます。`action.java.name` が `"findById"` と等しいか、また `action.java.declaringTypeName` が regular expression `".*BookRepository$"` に一致するかを確認します。言い換えると、attribute string は `BookRepository` で終わる必要があります。SAPL はこのチェックに regex comparison operator `=~` を使用します。

**Note**: authorization subscription JSON では、nested object は他の object 内の object value として現れます。SAPL policy expression では、dot notation を使ってこれらの nested structure をたどります。たとえば、subscription 内の `"action": {"java": {"name": "findById"}}` は policy では `action.java.name` になります。

これら 2 つの expression により、PDP が個別 book への access 時には policy document `"permit_bob_for_books.sapl"` を applicable と識別する一方、一覧全体への access 時には一致する document を見つけない理由が説明できます。

SAPL は、AND と OR を表す lazy Boolean operator の `&&` と `||`、および eager Boolean operator の `&` と `|` を区別する点に注意してください。*Target expressions* では eager operator のみが許可されます。これは大規模な policy set を効率的に index するための要件です。

ユーザーが個別 book に access しようとすると、PDP は complete policy を評価します。*policy body* は `permit` または `deny` に続く condition の一覧です。そこには任意の数の rule または variable assignment を含めることができ、それぞれが SAPL statement terminator で終わります。各 rule は Boolean expression です。body 全体は、すべての rule が `true` に評価されたときに `true` に評価されます。rule は上から下へ lazy に評価されます。

上記の状況では、Bob の名前を確認する rule は、Bob が book に access している場合にのみ `true` です。

この section では、SAPL document がいつ applicable になるか、また policy body の condition が authorization decision をどのように決定するかを学びました。

次に、authorization subscription をカスタマイズし、temporal function を使って年齢に適した book だけへの access を許可する方法を学びます。

### 個別 Book の年齢レーティングを強制する

続ける前に、既存の policy をすべて削除するか、filename に `.off` suffix を追加して deactivate してください。

この section の goal は、ユーザーの年齢に適した book にのみ access を許可することです。この decision を行うには、PDP はユーザーの生年月日 (subject の attribute)、book の年齢レーティング (resource の attribute)、現在の日付 (environment の attribute) を必要とします。前の例で送信された authorization subscription を調べると、現在 subscription で利用できるのはユーザーの生年月日だけであることに気づきます。他の attribute を PDP の policy で利用できるようにするには、どうすればよいでしょうか。

一般に、attribute の source は 2 つ考えられます。authorization subscription または Policy Information Point (PIP) です。

book の年齢レーティングを考えてみましょう。この情報は query を実行する前には PEP には分かりません。そのため、`BookRepository` では、`@PreEnforce` を `findById` に付けたままにせず、次のように `@PostEnforce` アノテーションに置き換えます。

```java
public interface BookRepository {

    @PreEnforce
    List<Book> findAll();

    @PostEnforce(subject  = "authentication.getPrincipal()",
                 action   = "'read book'",
                 resource = "returnObject")
    Optional<Book> findById(Long id);

    Book save(Book entity);
}
```

このアノテーションは enforcement flow を変更します。

* まず method を呼び出します。
* [Spring Expression Language (SpEL)](https://docs.spring.io/spring-framework/docs/current/reference/html/core.html#expressions) でカスタム authorization subscription を構築します。
* カスタム authorization subscription で PDP に subscribe します。
* decision を enforce します。

元の自動生成された authorization subscription を調べたとき、結果の object は比較的大きく技術的なものでした。ここでは、`@PostEnforce` アノテーションの parameter が、アプリケーションドメインに合う、より正確な authorization subscription を作成するのに役立ちます。

parameter `subject = "authentication.getPrincipal()"` は、authentication object から principal object を抽出し、subscription の subject object として使用します。

parameter `action = "'read book'"` は、subscription の action object を string constant `read book` に設定します。

最後に、parameter `resource = "returnObject"` は、subscription の resource object を method invocation result に設定します。この resource は book entity であるため、自動的に `ageRating` attribute を含みます。

これらの object を特定した後、PEP は Spring application context の `ObjectMapper` を使って object を JSON に serialize します。

結果の authorization subscription は次のようになります。

```json
{
    "subject": {
        "username": "zoe",
        "birthday": "2009-04-28",
        "password": null,
        "accountNonExpired": true,
        "accountNonLocked": true,
        "authorities": [],
        "credentialsNonExpired": true,
        "enabled": true
    },
    "action": "read book",
    "resource": {
        "id": 1,
        "name": "Clifford: It's Pool Time!",
        "ageRating": 0,
        "content": "*Woof*"
    }
}
```

この authorization subscription は、Spring integration がカスタマイズなしで行う自動推測よりも、はるかに扱いやすく実用的です。

book の年齢制限を enforce するために書く policy では、いくつかの新しい概念が導入されます。

* local attribute variable の定義
* Policy Information Point の使用
* function library

次のように policy document `check_age.sapl` を作成します。

```sapl
policy "check age"
permit
    action == "read book";
    var birthday  = subject.birthday;
    var today     = time.dateOf(|<time.now>);
    var age       = time.timeBetween(birthday, today, "years");
    age >= resource.ageRating;
```

最初の condition で、policy `check age` は action が `read book` のすべての authorization subscription に applicability を scope します。

次に policy は、`birthday` という名前の local attribute variable を定義し、それを `subject.birthday` attribute に割り当てます。

次の行では、現在の日付を variable `today` に割り当てます。SAPL では、angle bracket `<ATTRIBUTE_IDENTIFIER>` が attribute stream を表します。これは Policy Information Point (PIP) が提供する external attribute source への subscription です。この場合、identifier `time.now` は system clock から UTC の現在時刻に access します。

このガイドでは、時刻更新の stream は必要ありません。attribute stream 内の最初の event だけが必要です。angle bracket の前に pipe symbol を付けた `|<>` は、最初の event を取得してから PIP から unsubscribe します。SAPL の time library は、time を表すために ISO 8601 string を使用します。その後、function `time.dateOf` が PIP から取得した timestamp の date component を抽出します。

policy は、`time.timeBetween` function と定義済み variable を使って subject の年齢を years 単位で計算します。

engine は variable assignment rule を上から下へ評価します。各 rule は、それより上で定義された variable に access できます。assignment rule は、評価中に error が発生しない限り `true` に評価されます。

最後に、policy は `age` と `resource.ageRating` を比較します。この condition は、subject の年齢が book の年齢レーティング以上の場合に `true` に評価されます。

たとえば、Zoe としてログインし、最初の book に access すると、ログには次のように表示されます。

```text
[...] : === PDP Decision ===
[...] : Subscription   : { ... }
[...] : Decision       : PERMIT
[...] : PDP ID         : default
[...] : Documents:
[...] :   check age -> PERMIT
[...] :     Attributes:
[...] :       <time.now> = "2026-05-18T10:39:42.599004238Z" @ 2026-05-18T12:39:42.601684543+02:00
```

external attribute を解決した各 policy の下に、report は評価中に PDP が見た attribute value を一覧表示します。これは `print-text-report` output の一部であり、`print-trace` とは独立しています。

一方、Alice が book four に access しようとすると、年齢 condition が `false` に評価され、policy が applicable ではないため、access は拒否されます。

```text
[...] : === PDP Decision ===
[...] : Subscription   : { ... }
[...] : Decision       : DENY
[...] : PDP ID         : default
[...] : Documents:
[...] :   check age -> NOT_APPLICABLE
[...] :     Attributes:
[...] :       <time.now> = "2026-05-18T10:39:43.777712367Z" @ 2026-05-18T12:39:43.778336567+02:00
```

policy は `import` statement を使ってより compact に書けます。

```sapl
import time.timeBetween
import time.dateOf
policy "check age compact"
permit
    action == "read book";
    var age = timeBetween(subject.birthday, dateOf(|<time.now>), "years");
    age >= resource.ageRating;
```

import を使うと、SAPL library に保存されている function の fully qualified name の代わりに短い name を使用できます。

たとえば、statement `import time.timeBetween` は time library から `timeBetween` function を import し、その simple name で利用可能にします。個別の attribute finder を import することも、aliasing のために `'library name' as 'alias'` を使用することもできます。

## SAPL Policy で Output を変換および制約する

チュートリアルのこの part では、policy を使って query result を変更し、constraint によって side effect を trigger します。

SAPL は authorization decision に constraint を attach できます。constraint は、その decision を enforce する間に追加作業を行うよう PEP に指示します。SAPL は 3 種類の constraint type を区別します。

* *Obligation*: mandatory instruction です。PEP がこれを満たせない場合、access を許可してはなりません。
* *Advice*: optional instruction です。PEP がこれを満たせない場合でも、元の authorization decision はそのまま維持されます。
* *Transformation*: obligation の特殊な形式で、PEP は access された resource を authorization decision で提供された resource object に置き換えなければなりません。

`PERMIT` decision では、未解決の obligation は PEP が access を許可することを妨げます。未解決の advice は妨げません。

たとえば、緊急時にはどの医師でも患者の medical record に access できます。しかし、その医師がその患者の attending doctor ではない場合、system は access を log し、audit process を trigger しなければなりません。これはしばしば "break glass" scenario と呼ばれます。

### SAPL Policy で Transformation を使用する

Book entity にはすでに `content` field が含まれています。book に対して若すぎるユーザーを単純に deny しないよう、図書館の policy を変更したいとします。代わりに、要求された book の content だけを mask するべきです。この変更を実装するには、次の `check_age_transform.sapl` policy document をアプリケーションの policies に追加します。

```sapl
import time.timeBetween
import time.dateOf
import filter.blacken
policy "check age transform"
permit
    action == "read book";
    var age = timeBetween(subject.birthday, dateOf(|<time.now>), "years");
    age < resource.ageRating;
transform
    resource |- {
        @.content : blacken(3,0,"\u2588")
    }
```

この policy は `transform` expression を導入します。

policy body が `true` に評価されると、`transform` statement が生成した JSON value が authorization decision の `resource` property として追加されます。その property は、元の method result ではなく、提供された replacement resource を返すよう PEP に指示します。保存済みの book entity は変更されません。

この場合、filter operator `|-` が `resource` object に適用されています。filter operator は、JSON value の個別部分を manipulation のために選択します。たとえば、選択された value に function を適用します。ここでは、operator が resource の `content` key を選択し、最初の 3 文字だけを visible にして、残りを黒い四角 ("\\u2588" in Unicode) に置き換えた version に置換します。selection expression は強力です。完全な説明は [SAPL Documentation](https://sapl.io/docs/latest/) を参照してください。

元の age checking policy がまだ存在していることを確認してください。再起動し、Alice としてログインします。

<http://localhost:8080/api/books/1> に access すると、次が得られます。

```json
{
    "id"        : 1,
    "name"      : "Clifford: It's Pool Time!",
    "ageRating" : 0,
    "content"   : "*Woof*"
}
```

Alice はまだ 3 歳です。<http://localhost:8080/api/books/4> の book を request すると、読むには若すぎるため content が mask されます。

```json
{
    "id"        : 4,
    "name"      : "The Three-Body Problem",
    "ageRating" : 14,
    "content"   : "Spa████████████"
}
```

この access attempt のログは次のようになります。

```text
[...] : === PDP Decision ===
[...] : Subscription   : { ... }
[...] : Decision       : PERMIT
[...] : PDP ID         : default
[...] : Resource: {"id"=4, "name"="The Three-Body Problem", "ageRating"=14, "content"="Spa████████████"}
[...] : Documents:
[...] :   check age transform -> PERMIT
[...] :     Attributes:
[...] :       <time.now> = "2026-05-18T10:40:26.725343696Z" @ 2026-05-18T12:40:26.72610141+02:00
[...] :   check age -> NOT_APPLICABLE
[...] :     Attributes:
[...] :       <time.now> = "2026-05-18T10:40:26.725343696Z" @ 2026-05-18T12:40:26.72610141+02:00
```

両方の policy document が subscription に対して評価されます。Alice は "The Three-Body Problem" を読むには十分な年齢ではないため、`check age` policy は `NOT_APPLICABLE` に評価されます。`check age transform` policy は、transformed resource 付きの `PERMIT` に評価されます。その結果、PEP は元の resource を、masked content を含む decision の resource に置き換えます。

### SAPL Policy で Obligation と Advice を使用する

`check age transform` policy は、`transform` statement によって、追加の statement が同時に enforce される場合にのみ access を許可するよう PEP に指示する policy の最初の例でした。

次に、この policy に obligation を追加します。system は、ユーザーが読むには若すぎる book への request も log する必要があります。これにより、親が先に子どもとその book について話し合う機会を得られます。

そのために、`check_age_transform.sapl` policy を次のように変更します。

```sapl
import time.timeBetween
import time.dateOf
import filter.blacken
policy "check age transform"
permit
    action == "read book";
    var age = timeBetween(subject.birthday, dateOf(|<time.now>), "years");
    age < resource.ageRating;
obligation
    {
        "type": "logAccess",
        "message": "Attention, "+subject.username+" accessed the book '"+resource.name+"'."
    }
transform
    resource |- {
        @.content : blacken(3,0,"\u2588")
    }
```

ここで Alice としてログインし、<http://localhost:8080/api/books/2> への access を試みます。

access は拒否され、ログは次のようになります。

```text
[...] : === PDP Decision ===
[...] : Subscription   : { ... }
[...] : Decision       : PERMIT
[...] : PDP ID         : default
[...] : Obligations: [{"type"="logAccess", "message"="Attention, alice accessed the book 'The Rescue Mission: (Pokemon: Kalos Reader #1)'."}]
[...] : Resource: {"id"=2, "name"="The Rescue Mission: (Pokemon: Kalos Reader #1)", "ageRating"=4, "content"="Got█████████████████"}
[...] : Documents:
[...] :   check age transform -> PERMIT
[...] :   check age -> NOT_APPLICABLE
```

PDP は `PERMIT` を返しましたが、authorization decision に logging obligation が含まれていたため、PEP はそれでも access を拒否しました。SAPL は obligation と advice を JSON object として表現し、アプリケーションは使用する constraint type 用の handler を提供しなければなりません。まだ logging obligation を理解して enforce できる handler がないため、PEP は access を拒否しました。

logging obligation を support するには、*constraint handler provider* を実装します。

```java
@Slf4j
@Service
public class LoggingConstraintHandlerProvider implements ConstraintHandlerProvider {

    private static final String CONSTRAINT_TYPE  = "logAccess";
    private static final int    DEFAULT_PRIORITY = 50;

    @Override
    public List<ScopedConstraintHandler> getConstraintHandlers(Value constraint, Set<SignalType> supportedSignals) {
        var signalOpt = ConstraintHandlerProvider.constraintTypeAndSignal(constraint, CONSTRAINT_TYPE,
                supportedSignals, DecisionSignal.SIGNAL_TYPE);
        if (signalOpt.isEmpty()) {
            return List.of();
        }
        Runner runner = runnerFor(constraint);
        return List.of(new ScopedConstraintHandler(runner, signalOpt.get(), DEFAULT_PRIORITY));
    }

    private static Runner runnerFor(Value constraint) {
        var message = ConstraintHandlerProvider.stringField(constraint, "message").orElse("Access logged");
        return () -> log.info(message);
    }
}
```

SAPL Spring integration は、PEP lifecycle の明確に定義された point で発火される *signal* を通じて constraint handler を届けます。signal の例には、`DecisionSignal` (decision が PEP に到着した瞬間)、`OutputSignal` (保護対象 method の emit された result ごと)、PEP が HTTP path 上にある場合のいくつかの HTTP 固有 signal があります。各 provider は、その handler がどの signal に attach するか、またどの priority で attach するかを宣言します。

`ConstraintHandlerProvider` は、すべての provider が実装する単一の interface です。その唯一の method である `getConstraintHandlers` は、constraint value と、deploy された PEP が実際に発火する signal type の set を受け取ります。provider は constraint を認識しない場合は空の list を返し、認識する場合は `ScopedConstraintHandler` entry の non-empty list を返します。各 entry は handler と、それが attach する signal type、および execution order を決める priority を対応付けます。1 つの provider は、1 つの constraint が lifecycle 全体にわたって coordinated handler を駆動する場合、異なる signal 用に複数 entry を返すことがあります。

handler 自体には、`ConstraintHandler` の sealed sub-interface として表現される 3 つの形式があります。

* `Runner` は fire-and-forget side effect (logging、audit emission) 用の `Runnable` です。
* `Consumer<T>` は typed signal value を変更せずに observe します (decision を inspect する、emitted item を peek する)。
* `Mapper<T>` は signal value を変換する `UnaryOperator<T>` です (response body を rewrite する、返された collection を filter する)。

logging の場合、handler は `DecisionSignal` に attach された side effect です。static helper `ConstraintHandlerProvider.constraintTypeAndSignal` は 2 つの check を組み合わせます。constraint が期待される type でなければならず、deploy された PEP が期待される signal を発火しなければなりません。provider は、`Runner` を返し、それが obligation の `message` field を SLF4J 経由で出力します。

Alice としてログインし、<http://localhost:8080/api/books/2> に access すると、access は許可され、ログには次の行が含まれるようになります。

```text
[...] : Attention, alice accessed the book 'The Rescue Mission: (Pokemon: Kalos Reader #1)'.
```

obligation の別の例を試してみましょう。

login 成功後も、`/api/books` はまだ拒否されます。`findAll` method 用の policy をまだ実装していないためです。ユーザーが年齢に適した book を list できる policy が必要です。今回は、`transform` instruction で resource を置き換えることはしません。実際の図書館では、PEP が数百件の record を処理する必要が生じる可能性があります。代わりに、特定の book だけを返すよう PEP に指示します。

まず、`@PreEnforce` を `findAll` に付け、`BookRepository` で次のように完成させます。

```java
public interface BookRepository {

    @PreEnforce(subject = "authentication.getPrincipal()",
                action  = "'list books'")
    List<Book> findAll();

    @PostEnforce(subject  = "authentication.getPrincipal()",
                 action   = "'read book'",
                 resource = "returnObject")
    Optional<Book> findById(Long id);

    Book save(Book entity);
}
```

考え方は `findById` method の場合と同じです。parameter `subject = "authentication.getPrincipal()"` は principal object を抽出し、subscription の subject object として使用します。parameter `action = "'list books'"` は action object を string `list books` に設定します。`@PreEnforce` は method より前に実行されるため、まだ return value はありません。PEP は resource を absent のままにするか、利用可能な context から derive します。

accessible な book だけを返すには、次のような policy を書きます。

```sapl
import time.timeBetween
import time.dateOf
policy "filter content in collection"
permit
    action == "list books";
obligation
    {
        "type" : "jsonContentFilterPredicate",
        "conditions" : [
            {
                "path" : "$.ageRating",
                "type" : "<=",
                "value" : timeBetween(subject.birthday, dateOf(|<time.now>), "years")
            }
        ]
    }
```

SAPL engine ですでに提供されている `ContentFilterPredicateProvider` クラスを使用します。このクラスは JSON object を filter し、指定された condition に一致する node を抽出します。

obligation は assignment `"type" : "jsonContentFilterPredicate"` でこの provider を選択します。`conditions` field は、check する 1 つ以上の condition を指定します。ここでは、provider は array から `ageRating` element を含み、かつ age rating が access しているユーザーの年齢以下である JSON node を確認します。一致する node だけが response に残ります。

custom behavior が必要な場合は、独自の *constraint handler provider* を実装できます。

```java
@Service
public class FilterByAgeProvider implements ConstraintHandlerProvider {

    private static final String CONSTRAINT_TYPE  = "filterBooksByAge";
    private static final int    DEFAULT_PRIORITY = 10;

    @Override
    public List<ScopedConstraintHandler> getConstraintHandlers(Value constraint, Set<SignalType> supportedSignals) {
        if (!ConstraintHandlerProvider.constraintIsOfType(constraint, CONSTRAINT_TYPE)) {
            return List.of();
        }
        if (!(constraint instanceof ObjectValue obj) || !(obj.get("age") instanceof NumberValue ageValue)) {
            return List.of();
        }
        final int maxAge = ageValue.value().intValue();
        return SignalType.findIn(supportedSignals, Signal.OutputSignal.class).map(outputSignal -> {
            Mapper<Object> mapper = books -> filterBooks(books, maxAge);
            return List.of(new ScopedConstraintHandler(mapper, outputSignal, DEFAULT_PRIORITY));
        }).orElseGet(List::of);
    }

    private static Object filterBooks(Object value, int maxAge) {
        if (!(value instanceof Iterable<?> iterable)) {
            return value;
        }
        var result = new ArrayList<Book>();
        for (var item : iterable) {
            if (item instanceof Book book && book.getAgeRating() <= maxAge) {
                result.add(book);
            }
        }
        return result;
    }
}
```

shape は logging provider と同じですが、handler は `Mapper<Object>` で、`OutputSignal` に attach されています。`OutputSignal` は、保護対象 method が return value を生成した後に PEP が発火する per-result signal です。`Mapper` は、PEP が value を release する前にその value を変換します。`SignalType.findIn` は、deploy された PEP の signal set から任意の value type の `OutputSignal` を検索します。`findAll` は `List<Book>` を返すため (チュートリアル前半の `JpaBookRepository` の変更を参照)、deploy された PEP は value type が list の `OutputSignal` を発火し、私たちの `Mapper` は runtime に populated list を受け取ります。

mapper は age predicate を適用し、subject に見ることが permitted されている entry だけを含む新しい `ArrayList<Book>` を返します。一致する entry がない場合、空の `List<Book>` を返して問題ありません。`findAll` の policy はすでに request を permitted しているためです。obligation は result set を narrow するだけです。mapper は元の list を変更せず、filtered copy を返します。

Bob としてログインすると、次の book list が表示されます。

```json
[
    {
        "id": 1,
        "name": "Clifford: It's Pool Time!",
        "ageRating": 0,
        "content": "*Woof*"
    },
    {
        "id": 2,
        "name": "The Rescue Mission: (Pokemon: Kalos Reader #1)",
        "ageRating": 4,
        "content": "Gotta catch 'em all!"
    },
    {
        "id": 3,
        "name": "Dragonlance Chronicles Vol. 1: Dragons of Autumn Twilight",
        "ageRating": 9,
        "content": "Some fantasy story."
    }
]
```

## Policy Set を作成する

SAPL policy set は policy を group 化し、独自の combining algorithm で評価します。その set result は、他の top-level policy または policy set の result と combine されます。policy set は、`first or abstain errors propagate` algorithm を含む、最終的な conflict resolution と同じ family の algorithm を使用します。

**Note**: `pdp.json` ファイルとは対照的に、policy set 内の algorithm は lowercase natural language form で書く必要があります。

SAPL policy set は次の element で構成されます。

* document が policy set を含むことを宣言する *keyword* `set`
* PDP が他の policy set と区別できるようにする一意の policy set *name*
* *combining algorithm*
* optional な *target expression*
* optional な variable assignment
* 2 つ以上の policy

小さな例として、`check_age_by_id_set.sapl` ファイルを作成します。前の section の 2 つの policy、`'check age compact'` と `'check age transform'` のうち、同時に applicable になれるのは一方だけです。そのため、両方の policy を処理する policy set を作成しましょう。

```sapl
import time.dateOf
import time.timeBetween
import filter.blacken

set "check age set"
first or abstain errors propagate
for action == "read book"
var birthday    = subject.birthday;
var today       = dateOf(|<time.now>);
var age         = timeBetween(birthday, today, "years");

    policy "check age transform set"
    permit
        age < resource.ageRating;
    obligation
        {
            "type": "logAccess",
            "message": "Attention, "+subject.username+" accessed the book '"+resource.name+"'."
        }
    transform
        resource |- {
            @.content : blacken(3,0,"\u2588")
        }

    policy "check age compact set"
    permit
        age >= resource.ageRating;
```

set 内の policy の rule は、top-level policy と同じです。各 condition は SAPL statement terminator で終わります。set の 2 つ目の policy には、`permit` の直後に 1 つの condition があります。

2 つの policy document `'check_age_compact.sapl'` と `'check_age_transform.sapl'` を extension `.off` で deactivate し、アプリケーションを再起動します。

Bob としてログインし、<http://localhost:8080/api/books/3> に access します。ログは次のようになります。

```text
[...] : === PDP Decision ===
[...] : Subscription   : { ... }
[...] : Decision       : PERMIT
[...] : PDP ID         : default
[...] : Documents:
[...] :   check age set -> PERMIT
[...] :     Attributes:
[...] :       <time.now> = "2026-05-18T10:44:28.892195674Z" @ 2026-05-18T12:44:28.893957875+02:00
[...] :   check age transform set -> NOT_APPLICABLE
[...] :   check age compact set -> PERMIT
```

policy set は両方の sub-policy を評価します。`check age compact set` は一致し (Bob は十分な年齢です)、`check age transform set` は apply されません。set は `first or abstain errors propagate` を使用するため、最初の applicable sub-policy が outcome を決定します。

次に <http://localhost:8080/api/books/4> に access します。ログは次のようになります。

```text
[...] : === PDP Decision ===
[...] : Subscription   : { ... }
[...] : Decision       : PERMIT
[...] : PDP ID         : default
[...] : Obligations: [{"type"="logAccess", "message"="Attention, bob accessed the book 'The Three-Body Problem'."}]
[...] : Resource: {"id"=4, "name"="The Three-Body Problem", "ageRating"=14, "content"="Spa████████████"}
[...] : Documents:
[...] :   check age set -> PERMIT
[...] :     Attributes:
[...] :       <time.now> = "2026-05-18T10:44:30.035236624Z" @ 2026-05-18T12:44:30.03640877+02:00
[...] :   check age transform set -> PERMIT
[...] : Attention, bob accessed the book 'The Three-Body Problem'.
```

`check age transform set` policy が先に一致するため (Bob's age < 14)、set は obligation と masked content を持つ transformed resource を含む result を返します。最初の policy がすでに applicable だったため、set 内の 2 つ目の policy は評価されません。

## Obligation、Advice、Transformation の組み合わせ

top-level policy では、SAPL は final authorization decision と一致する result を持つすべての policy から obligation と advice を収集します。policy set は異なります。すべての inner policy が必ず評価されるわけではないため、一致する result を持つ評価済み inner policy からの obligation と advice だけが収集されます。

もう 1 つの special case は *transformation* に関するものです。複数の policy を通じて複数の transformation statement を combine することはできません。2 つ以上の policy が `PERMIT` に評価され、その少なくとも 1 つに transformation statement が含まれる場合、SAPL は decision `PERMIT` を返しません。これは **transformation uncertainty** と呼ばれます。

demo project は、このチュートリアルの [GitHub repository](https://github.com/heutelbeck/sapl-tutorial-01-spring) から download できます。

## まとめ

このチュートリアルシリーズでは、attribute-based access control の基本と、SAPL で Spring application を保護する方法を学びました。

SAPL を使うと、organization 全体にまたがる柔軟な distributed authorization infrastructure など、さらに多くのことを実現できます。このシリーズの続くチュートリアルでは、より複雑な obligation、testing、reactive data type、data streaming、policy に基づく UI の customize、Axon framework ベースの application に焦点を当てます。

開発者や community とは、[Discord Server](https://discord.gg/pRXEVWm3xM) で気軽に交流してください。
