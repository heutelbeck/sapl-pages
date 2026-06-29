---
layout: sapl
lang: zh
ref: spring-guide
title: "使用 SAPL 的 Spring Security：SAPL 指南"
description: "使用 SAPL 和基于属性的访问控制保护 Spring Boot 应用。方法级授权、基于年龄的 policy、内容转换、obligation 和 policy set。"
permalink: /zh/guides/spring/
sitemap: false
robots: noindex,nofollow
---

## 使用 SAPL 的 Spring Boot 方法安全

本指南介绍如何使用 SAPL 保护 Spring Boot 应用。你将为 JPA repository 方法添加基于 policy 的授权，编写执行年龄限制的 policy，根据用户属性转换和过滤查询结果，并为 obligation 实现 constraint handler。

本指南假定你熟悉 Spring Boot 的基础知识。关于 ABAC 概念和 SAPL 架构的背景信息，请参阅[文档](https://sapl.io/docs/latest/)。

完整源代码可在 [github.com/heutelbeck/sapl-tutorial-01-spring](https://github.com/heutelbeck/sapl-tutorial-01-spring) 获取。

## 项目设置

首先，创建一个简单的 Spring Boot 应用。打开 [Spring Initializr](https://start.spring.io/)，并添加以下依赖：

* **Spring Web**（为测试应用提供 REST API）
* **Spring Data JPA**（用于开发应用的领域模型）
* **H2 Database**（作为简单的内存数据库来支持应用）
* **Lombok**（减少部分样板代码）
* **Spring Boot DevTools**（改善开发流程）

本教程使用 Maven 作为构建工具，并使用 Java 作为编程语言。

在 Initializr 中选择 Java 21 和 Spring Boot 4.1.0 或更新版本。

此时，你的 Initializr 设置大致应如下所示：

![Spring Initializr](/assets/guides/spring/spring_initializr.webp)

点击 "GENERATE"。浏览器会将项目模板下载为 ".zip" 文件。

解压项目，并将其导入你偏好的 IDE。

### 添加 SAPL 依赖

SAPL 提供一个 bill of materials 模块，用于保持 SAPL 模块版本彼此兼容。将以下代码块添加到 `pom.xml` 后，就不需要为每个 SAPL 依赖声明 `<version>`：

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

使用 SAPL 的应用需要一个 Policy Decision Point (PDP) 和一个或多个 Policy Enforcement Point (PEP)。PDP 负责做出授权决策。你可以将它嵌入应用，也可以将它作为专用服务器运行，并把决策委托给这个远程服务。本教程使用嵌入式 PDP，它会根据应用资源中存储的 policy 在本地做出决策。SAPL 还会与 Spring Security 集成，因此你可以通过注解在 Spring bean 上声明 PEP。将以下 starter 依赖添加到项目中：

```xml
    <dependency>
        <groupId>io.sapl</groupId>
        <artifactId>sapl-spring-boot-starter</artifactId>
    </dependency>
```

已发布的 SAPL 版本可从 Maven Central 获取。对于未发布的构建，请添加 Central Portal snapshots repository，并使用匹配的 `x.y.z-SNAPSHOT` 版本。

当前示例使用 Spring Boot 4.1.0 和 SAPL 4.1.1。Spring Boot 和 SAPL 的版本并不绑定。

要使用 Argon2 Password Encoder，请添加以下依赖：

```xml
    <dependency>
        <groupId>org.bouncycastle</groupId>
        <artifactId>bcpkix-jdk18on</artifactId>
        <version>1.84</version>
    </dependency>
```

在 `src/main/resources` 下创建 `policies` 文件夹，然后在该文件夹中创建名为 `pdp.json` 的文件：

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

`algorithm` 对象选择用于解决 policy 评估结果冲突的 combining algorithm。三个字段控制彼此正交的关注点：

* `votingMode` 决定同时存在 permit 和 deny 投票时哪种决策类型具有优先级。
* `defaultDecision` 是没有 policy 匹配 subscription 时的回退决策。
* `errorHandling` 控制 policy 评估出错时会发生什么（`PROPAGATE` 会让错误可见，`ABSTAIN` 会静默丢弃错误）。

此配置有意保持严格：deny 优先，默认 deny，并传播错误。这是 secure-by-default 的姿态。你将编写显式的 permit policy 来授予访问权限。

嵌入式 PDP 启动时需要 `policies` 目录和 `pdp.json` 文件。没有它们，应用会在启动期间失败。

你可以使用 `variables` 属性定义环境变量，例如 Policy Information Points (PIPs) 的配置。所有 policy 都可以访问这些变量的内容。

这个文件完成了基本的 Maven 设置。现在可以开始实现应用了。

## 项目领域

该领域是一个图书馆：只有用户满足某本书的最低年龄要求时，才可以查看该书。如果你已经熟悉 Spring Boot、JPA 和 Spring Security，可以直接跳到[使用 SAPL 保护 Repository 方法](#Method-Security)。

### 定义 Book 实体和 Repository

首先，定义一个 book 实体，包含 ID、名称、年龄分级和内容。你可以使用 Lombok 注解生成 getter、setter 和构造函数：

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

定义一个匹配的 repository 接口。目前只包含 `findAll`、`findById` 和 `save`：

```java
public interface BookRepository {
    List<Book> findAll();
    Optional<Book> findById(Long id);
    Book save(Book entity);
}
```

定义一个匹配的 repository bean，这样 Spring Data 就可以实例化你的接口实现：

```java
@Repository
// Important: interface order matters for detecting SAPL annotations.
public interface JpaBookRepository extends BookRepository, ListCrudRepository<Book, Long>  { }
```

这里使用 `ListCrudRepository` 而不是 `CrudRepository`，这样 `findAll()` 会返回 `List<Book>`，而不是 `Iterable<Book>`。稍后我们为过滤集合编写的 constraint handler 需要一个可识别的容器类型才能工作。

### 通过 REST Controller 暴露 Books

通过一个简单的 REST controller 暴露 books。Lombok 的 `@RequiredArgsConstructor` 注解会创建一个构造函数，用于 repository 的依赖注入：

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

### 创建自定义 `LibraryUser` 实现

现在扩展来自 `org.springframework.security.core.userdetails` 的 `User` 类，创建一个自定义 `LibraryUser` 实现，用于包含图书馆用户的出生日期。

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

为了确保自定义 `LibraryUser` 类存储在 security context 中，实现一个自定义 `LibraryUserDetailsService`。对于本教程，一个简单的内存中 `UserDetailsService` 就足够了：

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

### 创建配置类

创建一个带有 Spring 注解 `@Configuration` 和 `@EnableWebSecurity` 的 `SecurityConfiguration` 类。这个类提供的方法会在 Spring Security 上下文中自动处理。

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

### 在应用启动时生成测试数据

H2 和 JPA 的默认配置会创建一个易失的内存数据库。为了在每次应用启动时填充数据库，创建一个 `CommandLineRunner`。这个类会在 application context 成功加载后运行一次：

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

应用领域已经完成，现在可以测试应用。使用 `mvn clean install` 构建，然后在命令行用 `mvn spring-boot:run` 运行，或在 IDE 中使用 run configuration 运行。

应用启动后，访问 <http://localhost:8080/api/books>。浏览器会将你重定向到登录页。使用上面的任一用户登录。你应该会看到所有书籍的列表：

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

到目前为止，本教程还没有使用 SAPL 的任何功能，你只是创建了一个基本的 Spring Boot 应用。注意，我们没有显式添加任何 Spring Security 依赖。SAPL Spring 集成对 Spring Security 有传递依赖，因此为应用激活了它。

## 使用 SAPL 保护 Repository 方法

### <a name="Method-Security"></a> 设置方法安全

SAPL 扩展了 Spring Security 的方法安全功能。要为单个授权决策激活 SAPL 方法安全，请将 `@EnableSaplMethodSecurity` 注解添加到你的 `SecurityConfiguration` 类。

```java
@Configuration
@EnableWebSecurity
@EnableSaplMethodSecurity
public class SecurityConfiguration {
    ...
}
```

### 添加第一个 PEP

SAPL Spring Boot 集成使用注解为方法和类添加 PEP。本教程使用两个变体：`@PreEnforce` 和 `@PostEnforce`。根据注解不同，PEP 会在方法执行之前或之后运行。作为第一个示例，将 `@PreEnforce` 添加到 `BookRepository` 接口的 `findById` 方法：

```java
public interface BookRepository {
    List<Book> findAll();

    @PreEnforce
    Optional<Book> findById(Long id);

    Book save(Book entity);
}
```

### 启用控制台输出

将 `io.sapl.pdp.embedded.print-text-report=true` 添加到你的 `application.properties` 文件。text report 会记录每个 PDP 决策，包括 subscription、决策结果，以及哪些 policy 文档匹配。你也可以选择 `...print-json-report` 作为机器可读的变体，或选择 `...print-trace` 作为完整评估跟踪，其中包括属性解析。`print-trace` 是最细粒度的解释，只建议在排查问题的最后手段中使用。

text report 输出如下所示：

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

对于每个决策，你会看到哪些文档被评估以及它们各自的结果。对于 policy set，子 policy 的结果会列在 set 名称下。如果某个 policy 在评估期间从 Policy Information Points 解析了属性，这些值会显示在每个文档的 `Attributes:` 块下。存在 obligation 和 advice 时，它们也会列在决策中。

如需额外调试输出，例如启动时加载了哪些 policy 文档，可以在 `application.properties` 中使用 `logging.level.io.sapl=DEBUG`。

重启应用，登录，然后导航到 <http://localhost:8080/api/books/1>。现在你应该会看到一个错误页，其中包含语句：`There was an unexpected error (type=Forbidden, status=403).`

检查控制台，看看幕后发生了什么。日志应包含类似以下的语句：

```text
[...] : === PDP Decision ===
[...] : Timestamp      : 2026-05-18T12:36:42.66151139+02:00
[...] : Subscription Id: ebd3533d-853e-3b48-de3e-0f2af18cc21a
[...] : Subscription   : { ... large JSON object ... }
[...] : Decision       : DENY
[...] : PDP ID         : default
```

日志包含 authorization subscription（一个很大的 JSON 对象）、PDP 做出的决策、时间戳以及 PDP 标识符。决策是 `DENY`，因为还没有任何 policy，并且 combining algorithm 默认 deny。

subscription 在日志中并不容易阅读。让我们对 subscription 对象的关键部分做一些格式化，以便拆解：

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

注意：当用户使用密码登录时，Spring Security 7 会自动向 authentication 添加一个 `FACTOR_PASSWORD` authority。这是多因素认证框架的一部分。

在没有任何特定配置的情况下，subscription 是一个很大的对象，并且有明显的冗余。SAPL engine 和 Spring 集成不了解应用的领域知识，因此 PEP 会收集它能找到的任何信息，只要这些信息可以合理地描述 authorization subscription 中的 subject、action 和 resource。

默认情况下，PEP 会尝试将 Spring `SecurityContext` 中的 `Authentication` 对象直接 marshal 成 JSON 对象，作为 `subject`。在大多数情况下，这是一种合理做法；如你所见，`subject.principal.birthday` 包含你之前为自定义 `LibraryUser` 类定义的数据，并且可供 PDP 使用。

`action` 和 `resource` 对象几乎完全相同。由于缺少领域知识，PEP 只能从应用上下文中收集技术信息。

让我们从 action 及其关联的 Java 信息开始。PEP 可以使用受保护类和方法的名称与类型来描述 action。例如，方法名 `findById` 可以被视为描述 action 的动词，而参数 `1` 是该 action 的一个属性。

同时，参数 `1` 也可以被解释为 resource 的 ID。PEP 不知道哪些 Java context 值与应用相关，因此会把它能收集到的全部信息都添加到 action 和 resource。

如果受保护方法作为 HTTP 请求的一部分运行，该请求也可以描述 action 或 resource。例如，HTTP 方法 `GET` 可以描述 action，而 URL 自然标识一个 resource。

这种 subscription 对象很浪费。稍后你将学习如何自定义 subscription，使其更紧凑并更贴合应用领域。目前先保留默认配置。

## 为嵌入式 PDP 存储 SAPL Policy

控制台日志显示，PDP 没有找到任何匹配 authorization subscription 的 policy 文档，因为还不存在 policy。使用嵌入式 PDP 时，policy 可以和应用资源一起存储，也可以存储在主机文件系统的某个位置。应用资源中的 policy 在应用构建并启动后，在运行时是静态的。文件系统上的 policy 会被 PDP 监视，其变更可以在运行时生效。

嵌入式 PDP 的默认配置是第一种选项，因此应用的 policy 当前嵌入在资源中。

要使用基于文件系统的 policy，请将 `io.sapl.pdp.embedded.pdp-config-type = DIRECTORY` 添加到 `application.properties` 文件。

`pdp.json` 文件和 policy 可以存储在不同文件夹中。使用 `io.sapl.pdp.embedded.config-path` 配置 `pdp.json` 位置，使用 `io.sapl.pdp.embedded.policies-path` 配置 policy 位置。这两个属性都需要一个有效的文件系统路径，指向包含这些文件的文件夹。

**注意：** 路径中的 `\` 必须替换为 `/`，例如将 `C:\Users` 替换为 `C:/Users`。

## 创建 SAPL Policy

### 基本信息

存储的 policy 文档必须遵守一些规则：

- SAPL PDP 只会加载后缀为 `.sapl` 的文档。
- 每个文档恰好包含一个 policy 或一个 policy set。
- 所有顶层 policy 和 policy set 的名称在所有文档中必须唯一。
- 所有 `.sapl` 文档都必须语法正确，否则 PDP 可能会回退到由 `pdp.json` 配置中的 algorithm 决定的默认决策。

一个 SAPL policy 文档包含以下最少元素：

* *keyword* `policy`，声明该文档包含一个 policy。稍后你会了解 policy set。
* 唯一的 policy *name*，使 PDP 能将它与其他 policy 区分开。
* *entitlement* 关键字，即 `permit` 或 `deny`，它决定当 policy 适用且其主体评估为 `true` 时，PDP 返回的决策结果。

其他可选元素稍后会解释。

### 第一个 SAPL Policy：Permit All 或 Deny All

最基础的 policy 不检查任何属性，只是允许或拒绝所有 action。

从一个 "permit all" policy 开始。在 Maven 项目的 `resources/policies` 文件夹中添加文件 `permit_all.sapl`，内容如下：

```sapl
policy "permit all" permit
```

如上所述，该文档以关键字 `policy` 开头，表示该文档包含一个 policy。这个关键字后面跟着作为字符串的 policy *name*，本例中是 `"permit all"`。policy 名称后面是 *entitlement*，本例中是 `permit`。

在本指南中，我们没有在该 policy 中描述任何规则。因此，它的所有规则都被满足，并且无论 authorization subscription 中包含哪些属性细节，或 PIP 中有哪些外部属性，该 policy 都会告诉 PDP 返回 `permit` 决策。这类 policy 很危险，对生产系统也不太实用。不过，在开发期间它很有帮助，可以让你在不被授权逻辑阻挡的情况下快速测试。

重启应用，使用任一用户认证，然后再次访问 <http://localhost:8080/api/books/1>。

现在你应该会得到书籍 1 的数据：

```json
{
    "id"        : 1,
    "name"      : "Clifford: It's Pool Time!",
    "ageRating" : 0,
    "content"   : "*Woof*"
}
```

日志应如下所示：

```text
[...] : === PDP Decision ===
[...] : Subscription   : { ... }
[...] : Decision       : PERMIT
[...] : PDP ID         : default
[...] : Documents:
[...] :   permit all -> PERMIT
```

日志显示，PDP 找到一个匹配的 policy 文档（`permit all`），并且它评估为 `PERMIT`。由于这是唯一的 policy 且没有条件，`"permit all"` policy 总是匹配，并总是返回它的 entitlement。

因为这是唯一匹配的文档且返回 `permit`，PDP 返回 `PERMIT`。随后 PEP 允许 repository 方法执行。

在旁边创建一个 "deny all" policy。向 `resources/policies` 文件夹添加文件 `deny_all.sapl`：

```sapl
policy "deny all" deny
```

重启应用，使用任一用户认证，然后再次访问 <http://localhost:8080/api/books/1>。

应用会拒绝访问。日志显示两个 policy 都匹配，但 `PRIORITY_DENY` combining algorithm 会让 `deny` 决策优先：

```text
[...] : === PDP Decision ===
[...] : Subscription   : { ... }
[...] : Decision       : DENY
[...] : PDP ID         : default
[...] : Documents:
[...] :   permit all -> PERMIT
[...] :   deny all -> DENY
```

这是 secure-by-default 行为：当 permit 和 deny 同时存在时，deny 获胜。SAPL engine 实现了多种 combining algorithm 来解决冲突决策（参见 [SAPL Documentation: Combining Algorithms](https://sapl.io/docs/latest/2_5_CombiningAlgorithms/)）。

`pdp.json` algorithm 配置中的三个字段控制彼此正交的关注点：`votingMode` 决定 permit 和 deny 之间的优先级，`defaultDecision` 是没有 policy 匹配时的回退，`errorHandling` 控制评估错误是传播还是被静默吸收。

将 `deny_all.sapl` 重命名为 `deny_all.sapl.off`，将 `permit_all.sapl` 重命名为 `permit_all.sapl.off`。重命名后，在重启前使用 `mvn clean compile` 重新构建。这里需要 `clean`，因为 `target/` 目录中已编译的资源不会被普通构建移除。如果不这样做，旧的 `.sapl` 文件会留在 classpath 上，PDP 仍会加载它们。现在应该会拒绝访问该书，因为 PDP 只加载后缀为 `.sapl` 的文档，并且不再有匹配的 policy。

如果 policy 评估期间发生错误，PDP 也可能返回 `INDETERMINATE`。除显式 `PERMIT` 外，PEP 会拒绝所有决策。关于 policy 评估不同结果的更多信息，可以在 [SAPL 文档](https://sapl.io/docs/latest/)中找到。

在本节中，你了解了 SAPL 中 PEP 和 PDP 如何交互，以及 PDP 如何组合不同 policy 的结果。下一步，你将学习如何编写更实用的 policy，以及 policy 在什么情况下精确地*适用*于 authorization subscription。

### 创建领域特定的 Policy

首先，为 `BookRepository` 的 `findAll` 方法添加一个 `@PreEnforce` PEP：

```java
public interface BookRepository {

    @PreEnforce
    List<Book> findAll();

    @PreEnforce
    Optional<Book> findById(Long id);

    Book save(Book entity);
}
```

让我们根据自然语言语句“只有 Bob 可以查看单本书条目”编写一个 policy。从自然语言开始很有用，因为它能在你把规则编码到 SAPL 之前明确表达预期规则。在 resources 下的 policies 文件夹中创建 policy 文档 `permit_bob_for_books.sapl`，并将该语句翻译为如下 SAPL policy 文档：

```sapl
policy "only bob may see individual book entries"
permit
    action.java.name == "findById" & action.java.declaringTypeName =~ ".*BookRepository$";
    subject.name == "bob";
```

现在使用 `mvn clean compile` 重新构建（需要 clean，以便从 target 目录中移除之前编译的 `.sapl.off` 文件），重启，并以 Bob 身份登录。你应该会看到状态为 403 的错误页。这是因为登录会重定向到 `/api/books`，它调用 `findAll`，而没有 policy 匹配该方法。

现在直接访问单本书 <http://localhost:8080/api/books/1>。访问会被授予，日志如下所示：

```text
[...] : === PDP Decision ===
[...] : Subscription   : { ... }
[...] : Decision       : PERMIT
[...] : PDP ID         : default
[...] : Documents:
[...] :   only bob may see individual book entries -> PERMIT
```

现在访问 <http://localhost:8080/logout> 并登出。然后以 Zoe 身份登录，并尝试访问 <http://localhost:8080/api/books/1>。

应用会拒绝访问：

```text
[...] : === PDP Decision ===
[...] : Subscription   : { ... }
[...] : Decision       : DENY
[...] : PDP ID         : default
```

PDP 的决策过程现在看起来有所不同。首先，检查为什么访问 `/api/books` 或成功登录后没有适用的文档。

如果查看该 policy，`permit` 后面的条件包含两个由分号分隔的规则。第一个条件 `action.java.name == "findById" & action.java.declaringTypeName =~ ".*BookRepository$"` 充当 scoping rule，用于判断该 policy 是否与给定 authorization subscription 相关。只有当第一个条件为 `true` 时，PDP 才会评估其余条件。正如 `"permit all"` 示例所示，如果没有条件，policy 总是适用。

在本例中，*target expression* 检查 subscription 中 action 的两个属性。它检查 `action.java.name` 是否等于 `"findById"`，以及 `action.java.declaringTypeName` 是否匹配正则表达式 `".*BookRepository$"`。换句话说，属性字符串必须以 `BookRepository` 结尾。SAPL 使用 regex 比较运算符 `=~` 执行此检查。

**注意**：在 authorization subscription JSON 中，嵌套对象会作为其他对象中的对象值出现。在 SAPL policy 表达式中，你使用点号表示法导航这些嵌套结构。例如，subscription 中的 `"action": {"java": {"name": "findById"}}` 在 policy 中会变成 `action.java.name`。

这两个表达式解释了为什么访问单本书时，PDP 会将 policy 文档 `"permit_bob_for_books.sapl"` 识别为适用；而访问完整列表时，则找不到匹配文档。

注意，SAPL 区分 lazy Boolean operators（`&&` 和 `||`，表示 AND 和 OR）以及 eager Boolean operators（`&` 和 `|`）。*Target expressions* 只允许 eager operators，这是为了高效索引更大的 policy set。

当用户尝试访问单本书时，PDP 会评估完整 policy。*policy body* 是 `permit` 或 `deny` 后面的条件列表。它包含任意数量的规则或变量赋值，每一项都以 SAPL statement terminator 结尾。每条规则都是一个 Boolean 表达式。当所有规则都评估为 `true` 时，body 整体评估为 `true`。规则会从上到下 lazy 评估。

在上述情形中，检查 Bob 名称的规则只有在 Bob 正在访问该书时才为 `true`。

在本节中，你学习了 SAPL 文档何时适用，以及 policy body 中的条件如何决定授权决策。

接下来，你将学习如何自定义 authorization subscription，并使用时间函数只授予对适龄书籍的访问。

### 执行单本书的年龄分级

继续之前，请删除项目中所有现有 policy，或为文件名追加 `.off` 后缀，以停用它们。

本节的目标是只授予对适合用户年龄的书籍的访问。为了做出这个决策，PDP 需要用户的出生日期（subject 的属性）、书籍的年龄分级（resource 的属性）以及当前日期（environment 的属性）。当你检查前面示例中发送的 authorization subscription 时，会注意到当前只有用户的出生日期在 subscription 中可用。我们如何让 policy 中的 PDP 获得其他属性？

通常，属性有两个潜在来源：authorization subscription 或 Policy Information Points (PIPs)。

考虑书籍的年龄分级。这个信息在执行查询之前 PEP 并不知道。因此，在 `BookRepository` 中，将 `findById` 上的 `@PreEnforce` 替换为如下 `@PostEnforce` 注解：

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

这个注解改变了 enforcement flow：

* 先调用方法。
* 使用 [Spring Expression Language (SpEL)](https://docs.spring.io/spring-framework/docs/current/reference/html/core.html#expressions) 构造自定义 authorization subscription。
* 使用自定义 authorization subscription 订阅 PDP。
* 执行决策。

当我们检查最初自动生成的 authorization subscription 时，得到的对象相对庞大且偏技术化。这里，`@PostEnforce` 注解的参数有助于创建一个更精确、符合应用领域的 authorization subscription。

参数 `subject = "authentication.getPrincipal()"` 从 authentication 对象中提取 principal 对象，并将其用作 subscription 中的 subject 对象。

参数 `action = "'read book'"` 将 subscription 中的 action 对象设置为字符串常量 `read book`。

最后，参数 `resource = "returnObject"` 将 subscription 中的 resource 对象设置为方法调用结果。因为这个 resource 是 book entity，它会自动包含自己的 `ageRating` 属性。

识别这些对象后，PEP 会使用 Spring application context 中的 `ObjectMapper` 将对象序列化为 JSON。

生成的 authorization subscription 会类似如下：

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

这个 authorization subscription 比 Spring 集成在未自定义时自动猜测得到的对象更易管理，也更实用。

我们将要编写的用于执行书籍年龄限制的 policy 会引入几个新概念：

* 定义本地属性变量
* 使用 Policy Information Points
* 函数库

创建如下 policy 文档 `check_age.sapl`：

```sapl
policy "check age"
permit
    action == "read book";
    var birthday  = subject.birthday;
    var today     = time.dateOf(|<time.now>);
    var age       = time.timeBetween(birthday, today, "years");
    age >= resource.ageRating;
```

在第一个条件中，policy `check age` 将其适用范围限定为所有 action 为 `read book` 的 authorization subscription。

然后，该 policy 定义一个名为 `birthday` 的本地属性变量，并将它赋值为 `subject.birthday` 属性。

下一行将当前日期赋值给变量 `today`。在 SAPL 中，尖括号 `<ATTRIBUTE_IDENTIFIER>` 表示 attribute stream。这是对外部属性源的订阅，该属性源由 Policy Information Point (PIP) 提供。本例中，标识符 `time.now` 会从系统时钟访问 UTC 当前时间。

在本指南中，我们不需要时间更新流。我们只需要 attribute stream 中的第一个事件。在尖括号前加上管道符号 `|<>` 会取第一个事件，然后从 PIP 取消订阅。SAPL 的时间库使用 ISO 8601 字符串表示时间。函数 `time.dateOf` 随后从 PIP 获取的 timestamp 中提取日期部分。

该 policy 使用 `time.timeBetween` 函数和已定义变量，计算 subject 的年龄（以年为单位）。

engine 会从上到下评估变量赋值规则。每条规则都可以访问在其上方定义的变量。除非评估期间发生错误，赋值规则都会评估为 `true`。

最后，该 policy 将 `age` 与 `resource.ageRating` 比较。当 subject 的年龄至少达到书籍年龄分级时，该条件评估为 `true`。

例如，如果你以 Zoe 身份登录并访问第一本书，日志会显示：

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

在每个解析了外部属性的 policy 下方，报告会列出 PDP 在评估期间看到的属性值。这是 `print-text-report` 输出的一部分，与 `print-trace` 无关。

不过，如果 Alice 尝试访问第四本书，访问会被拒绝，因为年龄条件评估为 `false`，并且该 policy 不适用：

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

使用 `import` 语句可以更紧凑地编写该 policy：

```sapl
import time.timeBetween
import time.dateOf
policy "check age compact"
permit
    action == "read book";
    var age = timeBetween(subject.birthday, dateOf(|<time.now>), "years");
    age >= resource.ageRating;
```

import 允许你使用较短名称，而不是 SAPL 库中函数的完全限定名。

例如，语句 `import time.timeBetween` 会从 time 库导入 `timeBetween` 函数，使其可通过简单名称使用。你也可以导入单个 attribute finder，或使用 `'library name' as 'alias'` 创建别名。

## 使用 SAPL Policy 转换和约束输出

在本教程的这一部分，你将使用 policy 修改查询结果，并通过 constraint 触发副作用。

SAPL 可以将 constraint 附加到授权决策。constraint 会告诉 PEP 在执行该决策时完成额外工作。SAPL 区分三种 constraint 类型：

* *Obligation*：强制指令。如果 PEP 无法履行它，就不得授予访问权限。
* *Advice*：可选指令。如果 PEP 无法履行它，原始授权决策仍然有效。
* *Transformation*：一种特殊形式的 obligation，其中 PEP 必须用授权决策中提供的 resource 对象替换被访问的 resource。

对于 `PERMIT` 决策，未解决的 obligation 会阻止 PEP 授予访问权限。未解决的 advice 则不会。

例如，任何医生都可以在紧急情况下访问患者病历。但是，如果该医生不是该患者的主治医生，系统必须记录访问，从而触发审计流程。这通常称为 "break glass" 场景。

### 在 SAPL Policy 中使用 Transformation

Book entity 已经包含 `content` 字段。我们希望修改图书馆 policy，使年龄太小而不适合某本书的用户不会被直接拒绝访问。相反，只应遮盖所请求书籍的内容。为实现此变更，请将以下 `check_age_transform.sapl` policy 文档添加到应用的 policies 中：

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

该 policy 引入了 `transform` 表达式。

如果 policy body 评估为 `true`，`transform` 语句产生的 JSON 值会作为 `resource` 属性添加到 authorization decision。该属性告诉 PEP 返回所提供的替换 resource，而不是原始方法结果。它不会修改已存储的 book entity。

在本例中，filter operator `|-` 应用于 `resource` 对象。filter operator 会选择 JSON 值的各个部分进行操作，例如对选定值应用函数。这里，operator 选择 resource 的 `content` 键，并将它替换为一个只保留前三个字符可见、其余部分替换为黑色方块（Unicode 中的 "\\u2588"）的版本。selection expression 非常强大。完整说明请参阅 [SAPL 文档](https://sapl.io/docs/latest/)。

确保原始年龄检查 policy 仍然存在。重启并以 Alice 身份登录。

访问 <http://localhost:8080/api/books/1> 时，你会得到：

```json
{
    "id"        : 1,
    "name"      : "Clifford: It's Pool Time!",
    "ageRating" : 0,
    "content"   : "*Woof*"
}
```

Alice 只有三岁。当她请求 <http://localhost:8080/api/books/4> 上的书时，内容会被遮盖，因为她还太小，不能阅读它：

```json
{
    "id"        : 4,
    "name"      : "The Three-Body Problem",
    "ageRating" : 14,
    "content"   : "Spa████████████"
}
```

此访问尝试的日志如下所示：

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

两个 policy 文档都会针对该 subscription 进行评估。`check age` policy 评估为 `NOT_APPLICABLE`，因为 Alice 年龄不够，不能阅读 "The Three-Body Problem"。`check age transform` policy 评估为带有已转换 resource 的 `PERMIT`。因此，PEP 会用决策中的 resource 替换原始 resource，决策中的 resource 包含被遮盖的内容。

### 在 SAPL Policy 中使用 Obligation 和 Advice

带有 `transform` 语句的 `check age transform` policy，是第一个指示 PEP 只有在同时执行额外语句时才授予访问权限的 policy 示例。

现在为该 policy 添加一个 obligation。系统还应记录用户年龄太小而不适合阅读的书籍请求。这让父母有机会先和孩子讨论这本书。

为此，请如下修改 `check_age_transform.sapl` policy：

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

现在以 Alice 身份登录，并尝试访问 <http://localhost:8080/api/books/2>。

访问会被拒绝，日志如下：

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

PDP 返回了 `PERMIT`，但 PEP 仍然拒绝访问，因为 authorization decision 包含一个日志 obligation。SAPL 将 obligation 和 advice 表示为 JSON 对象，而应用必须为它使用的 constraint 类型提供 handler。由于还没有任何 handler 能够理解并执行这个日志 obligation，PEP 因此拒绝访问。

要支持日志 obligation，请实现一个 *constraint handler provider*：

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

SAPL Spring 集成通过 *signals* 交付 constraint handler，这些 signal 会在 PEP 生命周期中定义明确的时间点触发。signal 的示例包括 `DecisionSignal`（决策到达 PEP 的时刻）、`OutputSignal`（受保护方法每次发出结果时），以及当 PEP 位于 HTTP 路径上时的一些 HTTP 专用 signal。每个 provider 会声明它的 handler 附加到哪个或哪些 signal，以及使用什么优先级。

`ConstraintHandlerProvider` 是每个 provider 都要实现的单一接口。它唯一的方法 `getConstraintHandlers` 接收 constraint value 以及已部署 PEP 实际会触发的 signal type 集合。当 provider 不识别该 constraint 时返回空列表；识别时，返回一个包含 `ScopedConstraintHandler` 条目的非空列表。每个条目将一个 handler 与其附加的 signal type 以及用于排序执行的优先级配对。如果一个 constraint 驱动生命周期中多个阶段的协同 handler，单个 provider 可以为不同 signal 返回多个条目。

handler 本身有三种形式，表示为 `ConstraintHandler` 的 sealed sub-interface：

* `Runner` 是一个 `Runnable`，用于 fire-and-forget 的副作用（日志记录、审计事件发送）。
* `Consumer<T>` 观察一个 typed signal value，但不修改它（检查决策、查看发出的条目）。
* `Mapper<T>` 是一个 `UnaryOperator<T>`，用于转换 signal value（重写响应体、过滤返回的集合）。

对于日志记录，handler 是附加到 `DecisionSignal` 的副作用。静态 helper `ConstraintHandlerProvider.constraintTypeAndSignal` 组合了两个检查：constraint 必须是预期类型，并且已部署 PEP 必须触发预期 signal。provider 返回一个 `Runner`，它通过 SLF4J 打印 obligation 的 `message` 字段。

以 Alice 身份登录并访问 <http://localhost:8080/api/books/2> 后，访问会被授予，并且日志现在包含以下行：

```text
[...] : Attention, alice accessed the book 'The Rescue Mission: (Pokemon: Kalos Reader #1)'.
```

让我们尝试另一个 obligation 示例。

成功登录后，`/api/books` 仍然会被拒绝，因为我们还没有为 `findAll` 方法实现 policy。我们需要一个 policy，让用户列出适合其年龄的书籍。这一次，我们不会用 `transform` 指令替换 resource。在真实图书馆中，这可能要求 PEP 处理数百条记录。相反，我们指示 PEP 只返回特定书籍。

首先，如下完成 `BookRepository` 中 `findAll` 上的 `@PreEnforce`：

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

这个思路与 `findById` 方法相同。参数 `subject = "authentication.getPrincipal()"` 提取 principal 对象，并将其用作 subscription 中的 subject 对象。参数 `action = "'list books'"` 将 action 对象设置为字符串 `list books`。由于 `@PreEnforce` 在方法之前运行，此时还没有返回值。PEP 会让 resource 缺失，或从可用上下文中派生它。

要只返回可访问的书籍，请编写如下 policy：

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

我们使用 SAPL engine 已提供的 `ContentFilterPredicateProvider` 类。这个类会过滤 JSON 对象，并提取匹配指定条件的节点。

obligation 通过赋值 `"type" : "jsonContentFilterPredicate"` 选择该 provider。`conditions` 字段随后指定一个或多个要检查的条件。这里，provider 会检查数组中包含 `ageRating` 元素且其年龄分级小于或等于访问用户年龄的 JSON node。只有匹配的 node 会保留在响应中。

如果需要自定义行为，可以实现自己的 *constraint handler provider*：

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

其形状与 logging provider 类似，但现在 handler 是附加到 `OutputSignal` 的 `Mapper<Object>`。`OutputSignal` 是 PEP 在受保护方法产生返回值后触发的 per-result signal。`Mapper` 会在 PEP 释放该值之前转换它。`SignalType.findIn` 会在已部署 PEP 的 signal 集合中查找任意 value type 的 `OutputSignal`。由于 `findAll` 返回 `List<Book>`（见本教程前面对 `JpaBookRepository` 的修改），已部署 PEP 会触发一个 value type 为该列表的 `OutputSignal`，我们的 `Mapper` 在运行时接收填充完成的列表。

mapper 应用年龄谓词，并返回一个新的 `ArrayList<Book>`，其中只包含允许 subject 查看条目。如果没有条目匹配，返回一个空的 `List<Book>` 是可以接受的，因为 `findAll` 上的 policy 已经允许了请求。obligation 只会收窄结果集。mapper 不会修改原始列表，而是返回一个过滤后的副本。

现在以 Bob 身份登录，你会看到以下书籍列表：

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

## 创建 Policy Set

SAPL policy set 会将多个 policy 分组，并使用自身的 combining algorithm 评估它们。set 结果随后会与其他顶层 policy 或 policy set 的结果组合。policy set 使用与最终冲突解决相同的 algorithm 系列，包括 `first or abstain errors propagate` algorithm。

**注意**：与 `pdp.json` 文件不同，policy set 中的 algorithm 必须写成小写自然语言形式。

一个 SAPL policy set 包含以下元素：

* *keyword* `set`，声明该文档包含一个 policy set
* 唯一的 policy set *name*，使 PDP 能将它与其他 policy set 区分开
* 一个 *combining algorithm*
* 一个可选的 *target expression*
* 可选的变量赋值
* 两个或更多 policy

作为一个小示例，创建文件 `check_age_by_id_set.sapl`。前一节中的两个 policy（`'check age compact'` 和 `'check age transform'`）一次只能有一个适用。因此，让我们创建一个处理这两个 policy 的 policy set。

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

set 内 policy 的规则与顶层 policy 相同。每个条件都以 SAPL statement terminator 结尾。set 的第二个 policy 在 `permit` 后直接跟着一个条件。

使用扩展名 `.off` 停用两个 policy 文档 `'check_age_compact.sapl'` 和 `'check_age_transform.sapl'`，然后重启应用。

以 Bob 身份登录并访问 <http://localhost:8080/api/books/3>。日志如下：

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

policy set 会评估两个子 policy。`check age compact set` 匹配（Bob 年龄足够），而 `check age transform set` 不适用。set 使用 `first or abstain errors propagate`，因此第一个适用的子 policy 决定结果。

现在访问 <http://localhost:8080/api/books/4>。日志显示：

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

`check age transform set` policy 首先匹配（Bob 的年龄 < 14），因此 set 返回它的结果，其中包含 obligation，以及带有遮盖内容的已转换 resource。set 中的第二个 policy 不会被评估，因为第一个已经适用。

## 组合 Obligation、Advice 和 Transformation

对于顶层 policy，SAPL 会收集所有结果与最终授权决策匹配的 policy 中的 obligation 和 advice。policy set 则不同：并非每个内部 policy 都一定会被评估，因此只会收集已评估且结果匹配的内部 policy 的 obligation 和 advice。

另一个特殊情况与 *transformation* 有关。无法通过多个 policy 组合多个 transformation statement。如果有多个 policy 评估为 `PERMIT`，并且其中至少一个包含 transformation statement，SAPL 不会返回 `PERMIT` 决策。这称为 **transformation uncertainty**。

你可以从[本教程的 GitHub repository](https://github.com/heutelbeck/sapl-tutorial-01-spring) 下载演示项目。

## 结论

在本教程系列中，你学习了基于属性的访问控制基础，以及如何使用 SAPL 保护 Spring 应用。

使用 SAPL 可以实现更多能力，包括在组织范围内构建灵活、分布式的授权基础设施。本系列后续教程将聚焦更复杂的 obligation、测试、reactive data types、data streaming、根据 policy 自定义 UI，以及基于 Axon framework 的应用。

欢迎在我们的 [Discord Server](https://discord.gg/pRXEVWm3xM) 与开发者和社区交流。
