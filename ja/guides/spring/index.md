---
layout: sapl
lang: ja
ref: spring-guide
title: "SAPL による Spring Security: SAPL ガイド"
description: "SAPL と属性ベースアクセス制御で Spring Boot アプリケーションを保護します。メソッド単位の認可、年齢レーティング、変換、obligation、policy set。"
permalink: /ja/guides/spring/
sitemap: false
robots: noindex,nofollow
---

## SAPL による Spring Boot メソッドセキュリティ

このガイドでは、SAPL を使って Spring Boot アプリケーションを保護する方法を示します。JPA repository のメソッドに policy ベースの認可を追加し、年齢制限を適用する policy を書き、ユーザー属性に基づいて結果を変換し、リストをフィルタリングします。

このガイドは Spring Boot の基本知識を前提としています。ABAC と SAPL のアーキテクチャについては、[ドキュメント](https://sapl.io/docs/latest/)を参照してください。

完全なソースコードは [github.com/heutelbeck/sapl-tutorial-01-spring](https://github.com/heutelbeck/sapl-tutorial-01-spring) にあります。

## プロジェクト設定

まず、シンプルな Spring Boot アプリケーションを作成します。[Spring Initializr](https://start.spring.io/) を開き、次の依存関係を追加します。

* **Spring Web** REST API を提供するため
* **Spring Data JPA** ドメインモデルを作成するため
* **H2 Database** シンプルなインメモリデータベースとして
* **Lombok** ボイラープレートコードを減らすため
* **Spring Boot DevTools** 開発フローを改善するため

このガイドでは、ビルドツールとして Maven、言語として Java を使用します。

Java 21 と Spring Boot 4.1.0 以降を選択してください。

![Spring Initializr](/assets/guides/spring/spring_initializr.webp)

プロジェクトをダウンロードし、展開して、使用している IDE にインポートします。

### SAPL 依存関係

SAPL は Bill of Materials モジュールを提供しています。これにより、個々の SAPL モジュールごとにバージョンを宣言する必要がありません。

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

次に、SAPL Spring Boot starter を追加します。

```xml
    <dependency>
        <groupId>io.sapl</groupId>
        <artifactId>sapl-spring-boot-starter</artifactId>
    </dependency>
```

リリース済みの SAPL バージョンは Maven Central から取得できます。未リリースのビルドを試す場合は、Central Portal snapshots repository を追加し、対応する `x.y.z-SNAPSHOT` バージョンを使用します。

この例では Spring Boot 4.1.0 と SAPL 4.1.1 を使用しています。Spring Boot と SAPL のバージョンは連動していません。

Argon2 Password Encoder を使用するために、Bouncy Castle も追加します。

```xml
    <dependency>
        <groupId>org.bouncycastle</groupId>
        <artifactId>bcpkix-jdk18on</artifactId>
        <version>1.84</version>
    </dependency>
```

`src/main/resources` の下に `policies` フォルダーを作成し、`pdp.json` を追加します。

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

## ドメインモデル

このアプリケーションは小さな図書館を表します。各書籍には年齢レーティングがあり、ログインユーザーが十分な年齢に達している場合にのみ全文を読めます。

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

repository は後で SAPL アノテーションで保護します。

```java
public interface BookRepository {

    List<Book> findAll();

    Optional<Book> findById(Long id);

    Book save(Book entity);
}
```

Spring Data repository がこれらのメソッドを実装します。

```java
public interface JpaBookRepository extends BookRepository, ListCrudRepository<Book, Long> {
}
```

## ユーザーとセキュリティ設定

サンプルアプリケーションでは、年齢の異なる 3 人のユーザーを使用します。生年月日は SAPL 決定における subject の属性になります。

```java
@ToString(callSuper = true)
@EqualsAndHashCode(callSuper = true)
public class LibraryUser extends User {

    @Getter
    private LocalDate birthday;

    public LibraryUser(String username, LocalDate birthday, String password) {
        super(username, password, true, true, true, true, List.of());
        this.birthday = birthday;
    }
}
```

設定クラスで Spring Security と SAPL Method Security を有効にします。

```java
@Configuration
@EnableWebSecurity
@EnableSaplMethodSecurity
public class SecurityConfiguration {

    @Bean
    SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        var clearSiteData = new HeaderWriterLogoutHandler(new ClearSiteDataHeaderWriter(Directive.ALL));
        return http.authorizeHttpRequests(requests -> requests.anyRequest().authenticated())
                   .formLogin(login -> login.defaultSuccessUrl("/api/books", true))
                   .logout(logout -> logout.permitAll()
                                           .logoutSuccessUrl("/login")
                                           .addLogoutHandler(clearSiteData))
                   .build();
    }

    @Bean
    static PasswordEncoder passwordEncoder() {
        return Argon2PasswordEncoder.defaultsForSpringSecurity_v5_8();
    }
}
```

## 最初の Policy Enforcement Point

SAPL は、メソッドまたはクラスのアノテーションによって Policy Enforcement Point を追加します。単一の書籍へのアクセスには `@PostEnforce` を使います。書籍の年齢レーティングは、書籍を読み込んだ後で初めて分かるためです。

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

`subject` は Spring Security authentication からログインユーザーを取り出します。`action` は業務上のアクション名を設定します。`findById` では、`resource` が読み込まれた書籍を指します。

## 単一書籍の年齢制限

次のシンプルな policy は、ユーザーが十分な年齢に達している場合にアクセスを許可します。

```sapl
import time.timeBetween
import time.dateOf
policy "check age"
permit
    action == "read book";
    var age = timeBetween(subject.birthday, dateOf(|<time.now>), "years");
    age >= resource.ageRating;
```

ユーザーが若すぎる場合、SAPL は resource を変換することもできます。この例では、先頭 3 文字以降の内容を黒塗りし、ログ用の obligation を追加します。

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

ログ obligation を処理するために、constraint handler provider を登録します。

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

## リストのフィルタリング

`findAll` では、メソッド呼び出しの前に決定が行われます。次の policy は呼び出しを許可し、戻り値をフィルタリングする obligation を追加します。

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

組み込みの `ContentFilterPredicateProvider` が戻り値のリストをフィルタリングし、ユーザーの年齢に適した書籍だけを残します。

## Policy Set

単一書籍用の 2 つの policy は、policy set にまとめることができます。

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

この policy set は `first or abstain errors propagate` を使用します。内部の policy が適用可能になると、その policy が set の結果を決定します。

## 期待される動作

設定後の主な動作は次のとおりです。

* 匿名ユーザーはログインページにリダイレクトされます。
* Bob は年齢レーティング 10 以下の書籍だけを一覧で見られます。
* Alice は年齢レーティング 0 の書籍だけを一覧で見られます。
* Zoe はすべての単一書籍を全文読めます。
* 年齢レーティングが高すぎる場合、Bob と Alice には黒塗りされた内容が返されます。

英語版には、追加の説明とログ出力を含む完全な手順があります。
