---
layout: post
title: "Implementing Attribute-based Access Control (ABAC) with Spring and SAPL"
date: 2022-07-27 11:20:22 +0200
tags: abac asbac sapl spring spring-boot tutorial
categories: tutorials
excerpt_separator: <!--more-->
---


## What is Attribute-based Access Control?

Attribute-based Access Control (ABAC) is an expressive access control model. 
In this tutorial, you will learn how secure services and APIs of a Spring Boot application using the SAPL Engine to implement ABAC. The tutorial assumes basic familiarity with the development process of Spring applications.

<!--more-->

ABAC decides on granting access by inspecting attributes of the subject, resource, action, and environment. 

The subject is the user or system requesting access to a resource. Attributes may include information such as the user's department in an organization, a security clearance level, schedules, location, or qualifications in the form of certifications.

The action is how the subject attempts to access the resource. An action may be one of the typical CRUD operations or something more domain-specific like "assign new operator," and attributes could include parameters of the operation.

Resource attributes may include owners, security classification, categories, or other arbitrary domain-specific data.

Environment attributes include data like the system and infrastructure context or time.

An application performing authorization of an action formulates an authorization question by collecting attributes of the subject, action, resource, and environment as required by the domain and asks a decision-making component which then makes a decision based on domain-specific rules which the application then has to enforce.

### The SAPL Attribute-Based Access Control (ABAC) Architecture

SAPL implements its interpretation of ABAC called Attribute Stream-Based Access Control (ASBAC). It uses publish-subscribe as its primary mode of interaction between the individual components. This tutorial will explain the basic ideas. The [SAPL Documentation](/docs/2.1.0-SNAPSHOT/sapl-reference.html#reference-architecture) provides a more complete discussion of the architecture. 

![SAPL ABAC/ASBAC Architecture](/assets/sapl-architecture.png)

In your application, there will be several code paths where a subject attempts to perform some action on a resource, and based on the domain's requirements, the action must be authorized. For example, in a zero-trust system, all actions triggered by users or other components must be explicitly authorized. 

A *Policy Enforcement Point (PEP)* is the logic in your application in these code paths that do:
* mediate access to the *Resource Access Point (RAP)*, i.e., the component executing the action and potentially retrieving data 
* formulate the authorization question in the form of an *authorization subscription*, i.e., a JSON object containing values for the subject, resource, action, and possibly the environment. The PEP determines the values based on the domain and context of the current attempt to execute the action.
* delegates the decision-making for the authorization question to the *Policy Decision Point (PDP)* by subscribing to it using the authorization subscription.
* enforces all decisions made by the PDP.

This tutorial will not examine the subscription nature of SAPL authorization. And instead, it will only look at PEPs requiring a single decision. Later tutorials will teach you how to use authorization subscriptions to handle reactive datatypes like ```Flux<>```, Axon subscription queries, or interactive web applications with Vaadin.

In SAPL, decisions may contain additional requirements for the PEP to enforce beyond the simple permission or denial of access. SAPL decisions may include constraints, i.e., further actions the PEP has to perform to grant success. If a constraint is optional, it is called *advice*. If the constraint is mandatory, it is called an *obligation*. 

SAPL also denotes a policy language used to express the rules describing the overall policies governing access control in the organization. For each authorization subscription, the PDP monitors the *Policy Retrieval Point (PRP)* for policies responsible, i.e., *applicable*, to the subscription. Individual policies may refer to attributes not stored within the authorization subscription. The PDP can subscribe to these attributes using domain-specific *Policy Information Points (PIPs)*. The PDP continuously evaluates the policies as the PIP attributes change and the policy documents are updated. It notifies the PEP whenever the implied *authorization decision* changes.

When developing an application using SAPL or ABAC in general, the PDP and systems used by the PDP are usually well developed and only require the integration of domain-specific PIPs. A significant part of the effort in adopting the ABAC pattern lies in implementing the PEPs. Developing a PEP capable of flexible handling of decisions with constraints can become very complex. SAPL provides several libraries that make this process as unintrusive as possible and integrate deeply into the supported frameworks. This tutorial will teach you how to deploy PEPs in a Spring Boot application, securing a JPA repository as an example.

## Project Setup

First, you will implement a simple Spring Boot application. Go to Go to Spring Initializr and add the following dependencies to a project:
* Web (to provide a REST API for testing your application)
* JPA (to develop the domain model of your application)
* H2 (as a simple in-memory database backing the application)
* Lombok (to eliminate some boilerplate code)

Name your project template as you like. SAPL is compatible with Java 11 and above. So feel free to select your preferred version. For this tutorial, use Maven as your build tool and Java as the language.
Your Initializr settings should now look something like this:

![Spring Initializr](/assets/tutorial_01/spring_initializr.png)

Now click "GENERATE." Your browser will download the project template as a ".zip" file.

Now unzip the project and import it into your preferred IDE. 

### Adding SAPL Dependencies

This tutorial uses the ```2.1.0-SNAPSHOT``` version of SAPL. For Maven to be able to download the respective libraries, add the central snapshot repository to your POM:

```xml
    <repositories>
        <repository>
            <id>ossrh</id>
            <url>https://s01.oss.sonatype.org/content/repositories/snapshots</url>
            <snapshots>
                <enabled>true</enabled>
            </snapshots>
        </repository>
    </repositories>
```

SAPL provides a bill of materials module, helping you to use compatible versions of SAPL modules. After adding the following to your POM, you do not need to declare the ```<version>``` of individual SAPL dependencies:

```xml
    <dependencyManagement>
        <dependencies>
            <dependency>
                <groupId>io.sapl</groupId>
                <artifactId>sapl-bom</artifactId>
                <version>2.1.0-SNAPSHOT</version>
                <type>pom</type>
                <scope>import</scope>
            </dependency>
        </dependencies>
    </dependencyManagement>
```
 
To develop an application using SAPL, you need two components. First, you need a component for making authorization decisions, the so-called policy decision point (PDP). You may embed the PDP within your application or use a dedicated server application and delegate the decision-making to this remote service. This tutorial uses an embedded PDP making decisions locally based on policies stored in the application resources. Add the following dependency to your project:

```XML
        <dependency>
            <groupId>io.sapl</groupId>
            <artifactId>sapl-spring-pdp-embedded</artifactId>
        </dependency>
```

SAPL provides deep integration with Spring Security. This integration enables simple deployment of policy enforcement points in Spring application using a declarative aspect-oriented programming style. Add the following dependency to your project:

```XML
        <dependency>
            <groupId>io.sapl</groupId>
            <artifactId>sapl-spring-security</artifactId>
        </dependency>
```

Finally, create a new folder in the resources folder ```src/main/resources``` called ```policies``` and create a file called ```pdp.json```: 

```JSON
{
    "algorithm": "DENY_UNLESS_PERMIT",
    "variables": {}
}
```

The ```algorithm``` property selects an algorithm used to resolve conflicting results from policy evaluation. In this case, the algorithm will ensure that the PDP always returns a ```deny``` decision if no policy evaluation returns an explicit ```permit``` decision. You can use the ```variables``` property to define environment variables, e.g., the configuration of policy information points (PIPs). All policies can access the content of these variables.

This file completes the basic setup of the Maven project. Next, we can begin with the implementation of the application.

You can get a demo project in this state from the [GitHub repository for this tutorial](https://github.com/heutelbeck/sapl-tutorial-01-spring/tree/d41d643a97d74abafedf2300d95fa3522fb8e538).

## The Project Domain

The application domain of this tutorial will be a library of books, where the books may only be seen and borrowed if the user has the minimum age indicated to be appropriate for the book. If you are already proficient with Spring, JPA, and Spring Security basics, you can skip this section and directly jump to [Securing a Service Method with SAPL](#securing-a-service-method-with-sapl).

### Define the Book Entity and Repository

First, define a book entity. You can use project Lombok annotations to create getters, setters, and constructors as follows automatically:

```Java
@Data
@Entity
@NoArgsConstructor
@AllArgsConstructor
public class Book {
    @Id
    Long id;
    String name;
    Integer ageRating;
}
```

Now define a matching repository interface. For now, only include a ```findAll```, ```findById```, and ```save``` method:

```Java
public interface BookRepository {
    Iterable<Book> findAll();
    Optional<Book> findById(Long id);
    Book save(Book entity);
}
```

Also, define a matching repository bean to have Spring Data automatically instantiate a repository implementing your interface:

```Java
@Repository
public interface JpaBookRepository extends CrudRepository<Book, Long>, BookRepository { }
```

### Expose the Books using a REST Controller

To expose the books to the users, implement a simple REST controller. We use Lombok annotation to create a constructor taking the required beans as parameters for dependency injection of the repository implementation:

```Java
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

### Create a Custom ```UserDetails``` Implementation

Now create a custom ```UserDetails``` implementation which contains the birthdate of the user:

```Java
@ToString(callSuper = true)
@EqualsAndHashCode(callSuper = true)
public class LibraryUser extends user implements UserDetails {

    @Getter
    private LocalDate birthday;

    public LibraryUser(String username, LocalDate birthday, String password) {
        super(username, password, true, true, true, true, List.of());
        this.birthday=birthday;
    }

}
```

To make sure the custom ```UserDetails``` class will end up in the security context, implement a custom ```UserDetailsService```. If you omit this service, you will still be able to authenticate using ```LibraryUser``` users stored in a default Spring ```InMemoryUserDetailsManager```. However, your principal will only contain a ```User``` object, and the ```birthday``` would be unavailable. So for the tutorial, implement a simple custom in-memory ```UserDetailsService```:

```java
@Service
public class LibraryUserDetailsService implements UserDetailsService {

    Map<String, LibraryUser> users = new HashMap<>();

    public void load(LibraryUser user) {
        users.put(user.getUsername(), user);
    }

    @Override
    public UserDetails loadUserByUsername(String username) throws UsernameNotFoundException {
        var user = users.get(username);
        if(user==null) {
            throw new UsernameNotFoundException("User not found");
        }
        return user;
    }

}
```

### Generate Test-Data and Test-Users on Application Startup

The default configuration with H2 and JPA will create a volatile in-memory database. Therefore, we want the system to contain some books and users each time the application starts. For this, create a ```CommandLineRunner```. This class executes once the application context is loaded successfully:

```Java
@Component
@RequiredArgsConstructor
public class DemoData implements CommandLineRunner {

    private final BookRepository bookRepository;
    private final LibraryUserDetailsService userDetailsService;

    @Override
    public void run(String... args) {
        bookRepository.save(new Book(1L, "Clifford: It's Pool Time!",                                  0));
        bookRepository.save(new Book(2L, "The Rescue Mission: (Pokemon: Kalos Reader #1)",             4));
        bookRepository.save(new Book(3L, "Dragonlance Chronicles Vol. 1: Dragons of Autumn Twilight",  9));
        bookRepository.save(new Book(4L, "The Three-Body Problem",                                    14));

        userDetailsService.load(new LibraryUser("zoe",     birthdayForAgeInYears(17), "{noop}password"));
        userDetailsService.load(new LibraryUser("bob",     birthdayForAgeInYears(10), "{noop}password"));
        userDetailsService.load(new LibraryUser("alice",   birthdayForAgeInYears(3),  "{noop}password"));
    }

    private LocalDate birthdayForAgeInYears(int age) {
        return LocalDate.now().minusYears(age).minusDays(20);
    }
}
```

The application domain is complete, and you can test the application. Run it by executing ```mvn spring-boot:run``` on the command line or use the matching tools in your IDE. After the application starts, go to ```http://localhost:8080/api/books```. The browser will forward you to the login page. Use one of the users above to log in. You will end up on an error page, as we have not set up forwarding after successful login. But we try to keep configuration to a minimum in this tutorial. You can go back to ```http://localhost:8080/api/books```, and you should see a list of all books:

```JSON
[
    {
        "id"       : 1,
        "name"     : "Clifford: It's Pool Time!",
        "ageRating": 0
    },
    {
        "id"       : 2,
        "name"     : "The Rescue Mission: (Pokemon: Kalos Reader #1)",
        "ageRating": 4
    },
    {
        "id"       : 3,
        "name"     : "Dragonlance Chronicles Vol. 1: Dragons of Autumn Twilight",
        "ageRating": 9
    },
    {
        "id"       : 4,
        "name"     : "The Three-Body Problem",
        "ageRating": 14
    }
]
```

So far, this tutorial has not used any features of SAPL, and you just created a basic Spring Boot application. Note that we did not explicitly add any dependency on Spring Security. The SAPL Spring integration has a transitive dependency on Spring Security which activated it for the application. 

 You can get a demo project in this state from the [GitHub repository for this tutorial](https://github.com/heutelbeck/sapl-tutorial-01-spring/tree/0f937c9cecaa5eb44b1740b0caa7c247cbd24a2d).

## Securing Repository Methods with SAPL

### Setting Up Method Security

SAPL extends the Spring Security framework's method security features. To activate SAPL's method security, add the following configuration to the application:

```Java
@Configuration
@EnableGlobalMethodSecurity
public class MethodSecurityConfiguration extends SaplMethodSecurityConfiguration {

    public MethodSecurityConfiguration(ObjectFactory<PolicyDecisionPoint> pdpFactory,
            ObjectFactory<ConstraintEnforcementService> constraintHandlerFactory,
            ObjectFactory<ObjectMapper> objectMapperFactory,
            ObjectFactory<AuthorizationSubscriptionBuilderService> subscriptionBuilderFactory) {
        super(pdpFactory, constraintHandlerFactory, objectMapperFactory, subscriptionBuilderFactory);
    }

}
```

### Adding the first PEP

The SAPL Spring Boot integration uses annotations to add PEPs to methods and classes. As a first example, add the ```@PreEnforce``` annotation the ```findById```method of the ```BookRepository``` interface:

```Java
public interface BookRepository {
    Iterable<Book> findAll();

    @PreEnforce
    Optional<Book> findById(Long id);

    Book save(Book entity);
}
```

Also, add ```logging.level.io.sapl=DEBUG``` to your ```application.properties``` file. This property will provide some insights into what is happening during policy enforcement.

Restart the application, log in, and navigate to [http://localhost:8080/api/books/1](http://localhost:8080/api/books/1). 
You now should get an error page including the statement: ```There was an unexpected error (type=Forbidden, status=403).```

Inspect the console, and you will find out what happened behind the scenes. The logs should contain some statements similar to the following:

```
 [nio-8080-exec-5] io.sapl.pdp.EmbeddedPolicyDecisionPoint  : - START DECISION: AuthorizationSubscription(subject={"authorities":[],"details":{"remoteAddress":"0:0:0:0:0:0:0:1","sessionId":"5065925D227E3E154C5C967C987A47E0"},"authenticated":true,"principal":{"username":"zoe","authorities":[],"accountNonExpired":true,"accountNonLocked":true,"credentialsNonExpired":true,"enabled":true,"birthday":"2005-07-11"},"name":"zoe"}, action={"http":{"characterEncoding":"UTF-8","protocol":"HTTP/1.1","scheme":"http","serverName":"localhost","serverPort":8080,"remoteAddress":"0:0:0:0:0:0:0:1","remoteHost":"0:0:0:0:0:0:0:1","remotePort":57231,"isSecure":false,"localName":"0:0:0:0:0:0:0:1","localAddress":"0:0:0:0:0:0:0:1","localPort":8080,"method":"GET","contextPath":"","requestedSessionId":"9AC851C0F24A51691A06BBA118E6E0D8","requestedURI":"/api/books/1","requestURL":"http://localhost:8080/api/books/1","servletPath":"/api/books/1","headers":{"host":["localhost:8080"],"connection":["keep-alive"],"sec-ch-ua":["\".Not/A)Brand\";v=\"99\", \"Google Chrome\";v=\"103\", \"Chromium\";v=\"103\""],"sec-ch-ua-mobile":["?0"],"sec-ch-ua-platform":["\"Windows\""],"dnt":["1"],"upgrade-insecure-requests":["1"],"user-agent":["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36"],"accept":["text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9"],"sec-fetch-site":["none"],"sec-fetch-mode":["navigate"],"sec-fetch-user":["?1"],"sec-fetch-dest":["document"],"accept-encoding":["gzip, deflate, br"],"accept-language":["de-DE,de;q=0.9,en;q=0.8,en-US;q=0.7,pt;q=0.6"]},"cookies":[{"name":"JSESSIONID","value":"9AC851C0F24A51691A06BBA118E6E0D8"}],"locale":"de_DE","locales":["de_DE","de","en","en_US","pt"]},"java":{"name":"findById","declaringTypeName":"io.sapl.tutorial.domain.BookRepository","modifiers":["public"],"instanceof":[{"name":"jdk.proxy3.$Proxy112","simpleName":"$Proxy112"},{"name":"io.sapl.tutorial.domain.JpaBookRepository","simpleName":"JpaBookRepository"},{"name":"org.springframework.data.repository.CrudRepository","simpleName":"CrudRepository"},{"name":"org.springframework.data.repository.Repository","simpleName":"Repository"},{"name":"io.sapl.tutorial.domain.BookRepository","simpleName":"BookRepository"},{"name":"org.springframework.data.repository.Repository","simpleName":"Repository"},{"name":"org.springframework.transaction.interceptor.TransactionalProxy","simpleName":"TransactionalProxy"},{"name":"org.springframework.aop.SpringProxy","simpleName":"SpringProxy"},{"name":"org.springframework.aop.framework.Advised","simpleName":"Advised"},{"name":"org.springframework.aop.TargetClassAware","simpleName":"TargetClassAware"},{"name":"org.springframework.core.DecoratingProxy","simpleName":"DecoratingProxy"},{"name":"java.lang.reflect.Proxy","simpleName":"Proxy"},{"name":"java.io.Serializable","simpleName":"Serializable"},{"name":"java.lang.Object","simpleName":"Object"}],"arguments":[1]}}, resource={"http":{"characterEncoding":"UTF-8","protocol":"HTTP/1.1","scheme":"http","serverName":"localhost","serverPort":8080,"remoteAddress":"0:0:0:0:0:0:0:1","remoteHost":"0:0:0:0:0:0:0:1","remotePort":57231,"isSecure":false,"localName":"0:0:0:0:0:0:0:1","localAddress":"0:0:0:0:0:0:0:1","localPort":8080,"method":"GET","contextPath":"","requestedSessionId":"9AC851C0F24A51691A06BBA118E6E0D8","requestedURI":"/api/books/1","requestURL":"http://localhost:8080/api/books/1","servletPath":"/api/books/1","headers":{"host":["localhost:8080"],"connection":["keep-alive"],"sec-ch-ua":["\".Not/A)Brand\";v=\"99\", \"Google Chrome\";v=\"103\", \"Chromium\";v=\"103\""],"sec-ch-ua-mobile":["?0"],"sec-ch-ua-platform":["\"Windows\""],"dnt":["1"],"upgrade-insecure-requests":["1"],"user-agent":["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36"],"accept":["text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9"],"sec-fetch-site":["none"],"sec-fetch-mode":["navigate"],"sec-fetch-user":["?1"],"sec-fetch-dest":["document"],"accept-encoding":["gzip, deflate, br"],"accept-language":["de-DE,de;q=0.9,en;q=0.8,en-US;q=0.7,pt;q=0.6"]},"cookies":[{"name":"JSESSIONID","value":"9AC851C0F24A51691A06BBA118E6E0D8"}],"locale":"de_DE","locales":["de_DE","de","en","en_US","pt"]},"java":{"name":"findById","declaringTypeName":"io.sapl.tutorial.domain.BookRepository","modifiers":["public"],"instanceof":[{"name":"jdk.proxy3.$Proxy112","simpleName":"$Proxy112"},{"name":"io.sapl.tutorial.domain.JpaBookRepository","simpleName":"JpaBookRepository"},{"name":"org.springframework.data.repository.CrudRepository","simpleName":"CrudRepository"},{"name":"org.springframework.data.repository.Repository","simpleName":"Repository"},{"name":"io.sapl.tutorial.domain.BookRepository","simpleName":"BookRepository"},{"name":"org.springframework.data.repository.Repository","simpleName":"Repository"},{"name":"org.springframework.transaction.interceptor.TransactionalProxy","simpleName":"TransactionalProxy"},{"name":"org.springframework.aop.SpringProxy","simpleName":"SpringProxy"},{"name":"org.springframework.aop.framework.Advised","simpleName":"Advised"},{"name":"org.springframework.aop.TargetClassAware","simpleName":"TargetClassAware"},{"name":"org.springframework.core.DecoratingProxy","simpleName":"DecoratingProxy"},{"name":"java.lang.reflect.Proxy","simpleName":"Proxy"},{"name":"java.io.Serializable","simpleName":"Serializable"},{"name":"java.lang.Object","simpleName":"Object"}]}}, environment=null)
 [nio-8080-exec-1] nericInMemoryIndexedPolicyRetrievalPoint :   |- Matching documents: NONE
 [nio-8080-exec-1] s.s.m.b.PreEnforcePolicyEnforcementPoint : AuthzDecision    : AuthorizationDecision(decision=DENY, resource=Optional.empty, obligations=Optional.empty, advice=Optional.empty)

```

The first log entry states that the PDP is starting the decision-making process for an authorization subscription. The subscription is not very readable this way. Let us apply some formatting to the JSON data to unpack what the subscription object:

```JSON
{
    "subject": {
        "name":"zoe"
        "authorities":[],
        "authenticated":true,
        "details": {
            "remoteAddress":"0:0:0:0:0:0:0:1",
            "sessionId":"3EB8C81E289D18BC471DD7EDFD3A22B0"
        },
        "principal": {
            "username":"zoe",
            "authorities":[],
            "accountNonExpired":true,
            "accountNonLocked":true,
            "credentialsNonExpired":true,
            "enabled":true,
            "birthday":"2005-07-11"
        },
    },
    "action": {
        "http": {
            "method":"GET",
            "contextPath":"",
            "requestedURI":"/api/books/1",
            "requestURL":"http://localhost:8080/api/books/1",
            "servletPath":"/api/books/1",
            "characterEncoding":"UTF-8",
            "protocol":"HTTP/1.1",
            "scheme":"http",
            "serverName":"localhost",
            "serverPort":8080,
            "remoteAddress":"0:0:0:0:0:0:0:1",
            "remoteHost":"0:0:0:0:0:0:0:1",
            "remotePort":61476,
            "isSecure":false,
            "localName":"0:0:0:0:0:0:0:1",
            "localAddress":"0:0:0:0:0:0:0:1",
            "localPort":8080,
            "requestedSessionId":"F19999E939334243AA01EDED24EA7EBB",
            "headers":{
                "host":["localhost:8080"],
                "connection":["keep-alive"],
                "cache-control":["max-age=0"],
                "sec-ch-ua":["\".Not/A)Brand\";v=\"99\", \"Google Chrome\";v=\"103\", \"Chromium\";v=\"103\""],
                "sec-ch-ua-mobile":["?0"],
                "sec-ch-ua-platform":["\"Windows\""],
                "dnt":["1"],
                "upgrade-insecure-requests":["1"],
                "user-agent":["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/103.0.0.0 Safari/537.36"],
                "accept":["text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9"],
                "sec-fetch-site":["none"],
                "sec-fetch-mode":["navigate"],
                "sec-fetch-user":["?1"],
                "sec-fetch-dest":["document"],
                "accept-encoding":["gzip, deflate, br"],
                "accept-language":["de-DE,de;q=0.9,en;q=0.8,en-US;q=0.7,pt;q=0.6"]
            },
            "cookies":[{"name":"JSESSIONID","value":"F19999E939334243AA01EDED24EA7EBB"}],
            "locale":"de_DE",
            "locales":["de_DE","de","en","en_US","pt"]
        },
        "java":{
            "name":"findById",
            "declaringTypeName":"io.sapl.tutorial.domain.BookRepository",
            "modifiers":["public"],
            "arguments":[1],
            "instanceof":[
                { "name":"jdk.proxy10.$Proxy179", "simpleName":"$Proxy179" },
                { "name":"io.sapl.tutorial.domain.JpaBookRepository", "simpleName":"JpaBookRepository" },
                { "name":"org.springframework.data.repository.CrudRepository", "simpleName":"CrudRepository" },
                { "name":"org.springframework.data.repository.Repository", "simpleName":"Repository" },
                { "name":"io.sapl.tutorial.domain.BookRepository", "simpleName":"BookRepository" },
                { "name":"org.springframework.data.repository.Repository", "simpleName":"Repository" },
                { "name":"org.springframework.transaction.interceptor.TransactionalProxy", "simpleName":"TransactionalProxy" },
                { "name":"org.springframework.aop.SpringProxy", "simpleName":"SpringProxy" },
                { "name":"org.springframework.aop.framework.Advised", "simpleName":"Advised" },
                { "name":"org.springframework.aop.TargetClassAware", "simpleName":"TargetClassAware" },
                { "name":"org.springframework.core.DecoratingProxy", "simpleName":"DecoratingProxy" },
                { "name":"java.lang.reflect.Proxy", "simpleName":"Proxy" },
                { "name":"java.io.Serializable", "simpleName":"Serializable" },
                { "name":"java.lang.Object", "simpleName":"Object" }]
        }
    }, 
    "resource": {
        "http":{
            [...]
        },
        "java": { 
            [...]
        }
    }, 
    "environment": null 
}
```

As you can see, without any specific configuration, the subscription is a massive object with significant redundancies. 
The reason for this is that the SPAL Engine and Spring integration do not have any domain knowledge regarding the application. 
Thus, the PEP gathers any information it can find that could reasonably describe the three required objects for an authorization subscription.

By default, the PEP attempts to marshall the ```Authentication``` object from Spring's ```SecurityContext``` directly into a JSON object for the ```subject```. 
This is a reasonable approach in most cases, and as you can see, ```subject.principal.birthday``` contains the data you defined earlier for
the custom ```UserDetails``` class is made available for the PDP.

The ```action``` and ```resource``` objects are almost identical. Consider where one can find information from the application context to describe these objects. 
Without any domain knowledge, the PEP can only gather technical information. 

First, the PEP can consider the name of and types of the protected classes and methods to describe the action, e.g., the method name ```findById``` can be considered a  verb describing the action, and the argument ```1``` is an attribute of this action.
At the same time, the argument ```1``` can also be considered the resource's id. 
What information about the PEP's Java context is actually relevant is unknown to the PEP. 
Therefore, it adds all information it can gather to the action and resource.

Second, if the action happens in the context of a web application, often the application context contains an HTTP request. 
Again, this HTTP request can describe the action, e.g., the HTTP method GET, or the resource, e.g., the URL naturally identifies a resource.

This kind of subscription object is wasteful. Later, you will learn how to customize the subscription to be more compact and match your application domain. 
For now, we stick with the default configuration to progress quickly.

### Storing SAPL Polices for an Embedded PDP

As you can see in the second line in the console log, the PDP did not find any policy document matching the authorization subscription, 
as we have not yet defined any policy for the application.
With an embedded PDP, policies can be stored alongside the application's resources folder or somewhere on the host's filesystem. 
The difference between these options is that with policies in the resources, once you have built and started the application, the policies are static at runtime. 
When using the filesystem, the PDP will actively monitor the folder and update its behavior accordingly when policies change at runtime.

As it is the default configuration of the embedded PDP, the application currently uses the first option to embed the policies in the resources.

The set of policy documents stored must adhere to some rules:
* The SAPL PDP will only load documents that have the suffix ```.sapl```
* The documents may not have a byte order mark (to be updated in future versions)
* Each document contains exactly one policy or one policy set
* the top-level policy or policy set in all documents must have pairwise-different names
* All ```.sapl``` documents must be syntactically correct, or the PDP may fall back to a default decision determined by the algorithm given in the ```pdp.json`` configuration.

### First SAPL Policies - Permit All or Deny All

The most basic policies are the policies to either permit or deny all actions without further inspection of any attributes. 

Let us start with a "permit all" policy. Add a file ```permit_all.sapl``` to the ```resources/policies``` folder of the maven project with the following contents:

```
policy "permit all" permit
```

The keyword ``policy``` indicates that the document contains a single policy, not a policy set. You will learn about policy sets later.
This keyword is always followed by the name of the SPAL document as a string, i.e., ```"permit all"```. 
The name of a policy must always be followed by the *entitlement* which is either ```permit``` or ```deny```.
The entitlement expresses which decision the PDP should return when all policy rules are satisfied. 
In this case, the policy does not have any rules. Therefore, all of its rules are satisfied, and the policy tells the PDP always to return a ```permit```
decision, regardless of any details of the attributes contained in the authorization subscription or any external attributes from PIPs.
This kind of policy is dangerous and not very practical for production systems. However, it is helpful during development to be able 
to perform quick tests without authorization getting in the way.

Now restart the application, authenticate with any user and again try to access [http://localhost:8080/api/books/1](http://localhost:8080/api/books/1).

Now you should get the data for book 1:

```json
{
    "id"        : 1,
    "name"      : "Clifford: It's Pool Time!",
    "ageRating" : 0
}
```

And your log should read like this:

```
 nericInMemoryIndexedPolicyRetrievalPoint :   |- Matching documents:
 nericInMemoryIndexedPolicyRetrievalPoint :   |  * 'permit all'
 i.s.g.s.i.CombiningAlgorithmImplCustom   :   |- Evaluate: permit all 
 i.s.grammar.sapl.impl.PolicyImplCustom   :   |  |- Evaluate 'permit all'
 i.s.grammar.sapl.impl.PolicyImplCustom   :   |     |- PERMIT 'permit all': AuthorizationDecision(decision=PERMIT, resource=Optional.empty, obligations=Optional.empty, advice=Optional.empty)
 UnlessPermitCombiningAlgorithmImplCustom :   |- *PERMIT* Combined AuthorizationDecision(decision=PERMIT, resource=Optional.empty, obligations=Optional.empty, advice=Optional.empty)
 s.s.m.b.PreEnforcePolicyEnforcementPoint : AuthzDecision    : AuthorizationDecision(decision=PERMIT, resource=Optional.empty, obligations=Optional.empty, advice=Optional.empty)
```

In this log, you can see that the PRP identified the ```'permit all'``` policy document relevant for the authorization subscription. It proceeded to evaluate the document and, as expected, concluded that all rules are satisfied and that the decision indicated by the policy is ```permit```. Finally, as this is the only matching document with a decision, the combining algorithm also concludes to return a ```permit```. Therefore, the PEP allows access to the repository method.

Now, add a "deny all" policy. Add a file ```deny_all.sapl``` to the ```resources/policies``` folder of the maven project with the following contents:

```
policy "deny all" deny
```

Now restart the application, authenticate with any user and again try to access [http://localhost:8080/api/books/1](http://localhost:8080/api/books/1).

The PDP will grant access, and the log will look similar to this:

```
 nericInMemoryIndexedPolicyRetrievalPoint :   |- Matching documents:
 nericInMemoryIndexedPolicyRetrievalPoint :   |  * 'permit all'
 nericInMemoryIndexedPolicyRetrievalPoint :   |  * 'deny all'
 i.s.g.s.i.CombiningAlgorithmImplCustom   :   |- Evaluate: permit all 
 i.s.grammar.sapl.impl.PolicyImplCustom   :   |  |- Evaluate 'permit all'
 i.s.grammar.sapl.impl.PolicyImplCustom   :   |     |- PERMIT 'permit all': AuthorizationDecision(decision=PERMIT, resource=Optional.empty, obligations=Optional.empty, advice=Optional.empty)
 i.s.g.s.i.CombiningAlgorithmImplCustom   :   |- Evaluate: deny all 
 i.s.grammar.sapl.impl.PolicyImplCustom   :   |  |- Evaluate 'deny all'
 i.s.grammar.sapl.impl.PolicyImplCustom   :   |     |- DENY 'deny all': AuthorizationDecision(decision=DENY, resource=Optional.empty, obligations=Optional.empty, advice=Optional.empty)
 UnlessPermitCombiningAlgorithmImplCustom :   |- *PERMIT* Combined AuthorizationDecision(decision=PERMIT, resource=Optional.empty, obligations=Optional.empty, advice=Optional.empty)
 s.s.m.b.PreEnforcePolicyEnforcementPoint : AuthzDecision    : AuthorizationDecision(decision=PERMIT, resource=Optional.empty, obligations=Optional.empty, advice=Optional.empty)
```

Note that your system's ordering of the log entries may be slightly different. The log indicates that both policies match the subscription and that the PDP evaluates them. Then the combining algorithm resolves the two decisions, i.e., one ```permit``` and one ```deny```, to ```permit```.

The PDP uses the combining algorithm selected in the ```pdp.json``` configuration file: ```"algorithm": "DENY_UNLESS_PERMIT",```. 
This algorithm only returns ```deny``` if no ```permit``` is present. This algorithm is relatively permissive. The SAPL engine implements alternative algorithms to resolve the presence of different, potentially contradicting, decisions (also see [SAPL Documentation - Combining Algorithm](/docs/2.1.0-SNAPSHOT/sapl-reference.html#combining-algorithm-2)). For the tutorial domain, select a more restrictive algorithm. Replace ```DENY_UNLESS_PERMIT``` in the configuration with ```DENY_OVERRIDES```. This algorithm prioritizes ```deny``` decisions over ```permit```. 

Now restart the application, authenticate with any user and again try to access [http://localhost:8080/api/books/1](http://localhost:8080/api/books/1).

The application denies access and the log will look similar to this (remember, the line order may vary):

```
 nericInMemoryIndexedPolicyRetrievalPoint :   |- Matching documents:
 nericInMemoryIndexedPolicyRetrievalPoint :   |  * 'permit all'
 nericInMemoryIndexedPolicyRetrievalPoint :   |  * 'deny all'
 i.s.g.s.i.CombiningAlgorithmImplCustom   :   |- Evaluate: permit all 
 i.s.grammar.sapl.impl.PolicyImplCustom   :   |  |- Evaluate 'permit all'
 i.s.g.s.i.CombiningAlgorithmImplCustom   :   |- Evaluate: deny all 
 i.s.grammar.sapl.impl.PolicyImplCustom   :   |  |- Evaluate 'deny all'
 i.s.grammar.sapl.impl.PolicyImplCustom   :   |     |- PERMIT 'permit all': AuthorizationDecision(decision=PERMIT, resource=Optional.empty, obligations=Optional.empty, advice=Optional.empty)
 i.s.grammar.sapl.impl.PolicyImplCustom   :   |     |- DENY 'deny all': AuthorizationDecision(decision=DENY, resource=Optional.empty, obligations=Optional.empty, advice=Optional.empty)
 enyOverridesCombiningAlgorithmImplCustom :   | |-- DENY Combined AuthorizationDecision: AuthorizationDecision(decision=DENY, resource=Optional.empty, obligations=Optional.empty, advice=Optional.empty)
 s.s.m.b.PreEnforcePolicyEnforcementPoint :   AuthzDecision    : AuthorizationDecision(decision=DENY, resource=Optional.empty, obligations=Optional.empty, advice=Optional.empty)
```

As expected, the combining algorithm gave precedence to the ```deny``` decision.

Finally, rename ```deny_all.sapl``` to ```deny_all.sapl.off``` and ```permit_all.sapl``` to ```permit_all.sapl.off```. Now access to the book should be denied, as the PDP only loads documents with the ```.sapl```suffix.

The log now reads like this:

```
 nericInMemoryIndexedPolicyRetrievalPoint :   |- Matching documents: NONE
 s.s.m.b.PreEnforcePolicyEnforcementPoint : AuthzDecision    : AuthorizationDecision(decision=NOT_APPLICABLE, resource=Optional.empty, obligations=Optional.empty, advice=Optional.empty)
```

The PDP returns ```not applicable``` because it did not find a document making a decision explicitly, and ```deny-overrides``` does not have a default decision. The PDP may also return ```indeterminate``` if an error occurred during policy evaluation. In both cases, a PEP must not grant access.

In this section, you learned how a PEP and PDP interact in SAPL and how the PDP combines outcomes of different policies. In the next step, you will learn how to write more practical policies and when precisely a policy is *applicable*, i.e., matches, for an authorization subscription. 

### Create Domain-Specific Policies

In this step, you will build the application and configuration. You can also download the tutorial application in this stage from GitHub [here](https://github.com/heutelbeck/sapl-tutorial-01-spring/tree/f7d636de156674c2a3e15dbbe6a1160c5217008b).

First, add a PEP to the ```findAll``` method of the ```BookRepository```:
```Java
public interface BookRepository {

    @PreEnforce
    Iterable<Book> findAll();

    @PreEnforce
    Optional<Book> findById(Long id);

    Book save(Book entity);
}
```


Let us write a policy that states, "only bob may see individual book entries." Note that this kind of statement is a requirement also called a *natural language policy (NLP)*. Create the policy document ```permit_bob_for_books.sapl``` in the policies folder of the resources. And translate the NLP to a SAPL policy document as follows:

```
policy "only bob may see individual book entries"
permit action.java.name == "findById" & action.java.declaringTypeName =~ ".*BookRepository$"
where
  subject.name == "bob";
```

Now restart, log in as Bob, and try to access [http://localhost:8080/api/books/1](http://localhost:8080/api/books/1).

Access will be granted and the log reads:

```
 nericInMemoryIndexedPolicyRetrievalPoint :   |- Matching documents:
 nericInMemoryIndexedPolicyRetrievalPoint :   |  * 'only bob may see individual book entries'
 i.s.g.s.i.CombiningAlgorithmImplCustom   :   |- Evaluate: only bob may see individual book entries 
 i.s.grammar.sapl.impl.PolicyImplCustom   :   |  |- Evaluate 'only bob may see individual book entries'
 i.s.grammar.sapl.impl.PolicyImplCustom   :   |     |- PERMIT 'only bob may see individual book entries': AuthorizationDecision(decision=PERMIT, resource=Optional.empty, obligations=Optional.empty, advice=Optional.
 enyOverridesCombiningAlgorithmImplCustom : | |-- PERMIT Combined AuthorizationDecision: AuthorizationDecision(decision=PERMIT, resource=Optional.empty, obligations=Optional.empty, advice=Optional.empty)
 s.s.m.b.PreEnforcePolicyEnforcementPoint : AuthzDecision    : AuthorizationDecision(decision=PERMIT, resource=Optional.empty, obligations=Optional.empty, advice=Optional.empty)
```

Now access the list of books: [http://localhost:8080/api/books](http://localhost:8080/api/books).

The application grants access, and the log reads:

```
 nericInMemoryIndexedPolicyRetrievalPoint :   |- Matching documents: NONE
 s.s.m.b.PreEnforcePolicyEnforcementPoint : AuthzDecision    : AuthorizationDecision(decision=NOT_APPLICABLE, resource=Optional.empty, obligations=Optional.empty, advice=Optional.empty)
```

Now go to [http://localhost:8080/logout](http://localhost:8080/logout) and log out. Then log in as Zoe and try to access [http://localhost:8080/api/books/1](http://localhost:8080/api/books/1).

The application denies access, and the log reads:

```
 nericInMemoryIndexedPolicyRetrievalPoint :   |- Matching documents:
 nericInMemoryIndexedPolicyRetrievalPoint :   |  * 'only bob may see individual book entries'
 i.s.g.s.i.CombiningAlgorithmImplCustom   :   |- Evaluate: only bob may see individual book entries 
 i.s.grammar.sapl.impl.PolicyImplCustom   :   |  |- Evaluate 'only bob may see individual book entries'
 i.s.grammar.sapl.impl.PolicyImplCustom   :   |     |- NOT_APPLICABLE 'only bob may see individual book entries': AuthorizationDecision(decision=NOT_APPLICABLE, resource=Optional.empty, obligations=Optional.empty, 
 enyOverridesCombiningAlgorithmImplCustom : | |-- NOT_APPLICABLE Combined AuthorizationDecision: AuthorizationDecision(decision=NOT_APPLICABLE, resource=Optional.empty, obligations=Optional.empty, advice=Optional.
 s.s.m.b.PreEnforcePolicyEnforcementPoint : AuthzDecision    : AuthorizationDecision(decision=NOT_APPLICABLE, resource=Optional.empty, obligations=Optional.empty, advice=Optional.empty)
```

As you can see, there are several differences in the decision-making process of the PDP. First, let us examine what leads to the fact that there are no applicable (matching) documents when accessing ```/api/books```.

If you look at the policy, there is an expression following the entitlement ```permit``` that states ```action.java.name == "findById" & action.java.declaringTypeName =~ ".*BookRepository$"``` and ends before the (optional) keyword ```where```.
An expression at this position in a policy is called the *target expression*. 
The target expression is a rule which determines if the policy is applicable to a given authorization subscription. 
A policy is applicable if the expression evaluates to ```true``` for the given subscription. 
The PDP only evaluates applicable policies. 
As seen with the permit all example, if the target expression is missing, the policy is always considered applicable.
Also, the PDP only evaluates the remaining rules following the ```where``` keyword for applicable policies.

In this case, the target expression examines two attributes of the action. It validates, if ```action.java.name``` is equal to ```"findById"``` and if ```action.java.declaringTypeName``` matches the regular expression ```".*BookRepository$"```, i.e., the attribute string ends with ```BookRepository```, using the regex comparison operator ```=~```. 

These expressions explain why the PDP identified the policy as applicable in both cases attempting to access a single book. Still, it did not find an applicable policy when accessing the book collection.

Please note that SAPL distinguishes between lazy Boolean operators, i.e., ```&&``` and ```||``` for AND and OR, and eager Boolean operators ```&``` and ```|``` respectively. Target expressions only allow eager operators, a requirement for efficient indexing of larger sets of policies.

The PDP evaluates the complete policy in the two cases where the user attempts to access the individual book, i.e., the rules following ```where``` are evaluated. This section of the policy is called the **where block**. 
The where contains an arbitrary number of rules. Each rule is a Boolean expression ending with a ```;```. The where block as a whole evaluates to ```true``` when all of its rules evaluate to true. Rules are evaluated lazily from top to bottom. 

In the situations above, the rule ```subject.name == "bob";``` is only ```true``` for the case where bob is accessing the book. 

In this section, you have learned when a SAPL document is applicable, the purpose of the target expression, and what the where block of a policy is. 

Next, you will learn how to customize the authorization subscription and use temporal functions to only grant access to age-appropriate books.

### Enforce the Age Rating of individual Books

First, in preparation, deactivate all existing policies in your project by deleting or appending the ```.off``` suffix to the filename.

The goal of this section is only to grant access to books appropriate for the user's age. To make this decision, the PDP needs the birthdate of the user (attribute of the subject), the age rating of the book (attribute of the resource), and the current date (attribute of the environment).
When you examine the authorization subscription sent in the previous examples, you will notice that only the user's birth date is currently available in the subscription. How can we make the other attributes available for the PDP in the policies?

Generally, there are two potential sources for attributes: the authorization subscription or Policy Information Points (PIPs). 

Consider the age rating of the book. This information is not known to the PEP before executing the query. Therefore, in the ```BookRepository```, replace the ```@PreEnforce``` on ```findById``` with a ```@PostEnforce``` annotation as follows:

```Java
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
* First invoke the method.
* Construct a custom authorization subscription with [Spring Expression Language (SpEL)](https://docs.spring.io/spring-framework/docs/current/reference/html/core.html#expressions).
* Subscribe to the PDP with the custom authorization subscription.
* Enforce the decision.

When we inspected the original automatically generated authorization subscription, you will remember that the resulting object was relatively large and technical. 
Here, the parameters of the ```@PostEnforce``` annotation help create a more domain-specific precise authorization subscription.

The parameter ```subject = "authentication.getPrincipal()"``` extracts the principal object from the authentication object and uses it as the subject-object in the subscription.

The parameter ```action = "'read book'"``` sets the action-object in the subscription to the string constant ```read book```. 

Finally, the parameter ```resource = "returnObject"``` sets the resource-object in the subscription to the method invocation result. 
As this resource is the book entity, it will automatically contain its ```ageRating``` attribute.

After identifying these objects, the PEP uses the ```ObjectMapper``` in the Spring application context to serialize the objects to JSON. 

The resulting authorization subscription will look similar to this:

```json
{
    "subject": {
        "username": "zoe",
        "birthday": "2005-07-11",
        "authorities": [],
        "accountNonExpired": true,
        "accountNonLocked": true,
        "credentialsNonExpired": true,
        "enabled": true
    },
    "action": "read book",
    "resource": {
        "id": 1,
        "name": "Clifford: It's Pool Time!",
        "ageRating": 0
    }
}
```

This authorization subscription is much more manageable and practical than the automatic guesswork the Spring integration performs without any customization.

The policy we will write to enforce the book age restriction will introduce a number of new concepts:
* definition of local attribute variables
* usage of policy information points
* function libraries
* logging for debugging policy information

```
policy "check age" 
permit action == "read book"
where 
   var birthday    = log.infoSpy("birthday     : ", subject.birthday);
   var today       = log.infoSpy("today        : ", time.dateOf(|<time.now>));
   var age         = log.infoSpy("age          : ", time.timeBetween(birthday, today, "years"));
   var ageRating   = log.infoSpy("age rating   : ", resource.ageRating);
                     log.infoSpy("is older     : ", age >= ageRating );
```

In its target expression, the policy ```check age``` scopes its applicability to all authorization subscriptions with the action ```read book```.

In the first line of the ```where``` block, using the ```var``` keyword, the policy defines a local attribute variable named ```birthday``` and assigns it to the ```subject.birthday``` attribute. While doing so, the expression ```subject.birthday``` is wrapped in a function call. The function ```log.infoSpy``` is a utility function, logging its parameter to the console using the log level ```INFO```. The function is the identity function with the logging as a side-effect. Similar functions exist for other log levels. The logging function library also contains functions like ```log.debug```, without the ```Spy``` which logs their parameter and always returns ```true```. These log functions can be used as single rule lines in a ```where``` block. 

The second line of the ```where``` block assigns the current date to the variable ```today```. 
In SAPL, angled brackets ```<ATTRIBUTE_IDENTIFIER>``` always denotes an attribute stream, a subscription to an external attribute source, using a Policy Information Point (PIP). 
In this case, the identifier ```time.now``` is used to access the current time in UTC from the system clock. 
In this scenario, we do not need the streaming nature of the time, and we are only interested in the first event in the attribute stream. Prepending the pipe symbol to the angled brackets ```|<>``` only takes the head element, i.e., the first event in the attribute stream, and then unsubscribes from the PIP. The time libraries in SAPL use ISO 8601 strings to represent time. The function ```time.dateOF``` is then used to extract the date component of the timestamp retrieved from the PIP.

Then, the policy calculates the subject's age using the function ```time.timeBetween```. And the ```ageRating``` of the book is stored in the matching variable.

Note that the engine evaluates variable assignment rules from top to bottom. And each rule has access to variables defined above it. Also, these assignment rules always evaluate to ```true``` unless an error occurs during evaluation.

Finally, the ```age``` is compared with the ```ageRating``` and the policy returns true if the subject's age is above the book's age rating.

For example, if you log in as Zoe and access the first book, the logs will read similar to this:

```
 nericInMemoryIndexedPolicyRetrievalPoint :   |- Matching documents:
 nericInMemoryIndexedPolicyRetrievalPoint :   |  * 'check age'
 i.s.g.s.i.CombiningAlgorithmImplCustom   :   |- Evaluate: check age 
 i.s.grammar.sapl.impl.PolicyImplCustom   :   |  |- Evaluate 'check age'
 i.sapl.functions.LoggingFunctionLibrary  :   |     [LOG] birthday     :  "2005-07-11"
 i.sapl.functions.LoggingFunctionLibrary  :   |     [LOG] today        :  "2022-07-31"
 i.sapl.functions.LoggingFunctionLibrary  :   |     [LOG] age          :  17
 i.sapl.functions.LoggingFunctionLibrary  :   |     [LOG] age rating   :  0
 i.sapl.functions.LoggingFunctionLibrary  :   |     [LOG] is older     :  true
 i.s.grammar.sapl.impl.PolicyImplCustom   :   |     |- PERMIT 'check age': AuthorizationDecision(decision=PERMIT, resource=Optional.empty, obligations=Optional.empty, advice=Optional.empty)
 enyOverridesCombiningAlgorithmImplCustom : | |-- PERMIT Combined AuthorizationDecision: AuthorizationDecision(decision=PERMIT, resource=Optional.empty, obligations=Optional.empty, advice=Optional.empty)
```

However, if Alice attempts to access book four, access will be denied because the policy is not applicable, i.e., not all rules evaluate ```true```:

```
 nericInMemoryIndexedPolicyRetrievalPoint :   |- Matching documents:
 nericInMemoryIndexedPolicyRetrievalPoint :   |  * 'check age'
 i.s.g.s.i.CombiningAlgorithmImplCustom   :   |- Evaluate: check age 
 i.s.grammar.sapl.impl.PolicyImplCustom   :   |  |- Evaluate 'check age'
 i.sapl.functions.LoggingFunctionLibrary  :   |     [LOG] birthday     :  "2019-07-11"
 i.sapl.functions.LoggingFunctionLibrary  :   |     [LOG] today        :  "2022-07-31"
 i.sapl.functions.LoggingFunctionLibrary  :   |     [LOG] age          :  3
 i.sapl.functions.LoggingFunctionLibrary  :   |     [LOG] age rating   :  14
 i.sapl.functions.LoggingFunctionLibrary  :   |     [LOG] is older     :  false
 i.s.grammar.sapl.impl.PolicyImplCustom   :   |     |- NOT_APPLICABLE 'check age': AuthorizationDecision(decision=NOT_APPLICABLE, resource=Optional.empty, obligations=Optional.empty, advice=Optional.empty)
 enyOverridesCombiningAlgorithmImplCustom : | |-- NOT_APPLICABLE Combined AuthorizationDecision: AuthorizationDecision(decision=NOT_APPLICABLE, resource=Optional.empty, obligations=Optional.empty, advice=Optional.
```

The policy can be written more compact without logging and using an ```import``` statement:

```
import time.*
policy "check age compact" 
permit action == "read book"
where 
   var age = timeBetween(subject.birthday, dateOf(|<now>), "years");
   age >= resource.ageRating;
```

You can download a project version with the age enforcement in place from [GitHub](https://github.com/heutelbeck/sapl-tutorial-01-spring/tree/0e154a6a92765dad32882c0a5a082b344730c7d7).

## How to use SAPL Policies to Transform a Resource ?

In this part of the tutorial, you will learn how to use policies to change the outcome of queries and how to trigger side effects using constraints.

To have some more data to work with, first, extend the domain model by adding some content to the books:

```Java
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

Also, extend the ```DemoData``` accordingly:

```Java
bookRepository.save(new Book(1L, "Clifford: It's Pool Time!", 0, "*Woof*"));
bookRepository.save(new Book(2L, "The Rescue Mission: (Pokemon: Kalos Reader #1)", 4, "Gotta catch 'em all!"));
bookRepository.save(new Book(3L, "Dragonlance Chronicles Vol. 1: Dragons of Autumn Twilight", 9, "Some fantasy story."));
bookRepository.save(new Book(4L, "The Three-Body Problem", 14, "Space is scary."));
```

We want to change the policies of the library in a way that users not meeting the age requirement do not get their access denied. 
Instead, only the contents of the book should be blackened. Add the following policy, ```check_age_transform.sapl``` to the application's policies:

```
import time.*
policy "check age transform" 
permit action == "read book"
where 
   var age = timeBetween(subject.birthday, dateOf(|<now>), "years");
   age < resource.ageRating;
transform
   resource |- {
        @.content : filter.blacken(3,0,"\u2588")
   }
```

This policy introduces a new concept, i.e., the ```transform``` expression. 
If the policy is applicable, i.e., all rules evaluate to ```true```, whatever 
JSON value the ```transform``` expression evaluates to is added to authorization 
decision as the property ```resource``` and is sent back to the PEP. 
The presence of a ```resource``` object instructs the PEP to replace the resource data with itself.

In this case, the so-called filter operator ```|-``` is applied to the resource object. 
The filter operator enables to select indivividual parts of a JSON value and to manipulate this 
part by, e.g., applying function to the selected value. 
In this case, the operator selects the ```content``` key of the resource and replaces it with a 
version of its content only exposing the the three leftmost characters and replacing the rest with 
a black square ("\u2588" in unicode). 
The selection expression is very powerful. 
Please refer to the [SAPL Documentation](/docs/2.1.0-SNAPSHOT/sapl-reference.html#filtering) for a full explanation.

Ensure that the original age checking policy is still in place. Now, restart and log in as Alice. 

When accessing ```http://localhost:8080/api/books/1```, you will get:

```JSON
{
    "id"        : 1,
    "name"      : "Clifford: It's Pool Time!",
    "ageRating" : 0,
    "content"   : "*Woof*"
}
```

But of course, because Alice is only three years old, the content of the age-inappropriate book ```http://localhost:8080/api/books/4``` will be blackened:
```JSON
{
    "id"        : 4,
    "name"      : "The Three-Body Problem",
    "ageRating" : 0,
    "content"   : "Spa████████████"
}
```

The logs for this access attempt read as follows:

```
 nericInMemoryIndexedPolicyRetrievalPoint :   |- Matching documents:
 nericInMemoryIndexedPolicyRetrievalPoint :   |  * 'check age compact'
 nericInMemoryIndexedPolicyRetrievalPoint :   |  * 'check age transform'
 i.s.g.s.i.CombiningAlgorithmImplCustom   :   |- Evaluate: check age compact 
 i.s.grammar.sapl.impl.PolicyImplCustom   :   |  |- Evaluate 'check age compact'
 i.s.g.s.i.CombiningAlgorithmImplCustom   :   |- Evaluate: check age transform 
 i.s.grammar.sapl.impl.PolicyImplCustom   :   |  |- Evaluate 'check age transform'
 i.s.grammar.sapl.impl.PolicyImplCustom   :   |     |- NOT_APPLICABLE 'check age compact': AuthorizationDecision(decision=NOT_APPLICABLE, resource=Optional.empty, obligations=Optional.empty, advice=Optional.empty)
 i.s.grammar.sapl.impl.PolicyImplCustom   :   |     |- PERMIT 'check age transform': AuthorizationDecision(decision=PERMIT, resource=Optional[{"id":4,"name":"The Three-Body Problem","ageRating":14,"content":"Spa████████████"}], obligations=Optional.empty, advice=Optional.empty)
 enyOverridesCombiningAlgorithmImplCustom : | |-- PERMIT Combined AuthorizationDecision: AuthorizationDecision(decision=PERMIT, resource=Optional[{"id":4,"name":"The Three-Body Problem","ageRating":14,"content":"Spa████████████"}], obligations=Optional.empty, advice=Optional.empty)
```

The PRP discovered both polices to be matching the subscription. 
The PDP starts to evaluate both and the ```check age compact``` policy evaluats to ```NOT_APPLICABLE```, because Alice is not old enough to read "The Three-Body Problem". 
At the same time, the ```check age transform``` policy evaluates to ```permit```. 
However, the authorization decision also contains a ```resource``` object. 
Thus, the PEP replaced the value returned by the modified ```resource``` object.

## How to enforce Obligations and Advice of SAPL Policies?

The ```transform``` expression of SAPL policies is a first example of a policy that instructs the PEP to only grant access once additional conditions are met. SAPL call this type of instructions *constraints*. SAPL supports three types of constraints:
* *obligations*, i.e., a mandatory constranit that must be fulfilled, i.e., the PEP must successfully execute the instruction, or else the PEP must deny access.
* *advice*, i.e., am optional constraint that should be fulfilled, i.e., the PEP should make a best effort to execute the instruction. However if it fails to do so, access is still franted, if the original decision was ```permit```.
* *resource replacement*, i.e., a special case of an obligation expressing that the accessed resource must be replaced with the data supplied in the authorization decision.

An authorization decision containing a constraint expresses that the access should be granted (or denied) only when obligations fulfilled sucessfully.

For example, any doctor may access a patient's medical record in an emergency situation, but the access must be logged if the doctor is not the attending doctor of the patient in question, and an audit process has to be triggered. This is the so-called "breaking the glass scenario".

In the library example, access age-inappropriate books must be logged in order to enable parents to discuss the accessed material later.

To do so, modify the ```check_age_transform.sapl``` policy as follows:

```
import time.*
policy "check age transform" 
permit action == "read book"
where 
   var age = timeBetween(subject.birthday, dateOf(|<now>), "years");
   age < resource.ageRating;
obligation {
				"type": "logAccess",
				"message": "Attention, "+subject.username+" accessed the book '"+resource.name+"'."
           }
transform
   resource |- {
        @.content : filter.blacken(3,0,"\u2588")
   }
```

When logging in as Alice and attempting to access ```http://localhost:8080/api/books/2``` access will be denied and the logs look as follows:

```
2022-08-02 01:09:05.780 DEBUG 80816 --- [nio-8080-exec-1] nericInMemoryIndexedPolicyRetrievalPoint :   |- Matching documents:
2022-08-02 01:09:05.780 DEBUG 80816 --- [nio-8080-exec-1] nericInMemoryIndexedPolicyRetrievalPoint :   |  * 'check age compact'
2022-08-02 01:09:05.780 DEBUG 80816 --- [nio-8080-exec-1] nericInMemoryIndexedPolicyRetrievalPoint :   |  * 'check age transform'
2022-08-02 01:09:05.780 DEBUG 80816 --- [nio-8080-exec-1] i.s.g.s.i.CombiningAlgorithmImplCustom   :   |- Evaluate: check age compact 
2022-08-02 01:09:05.780 DEBUG 80816 --- [nio-8080-exec-1] i.s.grammar.sapl.impl.PolicyImplCustom   :   |  |- Evaluate 'check age compact'
2022-08-02 01:09:05.780 DEBUG 80816 --- [nio-8080-exec-1] i.s.g.s.i.CombiningAlgorithmImplCustom   :   |- Evaluate: check age transform 
2022-08-02 01:09:05.780 DEBUG 80816 --- [nio-8080-exec-1] i.s.grammar.sapl.impl.PolicyImplCustom   :   |  |- Evaluate 'check age transform'
2022-08-02 01:09:05.781 DEBUG 80816 --- [nio-8080-exec-1] i.s.grammar.sapl.impl.PolicyImplCustom   :   |     |- NOT_APPLICABLE 'check age compact': AuthorizationDecision(decision=NOT_APPLICABLE, resource=Optional.empty, obligations=Optional.empty, advice=Optional.empty)
2022-08-02 01:09:05.782 DEBUG 80816 --- [nio-8080-exec-1] i.s.grammar.sapl.impl.PolicyImplCustom   :   |     |- PERMIT 'check age transform': AuthorizationDecision(decision=PERMIT, resource=Optional[{"id":2,"name":"The Rescue Mission: (Pokemon: Kalos Reader #1)","ageRating":4,"content":"Got█████████████████"}], obligations=Optional[[{"type":"logAccess","message":"Attention, alice accessed the book 'The Rescue Mission: (Pokemon: Kalos Reader #1)'."}]], advice=Optional.empty)
2022-08-02 01:09:05.782 DEBUG 80816 --- [nio-8080-exec-1] enyOverridesCombiningAlgorithmImplCustom : | |-- PERMIT Combined AuthorizationDecision: AuthorizationDecision(decision=PERMIT, resource=Optional[{"id":2,"name":"The Rescue Mission: (Pokemon: Kalos Reader #1)","ageRating":4,"content":"Got█████████████████"}], obligations=Optional[[{"type":"logAccess","message":"Attention, alice accessed the book 'The Rescue Mission: (Pokemon: Kalos Reader #1)'."}]], advice=Optional.empty)
2022-08-02 01:09:05.782 DEBUG 80816 --- [nio-8080-exec-1] .s.m.b.PostEnforcePolicyEnforcementPoint : AuthzDecision    : AuthorizationDecision(decision=PERMIT, resource=Optional[{"id":2,"name":"The Rescue Mission: (Pokemon: Kalos Reader #1)","ageRating":4,"content":"Got█████████████████"}], obligations=Optional[[{"type":"logAccess","message":"Attention, alice accessed the book 'The Rescue Mission: (Pokemon: Kalos Reader #1)'."}]], advice=Optional.empty)
```

The PDP clearly communicated a ```permit``` decision containing the two constraints to replace the resource and to log the access to the console. 
The PEP failed to enforce the logging obligation and thus denied access. 

In SAPL, constraints may be expressed as arbritary JSON objects. Also, SAPL does not know which types of constraints may be relevant in an application domain and how policies decide to describe them.

To support the logging obligation, implement a so-called *constraint handler provider*:

```Java
@Slf4j
@Service
public class LoggingConstraintHandlerProvider implements RunnableConstraintHandlerProvider {

	@Override
	public Signal getSignal() {
		return Signal.ON_DECISION;
	}

	@Override
	public boolean isResponsible(JsonNode constraint) {
		return constraint != null && constraint.has("type")
				&& "logAccess".equals(constraint.findValue("type").asText());
	}

	@Override
	public Runnable getHandler(JsonNode constraint) {
		return () -> log.info(constraint.findValue("message").asText());

	}

}
```

## Conclusions

