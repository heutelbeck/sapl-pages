---
layout: sapl
lang: it
ref: spring-guide
title: "Spring Security con SAPL: Guide SAPL"
description: "Proteggere una applicazione Spring Boot con SAPL e controllo degli accessi basato su attributi. Autorizzazione a livello di metodo, limiti di eta, trasformazioni, obligation e policy set."
permalink: /it/guides/spring/
sitemap: false
robots: noindex,nofollow
---

## Sicurezza dei metodi Spring Boot con SAPL

Questa guida mostra come proteggere una applicazione Spring Boot con SAPL. Aggiungerai autorizzazione basata su policy ai metodi di un repository JPA, scriverai policy per applicare limiti di eta, trasformerai i risultati e filtrerai liste in base agli attributi dell utente.

La guida presuppone una conoscenza di base di Spring Boot. Per il contesto su ABAC e sull architettura di SAPL, consulta la [documentazione](https://sapl.io/docs/latest/).

Il codice sorgente completo e disponibile su [github.com/heutelbeck/sapl-tutorial-01-spring](https://github.com/heutelbeck/sapl-tutorial-01-spring).

## Configurazione del progetto

Per prima cosa crea una semplice applicazione Spring Boot. Apri [Spring Initializr](https://start.spring.io/) e aggiungi queste dipendenze:

* **Spring Web** per esporre una API REST
* **Spring Data JPA** per il modello di dominio
* **H2 Database** come database in memoria
* **Lombok** per ridurre il codice boilerplate
* **Spring Boot DevTools** per migliorare il flusso di sviluppo

Useremo Maven come strumento di build e Java come linguaggio.

Seleziona Java 21 e Spring Boot 4.1.0 o una versione piu recente.

![Spring Initializr](/assets/guides/spring/spring_initializr.webp)

Scarica il progetto, decomprimi il file e importalo nel tuo IDE.

### Dipendenze SAPL

SAPL fornisce un modulo Bill of Materials. In questo modo non devi dichiarare separatamente la versione di ogni modulo SAPL:

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

Aggiungi poi lo starter Spring Boot di SAPL:

```xml
    <dependency>
        <groupId>io.sapl</groupId>
        <artifactId>sapl-spring-boot-starter</artifactId>
    </dependency>
```

Le versioni rilasciate di SAPL sono disponibili su Maven Central. Per build non rilasciate, puoi aggiungere il repository Central Portal snapshots e usare la versione `x.y.z-SNAPSHOT` corrispondente.

Questo esempio usa Spring Boot 4.1.0 e SAPL 4.1.1. Le versioni di Spring Boot e SAPL non sono accoppiate.

Per usare Argon2 Password Encoder, aggiungi anche Bouncy Castle:

```xml
    <dependency>
        <groupId>org.bouncycastle</groupId>
        <artifactId>bcpkix-jdk18on</artifactId>
        <version>1.84</version>
    </dependency>
```

Crea una cartella `policies` sotto `src/main/resources` e aggiungi un file `pdp.json`:

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

## Modello di dominio

L applicazione rappresenta una piccola biblioteca. Ogni libro ha una classificazione per eta e puo essere letto integralmente solo se l utente autenticato ha eta sufficiente.

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

Il repository sara protetto piu avanti con annotazioni SAPL:

```java
public interface BookRepository {

    List<Book> findAll();

    Optional<Book> findById(Long id);

    Book save(Book entity);
}
```

Il repository Spring Data implementa questi metodi:

```java
public interface JpaBookRepository extends BookRepository, ListCrudRepository<Book, Long> {
}
```

## Utenti e configurazione di sicurezza

L applicazione di esempio usa tre utenti con eta diverse. La data di nascita diventa un attributo del subject nella decisione SAPL.

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

Abilita Spring Security e SAPL Method Security in una classe di configurazione:

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

## Primi Policy Enforcement Point

SAPL aggiunge Policy Enforcement Point con annotazioni su metodi o classi. Per l accesso a un singolo libro si usa `@PostEnforce`, perche la classificazione per eta e nota solo dopo il caricamento del libro:

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

`subject` estrae l utente autenticato dall autenticazione Spring Security. `action` imposta un nome di azione di dominio. Per `findById`, `resource` punta al libro caricato.

## Limiti di eta per singoli libri

Una policy semplice consente l accesso quando l utente ha eta sufficiente:

```sapl
import time.timeBetween
import time.dateOf
policy "check age"
permit
    action == "read book";
    var age = timeBetween(subject.birthday, dateOf(|<time.now>), "years");
    age >= resource.ageRating;
```

Se l utente e troppo giovane, SAPL puo anche trasformare la risorsa. In questo esempio, il contenuto viene oscurato dopo i primi tre caratteri e viene aggiunta una obligation di logging:

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

Per gestire la obligation di logging, registra un constraint handler provider:

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

## Filtrare le liste

Per `findAll`, la decisione viene presa prima della chiamata al metodo. La policy consente la chiamata e aggiunge una obligation per filtrare il valore restituito:

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

Il `ContentFilterPredicateProvider` integrato filtra la lista restituita in modo che restino visibili solo i libri adatti all eta dell utente.

## Policy Set

Le due policy per i singoli libri possono essere raggruppate in un policy set:

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

Il policy set usa `first or abstain errors propagate`. Appena una policy interna e applicabile, determina il risultato del set.

## Comportamento atteso

Dopo aver configurato l applicazione, i casi principali sono:

* Gli utenti anonimi vengono reindirizzati alla pagina di login.
* Bob vede nella lista solo libri con classificazione fino a 10.
* Alice vede nella lista solo il libro con classificazione 0.
* Zoe puo leggere integralmente tutti i singoli libri.
* Bob e Alice ricevono contenuto oscurato quando la classificazione e troppo alta.

La versione inglese contiene il percorso completo con spiegazioni aggiuntive e output di log.
