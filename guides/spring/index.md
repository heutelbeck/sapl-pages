---
layout: sapl
title: "Spring Security with SAPL - SAPL Guides"
description: "Secure a Spring Boot application with attribute-based access control using SAPL. Method-level authorization, age-based policies, content transformation, obligations, and policy sets."
---

## Spring Boot Method Security with SAPL

This guide walks through securing a Spring Boot application with SAPL. You will add policy-based authorization to JPA repository methods, write policies that enforce age restrictions, transform and filter query results based on user attributes, and implement constraint handlers for obligations.

The guide assumes basic familiarity with Spring Boot. For background on ABAC concepts and SAPL's architecture, see the [documentation](https://sapl.io/docs/latest/).

The complete source code is available at [github.com/heutelbeck/sapl-tutorial-01-spring](https://github.com/heutelbeck/sapl-tutorial-01-spring).

## Project Setup

First, you will implement a simple Spring Boot application. Go to [Spring Initializr](https://start.spring.io/) and add the following dependencies to a project:

* **Spring Web** (to provide a REST API for testing your application)
* **Spring Data JPA** (to develop the domain model for your application)
* **H2 Database** (as a simple in-memory database to support the application)
* **Lombok** (to eliminate some boilerplate code)
* **Spring Boot DevTools** (to improve the development process)

We will use Maven as our build tool and Java as our language for this tutorial.

Select Java 21 (or higher) and Spring Boot 4.0.3 (or higher) in the Initializr.

 Your Initializr settings should now look something like this:

![Spring Initializr](/assets/guides/spring/spring_initializr.webp)

Now click "GENERATE." Your browser will download the project template as a ".zip" file.

Now unzip the project and import it into your preferred IDE.

### Adding SAPL Dependencies

This tutorial uses the `4.0.0-SNAPSHOT` version of SAPL. To enable Maven to download the respective libraries, add the central snapshot repository to your `pom.xml` file:

```xml
    <repositories>
      <repository>
        <name>Central Portal Snapshots</name>
        <id>central-portal-snapshots</id>
        <url>https://central.sonatype.com/repository/maven-snapshots/</url>
      <releases>
        <enabled>false</enabled>
      </releases>
      <snapshots>
        <enabled>true</enabled>
      </snapshots>
    </repository>
  </repositories>
```

SAPL provides a bill of materials module to help you to use compatible versions of SAPL modules. By adding the following to your `pom.xml`, you do not need to declare the `<version>` of each SAPL dependency:

```xml
    <dependencyManagement>
        <dependencies>
            <dependency>
                <groupId>io.sapl</groupId>
                <artifactId>sapl-bom</artifactId>
                <version>4.0.0-SNAPSHOT</version>
                <type>pom</type>
                <scope>import</scope>
            </dependency>
        </dependencies>
    </dependencyManagement>
```

To develop an application using SAPL, you need two components. First, you need a component to make authorization decisions, the so-called Policy Decision Point (PDP). You can embed the PDP in your application or use a dedicated server application and delegate the decision-making to that remote service. This tutorial uses an embedded PDP that makes decisions locally based on policies stored in the application resources. SAPL offers deep integration with Spring Security, allowing you to deploy Policy Enforcement Points easily using a declarative aspect-oriented programming style. Add the following single starter dependency to your project:

```xml
    <dependency>
        <groupId>io.sapl</groupId>
        <artifactId>sapl-spring-boot-starter</artifactId>
    </dependency>
```

To use the Argon2 Password Encoder, add the following dependency:

```xml
    <dependency>
        <groupId>org.bouncycastle</groupId>
        <artifactId>bcpkix-jdk18on</artifactId>
        <version>1.83</version>
    </dependency>
```

Finally, create a new folder in the resources folder `src/main/resources` called `policies` and create a file called `pdp.json`:

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

The `algorithm` object selects the combining algorithm for resolving conflicting policy evaluation results. The three fields control orthogonal concerns:

* `votingMode` determines which decision type takes priority when both permit and deny votes are present.
* `defaultDecision` is the fallback when no policy matches the subscription.
* `errorHandling` controls what happens when policy evaluation errors occur (`PROPAGATE` makes errors visible, `ABSTAIN` silently drops them).

This configuration is deliberately restrictive: deny takes priority, the default is deny, and errors propagate. This is the secure-by-default posture. You will write explicit permit policies to grant access.

The `policies` directory and `pdp.json` file are required for the embedded PDP to start. Without them, the application will fail during startup.

You can use the `variables` property to define environment variables, such as the configuration of Policy Information Points (PIPs). All policies can access the contents of these variables.

This file completes the basic setup of the Maven project. Now, we can start implementing the application.

## The Project Domain

The domain is a library where books can only be viewed if the user meets the minimum age rating. If you are already familiar with Spring Boot, JPA, and Spring Security, skip ahead to [Securing Repository Methods with SAPL](#Method-Security).

### Define the Book Entity and Repository

First, define a book entity that contains an ID, a name, a suitable age rating, and content. You can use project Lombok annotations to automatically create getters, setters, and constructors as follows:

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

Now, define a matching repository interface. For now, only include a `findAll`, `findById`, and `save` method:

```java
public interface BookRepository {
    Iterable<Book> findAll();
    Optional<Book> findById(Long id);
    Book save(Book entity);
}
```

Also, define a matching repository bean to have Spring Data automatically instantiate a repository implementing your interface:

```java
@Repository
// Attention: here order of interface matters for detecting SAPL annotations. 
public interface JpaBookRepository extends BookRepository, CrudRepository<Book, Long>  { }
```

### Expose the Books using a REST Controller

To expose the books to the users, implement a simple REST controller. We use the Lombok annotation to create a constructor that takes the required beans as parameters for the dependency injection of the repository implementation:

```java
@RestController
@RequiredArgsConstructor
public class BookController {

    private final BookRepository repository;

    @GetMapping("/api/books")
    Iterable<Book> findAll() {
        return repository.findAll();
    }

    @GetMapping("/api/books/{id}")
    Optional<Book> findById(@PathVariable Long id) {
        return repository.findById(id);
    }
}
```

### Create a Custom `LibraryUser` Implementation

Now extend the `User` class from the package `org.springframework.security.core.userdetails` to create a custom `LibraryUser` implementation that contains the library user's birthdate.

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

To make sure the custom `LibraryUser` class will end up in the security context, implement a custom `LibraryUserDetailsService` which implements the `UserDetailsService`. This class loads the various `LibraryUsers` so that they can be used for authentication. So, for the tutorial, implement a simple custom in-memory `UserDetailsService`: 

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

### Create a Configurations class

Create a `SecurityConfiguration` class with the Lombok annotations `@Configuration` and `@EnableWebSecurity`. This class provides methods that are automatically processed in the context of Spring Security.

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

### Generate Test-Data on Application Startup

The default configuration with H2 and JPA will create a volatile in-memory database. Therefore, we want the system to contain some books each time the application starts. For this, create a `CommandLineRunner`. This class executes once the application context is loaded successfully:

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

The application domain is complete, and you can test the application. Build it with `mvn clean install` and then run it by executing `mvn spring-boot:run` on the command line or use the matching tools in your IDE.

After the application starts, go to <http://localhost:8080/api/books>. The browser will forward you to the login page. Use one of the users above to log in. You should see a list of all books:

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

So far, this tutorial has not used any features of SAPL, and you just created a basic Spring Boot application. Note that we did not explicitly add any dependency on Spring Security. The SAPL Spring integration has a transitive dependency on Spring Security, which activated it for the application.

## Securing Repository Methods with SAPL

### <a name="Method-Security"></a> Setting Up Method Security

SAPL extends the Spring Security framework's method security features. To activate SAPL's method security for single decisions, add the `@EnableSaplMethodSecurity` Lombok annotation to your `SecurityConfiguration` class.

```java
@Configuration
@EnableWebSecurity
@EnableSaplMethodSecurity
public class SecurityConfiguration {
    ...
}
```

### Adding the first PEP

The SAPL Spring Boot integration uses annotations to add PEPs to methods and classes. The scope of this tutorial covers the two variants `@PreEnforce` and `@PostEnforce`. Depending on which annotation is selected, the PEP is placed before or after the method execution. As a first example, add the `@PreEnforce` annotation to the `findById`method of the `BookRepository` interface:

```java
public interface BookRepository {
    Iterable<Book> findAll();

    @PreEnforce
    Optional<Book> findById(Long id);

    Book save(Book entity);
}
```

### Enable console output

Add `io.sapl.pdp.embedded.print-text-report=true` to your `application.properties` file. The text report logs each PDP decision with the subscription, decision outcome, and which policy documents matched. You can also select `...print-json-report` for a machine-readable variant or `...print-trace` for a full evaluation trace including attribute resolution. `print-trace` is the most fine-grained explanation and is only recommended as a last resort for troubleshooting.

The text report output looks like this:

```text
[...] : --- PDP Decision ---
[...] : Timestamp      : 2026-03-18T20:43:19.327+01:00
[...] : Subscription Id: 46d7ff56-...
[...] : Subscription   : { ... }
[...] : Decision       : PERMIT
[...] : PDP ID         : default
[...] : Documents:
[...] :   policy-name -> PERMIT
```

For each decision, you see which documents were evaluated and their individual outcomes. For policy sets, sub-policy results are listed under the set name. If PIPs are involved, their attribute values appear in the trace. Obligations and advice are listed when present in the decision.

For additional debug output, e.g., which policy documents are loaded at startup, you can use `logging.level.io.sapl=DEBUG` in your `application.properties`.

Restart the application, log in, and navigate to <http://localhost:8080/api/books/1>. You should now see an error page including the statement: `There was an unexpected error (type=Forbidden, status=403).`

Inspect the console, and you will find out what happened behind the scenes. The logs should contain statements similar to the following:

```text
[...] : --- PDP Decision ---
[...] : Timestamp      : 2026-03-18T20:43:19.327+01:00
[...] : Subscription Id: 46d7ff56-11c5-f628-6d6a-952bb1425558
[...] : Subscription   : { ... large JSON object ... }
[...] : Decision       : DENY
[...] : PDP ID         : default
```

The log contains the authorization subscription (a large JSON object), the decision made by the PDP, a timestamp, and the PDP identifier. The decision is `DENY` because no policies exist yet and the combining algorithm defaults to deny.

The subscription is not very readable in the log. Let us apply some formatting to unpack the key parts of the subscription object:

```json
{
    "subject": {
        "authenticated": true,
        "authorities": [
            { "authority": "FACTOR_PASSWORD", "issuedAt": "..." }
        ],
        "name": "zoe",
        "principal": {
            "username": "zoe",
            "birthday": "2009-02-26",
            "authorities": [],
            "accountNonExpired": true,
            "accountNonLocked": true,
            "credentialsNonExpired": true,
            "enabled": true
        }
    },
    "action": {
        "http": {
            "method": "GET",
            "requestedURI": "/api/books/1",
            "requestURL": "http://localhost:8080/api/books/1",
            "serverName": "localhost",
            "serverPort": 8080,
            "headers": { ... },
            "cookies": [ ... ]
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

Note: Spring Security 7 automatically adds a `FACTOR_PASSWORD` authority to the authentication when the user logs in with a password. This is part of the multi-factor authentication framework.

As you can see, without any specific configuration, the subscription is a massive object with significant redundancies. This is because the SAPL Engine and Spring integration do not have any domain knowledge regarding the application. Thus, the PEP gathers any information it can find that could reasonably describe the three required objects (subject, action, resource) for an authorization subscription.

By default, the PEP attempts to marshal the `Authentication` object from Spring's `SecurityContext` directly into a JSON object for the `subject`. This is a reasonable approach in most cases, and as you can see, `subject.principal.birthday` contains the data you previously defined for the custom `LibraryUser`class and is made available to the PDP.

The `action` and `resource` objects are almost identical. Consider where one can find information from the application context to describe these objects. Without any domain knowledge, the PEP can only gather technical information.

Let's begin with the action and its associated Java information. The PEP can consider the name and types of the protected classes and methods to describe the action. For example, the method name `findById` can be considered a  verb that describes the action, while the argument `1` is an attribute of this action.

At the same time, the argument `1` can also be considered as the resource's ID. What information about the PEP's Java context is actually relevant is unknown to the PEP. Therefore, it adds all information it can gather to the action and resource.

Second, if the action happens in the context of a web application, often the application context contains an HTTP request. Again, this HTTP request can describe the action, e.g., the HTTP method GET, or the resource, e.g., the URL naturally identifies a resource.

This kind of subscription object is wasteful. Later, you will learn how to customize the subscription to be more compact and match your application domain. For now, we stick with the default configuration.

## Storing SAPL Policies for an Embedded PDP

As you can see in the sixth line in the console log, the PDP did not find any policy document matching the authorization subscription, as we have not yet defined any policy for the application. With an embedded PDP, policies can be stored alongside the application's resources folder or somewhere on the host's filesystem. The difference between these options is that with policies in the resources, once you have built and started the application, the policies are static at runtime. When using the filesystem, the PDP will actively monitor the folder and update its behavior accordingly when policies change at runtime.

The default configuration of an embedded PDP is the first option, so the application's policies are currently embedded in the resources.

If you want to configure this behavior, you have to add `io.sapl.pdp.embedded.pdp-config-type = DIRECTORY` to the application.properties file.

The `pdp.json` file and the policies can be stored in different folders. This is regulated with the properties `io.sapl.pdp.embedded.config-path` for the `pdp.json` file and `io.sapl.pdp.embedded.policies-path` for the policies. Both require a valid file system path for the folder where the files are located.

**Note:** `\` within the path must be replaced by `/`, e.g., `C:\Users` by `C:/Users`.

## Creating SAPL Policies

### Basic Information

The stored policy documents must adhere to some rules:

- The SAPL PDP will only load documents that have the suffix `.sapl` .
- Each document contains exactly one policy or one policy set.
- The top-level policies or policy sets in all documents must have pairwise different names.
- All `.sapl` documents must be syntactically correct, or the PDP may fall back to a default decision determined by the algorithm given in the `pdp.json` configuration.

A SAPL policy document contains the following minimum elements:

* The *keyword* `policy`, declaring that the document contains a policy (as opposed to a policy set; You will learn about policy sets later)
* A unique policy *name* so that the PDP can distinguish them
* The *entitlement*, which is the decision result the PDP should return if the policy is successfully evaluated, i.e., `permit` or `deny`

Other optional elements will be explained later.

### First SAPL Policies - Permit All or Deny All

The most basic policies are the policies to either permit or deny all actions without further inspection of any attributes.

Let us start with a "permit all" policy. Add a file `permit_all.sapl` to the `resources/policies` folder of the maven project with the following contents:

```sapl
policy "permit all" permit
```

As described above, we start with the keyword `policy`, which indicates that it is a policy.
This keyword is always followed by the *name* of the SAPL policy as a string. In this case `"permit all"`. The policy name must always be followed by the *entitlement*, in this case `permit`.

In this guide, we haven't described any rules in the policy. Therefore, all of its rules are satisfied, and the policy tells the PDP to return a `permit` decision, regardless of any details of the attributes contained in the authorization subscription or any external attributes from PIPs. This type of policy is dangerous and not very practical for production systems. However, it is helpful during development to be able to perform quick tests without authorization getting in the way.

Now restart the application, authenticate with any user and access <http://localhost:8080/api/books/1> again.

Now you should get the data for book 1:

```json
{
    "id"        : 1,
    "name"      : "Clifford: It's Pool Time!",
    "ageRating" : 0,
    "content"   : "*Woof*"
}
```

And your log should look like this:

```text
[...] : --- PDP Decision ---
[...] : Subscription   : { ... }
[...] : Decision       : PERMIT
[...] : PDP ID         : default
[...] : Documents:
[...] :   permit all -> PERMIT
```

The log shows that the PDP found one matching policy document (`permit all`) and it evaluated to `PERMIT`. Since this is the only policy and it has no conditions, the `"permit all"` policy always matches and always returns its entitlement.

Since this is the only matching document and it returns `permit`, the PDP grants access. The PEP allows the repository method to execute.

Now, create a "deny all" policy alongside. Add a file `deny_all.sapl` to the `resources/policies` folder:

```sapl
policy "deny all" deny
```

Restart the application, authenticate with any user and access <http://localhost:8080/api/books/1> again.

The application denies access. The log shows both policies matched, but the `PRIORITY_DENY` combining algorithm gives precedence to the `deny` decision:

```text
[...] : --- PDP Decision ---
[...] : Subscription   : { ... }
[...] : Decision       : DENY
[...] : PDP ID         : default
[...] : Documents:
[...] :   permit all -> PERMIT
[...] :   deny all -> DENY
```

This is the secure-by-default behavior: when both permit and deny are present, deny wins. The SAPL engine implements several combining algorithms to resolve conflicting decisions (see [SAPL Documentation - Combining Algorithms](https://sapl.io/docs/latest/2_5_CombiningAlgorithms/)).

The three fields in the `pdp.json` algorithm configuration control orthogonal concerns: `votingMode` determines priority between permit and deny, `defaultDecision` is the fallback when no policy matches, and `errorHandling` controls whether evaluation errors propagate or are silently absorbed.

Finally, rename `deny_all.sapl` to `deny_all.sapl.off` and `permit_all.sapl` to `permit_all.sapl.off`. After renaming, rebuild with `mvn clean compile` before restarting. The `clean` is needed because compiled resources in the `target/` directory are not removed by a regular build. Without it, the old `.sapl` files remain on the classpath and the PDP still loads them. Now access to the book should be denied, as the PDP only loads documents with the `.sapl` suffix and no matching policies remain.

The PDP may also return `indeterminate` if an error occurred during policy evaluation. In all cases except an explicit `permit`, the PEP must deny access. Additional information about the different results of a policy evaluation can be found in the [SAPL documentation](https://sapl.io/docs/latest/).

In this section, you learned how a PEP and PDP interact in SAPL and how the PDP combines outcomes of different policies. In the next step, you will learn how to write more practical policies and when precisely a policy is *applicable*, i.e., matches, for an authorization subscription.

### Create Domain-Specific Policies

First, add a `@PreEnforce` PEP to the `findAll` method of the `BookRepository`:

```java
public interface BookRepository {

    @PreEnforce
    Iterable<Book> findAll();

    @PreEnforce
    Optional<Book> findById(Long id);

    Book save(Book entity);
}
```

Let's write a policy that says, "Only Bob can see individual book entries". Writing such *natural language policies (NLP)* is important to avoid inconsistencies between administrators and other users. Now, create a policy document `permit_bob_for_books.sapl` in the policies folder under resources, and translate the NLP into a SAPL policy document as follows:

```sapl
policy "only bob may see individual book entries"
permit
    action.java.name == "findById" & action.java.declaringTypeName =~ ".*BookRepository$";
    subject.name == "bob";
```

Now rebuild with `mvn clean compile` (clean is needed to remove any previously compiled `.sapl.off` files from the target directory), restart, and log in as Bob. You should see an error page with status 403. This happens because the login redirects to `/api/books` which calls `findAll`, and no policy matches that method.

Now access an individual book directly at <http://localhost:8080/api/books/1>. Access will be granted, and the log looks like this:

```text
[...] : --- PDP Decision ---
[...] : Subscription   : { ... }
[...] : Decision       : PERMIT
[...] : PDP ID         : default
[...] : Documents:
[...] :   only bob may see individual book entries -> PERMIT
```

Now go to <http://localhost:8080/logout> and log out. Then log in as Zoe and try to access <http://localhost:8080/api/books/1>.

The application denies access:

```text
[...] : --- PDP Decision ---
[...] : Subscription   : { ... }
[...] : Decision       : DENY
[...] : PDP ID         : default
```

As you can see, there are several differences in the decision-making process of the PDP. First, let us examine what leads to the fact that there are no applicable (matching) documents when accessing `/api/books` or after a successful login.

If you look at the policy, the conditions following `permit` contain two rules separated by semicolons. The first condition `action.java.name == "findById" & action.java.declaringTypeName =~ ".*BookRepository$"` acts as a scoping rule that determines if the policy is relevant to the given authorization subscription. The PDP only evaluates the remaining conditions if this first condition is `true`. As seen in the `"permit all"` example, if no conditions are present, the policy always applies.

In this case, the *target expression* examines two attributes of the action in the subscription. It validates if `action.java.name` is equal to `"findById"` and if `action.java.declaringTypeName` matches the regular expression `".*BookRepository$"`, i.e., the attribute string ends with `BookRepository`, using the regex comparison operator `=~`.

**Note**: In the authorization subscription JSON, nested objects use `:{`. In SAPL policy expressions, you navigate these nested structures with dot notation. For example, `"action": {"java": {"name": "findById"}}` in the subscription becomes `action.java.name` in the policy.

These two expressions explain why the PDP has identified the policy document `"permit_bob_for_books.sapl"` as applicable when accessing individual books, but does not find a matching document when accessing the entire list.

Please note that SAPL distinguishes between lazy Boolean operators, i.e., `&&` and `||` for AND and OR, and eager Boolean operators `&` and `|` respectively. *Target expressions* only allow eager operators, a requirement for efficient indexing of larger sets of policies.

The PDP evaluates the complete policy when the user attempts to access the individual book. The *policy body* is the list of conditions following `permit` or `deny`. It contains an arbitrary number of rules or variable assignments, each ending with a `;`. Each rule is a Boolean expression. The body as a whole evaluates to `true` when all of its rules evaluate to `true`. Rules are evaluated lazily from top to bottom.

In the situations above, the rule `subject.name == "bob";` is only `true` when Bob is accessing the book.

In this section, you have learned when a SAPL document is applicable and how the conditions in the policy body determine the authorization decision.

Next, you will learn how to customize the authorization subscription and use temporal functions to only grant access to age-appropriate books.

### Enforce the Age Rating of Individual Books

First, in preparation, deactivate all existing policies in your project by deleting them or appending the `.off` suffix to the filename.

The goal of this section is only to grant access to books appropriate for the user's age. To make this decision, the PDP needs the birthdate of the user (attribute of the subject), the age rating of the book (attribute of the resource), and the current date (attribute of the environment). When you examine the authorization subscription sent in the previous examples, you will notice that only the user's birthdate is currently available in the subscription. How can we make the other attributes available for the PDP in the policies?

Generally, there are two potential sources for attributes: the authorization subscription or Policy Information Points (PIPs).

Consider the age rating of the book. This information is not known to the PEP before executing the query. Therefore, in the `BookRepository`, replace the `@PreEnforce` on `findById` with a `@PostEnforce` annotation as follows:

```java
public interface BookRepository {
    
    @PreEnforce
    Iterable<Book> findAll();

    @PostEnforce(subject  = "authentication.getPrincipal()", 
                 action   = "'read book'", 
                 resource = "returnObject")
    Optional<Book> findById(Long id);

    Book save(Book entity);
}
```

This annotation does a couple of things:

* First, invoke the method.
* Construct a custom authorization subscription with [Spring Expression Language (SpEL)](https://docs.spring.io/spring-framework/docs/current/reference/html/core.html#expressions).
* Subscribe to the PDP with the custom authorization subscription.
* Enforce the decision.

When we inspected the original automatically generated authorization subscription, you will remember that the resulting object was relatively large and technical. Here, the parameters of the `@PostEnforce` annotation helps create a more domain-specific precise authorization subscription.

The parameter `subject = "authentication.getPrincipal()"` extracts the principal object from the authentication object and uses it as the subject-object in the subscription.

The parameter `action = "'read book'"` sets the action-object in the subscription to the string constant `read book`.

Finally, the parameter `resource = "returnObject"` sets the resource-object in the subscription to the method invocation result. As this resource is the book entity, it will automatically contain its `ageRating` attribute.

After identifying these objects, the PEP uses the `ObjectMapper` in the Spring application context to serialize the objects to JSON.

The resulting authorization subscription will look similar to this:

```json
{
    "subject": {
        "username": "zoe",
        "birthday": "2009-02-26",
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
    },
    "environment": null
}
```

This authorization subscription is much more manageable and practical than the automatic guesswork the Spring integration performs without any customization.

The policy we will write to enforce the book age restriction will introduce a number of new concepts:

* Definition of local attribute variables
* Usage of Policy Information Points
* Function libraries

Create a policy document `check_age.sapl` as follows:

```sapl
policy "check age"
permit
    action == "read book";
    var birthday  = subject.birthday;
    var today     = time.dateOf(|<time.now>);
    var age       = time.timeBetween(birthday, today, "years");
    age >= resource.ageRating;
```

In its first condition, the policy `check age` scopes its applicability to all authorization subscriptions with the action `read book`.

The policy then defines a local attribute variable named `birthday` and assigns it to the `subject.birthday` attribute.

The next line assigns the current date to the variable `today`. In SAPL, angled brackets `<ATTRIBUTE_IDENTIFIER>` always denotes an attribute stream, a subscription to an external attribute source, using a Policy Information Point (PIP). In this case, the identifier `time.now` is used to access the current time in UTC from the system clock.

In this guide, we do not need the streaming nature of the time, and we are only interested in the first event in the attribute stream. Prepending the pipe symbol to the angled brackets `|<>` only takes the head element, i.e., the first event in the attribute stream, and then unsubscribes from the PIP. The time libraries in SAPL use ISO 8601 strings to represent time. The function `time.dateOF` is then used to extract the date component of the timestamp retrieved from the PIP.

The policy calculates the subject's age in years using the `time.timeBetween` function and the defined variables. The `ageRating` of the book is stored in the matching variable.

Note that the engine evaluates variable assignment rules from top to bottom. And each rule has access to variables defined above it. Also, these assignment rules always evaluate to `true` unless an error occurs during evaluation.

Finally, the `age` is compared with the `ageRating` and the policy returns `true`if the subject's age is above the book's age rating.

For example, if you log in as Zoe and access the first book, the logs will show:

```text
[...] : --- PDP Decision ---
[...] : Subscription   : { ... }
[...] : Decision       : PERMIT
[...] : PDP ID         : default
[...] : Documents:
[...] :   check age -> PERMIT
```

However, if Alice attempts to access book four, access will be denied because the age condition evaluates to `false` and the policy becomes not applicable:

```text
[...] : --- PDP Decision ---
[...] : Subscription   : { ... }
[...] : Decision       : DENY
[...] : PDP ID         : default
[...] : Documents:
[...] :   check age -> NOT_APPLICABLE
```

The policy can be written more compactly using an `import` statement:

```sapl
import time.timeBetween
import time.dateOf
policy "check age compact"
permit
    action == "read book";
    var age = timeBetween(subject.birthday, dateOf(|<time.now>), "years");
    age >= resource.ageRating;
```

Imports allow the use of a shorter name instead of the fully qualified name of functions stored in libraries within a SAPL policy document.

For instance, the statement `import time.timeBetween` imports the `timeBetween` function from the time library, making it available under its simple name. You can also import individual attribute finders or use `'library name' as 'alias'` for aliasing.

It is also possible to import only single functions and use them under their simple names, as well as to choose an alias for a certain library with `'library name' as 'alias'`.

## How to transform and constrain Outputs with SAPL Policies?

In this part of the tutorial, you will learn how to use policies to change the outcome of queries and how to trigger side effects using constraints.

SAPL can be used to instruct the PEP to grant access only if other instructions are enforced at the same time. SAPL supports three types of additional instructions and calls them *constraints*. These constraints are as follows:

* *Obligation*, i.e., a mandatory condition that the PEP must fulfil. If this is not possible, access must be denied.
* *Advice*, i.e., an optional condition that the PEP should fulfil. If it fails to do so, access is still granted if the original decision was `permit`.
* *Transformation*, i.e., a special case of an obligation that expresses that the PEP must replace the accessed resource with the resource-object supplied in the authorization decision.

An authorization decision containing a constraint expresses that the PEP must only grant (or deny) access when it can fulfil all obligations.

For example, any doctor may access a patient's medical record in an emergency. However,  the system must log access if the doctor is not the attending doctor of the patient in question, triggering an audit process. Such a set of requirements is a so-called "breaking the glass scenario."

### How to use Transformations in SAPL Policies?

The Book entity already includes a `content` field. We want to change the policies of the library in a way that users not meeting the age requirement do not get their access denied. Instead, only the content of the applied book should be blackened. To implement this change, add the following `check_age_transform.sapl` policy document to the application's policies:

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

This policy introduces the `transform` expression for the *transformations*.

If the policy conditions are met (all evaluate to `true`), whatever JSON value the `transform` expression evaluates to is added to the authorization decision as the property `resource`. The presence of a `resource` object in the authorization decision instructs the PEP to replace the original `resource` data with the one supplied.

In this case, the so-called filter operator `|-` is applied to the `resource` object. The filter operator enables the selection of individual parts of a JSON value for manipulation, e.g., applying a function to the selected value. In this case, the operator selects the `content` key of the resource and replaces it with a version of its content, only exposing the three leftmost characters and replacing the rest with a black square ("\\u2588" in Unicode). The selection expression is very powerful. Please refer to the [SAPL Documentation](https://sapl.io/docs/latest/) for a full explanation.

Ensure that the original age-checking policy is still in place. Now, restart and log in as Alice.

When accessing <http://localhost:8080/api/books/1>, you will get:

```json
{
    "id"        : 1,
    "name"      : "Clifford: It's Pool Time!",
    "ageRating" : 0,
    "content"   : "*Woof*"
}
```

But of course, because Alice is only three years old, the content of the age-inappropriate book <http://localhost:8080/api/books/4> will be blackened:

```json
{
    "id"        : 4,
    "name"      : "The Three-Body Problem",
    "ageRating" : 14,
    "content"   : "Spa████████████"
}
```

The logs for this access attempt look like this:

```text
[...] : --- PDP Decision ---
[...] : Subscription   : { ... }
[...] : Decision       : PERMIT
[...] : PDP ID         : default
[...] : Documents:
[...] :   check age -> NOT_APPLICABLE
[...] :   check age transform -> PERMIT
```

Both policies match the subscription. The `check age` policy evaluates to `NOT_APPLICABLE` because Alice is not old enough to read "The Three-Body Problem". The `check age transform` policy evaluates to `PERMIT` with a transformed resource. As a result, the PEP replaces the original resource with the one from the decision, containing the blackened content.

### How to use Obligations and Advice in SAPL Policies?

The `check age transform` policy with the `transform` statement was the first example of a policy that instructs the PEP to grant access only if additional statements are enforced at the same time.

Now, we want to add an obligation to this policy. The system should also log attempted access to books that are not age-appropriate. This will allow parents to discuss the book with their children first.

To do so, modify the `check_age_transform.sapl` policy as follows:

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

Now log in as Alice and attempt to access <http://localhost:8080/api/books/2>.

Access will be denied, and the logs look as follows:

```text
[...] : --- PDP Decision ---
[...] : Subscription   : { ... }
[...] : Decision       : PERMIT
[...] : Obligations: [{"type"="logAccess", "message"="Attention, alice accessed the book '...'"}]
[...] : PDP ID         : default
[...] : Documents:
[...] :   check age -> NOT_APPLICABLE
[...] :   check age transform -> PERMIT
```

Despite the PDP's decision to permit access, it was still denied due to the obligation to log the access in the authorization decision. This is because SAPL expresses obligations and advice as arbitrary JSON objects and does not know which of them might be relevant in an application domain or how policies decide to describe them. Thus, the PEP was unable to understand and enforce the logging obligation, resulting in the denial of access.

To support the logging obligation, implement a so-called *constraint handler provider*:

```java
@Slf4j
@Service
public class LoggingConstraintHandlerProvider implements RunnableConstraintHandlerProvider {

    @Override
    public Signal getSignal() {
        return Signal.ON_DECISION;
    }

    @Override
    public boolean isResponsible(Value constraint) {
        if (!(constraint instanceof ObjectValue obj)) {
            return false;
        }
        return obj.get("type") instanceof TextValue type && "logAccess".equals(type.value());
    }

    @Override
    public Runnable getHandler(Value constraint) {
        if (constraint instanceof ObjectValue obj && obj.get("message") instanceof TextValue message) {
            return () -> log.info(message.value());
        }
        return () -> log.info("Access logged");
    }
}
```

The SAPL Spring integration offers different hooks in the execution path where applications can add constraint handlers. Depending on the annotation and if the underlying method returns a value synchronously or uses reactive datatypes like `Flux<>` different hooks are available.

For each of these hooks, the constraint handlers can influence the execution differently. E.g., for `@PreEnforce` the constraint handler may attempt to change the arguments handed over to the method. The different hooks map to interfaces a service bean can implement to provide the capability of enforcing different types of constraints. You can find a full list of the potential interfaces in the `sapl-spring-boot-starter` module.

In the case of logging, the constraint handler triggers a side effect by logging the message contained in the obligation to the console. Therefore, the `RunnableConstraintHandlerProvider` is the appropriate interface to implement.

This interface requires three methods:

* `isResponsible` returns `true` if the handlers provided can fulfil the constraint.
* `getSignal` returns when the `Runnable` should be executed. Here, the PEP immediately executes the `Runnable`  after it receives the decision from the PDP. Most other signals are primarily relevant for reactive data types and are out of the scope of this tutorial.
* `getHandler` returns the `Runnable` enforcing the constraint.

When logging in as Alice and attempting to access <http://localhost:8080/api/books/2> access will be granted, and the logs now contain the following line:

```text
[...] : Attention, alice accessed the book 'The Rescue Mission: (Pokemon: Kalos Reader #1)'.
```

Let's try another example of an obligation.

After a successful login, access is still denied. This is because we have not yet implemented a policy for the `findAll` method. Therefore, we need a policy that allows us to list all age-appropriate books. However, we do not replace the resource with the `transform` instruction. In a real library, this would require a significant amount of work for the PEP, potentially involving the processing of several hundred data records. Instead, we instruct the PEP to display only certain books.

First, complete the `@PreEnforce` on `findAll` in the `BookRepository` as follows:

```java
public interface BookRepository {
    
    @PreEnforce(subject = "authentication.getPrincipal()",
                action="'list books'")
    Iterable<Book> findAll();

    @PostEnforce(subject  = "authentication.getPrincipal()", 
                 action   = "'read book'", 
                 resource = "returnObject")
    Optional<Book> findById(Long id);

    Book save(Book entity);
}
```

The concept is the same as with the `findById` method. The parameter `subject = "authentication.getPrincipal()"` extracts the principal object and uses it as the subject-object in the subscription. The parameter `action = "'list books'"` sets the action object to the string `list books`. However, the resource remains unchanged or is guessed due to `@PreEnforce`.

To see all accessible books write a policy as follows:

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

We use the `ContentFilterPredicateProvider` class that is already provided in the SAPL engine. This class can be used to filter a JSON object and extract nodes that match the specified conditions.

The class is addressed in the obligation using the assignment `"type" : "jsonContentFilterPredicate"`. This is followed by the `conditions` keyword, where one or more conditions are specified and checked. Here, the array is checked for JSON nodes that contain the `ageRating` element and whether the age rating is lower than the age of the accessing user. Any matching nodes are then displayed.

Instead of using the provided class, we can again implement our own *constraint handler provider*:

```java
@Service
public class FilterByAgeProvider implements FilterPredicateConstraintHandlerProvider {

    @Override
    public boolean isResponsible(Value constraint) {
        if (!(constraint instanceof ObjectValue obj)) {
            return false;
        }
        return obj.get("type") instanceof TextValue type
                && "filterBooksByAge".equals(type.value())
                && obj.get("age") instanceof NumberValue;
    }

    @Override
    public Predicate<Object> getHandler(Value constraint) {
        return o -> {
            if (constraint instanceof ObjectValue obj && obj.get("age") instanceof NumberValue age) {
                if (o instanceof Book book) {
                    return age.value().intValue() >= book.getAgeRating();
                }
            }
            return true;
        };
    }
}
```

Here, we implement the `FilterPredicateConstraintHandlerProvider` interface.

This interface requires two methods:

* `isResponsible` returns `true` if the handlers provided can fulfil the constraint.
* `getHandler` returns a `Predicate` what is a boolean-valued function of one argument for testing.

Now log in as Bob, and you will see the following list of books:

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

## Create a Policy Set

A SAPL policy set allows a group of policies to be viewed separately and evaluated using a selected combining algorithm. The result is passed to the PDP and evaluated with the remaining policies (sets). The same algorithms are available as for final conflict resolution, including the `first or abstain errors propagate` algorithm.

**Note**: In contrast to the `pdp.json` file, the algorithms in policy sets must be written in lowercase and with `-`.

A SAPL policy set consists of the following elements:

* the *keyword* `set`, declaring that the document contains a policy set
* a unique policy set *name*, so that the PDP can distinguish them
* a *combining algorithm*
* an optional *target expression*
* optional variable assignments
* two or more policies

As a small example, create a file `check_age_by_id_set.sapl`. Only one of the two policies, `'check age compact'` and `'check age transform'`, from the previous chapter can be applicable at a time. Therefore, let's create a policy set that processes both policies.

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

The rules for policies within a set are the same as for top-level policies. Each condition ends with a `;`. The second policy of the set has a single condition directly following `permit`.

Deactivate the two policy documents `'check_age_compact.sapl'` and `'check_age_transform.sapl'` with the extension `.off` and restart the application.

Now, log in as Bob and access <http://localhost:8080/api/books/3>.
Your logs look as follows:

```text
[...] : --- PDP Decision ---
[...] : Subscription   : { ... }
[...] : Decision       : PERMIT
[...] : PDP ID         : default
[...] : Documents:
[...] :   check age set -> PERMIT
[...] :   check age compact set -> PERMIT
[...] :   check age transform set -> NOT_APPLICABLE
```

The policy set evaluates both sub-policies. The `check age compact set` matches (Bob is old enough), while `check age transform set` does not apply. The set uses `first or abstain errors propagate`, so the first applicable sub-policy determines the outcome.

Now access <http://localhost:8080/api/books/4>, you will get:

```text
[...] : --- PDP Decision ---
[...] : Subscription   : { ... }
[...] : Decision       : PERMIT
[...] : Obligations: [{"type"="logAccess", "message"="Attention, bob accessed the book 'The Three-Body Problem'."}]
[...] : PDP ID         : default
[...] : Documents:
[...] :   check age set -> PERMIT
[...] :   check age transform set -> PERMIT
[...] : Attention, bob accessed the book 'The Three-Body Problem'.
```

The `check age transform set` policy matches first (Bob's age < 14), so the set returns its result including the obligation and the transformed resource with blackened content. The second policy in the set is not evaluated because the first was already applicable.

## Collection of Obligations, Advice and Transformations

Before we end this tutorial, there is one more thing to note:

Finally, all the *obligations* and *advice* from policies that have been evaluated to the same decision are collected in an authorization decision. It is important to note that there may be a difference between policies and policy sets. In the case of sets, not all policies may be evaluated. In this case, only the *obligations* and *advice* from evaluated policies with the same result may be collected and transferred.

Another special case concerns *transformations*. It is not possible to combine multiple transformation statements through multiple policies. Any combining algorithm in SAPL will not return the decision `PERMIT` if there is more than one policy evaluating to `PERMIT` and at least one of them contains a transformation statement (this is called **transformation uncertainty**).

You can download the demo project from the [GitHub repository for this tutorial](https://github.com/heutelbeck/sapl-tutorial-01-spring).

## Conclusions

In this tutorial series, you have learned the basics of attribute-based access control and how to secure a Spring application with SAPL.

You can achieve much more with SAPL, including deploying flexible distributed organization-wide authorization infrastructures. The following tutorials in this series will focus on more complex obligations, testing, reactive data types, data streaming, customizing UIs based on policies, and applications based on the Axon framework.

Feel free to engage with the developers and community on our [Discord Server](https://discord.gg/pRXEVWm3xM).
