---
layout: sapl
lang: zh
ref: spring-guide
title: "使用 SAPL 的 Spring Security: SAPL 指南"
description: "使用 SAPL 和基于属性的访问控制保护 Spring Boot 应用。方法级授权、年龄分级、结果转换、obligation 和 policy set。"
permalink: /zh/guides/spring/
sitemap: false
robots: noindex,nofollow
---

## 使用 SAPL 保护 Spring Boot 方法

本指南演示如何使用 SAPL 保护 Spring Boot 应用。你会为 JPA repository 方法添加基于 policy 的授权，编写用于年龄分级的 policy，根据用户属性转换结果，并过滤返回列表。

本指南假定你熟悉 Spring Boot 的基础知识。关于 ABAC 和 SAPL 架构的背景信息，请参阅[文档](https://sapl.io/docs/latest/)。

完整源代码位于 [github.com/heutelbeck/sapl-tutorial-01-spring](https://github.com/heutelbeck/sapl-tutorial-01-spring)。

## 项目设置

先创建一个简单的 Spring Boot 应用。打开 [Spring Initializr](https://start.spring.io/) 并添加以下依赖:

* **Spring Web** 用于提供 REST API
* **Spring Data JPA** 用于领域模型
* **H2 Database** 作为内存数据库
* **Lombok** 用于减少样板代码
* **Spring Boot DevTools** 用于改善开发流程

本指南使用 Maven 作为构建工具，使用 Java 作为编程语言。

选择 Java 21 和 Spring Boot 4.1.0 或更新版本。

![Spring Initializr](/assets/guides/spring/spring_initializr.webp)

下载项目，解压文件，并将项目导入到你的 IDE。

### SAPL 依赖

SAPL 提供了 Bill of Materials 模块。使用它之后，不需要为每个 SAPL 模块分别声明版本:

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

然后添加 SAPL Spring Boot starter:

```xml
    <dependency>
        <groupId>io.sapl</groupId>
        <artifactId>sapl-spring-boot-starter</artifactId>
    </dependency>
```

已发布的 SAPL 版本可从 Maven Central 获取。对于尚未发布的构建，可以添加 Central Portal snapshots repository，并使用匹配的 `x.y.z-SNAPSHOT` 版本。

本示例使用 Spring Boot 4.1.0 和 SAPL 4.1.1。Spring Boot 和 SAPL 的版本并不绑定。

为了使用 Argon2 Password Encoder，还需要添加 Bouncy Castle:

```xml
    <dependency>
        <groupId>org.bouncycastle</groupId>
        <artifactId>bcpkix-jdk18on</artifactId>
        <version>1.84</version>
    </dependency>
```

在 `src/main/resources` 下创建 `policies` 文件夹，并添加 `pdp.json`:

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

## 领域模型

示例应用表示一个小型图书馆。每本书都有年龄分级。只有当已登录用户达到相应年龄时，才能完整阅读该书。

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

稍后会使用 SAPL 注解保护 repository:

```java
public interface BookRepository {

    List<Book> findAll();

    Optional<Book> findById(Long id);

    Book save(Book entity);
}
```

Spring Data repository 实现这些方法:

```java
public interface JpaBookRepository extends BookRepository, ListCrudRepository<Book, Long> {
}
```

## 用户和安全配置

示例应用使用三个不同年龄的用户。出生日期会作为 subject 的属性传递给 SAPL 决策。

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

在配置类中启用 Spring Security 和 SAPL Method Security:

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

## 第一个 Policy Enforcement Point

SAPL 通过方法或类上的注解添加 Policy Enforcement Point。访问单本书时使用 `@PostEnforce`，因为书的年龄分级只有在加载之后才知道:

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

`subject` 从 Spring Security authentication 中提取已登录用户。`action` 设置业务动作名称。对于 `findById`，`resource` 指向已加载的书。

## 单本书的年龄分级

下面的简单 policy 在用户达到年龄要求时允许访问:

```sapl
import time.timeBetween
import time.dateOf
policy "check age"
permit
    action == "read book";
    var age = timeBetween(subject.birthday, dateOf(|<time.now>), "years");
    age >= resource.ageRating;
```

如果用户年龄不足，SAPL 也可以转换资源。本例会在前三个字符之后遮蔽内容，并附加一个日志 obligation:

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

为了处理日志 obligation，需要注册一个 constraint handler provider:

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

## 过滤列表

对于 `findAll`，决策发生在方法调用之前。下面的 policy 允许调用，并附加一个 obligation 来过滤返回值:

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

内置的 `ContentFilterPredicateProvider` 会过滤返回列表，只保留符合用户年龄的书。

## Policy Set

可以把访问单本书的两个 policy 合并到一个 policy set 中:

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

该 policy set 使用 `first or abstain errors propagate`。一旦某个内部 policy 适用，它就决定整个 set 的结果。

## 预期行为

完成设置后，主要行为如下:

* 匿名用户会被重定向到登录页面。
* Bob 在列表中只能看到年龄分级不超过 10 的书。
* Alice 在列表中只能看到年龄分级为 0 的书。
* Zoe 可以完整阅读所有单本书。
* 当年龄分级过高时，Bob 和 Alice 会收到被遮蔽的内容。

英文版本包含完整的步骤、更多解释和日志输出。
