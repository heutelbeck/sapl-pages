---
layout: sapl
lang: de
ref: spring-guide
title: "Spring Security mit SAPL: SAPL Guides"
description: "Sichern Sie eine Spring Boot Anwendung mit attributbasierter Zugriffskontrolle durch SAPL ab. Autorisierung auf Methodenebene, altersbasierte Policies, Inhaltstransformation, Obligations und Policy Sets."
permalink: /de/guides/spring/
sitemap: false
robots: noindex,nofollow
---

## Methodensicherheit in Spring Boot mit SAPL

Dieser Guide führt Sie durch die Absicherung einer Spring Boot Anwendung mit SAPL. Sie ergänzen JPA-Repository-Methoden um Policy-basierte Autorisierung, schreiben Policies zur Durchsetzung von Altersbeschränkungen, transformieren und filtern Abfrageergebnisse anhand von Benutzerattributen und implementieren Constraint Handler für Obligations.

Der Guide setzt grundlegende Kenntnisse in Spring Boot voraus. Hintergrundinformationen zu ABAC-Konzepten und zur Architektur von SAPL finden Sie in der [Dokumentation](https://sapl.io/docs/latest/).

Der vollständige Quellcode ist unter [github.com/heutelbeck/sapl-tutorial-01-spring](https://github.com/heutelbeck/sapl-tutorial-01-spring) verfügbar.

## Projekt einrichten

Erstellen Sie zuerst eine einfache Spring Boot Anwendung. Öffnen Sie [Spring Initializr](https://start.spring.io/) und fügen Sie die folgenden Abhängigkeiten hinzu:

* **Spring Web** (stellt eine REST API zum Testen Ihrer Anwendung bereit)
* **Spring Data JPA** (zur Entwicklung des Domänenmodells Ihrer Anwendung)
* **H2 Database** (als einfache In-Memory-Datenbank zur Unterstützung der Anwendung)
* **Lombok** (zur Vermeidung von Boilerplate Code)
* **Spring Boot DevTools** (zur Verbesserung des Entwicklungsprozesses)

Dieses Tutorial verwendet Maven als Build Tool und Java als Programmiersprache.

Wählen Sie im Initializr Java 21 und Spring Boot 4.1.0 oder neuer aus.

Ihre Initializr-Einstellungen sollten nun ungefähr so aussehen:

![Spring Initializr](/assets/guides/spring/spring_initializr.webp)

Klicken Sie auf "GENERATE." Ihr Browser lädt die Projektvorlage als ".zip"-Datei herunter.

Entpacken Sie das Projekt und importieren Sie es in Ihre bevorzugte IDE.

### SAPL Abhängigkeiten hinzufügen

SAPL stellt ein Bill of Materials Modul bereit, das die Versionen der SAPL Module kompatibel hält. Nachdem Sie den folgenden Block zu Ihrer `pom.xml` hinzugefügt haben, müssen Sie die `<version>` der einzelnen SAPL Abhängigkeiten nicht angeben:

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

Eine Anwendung, die SAPL verwendet, benötigt einen Policy Decision Point (PDP) und einen oder mehrere Policy Enforcement Points (PEPs). Der PDP trifft Autorisierungsentscheidungen. Sie können ihn in Ihre Anwendung einbetten oder als dedizierten Server betreiben und Entscheidungen an diesen entfernten Dienst delegieren. Dieses Tutorial verwendet einen eingebetteten PDP, der Entscheidungen lokal anhand von Policies trifft, die in den Anwendungsressourcen gespeichert sind. SAPL integriert sich außerdem in Spring Security, sodass Sie PEPs mit Annotationen auf Spring Beans deklarieren können. Fügen Sie Ihrem Projekt die folgende Starter-Abhängigkeit hinzu:

```xml
    <dependency>
        <groupId>io.sapl</groupId>
        <artifactId>sapl-spring-boot-starter</artifactId>
    </dependency>
```

Veröffentlichte SAPL Versionen sind über Maven Central verfügbar. Für unveröffentlichte Builds fügen Sie das Central Portal snapshots repository hinzu und verwenden die passende Version `x.y.z-SNAPSHOT`.

Das aktuelle Beispiel verwendet Spring Boot 4.1.0 und SAPL 4.1.1. Spring Boot und SAPL Versionen sind nicht gekoppelt.

Um den Argon2 Password Encoder zu verwenden, fügen Sie die folgende Abhängigkeit hinzu:

```xml
    <dependency>
        <groupId>org.bouncycastle</groupId>
        <artifactId>bcpkix-jdk18on</artifactId>
        <version>1.84</version>
    </dependency>
```

Erstellen Sie unter `src/main/resources` einen Ordner `policies` und erstellen Sie in diesem Ordner anschließend eine Datei namens `pdp.json`:

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

Das Objekt `algorithm` wählt den Combining Algorithm aus, mit dem widersprüchliche Ergebnisse der Policy-Auswertung aufgelöst werden. Die drei Felder steuern voneinander unabhängige Aspekte:

* `votingMode` bestimmt, welcher Entscheidungstyp Priorität hat, wenn sowohl Permit- als auch Deny-Votes vorhanden sind.
* `defaultDecision` ist der Fallback, wenn keine Policy zur Subscription passt.
* `errorHandling` steuert, was bei Fehlern während der Policy-Auswertung geschieht (`PROPAGATE` macht Fehler sichtbar, `ABSTAIN` verwirft sie stillschweigend).

Diese Konfiguration ist bewusst restriktiv: Deny hat Priorität, der Standard ist Deny und Fehler werden weitergegeben. Das ist die Secure-by-Default-Haltung. Sie werden explizite Permit-Policies schreiben, um Zugriff zu gewähren.

Das Verzeichnis `policies` und die Datei `pdp.json` sind erforderlich, damit der eingebettete PDP startet. Ohne sie schlägt der Start der Anwendung fehl.

Sie können die Property `variables` verwenden, um Umgebungsvariablen zu definieren, beispielsweise die Konfiguration von Policy Information Points (PIPs). Alle Policies können auf den Inhalt dieser Variablen zugreifen.

Diese Datei schließt das grundlegende Maven Setup ab. Sie können nun mit der Implementierung der Anwendung beginnen.

## Die Projektdomäne

Die Domäne ist eine Bibliothek, in der Benutzer ein Buch nur ansehen dürfen, wenn sie dessen Mindestalter erfüllen. Wenn Sie bereits mit Spring Boot, JPA und Spring Security vertraut sind, springen Sie direkt zu [Repository-Methoden mit SAPL absichern](#Method-Security).

### Book Entity und Repository definieren

Definieren Sie zuerst eine Book Entity, die eine ID, einen Namen, eine Altersfreigabe und Inhalt enthält. Sie können Lombok Annotationen verwenden, um Getter, Setter und Konstruktoren zu generieren:

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

Definieren Sie ein passendes Repository Interface. Nehmen Sie vorerst nur `findAll`, `findById` und `save` auf:

```java
public interface BookRepository {
    List<Book> findAll();
    Optional<Book> findById(Long id);
    Book save(Book entity);
}
```

Definieren Sie eine passende Repository Bean, damit Spring Data eine Implementierung Ihres Interfaces instanziieren kann:

```java
@Repository
// Important: interface order matters for detecting SAPL annotations.
public interface JpaBookRepository extends BookRepository, ListCrudRepository<Book, Long>  { }
```

Wir verwenden `ListCrudRepository` statt `CrudRepository`, damit `findAll()` eine `List<Book>` statt `Iterable<Book>` zurückgibt. Der Constraint Handler, den wir später zum Filtern von Collections schreiben, benötigt einen erkennbaren Containertyp, auf dem er arbeiten kann.

### Books mit einem REST Controller verfügbar machen

Stellen Sie Bücher über einen einfachen REST Controller bereit. Die Lombok Annotation `@RequiredArgsConstructor` erzeugt einen Konstruktor für die Dependency Injection des Repositorys:

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

### Eine eigene `LibraryUser` Implementierung erstellen

Erweitern Sie nun die Klasse `User` aus `org.springframework.security.core.userdetails`, um eine eigene `LibraryUser` Implementierung zu erstellen, die das Geburtsdatum des Bibliotheksbenutzers enthält.

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

Damit sichergestellt ist, dass die eigene Klasse `LibraryUser` im Security Context gespeichert wird, implementieren Sie einen eigenen `LibraryUserDetailsService`. Für dieses Tutorial genügt ein einfacher In-Memory-`UserDetailsService`:

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

### Eine Konfigurationsklasse erstellen

Erstellen Sie eine Klasse `SecurityConfiguration` mit den Spring Annotationen `@Configuration` und `@EnableWebSecurity`. Diese Klasse stellt Methoden bereit, die im Kontext von Spring Security automatisch verarbeitet werden.

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

### Testdaten beim Anwendungsstart erzeugen

Die Standardkonfiguration mit H2 und JPA erzeugt eine flüchtige In-Memory-Datenbank. Um die Datenbank bei jedem Anwendungsstart zu befüllen, erstellen Sie einen `CommandLineRunner`. Diese Klasse wird einmal ausgeführt, nachdem der Anwendungskontext erfolgreich geladen wurde:

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

Die Anwendungsdomäne ist vollständig, und Sie können die Anwendung testen. Bauen Sie sie mit `mvn clean install` und führen Sie sie anschließend mit `mvn spring-boot:run` auf der Kommandozeile oder mit einer Run Configuration in Ihrer IDE aus.

Nachdem die Anwendung gestartet wurde, rufen Sie <http://localhost:8080/api/books> auf. Der Browser leitet Sie zur Login-Seite weiter. Verwenden Sie einen der oben genannten Benutzer, um sich anzumelden. Sie sollten eine Liste aller Bücher sehen:

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

Bisher hat dieses Tutorial keine Funktionen von SAPL verwendet, und Sie haben lediglich eine grundlegende Spring Boot Anwendung erstellt. Beachten Sie, dass wir keine Abhängigkeit zu Spring Security explizit hinzugefügt haben. Die SAPL Spring Integration hat eine transitive Abhängigkeit zu Spring Security, wodurch Spring Security für die Anwendung aktiviert wurde.

## Repository-Methoden mit SAPL absichern

### <a name="Method-Security"></a> Methodensicherheit einrichten

SAPL erweitert die Method-Security-Funktionen von Spring Security. Um SAPL Method Security für einzelne Autorisierungsentscheidungen zu aktivieren, fügen Sie Ihrer Klasse `SecurityConfiguration` die Annotation `@EnableSaplMethodSecurity` hinzu.

```java
@Configuration
@EnableWebSecurity
@EnableSaplMethodSecurity
public class SecurityConfiguration {
    ...
}
```

### Den ersten PEP hinzufügen

Die SAPL Spring Boot Integration verwendet Annotationen, um Methoden und Klassen PEPs hinzuzufügen. Dieses Tutorial verwendet die zwei Varianten `@PreEnforce` und `@PostEnforce`. Je nach Annotation läuft der PEP vor oder nach der Methodenausführung. Fügen Sie als erstes Beispiel der Methode `findById` des Interfaces `BookRepository` die Annotation `@PreEnforce` hinzu:

```java
public interface BookRepository {
    List<Book> findAll();

    @PreEnforce
    Optional<Book> findById(Long id);

    Book save(Book entity);
}
```

### Konsolenausgabe aktivieren

Fügen Sie Ihrer Datei `application.properties` `io.sapl.pdp.embedded.print-text-report=true` hinzu. Der Textreport protokolliert jede PDP-Entscheidung mit der Subscription, dem Entscheidungsergebnis und den Policy-Dokumenten, die gepasst haben. Sie können auch `...print-json-report` für eine maschinenlesbare Variante oder `...print-trace` für einen vollständigen Evaluation Trace einschließlich Attribute Resolution auswählen. `print-trace` ist die feingranularste Erklärung und wird nur als letztes Mittel zur Fehlersuche empfohlen.

Die Ausgabe des Textreports sieht so aus:

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

Für jede Entscheidung sehen Sie, welche Dokumente ausgewertet wurden und welche Einzelergebnisse sie geliefert haben. Bei Policy Sets werden die Ergebnisse der Sub-Policies unter dem Namen des Sets aufgeführt. Wenn eine Policy während der Auswertung Attribute aus Policy Information Points aufgelöst hat, erscheinen diese Werte pro Dokument unter einem `Attributes:` Block. Obligations und Advice werden aufgeführt, wenn sie in der Entscheidung vorhanden sind.

Für zusätzliche Debug-Ausgaben, zum Beispiel welche Policy-Dokumente beim Start geladen werden, können Sie `logging.level.io.sapl=DEBUG` in Ihrer `application.properties` verwenden.

Starten Sie die Anwendung neu, melden Sie sich an und navigieren Sie zu <http://localhost:8080/api/books/1>. Sie sollten nun eine Fehlerseite mit der Aussage sehen: `There was an unexpected error (type=Forbidden, status=403).`

Sehen Sie sich die Konsole an, um zu erkennen, was hinter den Kulissen passiert ist. Die Logs sollten Einträge enthalten, die den folgenden ähneln:

```text
[...] : === PDP Decision ===
[...] : Timestamp      : 2026-05-18T12:36:42.66151139+02:00
[...] : Subscription Id: ebd3533d-853e-3b48-de3e-0f2af18cc21a
[...] : Subscription   : { ... large JSON object ... }
[...] : Decision       : DENY
[...] : PDP ID         : default
```

Das Log enthält die Authorization Subscription (ein großes JSON-Objekt), die vom PDP getroffene Entscheidung, einen Zeitstempel und den PDP-Identifier. Die Entscheidung ist `DENY`, weil noch keine Policies existieren und der Combining Algorithm standardmäßig Deny zurückgibt.

Die Subscription ist im Log nicht besonders gut lesbar. Formatieren wir sie etwas, um die wesentlichen Teile des Subscription-Objekts aufzuschlüsseln:

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

Hinweis: Spring Security 7 fügt der Authentication automatisch eine `FACTOR_PASSWORD` Authority hinzu, wenn sich der Benutzer mit einem Passwort anmeldet. Dies ist Teil des Multi-Factor Authentication Frameworks.

Ohne spezielle Konfiguration ist die Subscription ein großes Objekt mit erheblichen Redundanzen. Die SAPL Engine und die Spring Integration haben kein Domänenwissen über die Anwendung. Daher sammelt der PEP alle Informationen, die er finden kann und die sinnvollerweise Subject, Action und Resource in einer Authorization Subscription beschreiben könnten.

Standardmäßig versucht der PEP, das `Authentication` Objekt aus dem `SecurityContext` von Spring direkt in ein JSON-Objekt für das `subject` zu marshallen. Das ist in den meisten Fällen ein sinnvoller Ansatz. Wie Sie sehen, enthält `subject.principal.birthday` die Daten, die Sie zuvor für die eigene Klasse `LibraryUser` definiert haben, und stellt sie dem PDP zur Verfügung.

Die Objekte `action` und `resource` sind nahezu identisch. Ohne Domänenwissen kann der PEP nur technische Informationen aus dem Anwendungskontext sammeln.

Beginnen wir mit der Action und den zugehörigen Java-Informationen. Der PEP kann die Namen und Typen geschützter Klassen und Methoden verwenden, um die Action zu beschreiben. Beispielsweise kann der Methodenname `findById` als Verb behandelt werden, das die Action beschreibt, während das Argument `1` ein Attribut dieser Action ist.

Gleichzeitig kann das Argument `1` auch als ID der Resource interpretiert werden. Der PEP weiß nicht, welche Java-Kontextwerte für die Anwendung relevant sind. Deshalb fügt er alle Informationen, die er sammeln kann, sowohl der Action als auch der Resource hinzu.

Wenn die geschützte Methode als Teil einer HTTP-Anfrage ausgeführt wird, kann diese Anfrage ebenfalls die Action oder Resource beschreiben. Beispielsweise kann die HTTP-Methode `GET` die Action beschreiben, während die URL auf natürliche Weise eine Resource identifiziert.

Diese Art von Subscription-Objekt ist verschwenderisch. Später lernen Sie, wie Sie die Subscription anpassen, damit sie kompakter und besser auf Ihre Anwendungsdomäne abgestimmt ist. Behalten Sie vorerst die Standardkonfiguration bei.

## SAPL Policies für einen eingebetteten PDP speichern

Das Konsolenlog zeigt, dass der PDP kein Policy-Dokument gefunden hat, das zur Authorization Subscription passt, weil noch keine Policy existiert. Bei einem eingebetteten PDP können Policies neben den Ressourcen der Anwendung oder irgendwo im Dateisystem des Hosts gespeichert werden. Policies in den Anwendungsressourcen sind zur Laufzeit statisch, sobald die Anwendung gebaut und gestartet wurde. Policies im Dateisystem werden vom PDP überwacht, und Änderungen können zur Laufzeit wirksam werden.

Die Standardkonfiguration eines eingebetteten PDP ist die erste Option, daher sind die Policies der Anwendung aktuell in den Ressourcen eingebettet.

Um dateisystembasierte Policies zu verwenden, fügen Sie der Datei `application.properties` `io.sapl.pdp.embedded.pdp-config-type = DIRECTORY` hinzu.

Die Datei `pdp.json` und die Policies können in verschiedenen Ordnern gespeichert werden. Konfigurieren Sie den Speicherort von `pdp.json` mit `io.sapl.pdp.embedded.config-path` und den Speicherort der Policies mit `io.sapl.pdp.embedded.policies-path`. Beide Properties benötigen einen gültigen Dateisystempfad zu dem Ordner, der die Dateien enthält.

**Hinweis:** `\` innerhalb des Pfads muss durch `/` ersetzt werden, zum Beispiel `C:\Users` durch `C:/Users`.

## SAPL Policies erstellen

### Grundlegende Informationen

Die gespeicherten Policy-Dokumente müssen einige Regeln einhalten:

- Der SAPL PDP lädt nur Dokumente mit dem Suffix `.sapl`.
- Jedes Dokument enthält genau eine Policy oder ein Policy Set.
- Die Top-Level-Policies und Policy Sets müssen über alle Dokumente hinweg eindeutige Namen haben.
- Alle `.sapl` Dokumente müssen syntaktisch korrekt sein, oder der PDP kann auf eine Standardentscheidung zurückfallen, die durch den Algorithmus in der `pdp.json` Konfiguration bestimmt wird.

Ein SAPL Policy-Dokument enthält die folgenden Mindestelemente:

* Das *Keyword* `policy`, das deklariert, dass das Dokument eine Policy enthält. Policy Sets lernen Sie später kennen.
* Einen eindeutigen Policy *Namen*, damit der PDP sie von anderen Policies unterscheiden kann.
* Das *Entitlement* Keyword, entweder `permit` oder `deny`, das bestimmt, welches Entscheidungsergebnis der PDP zurückgibt, wenn die Policy anwendbar ist und ihr Body zu `true` ausgewertet wird.

Weitere optionale Elemente werden später erklärt.

### Erste SAPL Policies: Permit All oder Deny All

Die grundlegendsten Policies erlauben oder verweigern alle Actions, ohne Attribute zu prüfen.

Beginnen Sie mit einer "permit all" Policy. Fügen Sie dem Ordner `resources/policies` des Maven-Projekts eine Datei `permit_all.sapl` mit folgendem Inhalt hinzu:

```sapl
policy "permit all" permit
```

Wie oben beschrieben, beginnt das Dokument mit dem Keyword `policy`, das angibt, dass das Dokument eine Policy enthält. Auf dieses Keyword folgt der Policy *Name* als String, in diesem Fall `"permit all"`. Auf den Policy-Namen folgt das *Entitlement*, in diesem Fall `permit`.

In diesem Guide haben wir keine Regeln in der Policy beschrieben. Daher sind alle ihre Regeln erfüllt, und die Policy weist den PDP an, eine `permit` Entscheidung zurückzugeben, unabhängig von Details der Attribute in der Authorization Subscription oder externen Attributen aus PIPs. Diese Art von Policy ist gefährlich und für Produktionssysteme nicht sehr praktisch. Während der Entwicklung ist sie jedoch hilfreich, um schnelle Tests durchführen zu können, ohne dass Autorisierung im Weg steht.

Starten Sie die Anwendung neu, authentifizieren Sie sich mit einem beliebigen Benutzer und greifen Sie erneut auf <http://localhost:8080/api/books/1> zu.

Nun sollten Sie die Daten für Buch 1 erhalten:

```json
{
    "id"        : 1,
    "name"      : "Clifford: It's Pool Time!",
    "ageRating" : 0,
    "content"   : "*Woof*"
}
```

Das Log sollte so aussehen:

```text
[...] : === PDP Decision ===
[...] : Subscription   : { ... }
[...] : Decision       : PERMIT
[...] : PDP ID         : default
[...] : Documents:
[...] :   permit all -> PERMIT
```

Das Log zeigt, dass der PDP ein passendes Policy-Dokument (`permit all`) gefunden hat und dieses zu `PERMIT` ausgewertet wurde. Da dies die einzige Policy ist und sie keine Bedingungen hat, passt die Policy `"permit all"` immer und gibt immer ihr Entitlement zurück.

Da dies das einzige passende Dokument ist und es `permit` zurückgibt, gibt der PDP `PERMIT` zurück. Der PEP erlaubt anschließend die Ausführung der Repository-Methode.

Erstellen Sie daneben eine "deny all" Policy. Fügen Sie dem Ordner `resources/policies` eine Datei `deny_all.sapl` hinzu:

```sapl
policy "deny all" deny
```

Starten Sie die Anwendung neu, authentifizieren Sie sich mit einem beliebigen Benutzer und greifen Sie erneut auf <http://localhost:8080/api/books/1> zu.

Die Anwendung verweigert den Zugriff. Das Log zeigt, dass beide Policies gepasst haben, aber der Combining Algorithm `PRIORITY_DENY` der `deny` Entscheidung Vorrang gibt:

```text
[...] : === PDP Decision ===
[...] : Subscription   : { ... }
[...] : Decision       : DENY
[...] : PDP ID         : default
[...] : Documents:
[...] :   permit all -> PERMIT
[...] :   deny all -> DENY
```

Dies ist das Secure-by-Default-Verhalten: Wenn sowohl Permit als auch Deny vorhanden sind, gewinnt Deny. Die SAPL Engine implementiert mehrere Combining Algorithms, um widersprüchliche Entscheidungen aufzulösen (siehe [SAPL Documentation: Combining Algorithms](https://sapl.io/docs/latest/2_5_CombiningAlgorithms/)).

Die drei Felder der Algorithmuskonfiguration in `pdp.json` steuern voneinander unabhängige Aspekte: `votingMode` bestimmt die Priorität zwischen Permit und Deny, `defaultDecision` ist der Fallback, wenn keine Policy passt, und `errorHandling` steuert, ob Auswertungsfehler weitergegeben oder stillschweigend absorbiert werden.

Benennen Sie `deny_all.sapl` in `deny_all.sapl.off` und `permit_all.sapl` in `permit_all.sapl.off` um. Bauen Sie nach dem Umbenennen mit `mvn clean compile` neu, bevor Sie die Anwendung neu starten. Das `clean` ist erforderlich, weil kompilierte Ressourcen im Verzeichnis `target/` bei einem regulären Build nicht entfernt werden. Ohne Clean bleiben die alten `.sapl` Dateien im Classpath, und der PDP lädt sie weiterhin. Der Zugriff auf das Buch sollte nun verweigert werden, weil der PDP nur Dokumente mit dem Suffix `.sapl` lädt und keine passenden Policies verbleiben.

Der PDP kann auch `INDETERMINATE` zurückgeben, wenn während der Policy-Auswertung ein Fehler aufgetreten ist. Der PEP verweigert den Zugriff für jede Entscheidung außer einem expliziten `PERMIT`. Weitere Informationen zu den verschiedenen Ergebnissen einer Policy-Auswertung finden Sie in der [SAPL Dokumentation](https://sapl.io/docs/latest/).

In diesem Abschnitt haben Sie gelernt, wie ein PEP und ein PDP in SAPL zusammenwirken und wie der PDP die Ergebnisse verschiedener Policies kombiniert. Im nächsten Schritt lernen Sie, praktischere Policies zu schreiben und genau zu bestimmen, wann eine Policy auf eine Authorization Subscription *anwendbar* ist.

### Domänenspezifische Policies erstellen

Fügen Sie zuerst der Methode `findAll` des `BookRepository` einen `@PreEnforce` PEP hinzu:

```java
public interface BookRepository {

    @PreEnforce
    List<Book> findAll();

    @PreEnforce
    Optional<Book> findById(Long id);

    Book save(Book entity);
}
```

Schreiben wir eine Policy aus der natürlichsprachlichen Aussage "Only Bob can see individual book entries". Mit natürlicher Sprache zu beginnen ist hilfreich, weil dadurch die beabsichtigte Regel explizit wird, bevor Sie sie in SAPL kodieren. Erstellen Sie im Policies-Ordner unter resources ein Policy-Dokument `permit_bob_for_books.sapl` und übersetzen Sie die Aussage wie folgt in ein SAPL Policy-Dokument:

```sapl
policy "only bob may see individual book entries"
permit
    action.java.name == "findById" & action.java.declaringTypeName =~ ".*BookRepository$";
    subject.name == "bob";
```

Bauen Sie nun mit `mvn clean compile` neu (clean ist erforderlich, um zuvor kompilierte `.sapl.off` Dateien aus dem Target-Verzeichnis zu entfernen), starten Sie neu und melden Sie sich als Bob an. Sie sollten eine Fehlerseite mit Status 403 sehen. Das geschieht, weil der Login zu `/api/books` weiterleitet, wodurch `findAll` aufgerufen wird, und keine Policy zu dieser Methode passt.

Greifen Sie nun direkt auf ein einzelnes Buch unter <http://localhost:8080/api/books/1> zu. Der Zugriff wird gewährt, und das Log sieht so aus:

```text
[...] : === PDP Decision ===
[...] : Subscription   : { ... }
[...] : Decision       : PERMIT
[...] : PDP ID         : default
[...] : Documents:
[...] :   only bob may see individual book entries -> PERMIT
```

Rufen Sie nun <http://localhost:8080/logout> auf und melden Sie sich ab. Melden Sie sich anschließend als Zoe an und versuchen Sie, auf <http://localhost:8080/api/books/1> zuzugreifen.

Die Anwendung verweigert den Zugriff:

```text
[...] : === PDP Decision ===
[...] : Subscription   : { ... }
[...] : Decision       : DENY
[...] : PDP ID         : default
```

Der Entscheidungsprozess des PDP sieht nun anders aus. Untersuchen Sie zuerst, warum es beim Zugriff auf `/api/books` oder nach einem erfolgreichen Login keine anwendbaren Dokumente gibt.

Wenn Sie sich die Policy ansehen, enthalten die Bedingungen nach `permit` zwei durch Semikolons getrennte Regeln. Die erste Bedingung `action.java.name == "findById" & action.java.declaringTypeName =~ ".*BookRepository$"` wirkt als Scoping-Regel, die bestimmt, ob die Policy für die gegebene Authorization Subscription relevant ist. Der PDP wertet die verbleibenden Bedingungen nur aus, wenn diese erste Bedingung `true` ist. Wie im Beispiel `"permit all"` gesehen, ist eine Policy immer anwendbar, wenn keine Bedingungen vorhanden sind.

In diesem Fall untersucht die *Target Expression* zwei Attribute der Action in der Subscription. Sie prüft, ob `action.java.name` gleich `"findById"` ist und ob `action.java.declaringTypeName` auf den regulären Ausdruck `".*BookRepository$"` passt. Anders gesagt muss der Attribut-String mit `BookRepository` enden. SAPL verwendet für diese Prüfung den Regex-Vergleichsoperator `=~`.

**Hinweis**: Im JSON der Authorization Subscription erscheinen verschachtelte Objekte als Objektwerte innerhalb anderer Objekte. In SAPL Policy Expressions navigieren Sie mit Punktnotation durch diese verschachtelten Strukturen. Aus `"action": {"java": {"name": "findById"}}` in der Subscription wird beispielsweise `action.java.name` in der Policy.

Diese zwei Expressions erklären, warum der PDP das Policy-Dokument `"permit_bob_for_books.sapl"` beim Zugriff auf einzelne Bücher als anwendbar identifiziert hat, beim Zugriff auf die gesamte Liste jedoch kein passendes Dokument findet.

Beachten Sie, dass SAPL zwischen lazy Boolean Operators, `&&` und `||` für AND und OR, und eager Boolean Operators, `&` und `|`, unterscheidet. *Target Expressions* erlauben nur eager Operators, eine Voraussetzung für eine effiziente Indizierung größerer Policy Sets.

Der PDP wertet die vollständige Policy aus, wenn der Benutzer versucht, auf das einzelne Buch zuzugreifen. Der *Policy Body* ist die Liste der Bedingungen nach `permit` oder `deny`. Er enthält eine beliebige Anzahl von Regeln oder Variablenzuweisungen, die jeweils mit dem SAPL Statement Terminator enden. Jede Regel ist eine Boolean Expression. Der Body als Ganzes wird zu `true` ausgewertet, wenn alle seine Regeln zu `true` ausgewertet werden. Regeln werden lazy von oben nach unten ausgewertet.

In den obigen Situationen ist die Regel, die Bobs Namen prüft, nur dann `true`, wenn Bob auf das Buch zugreift.

In diesem Abschnitt haben Sie gelernt, wann ein SAPL Dokument anwendbar ist und wie die Bedingungen im Policy Body die Autorisierungsentscheidung bestimmen.

Als Nächstes lernen Sie, wie Sie die Authorization Subscription anpassen und temporale Funktionen verwenden, um Zugriff nur auf altersgerechte Bücher zu gewähren.

### Altersfreigabe einzelner Bücher durchsetzen

Deaktivieren Sie alle bestehenden Policies in Ihrem Projekt, bevor Sie fortfahren, indem Sie sie löschen oder das Suffix `.off` an den Dateinamen anhängen.

Ziel dieses Abschnitts ist es, Zugriff nur auf Bücher zu gewähren, die für das Alter des Benutzers geeignet sind. Um diese Entscheidung zu treffen, benötigt der PDP das Geburtsdatum des Benutzers (Attribut des Subjects), die Altersfreigabe des Buchs (Attribut der Resource) und das aktuelle Datum (Attribut der Environment). Wenn Sie die Authorization Subscription untersuchen, die in den vorherigen Beispielen gesendet wurde, werden Sie feststellen, dass aktuell nur das Geburtsdatum des Benutzers in der Subscription verfügbar ist. Wie können wir die anderen Attribute dem PDP in den Policies verfügbar machen?

Allgemein gibt es zwei mögliche Quellen für Attribute: die Authorization Subscription oder Policy Information Points (PIPs).

Betrachten Sie die Altersfreigabe des Buchs. Diese Information ist dem PEP vor der Ausführung der Abfrage nicht bekannt. Ersetzen Sie daher im `BookRepository` das `@PreEnforce` auf `findById` durch eine `@PostEnforce` Annotation wie folgt:

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

Diese Annotation ändert den Enforcement-Ablauf:

* Die Methode zuerst aufrufen.
* Eine eigene Authorization Subscription mit [Spring Expression Language (SpEL)](https://docs.spring.io/spring-framework/docs/current/reference/html/core.html#expressions) konstruieren.
* Den PDP mit der eigenen Authorization Subscription abonnieren.
* Die Entscheidung durchsetzen.

Als wir die ursprünglich automatisch generierte Authorization Subscription untersucht haben, war das resultierende Objekt relativ groß und technisch. Hier helfen die Parameter der Annotation `@PostEnforce`, eine präzisere Authorization Subscription zu erstellen, die zur Anwendungsdomäne passt.

Der Parameter `subject = "authentication.getPrincipal()"` extrahiert das Principal-Objekt aus dem Authentication-Objekt und verwendet es als Subject-Objekt in der Subscription.

Der Parameter `action = "'read book'"` setzt das Action-Objekt in der Subscription auf die String-Konstante `read book`.

Schließlich setzt der Parameter `resource = "returnObject"` das Resource-Objekt in der Subscription auf das Ergebnis des Methodenaufrufs. Da diese Resource die Book Entity ist, enthält sie automatisch ihr Attribut `ageRating`.

Nachdem diese Objekte identifiziert wurden, verwendet der PEP den `ObjectMapper` im Spring Anwendungskontext, um die Objekte nach JSON zu serialisieren.

Die resultierende Authorization Subscription sieht ungefähr so aus:

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

Diese Authorization Subscription ist wesentlich überschaubarer und praktischer als die automatische Heuristik, die die Spring Integration ohne Anpassung ausführt.

Die Policy, die wir zur Durchsetzung der Altersbeschränkung für Bücher schreiben, führt mehrere neue Konzepte ein:

* Definition lokaler Attributvariablen
* Verwendung von Policy Information Points
* Funktionsbibliotheken

Erstellen Sie ein Policy-Dokument `check_age.sapl` wie folgt:

```sapl
policy "check age"
permit
    action == "read book";
    var birthday  = subject.birthday;
    var today     = time.dateOf(|<time.now>);
    var age       = time.timeBetween(birthday, today, "years");
    age >= resource.ageRating;
```

In ihrer ersten Bedingung begrenzt die Policy `check age` ihre Anwendbarkeit auf alle Authorization Subscriptions mit der Action `read book`.

Die Policy definiert dann eine lokale Attributvariable namens `birthday` und weist ihr das Attribut `subject.birthday` zu.

Die nächste Zeile weist der Variablen `today` das aktuelle Datum zu. In SAPL bezeichnen spitze Klammern `<ATTRIBUTE_IDENTIFIER>` einen Attributstrom. Dies ist eine Subscription auf eine externe Attributquelle, die von einem Policy Information Point (PIP) bereitgestellt wird. In diesem Fall greift der Identifier `time.now` auf die aktuelle Zeit in UTC aus der Systemuhr zu.

In diesem Guide benötigen wir keinen Strom von Zeitaktualisierungen. Wir brauchen nur das erste Ereignis im Attributstrom. Wenn das Pipe-Symbol den spitzen Klammern vorangestellt wird, nimmt `|<>` das erste Ereignis und meldet sich anschließend vom PIP ab. Die Zeitbibliotheken in SAPL verwenden ISO 8601 Strings, um Zeit darzustellen. Die Funktion `time.dateOf` extrahiert anschließend die Datumskomponente des vom PIP abgerufenen Zeitstempels.

Die Policy berechnet das Alter des Subjects in Jahren mit der Funktion `time.timeBetween` und den definierten Variablen.

Die Engine wertet Regeln zur Variablenzuweisung von oben nach unten aus. Jede Regel hat Zugriff auf Variablen, die oberhalb definiert wurden. Zuweisungsregeln werden zu `true` ausgewertet, sofern während der Auswertung kein Fehler auftritt.

Schließlich vergleicht die Policy `age` mit `resource.ageRating`. Die Bedingung wird zu `true` ausgewertet, wenn das Alter des Subjects mindestens der Altersfreigabe des Buchs entspricht.

Wenn Sie sich beispielsweise als Zoe anmelden und auf das erste Buch zugreifen, zeigen die Logs:

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

Unter jeder Policy, die ein externes Attribut aufgelöst hat, listet der Report den Attributwert auf, den der PDP während der Auswertung gesehen hat. Dies ist Teil der Ausgabe von `print-text-report` und unabhängig von `print-trace`.

Wenn Alice jedoch versucht, auf Buch vier zuzugreifen, wird der Zugriff verweigert, weil die Altersbedingung zu `false` ausgewertet wird und die Policy nicht anwendbar ist:

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

Die Policy kann mit einem `import` Statement kompakter geschrieben werden:

```sapl
import time.timeBetween
import time.dateOf
policy "check age compact"
permit
    action == "read book";
    var age = timeBetween(subject.birthday, dateOf(|<time.now>), "years");
    age >= resource.ageRating;
```

Imports erlauben es, einen kürzeren Namen statt des vollständig qualifizierten Namens von Funktionen aus SAPL Bibliotheken zu verwenden.

Beispielsweise importiert das Statement `import time.timeBetween` die Funktion `timeBetween` aus der Zeitbibliothek, sodass sie unter ihrem einfachen Namen verfügbar ist. Sie können auch einzelne Attribute Finder importieren oder `'library name' as 'alias'` für Aliasing verwenden.

## Ausgaben mit SAPL Policies transformieren und beschränken

In diesem Teil des Tutorials verwenden Sie Policies, um Abfrageergebnisse zu ändern und mit Constraints Seiteneffekte auszulösen.

SAPL kann Constraints an eine Autorisierungsentscheidung anhängen. Ein Constraint weist den PEP an, bei der Durchsetzung dieser Entscheidung zusätzliche Arbeit zu erledigen. SAPL unterscheidet drei Constraint-Typen:

* *Obligation*: eine verpflichtende Anweisung. Wenn der PEP sie nicht erfüllen kann, darf er keinen Zugriff gewähren.
* *Advice*: eine optionale Anweisung. Wenn der PEP sie nicht erfüllen kann, bleibt die ursprüngliche Autorisierungsentscheidung dennoch bestehen.
* *Transformation*: eine besondere Form der Obligation, bei der der PEP die zugegriffene Resource durch das Resource-Objekt ersetzen muss, das in der Autorisierungsentscheidung geliefert wird.

Bei einer `PERMIT` Entscheidung verhindern nicht aufgelöste Obligations, dass der PEP Zugriff gewährt. Nicht aufgelöster Advice verhindert dies nicht.

Beispielsweise darf jeder Arzt in einem Notfall auf die Krankenakte eines Patienten zugreifen. Das System muss jedoch den Zugriff protokollieren, wenn der Arzt nicht der behandelnde Arzt dieses Patienten ist, und damit einen Audit-Prozess auslösen. Dies wird häufig als "break glass" Szenario bezeichnet.

### Transformations in SAPL Policies verwenden

Die Book Entity enthält bereits ein Feld `content`. Wir möchten die Bibliotheks-Policies so ändern, dass Benutzer, die für ein Buch zu jung sind, nicht vollständig abgewiesen werden. Stattdessen soll nur der Inhalt des angefragten Buchs geschwärzt werden. Um diese Änderung umzusetzen, fügen Sie den Anwendungs-Policies das folgende Policy-Dokument `check_age_transform.sapl` hinzu:

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

Diese Policy führt die `transform` Expression ein.

Wenn der Policy Body zu `true` ausgewertet wird, wird der vom `transform` Statement erzeugte JSON-Wert der Autorisierungsentscheidung als Property `resource` hinzugefügt. Diese Property weist den PEP an, die bereitgestellte Ersatz-Resource anstelle des ursprünglichen Methodenergebnisses zurückzugeben. Die gespeicherte Book Entity wird dadurch nicht verändert.

In diesem Fall wird der Filteroperator `|-` auf das Objekt `resource` angewendet. Der Filteroperator wählt einzelne Teile eines JSON-Werts zur Manipulation aus, beispielsweise indem er eine Funktion auf den ausgewählten Wert anwendet. Hier wählt der Operator den Schlüssel `content` der Resource aus und ersetzt ihn durch eine Version, bei der nur die ersten drei Zeichen sichtbar bleiben und der Rest durch ein schwarzes Quadrat ersetzt wird ("\\u2588" in Unicode). Der Selection-Ausdruck ist mächtig. Eine vollständige Erklärung finden Sie in der [SAPL Dokumentation](https://sapl.io/docs/latest/).

Stellen Sie sicher, dass die ursprüngliche Policy zur Altersprüfung weiterhin vorhanden ist. Starten Sie neu und melden Sie sich als Alice an.

Beim Zugriff auf <http://localhost:8080/api/books/1> erhalten Sie:

```json
{
    "id"        : 1,
    "name"      : "Clifford: It's Pool Time!",
    "ageRating" : 0,
    "content"   : "*Woof*"
}
```

Alice ist erst drei Jahre alt. Wenn sie das Buch unter <http://localhost:8080/api/books/4> anfragt, ist der Inhalt geschwärzt, weil sie zu jung ist, um es zu lesen:

```json
{
    "id"        : 4,
    "name"      : "The Three-Body Problem",
    "ageRating" : 14,
    "content"   : "Spa████████████"
}
```

Die Logs für diesen Zugriffsversuch sehen so aus:

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

Beide Policy-Dokumente werden für die Subscription ausgewertet. Die Policy `check age` wird zu `NOT_APPLICABLE` ausgewertet, weil Alice nicht alt genug ist, um "The Three-Body Problem" zu lesen. Die Policy `check age transform` wird mit einer transformierten Resource zu `PERMIT` ausgewertet. In der Folge ersetzt der PEP die ursprüngliche Resource durch die Resource aus der Entscheidung, die den geschwärzten Inhalt enthält.

### Obligations und Advice in SAPL Policies verwenden

Die Policy `check age transform` mit dem `transform` Statement war das erste Beispiel für eine Policy, die den PEP anweist, Zugriff nur dann zu gewähren, wenn gleichzeitig zusätzliche Statements durchgesetzt werden.

Fügen Sie dieser Policy nun eine Obligation hinzu. Das System soll außerdem Anfragen nach Büchern protokollieren, für die der Benutzer zu jung ist. So erhalten Eltern die Möglichkeit, das Buch zuerst mit ihren Kindern zu besprechen.

Ändern Sie dazu die Policy `check_age_transform.sapl` wie folgt:

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

Melden Sie sich nun als Alice an und versuchen Sie, auf <http://localhost:8080/api/books/2> zuzugreifen.

Der Zugriff wird verweigert, und die Logs sehen folgendermaßen aus:

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

Der PDP hat `PERMIT` zurückgegeben, aber der PEP hat den Zugriff trotzdem verweigert, weil die Autorisierungsentscheidung eine Logging Obligation enthielt. SAPL stellt Obligations und Advice als JSON-Objekte dar, und die Anwendung muss Handler für die Constraint-Typen bereitstellen, die sie verwendet. Da noch kein Handler die Logging Obligation verstehen und durchsetzen konnte, hat der PEP den Zugriff verweigert.

Implementieren Sie zur Unterstützung der Logging Obligation einen *Constraint Handler Provider*:

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

Die SAPL Spring Integration liefert Constraint Handler über *Signals* aus, die an klar definierten Punkten im PEP-Lebenszyklus ausgelöst werden. Beispiele für Signals sind `DecisionSignal` (der Moment, in dem die Entscheidung beim PEP eintrifft), `OutputSignal` (pro ausgegebenem Ergebnis der geschützten Methode) und einige HTTP-spezifische Signals, wenn der PEP auf einem HTTP-Pfad sitzt. Jeder Provider deklariert, an welches Signal oder welche Signals seine Handler gebunden sind und mit welcher Priorität.

Ein `ConstraintHandlerProvider` ist das zentrale Interface, das jeder Provider implementiert. Seine einzige Methode, `getConstraintHandlers`, erhält den Constraint-Wert und die Menge der Signal Types, die der eingesetzte PEP tatsächlich auslöst. Der Provider gibt eine leere Liste zurück, wenn er den Constraint nicht erkennt, oder eine nicht leere Liste von `ScopedConstraintHandler` Einträgen, wenn er ihn erkennt. Jeder Eintrag paart einen Handler mit dem Signal Type, an den er gebunden wird, und einer Priority, die die Ausführungsreihenfolge bestimmt. Ein einzelner Provider kann mehrere Einträge für verschiedene Signals zurückgeben, wenn ein Constraint koordinierte Handler über den Lebenszyklus hinweg steuert.

Den Handler selbst gibt es in drei Formen, ausgedrückt als sealed Sub-Interfaces von `ConstraintHandler`:

* `Runner` ist ein `Runnable` für Fire-and-Forget-Seiteneffekte (Logging, Audit-Ausgabe).
* `Consumer<T>` beobachtet einen typisierten Signalwert, ohne ihn zu verändern (die Entscheidung inspizieren, ein ausgegebenes Element ansehen).
* `Mapper<T>` ist ein `UnaryOperator<T>`, der einen Signalwert transformiert (einen Response Body umschreiben, eine zurückgegebene Collection filtern).

Beim Logging ist der Handler ein Seiteneffekt, der an das `DecisionSignal` gebunden ist. Die statische Hilfsmethode `ConstraintHandlerProvider.constraintTypeAndSignal` kombiniert zwei Prüfungen: Der Constraint muss vom erwarteten Typ sein, und der eingesetzte PEP muss das erwartete Signal auslösen. Der Provider gibt einen `Runner` zurück, der das Feld `message` der Obligation über SLF4J ausgibt.

Nachdem Sie sich als Alice angemeldet und auf <http://localhost:8080/api/books/2> zugegriffen haben, wird der Zugriff gewährt, und die Logs enthalten nun die folgende Zeile:

```text
[...] : Attention, alice accessed the book 'The Rescue Mission: (Pokemon: Kalos Reader #1)'.
```

Versuchen wir ein weiteres Beispiel für eine Obligation.

Nach einem erfolgreichen Login wird `/api/books` weiterhin verweigert, weil wir noch keine Policy für die Methode `findAll` implementiert haben. Wir benötigen eine Policy, mit der der Benutzer altersgerechte Bücher auflisten kann. Diesmal ersetzen wir die Resource nicht mit einer `transform` Anweisung. In einer realen Bibliothek könnte das vom PEP verlangen, Hunderte von Datensätzen zu verarbeiten. Stattdessen weisen wir den PEP an, nur bestimmte Bücher zurückzugeben.

Vervollständigen Sie zuerst das `@PreEnforce` auf `findAll` im `BookRepository` wie folgt:

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

Die Idee ist dieselbe wie bei der Methode `findById`. Der Parameter `subject = "authentication.getPrincipal()"` extrahiert das Principal-Objekt und verwendet es als Subject-Objekt in der Subscription. Der Parameter `action = "'list books'"` setzt das Action-Objekt auf den String `list books`. Da `@PreEnforce` vor der Methode ausgeführt wird, gibt es noch keinen Rückgabewert. Der PEP lässt die Resource weg oder leitet sie aus dem verfügbaren Kontext ab.

Um nur zugängliche Bücher zurückzugeben, schreiben Sie eine Policy wie folgt:

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

Wir verwenden die Klasse `ContentFilterPredicateProvider`, die bereits in der SAPL Engine bereitgestellt wird. Diese Klasse filtert ein JSON-Objekt und extrahiert Knoten, die den angegebenen Bedingungen entsprechen.

Die Obligation wählt diesen Provider mit der Zuweisung `"type" : "jsonContentFilterPredicate"` aus. Das Feld `conditions` gibt anschließend eine oder mehrere zu prüfende Bedingungen an. Hier prüft der Provider das Array auf JSON-Knoten, die das Element `ageRating` enthalten und deren Altersfreigabe kleiner oder gleich dem Alter des zugreifenden Benutzers ist. Nur passende Knoten verbleiben in der Antwort.

Wenn Sie eigenes Verhalten benötigen, können Sie einen eigenen *Constraint Handler Provider* implementieren:

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

Die Form entspricht dem Logging Provider, aber der Handler ist nun ein `Mapper<Object>`, der an das `OutputSignal` gebunden ist. `OutputSignal` ist das Signal pro Ergebnis, das der PEP auslöst, sobald die geschützte Methode ihren Rückgabewert erzeugt hat. Ein `Mapper` transformiert diesen Wert, bevor der PEP ihn freigibt. `SignalType.findIn` sucht in der Signalmenge des eingesetzten PEP nach einem `OutputSignal` eines beliebigen Werttyps. Da `findAll` eine `List<Book>` zurückgibt (siehe die frühere Änderung an `JpaBookRepository` im Tutorial), löst der eingesetzte PEP ein `OutputSignal` aus, dessen Werttyp die Liste ist, und unser `Mapper` erhält zur Laufzeit die gefüllte Liste.

Der Mapper wendet das Alterspredikat an und gibt eine neue `ArrayList<Book>` zurück, die nur die Einträge enthält, die das Subject sehen darf. Wenn keine Einträge passen, ist die Rückgabe einer leeren `List<Book>` akzeptabel, weil die Policy auf `findAll` die Anfrage bereits erlaubt hat. Die Obligation schränkt nur die Ergebnismenge ein. Der Mapper lässt die ursprüngliche Liste unverändert und gibt eine gefilterte Kopie zurück.

Melden Sie sich nun als Bob an. Sie sehen die folgende Liste von Büchern:

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

## Ein Policy Set erstellen

Ein SAPL Policy Set gruppiert Policies und wertet sie mit einem eigenen Combining Algorithm aus. Das Ergebnis des Sets wird anschließend mit Ergebnissen anderer Top-Level-Policies oder Policy Sets kombiniert. Policy Sets verwenden dieselbe Algorithmusfamilie wie die finale Konfliktauflösung, einschließlich des Algorithmus `first or abstain errors propagate`.

**Hinweis**: Im Gegensatz zur Datei `pdp.json` müssen die Algorithmen in Policy Sets in kleingeschriebener, natürlichsprachlicher Form geschrieben werden.

Ein SAPL Policy Set besteht aus den folgenden Elementen:

* dem *Keyword* `set`, das deklariert, dass das Dokument ein Policy Set enthält
* einem eindeutigen Policy Set *Namen*, damit der PDP es von anderen Policy Sets unterscheiden kann
* einem *Combining Algorithm*
* einer optionalen *Target Expression*
* optionalen Variablenzuweisungen
* zwei oder mehr Policies

Erstellen Sie als kleines Beispiel eine Datei `check_age_by_id_set.sapl`. Nur eine der beiden Policies aus dem vorherigen Abschnitt, `'check age compact'` und `'check age transform'`, kann jeweils anwendbar sein. Erstellen wir daher ein Policy Set, das beide Policies verarbeitet.

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

Die Regeln für Policies innerhalb eines Sets sind dieselben wie für Top-Level-Policies. Jede Bedingung endet mit dem SAPL Statement Terminator. Die zweite Policy des Sets hat eine einzelne Bedingung direkt nach `permit`.

Deaktivieren Sie die beiden Policy-Dokumente `'check_age_compact.sapl'` und `'check_age_transform.sapl'` mit der Erweiterung `.off` und starten Sie die Anwendung neu.

Melden Sie sich als Bob an und greifen Sie auf <http://localhost:8080/api/books/3> zu. Die Logs sehen folgendermaßen aus:

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

Das Policy Set wertet beide Sub-Policies aus. `check age compact set` passt (Bob ist alt genug), während `check age transform set` nicht anwendbar ist. Das Set verwendet `first or abstain errors propagate`, daher bestimmt die erste anwendbare Sub-Policy das Ergebnis.

Greifen Sie nun auf <http://localhost:8080/api/books/4> zu. Die Logs zeigen:

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

Die Policy `check age transform set` passt zuerst (Bobs Alter < 14), daher gibt das Set ihr Ergebnis einschließlich der Obligation und der transformierten Resource mit geschwärztem Inhalt zurück. Die zweite Policy im Set wird nicht ausgewertet, weil die erste bereits anwendbar war.

## Obligations, Advice und Transformations kombinieren

Für Top-Level-Policies sammelt SAPL die Obligations und Advice aus allen Policies, deren Ergebnis zur finalen Autorisierungsentscheidung passt. Policy Sets sind anders: Nicht jede innere Policy wird notwendigerweise ausgewertet, daher werden nur Obligations und Advice aus ausgewerteten inneren Policies mit passendem Ergebnis gesammelt.

Ein weiterer Sonderfall betrifft *Transformations*. Es ist nicht möglich, mehrere Transformation Statements über mehrere Policies hinweg zu kombinieren. SAPL gibt die Entscheidung `PERMIT` nicht zurück, wenn mehr als eine Policy zu `PERMIT` ausgewertet wird und mindestens eine davon ein Transformation Statement enthält. Dies wird **transformation uncertainty** genannt.

Sie können das Demo-Projekt aus dem [GitHub Repository für dieses Tutorial](https://github.com/heutelbeck/sapl-tutorial-01-spring) herunterladen.

## Fazit

In dieser Tutorial-Serie haben Sie die Grundlagen der attributbasierten Zugriffskontrolle kennengelernt und gelernt, wie Sie eine Spring Anwendung mit SAPL absichern.

Mit SAPL können Sie noch deutlich mehr erreichen, einschließlich flexibler, verteilter Autorisierungsinfrastrukturen über eine Organisation hinweg. Die folgenden Tutorials in dieser Serie konzentrieren sich auf komplexere Obligations, Testing, reaktive Datentypen, Datenstreaming, die Anpassung von UIs anhand von Policies und Anwendungen auf Basis des Axon Frameworks.

Tauschen Sie sich gerne mit den Entwicklern und der Community auf unserem [Discord Server](https://discord.gg/pRXEVWm3xM) aus.
