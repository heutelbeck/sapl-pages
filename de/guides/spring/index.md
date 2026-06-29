---
layout: sapl
lang: de
ref: spring-guide
title: "Spring Security mit SAPL: SAPL Guides"
description: "Spring Boot Anwendung mit SAPL und attributbasierter Zugriffskontrolle absichern. Methodenschutz, Altersfreigaben, Transformationen, Obligations und Policy Sets."
permalink: /de/guides/spring/
sitemap: false
robots: noindex,nofollow
---

## Spring Boot Methodensicherheit mit SAPL

Dieser Guide zeigt, wie eine Spring Boot Anwendung mit SAPL abgesichert wird. Sie ergaenzen Policy basierte Autorisierung fuer JPA Repository Methoden, schreiben Policies fuer Altersfreigaben, transformieren Rueckgabewerte und filtern Ergebnislisten anhand von Benutzerattributen.

Der Guide setzt Grundkenntnisse in Spring Boot voraus. Hintergrund zu ABAC und SAPL finden Sie in der [Dokumentation](https://sapl.io/docs/latest/).

Der komplette Quellcode ist unter [github.com/heutelbeck/sapl-tutorial-01-spring](https://github.com/heutelbeck/sapl-tutorial-01-spring) verfuegbar.

## Projekt Setup

Erstellen Sie zuerst eine einfache Spring Boot Anwendung. Oeffnen Sie [Spring Initializr](https://start.spring.io/) und fuegen Sie diese Abhaengigkeiten hinzu:

* **Spring Web** fuer die REST API
* **Spring Data JPA** fuer das Domaenenmodell
* **H2 Database** als einfache In Memory Datenbank
* **Lombok** zur Reduzierung von Boilerplate Code
* **Spring Boot DevTools** fuer den Entwicklungsablauf

Verwenden Sie Maven als Build Tool und Java als Sprache.

Waehlen Sie Java 21 und Spring Boot 4.1.0 oder neuer.

![Spring Initializr](/assets/guides/spring/spring_initializr.webp)

Laden Sie das Projekt herunter, entpacken Sie es und importieren Sie es in Ihre IDE.

### SAPL Abhaengigkeiten

SAPL stellt ein Bill of Materials Modul bereit. Damit muessen Sie die Versionen der einzelnen SAPL Module nicht separat angeben:

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

Fuegen Sie anschliessend den SAPL Spring Boot Starter hinzu:

```xml
    <dependency>
        <groupId>io.sapl</groupId>
        <artifactId>sapl-spring-boot-starter</artifactId>
    </dependency>
```

Freigegebene SAPL Versionen sind ueber Maven Central verfuegbar. Fuer nicht freigegebene Builds kann das Central Portal Snapshot Repository zusammen mit der passenden `x.y.z-SNAPSHOT` Version verwendet werden.

Dieses Beispiel verwendet Spring Boot 4.1.0 und SAPL 4.1.1. Spring Boot und SAPL Versionen sind nicht gekoppelt.

Fuer den Argon2 Password Encoder wird zusaetzlich Bouncy Castle benoetigt:

```xml
    <dependency>
        <groupId>org.bouncycastle</groupId>
        <artifactId>bcpkix-jdk18on</artifactId>
        <version>1.84</version>
    </dependency>
```

Legen Sie unter `src/main/resources` einen Ordner `policies` an und erstellen Sie dort `pdp.json`:

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

## Domaenenmodell

Die Anwendung modelliert eine kleine Bibliothek. Buecher haben eine Altersfreigabe und koennen nur vollstaendig gelesen werden, wenn der angemeldete Benutzer alt genug ist.

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

Das Repository wird spaeter mit SAPL Annotationen abgesichert:

```java
public interface BookRepository {

    List<Book> findAll();

    Optional<Book> findById(Long id);

    Book save(Book entity);
}
```

Das Spring Data Repository implementiert die Methoden:

```java
public interface JpaBookRepository extends BookRepository, ListCrudRepository<Book, Long> {
}
```

## Benutzer und Security Konfiguration

Die Beispielanwendung verwendet drei Benutzer mit unterschiedlichen Altersstufen. Das Geburtsdatum wird als Attribut des Subjects an die Policy Entscheidung uebergeben.

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

Aktivieren Sie Spring Security und SAPL Method Security in einer Konfigurationsklasse:

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

## Erste Policy Enforcement Points

SAPL fuegt Policy Enforcement Points mit Annotationen an Methoden oder Klassen an. Fuer den Zugriff auf einzelne Buecher wird `@PostEnforce` verwendet, da die Altersfreigabe erst nach dem Laden des Buches bekannt ist:

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

`subject` extrahiert den angemeldeten Benutzer aus der Spring Security Authentifizierung. `action` setzt einen fachlichen Aktionsnamen. `resource` verweist bei `findById` auf das geladene Buch.

## Altersfreigabe fuer einzelne Buecher

Eine einfache Policy erlaubt den Zugriff, wenn der Benutzer alt genug ist:

```sapl
import time.timeBetween
import time.dateOf
policy "check age"
permit
    action == "read book";
    var age = timeBetween(subject.birthday, dateOf(|<time.now>), "years");
    age >= resource.ageRating;
```

Wenn der Benutzer zu jung ist, kann SAPL die Ressource auch transformieren. In diesem Beispiel wird der Inhalt nach den ersten drei Zeichen geschwaerzt und eine Logging Obligation angehaengt:

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

Damit die Logging Obligation verarbeitet werden kann, wird ein Constraint Handler Provider registriert:

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

## Listen filtern

Fuer `findAll` wird vor dem Methodenaufruf entschieden. Die Policy erlaubt den Aufruf und gibt eine Obligation zur Filterung der Rueckgabe mit:

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

Der eingebaute `ContentFilterPredicateProvider` filtert die Rueckgabeliste so, dass nur altersgerechte Buecher sichtbar bleiben.

## Policy Set

Zum Abschluss koennen die beiden Policies fuer einzelne Buecher in einem Policy Set zusammengefasst werden:

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

Das Policy Set verwendet `first or abstain errors propagate`. Sobald eine innere Policy anwendbar ist, bestimmt sie das Ergebnis des Sets.

## Erwartetes Verhalten

Nach dem Aufbau der Anwendung ergeben sich diese Kernfaelle:

* Anonyme Benutzer werden auf die Login Seite umgeleitet.
* Bob sieht in der Liste nur Buecher mit Altersfreigabe bis 10.
* Alice sieht in der Liste nur das Buch mit Altersfreigabe 0.
* Zoe kann alle einzelnen Buecher vollstaendig lesen.
* Bob und Alice erhalten bei zu hoher Altersfreigabe geschwaerzten Inhalt.

Die englische Version enthaelt die vollstaendige Schrittfolge mit zusaetzlichen Erklaerungen und Logausgaben.
