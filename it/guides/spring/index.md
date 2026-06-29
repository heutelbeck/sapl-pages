---
layout: sapl
lang: it
ref: spring-guide
title: "Spring Security con SAPL: Guide SAPL"
description: "Proteggere un'applicazione Spring Boot con controllo degli accessi basato su attributi usando SAPL. Autorizzazione a livello di metodo, policy basate sull'età, trasformazione del contenuto, obligation e policy set."
permalink: /it/guides/spring/
sitemap: false
robots: noindex,nofollow
---

## Sicurezza dei metodi Spring Boot con SAPL

Questa guida mostra come proteggere un'applicazione Spring Boot con SAPL. Aggiungerai un'autorizzazione basata su policy ai metodi di repository JPA, scriverai policy che applicano limiti di età, trasformerai e filtrerai i risultati delle query in base agli attributi dell'utente e implementerai constraint handler per le obligation.

La guida presuppone una conoscenza di base di Spring Boot. Per il contesto sui concetti ABAC e sull'architettura di SAPL, consulta la [documentazione](https://sapl.io/docs/latest/).

Il codice sorgente completo è disponibile su [github.com/heutelbeck/sapl-tutorial-01-spring](https://github.com/heutelbeck/sapl-tutorial-01-spring).

## Configurazione del progetto

Per prima cosa, crea una semplice applicazione Spring Boot. Apri [Spring Initializr](https://start.spring.io/) e aggiungi le seguenti dipendenze:

* **Spring Web** (per fornire un'API REST con cui testare l'applicazione)
* **Spring Data JPA** (per sviluppare il modello di dominio dell'applicazione)
* **H2 Database** (come semplice database in memoria a supporto dell'applicazione)
* **Lombok** (per eliminare parte del codice boilerplate)
* **Spring Boot DevTools** (per migliorare il processo di sviluppo)

Questo tutorial usa Maven come strumento di build e Java come linguaggio di programmazione.

Seleziona Java 21 e Spring Boot 4.1.0 o una versione più recente in Initializr.

Le impostazioni di Initializr dovrebbero ora apparire più o meno così:

![Spring Initializr](/assets/guides/spring/spring_initializr.webp)

Fai clic su "GENERATE." Il browser scaricherà il template del progetto come file ".zip".

Estrai il progetto e importalo nell'IDE che preferisci.

### Aggiungere le dipendenze SAPL

SAPL fornisce un modulo bill of materials che mantiene compatibili le versioni dei moduli SAPL. Dopo aver aggiunto il blocco seguente al tuo `pom.xml`, non devi dichiarare la `<version>` di ogni dipendenza SAPL:

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

Un'applicazione che usa SAPL ha bisogno di un Policy Decision Point (PDP) e di uno o più Policy Enforcement Point (PEP). Il PDP prende le decisioni di autorizzazione. Puoi incorporarlo nell'applicazione, oppure eseguirlo come server dedicato e delegare le decisioni a quel servizio remoto. Questo tutorial usa un PDP embedded che prende decisioni localmente a partire dalle policy archiviate nelle risorse dell'applicazione. SAPL si integra anche con Spring Security, quindi puoi dichiarare PEP sui bean Spring tramite annotazioni. Aggiungi la seguente dipendenza starter al progetto:

```xml
    <dependency>
        <groupId>io.sapl</groupId>
        <artifactId>sapl-spring-boot-starter</artifactId>
    </dependency>
```

Le versioni rilasciate di SAPL sono disponibili su Maven Central. Per build non rilasciate, aggiungi il repository Central Portal snapshots e usa la versione `x.y.z-SNAPSHOT` corrispondente.

L'esempio attuale usa Spring Boot 4.1.0 e SAPL 4.1.1. Le versioni di Spring Boot e SAPL non sono accoppiate.

Per usare Argon2 Password Encoder, aggiungi la dipendenza seguente:

```xml
    <dependency>
        <groupId>org.bouncycastle</groupId>
        <artifactId>bcpkix-jdk18on</artifactId>
        <version>1.84</version>
    </dependency>
```

Crea una cartella `policies` sotto `src/main/resources`, quindi crea in quella cartella un file chiamato `pdp.json`:

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

L'oggetto `algorithm` seleziona il combining algorithm per risolvere risultati di valutazione delle policy in conflitto. I tre campi controllano aspetti ortogonali:

* `votingMode` determina quale tipo di decisione ha priorità quando sono presenti sia voti permit sia voti deny.
* `defaultDecision` è il fallback quando nessuna policy corrisponde alla subscription.
* `errorHandling` controlla cosa accade quando si verificano errori di valutazione delle policy (`PROPAGATE` rende visibili gli errori, `ABSTAIN` li scarta silenziosamente).

Questa configurazione è volutamente restrittiva: deny ha priorità, il valore predefinito è deny e gli errori vengono propagati. È l'impostazione secure-by-default. Scriverai policy permit esplicite per concedere l'accesso.

La directory `policies` e il file `pdp.json` sono necessari per avviare il PDP embedded. Senza di essi, l'applicazione fallirà durante l'avvio.

Puoi usare la proprietà `variables` per definire variabili d'ambiente, come la configurazione dei Policy Information Point (PIP). Tutte le policy possono accedere al contenuto di queste variabili.

Questo file completa la configurazione Maven di base. Ora puoi iniziare a implementare l'applicazione.

## Il dominio del progetto

Il dominio è una biblioteca in cui gli utenti possono visualizzare un libro solo se soddisfano il suo requisito di età minima. Se conosci già Spring Boot, JPA e Spring Security, salta direttamente a [Proteggere i metodi di repository con SAPL](#Method-Security).

### Definire l'entità Book e il repository

Per prima cosa, definisci un'entità libro che contiene un ID, un nome, una classificazione per età e il contenuto. Puoi usare le annotazioni Lombok per generare getter, setter e costruttori:

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

Definisci un'interfaccia repository corrispondente. Per ora, includi solo `findAll`, `findById` e `save`:

```java
public interface BookRepository {
    List<Book> findAll();
    Optional<Book> findById(Long id);
    Book save(Book entity);
}
```

Definisci un bean repository corrispondente in modo che Spring Data possa istanziare un'implementazione della tua interfaccia:

```java
@Repository
// Important: interface order matters for detecting SAPL annotations.
public interface JpaBookRepository extends BookRepository, ListCrudRepository<Book, Long>  { }
```

Usiamo `ListCrudRepository` invece di `CrudRepository` affinché `findAll()` restituisca un `List<Book>` anziché un `Iterable<Book>`. Il constraint handler che scriveremo più avanti per filtrare le collection ha bisogno di un tipo contenitore riconoscibile su cui operare.

### Esporre i libri con un controller REST

Esponi i libri tramite un semplice controller REST. L'annotazione Lombok `@RequiredArgsConstructor` crea un costruttore per l'iniezione delle dipendenze del repository:

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

### Creare un'implementazione personalizzata di `LibraryUser`

Ora estendi la classe `User` di `org.springframework.security.core.userdetails` per creare un'implementazione personalizzata di `LibraryUser` che contiene la data di nascita dell'utente della biblioteca.

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

Per assicurarti che la classe personalizzata `LibraryUser` sia archiviata nel security context, implementa un `LibraryUserDetailsService` personalizzato. Per questo tutorial è sufficiente un semplice `UserDetailsService` in memoria:

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

### Creare una classe di configurazione

Crea una classe `SecurityConfiguration` con le annotazioni Spring `@Configuration` e `@EnableWebSecurity`. Questa classe fornisce metodi che vengono elaborati automaticamente nel contesto di Spring Security.

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

### Generare dati di test all'avvio dell'applicazione

La configurazione predefinita con H2 e JPA crea un database volatile in memoria. Per inizializzare il database ogni volta che l'applicazione si avvia, crea un `CommandLineRunner`. Questa classe viene eseguita una volta che l'application context è stato caricato correttamente:

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

Il dominio dell'applicazione è completo e puoi testare l'applicazione. Compilala con `mvn clean install`, quindi eseguila con `mvn spring-boot:run` dalla riga di comando o con una configurazione di esecuzione nel tuo IDE.

Dopo l'avvio dell'applicazione, vai a <http://localhost:8080/api/books>. Il browser ti reindirizza alla pagina di login. Usa uno degli utenti sopra per accedere. Dovresti vedere una lista di tutti i libri:

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

Finora questo tutorial non ha usato alcuna funzionalità di SAPL, e hai appena creato un'applicazione Spring Boot di base. Nota che non abbiamo aggiunto esplicitamente alcuna dipendenza da Spring Security. L'integrazione Spring di SAPL ha una dipendenza transitiva da Spring Security, che l'ha attivata per l'applicazione.

## Proteggere i metodi di repository con SAPL

### <a name="Method-Security"></a> Configurare la sicurezza dei metodi

SAPL estende le funzionalità di method security di Spring Security. Per attivare la method security di SAPL per decisioni di autorizzazione individuali, aggiungi l'annotazione `@EnableSaplMethodSecurity` alla classe `SecurityConfiguration`.

```java
@Configuration
@EnableWebSecurity
@EnableSaplMethodSecurity
public class SecurityConfiguration {
    ...
}
```

### Aggiungere il primo PEP

L'integrazione SAPL Spring Boot usa annotazioni per aggiungere PEP a metodi e classi. Questo tutorial usa le due varianti `@PreEnforce` e `@PostEnforce`. A seconda dell'annotazione, il PEP viene eseguito prima o dopo l'esecuzione del metodo. Come primo esempio, aggiungi `@PreEnforce` al metodo `findById` dell'interfaccia `BookRepository`:

```java
public interface BookRepository {
    List<Book> findAll();

    @PreEnforce
    Optional<Book> findById(Long id);

    Book save(Book entity);
}
```

### Abilitare l'output su console

Aggiungi `io.sapl.pdp.embedded.print-text-report=true` al file `application.properties`. Il report testuale registra ogni decisione del PDP con la subscription, l'esito della decisione e quali documenti di policy hanno corrisposto. Puoi anche selezionare `...print-json-report` per una variante leggibile dalle macchine o `...print-trace` per una traccia completa della valutazione, inclusa la risoluzione degli attributi. `print-trace` è la spiegazione più dettagliata ed è consigliato solo come ultima risorsa per il troubleshooting.

L'output del report testuale appare così:

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

Per ogni decisione, vedi quali documenti sono stati valutati e i loro esiti individuali. Per i policy set, i risultati delle sub-policy sono elencati sotto il nome del set. Se durante la valutazione una policy ha risolto attributi da Policy Information Point, quei valori compaiono sotto un blocco `Attributes:` per documento. Obligation e advice vengono elencati quando sono presenti nella decisione.

Per output di debug aggiuntivo, ad esempio quali documenti di policy vengono caricati all'avvio, puoi usare `logging.level.io.sapl=DEBUG` nel tuo `application.properties`.

Riavvia l'applicazione, effettua il login e vai a <http://localhost:8080/api/books/1>. Ora dovresti vedere una pagina di errore che include la frase: `There was an unexpected error (type=Forbidden, status=403).`

Controlla la console per vedere cosa è accaduto dietro le quinte. I log dovrebbero contenere istruzioni simili alle seguenti:

```text
[...] : === PDP Decision ===
[...] : Timestamp      : 2026-05-18T12:36:42.66151139+02:00
[...] : Subscription Id: ebd3533d-853e-3b48-de3e-0f2af18cc21a
[...] : Subscription   : { ... large JSON object ... }
[...] : Decision       : DENY
[...] : PDP ID         : default
```

Il log contiene la authorization subscription (un grande oggetto JSON), la decisione presa dal PDP, un timestamp e l'identificatore del PDP. La decisione è `DENY` perché non esiste ancora alcuna policy e il combining algorithm usa deny come valore predefinito.

La subscription non è molto leggibile nel log. Applichiamo un po' di formattazione per evidenziare le parti principali dell'oggetto subscription:

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

Nota: Spring Security 7 aggiunge automaticamente un'autorità `FACTOR_PASSWORD` all'autenticazione quando l'utente effettua il login con una password. Questo fa parte del framework di autenticazione a più fattori.

Senza alcuna configurazione specifica, la subscription è un oggetto grande con ridondanze significative. Il motore SAPL e l'integrazione Spring non hanno conoscenza del dominio dell'applicazione, quindi il PEP raccoglie qualunque informazione riesca a trovare che possa ragionevolmente descrivere subject, action e resource in una authorization subscription.

Per impostazione predefinita, il PEP tenta di serializzare direttamente l'oggetto `Authentication` dal `SecurityContext` di Spring in un oggetto JSON per il `subject`. È un approccio ragionevole nella maggior parte dei casi e, come puoi vedere, `subject.principal.birthday` contiene il dato che hai definito in precedenza per la classe personalizzata `LibraryUser` e lo rende disponibile al PDP.

Gli oggetti `action` e `resource` sono quasi identici. Senza conoscenza del dominio, il PEP può raccogliere solo informazioni tecniche dal contesto dell'applicazione.

Cominciamo dall'action e dalle informazioni Java associate. Il PEP può usare i nomi e i tipi delle classi e dei metodi protetti per descrivere l'action. Ad esempio, il nome del metodo `findById` può essere trattato come un verbo che descrive l'action, mentre l'argomento `1` è un attributo di quell'action.

Allo stesso tempo, l'argomento `1` può anche essere interpretato come l'ID della resource. Il PEP non sa quali valori del contesto Java siano rilevanti per l'applicazione, quindi aggiunge tutte le informazioni che può raccogliere sia all'action sia alla resource.

Se il metodo protetto viene eseguito come parte di una richiesta HTTP, anche quella richiesta può descrivere l'action o la resource. Ad esempio, il metodo HTTP `GET` può descrivere l'action, mentre l'URL identifica naturalmente una resource.

Questo tipo di oggetto subscription è dispendioso. Più avanti imparerai a personalizzare la subscription in modo che sia più compatta e meglio allineata al dominio dell'applicazione. Per ora, mantieni la configurazione predefinita.

## Archiviare policy SAPL per un PDP embedded

Il log della console mostra che il PDP non ha trovato alcun documento di policy corrispondente alla authorization subscription perché non esiste ancora alcuna policy. Con un PDP embedded, le policy possono essere archiviate insieme alle risorse dell'applicazione o da qualche parte nel filesystem dell'host. Le policy nelle risorse dell'applicazione sono statiche a runtime dopo che l'applicazione è stata compilata e avviata. Le policy nel filesystem vengono monitorate dal PDP e le modifiche possono avere effetto a runtime.

La configurazione predefinita di un PDP embedded è la prima opzione, quindi le policy dell'applicazione sono attualmente incorporate nelle risorse.

Per usare policy basate su filesystem, aggiungi `io.sapl.pdp.embedded.pdp-config-type = DIRECTORY` al file `application.properties`.

Il file `pdp.json` e le policy possono essere archiviati in cartelle diverse. Configura la posizione di `pdp.json` con `io.sapl.pdp.embedded.config-path` e la posizione delle policy con `io.sapl.pdp.embedded.policies-path`. Entrambe le proprietà richiedono un percorso filesystem valido verso la cartella che contiene i file.

**Nota:** `\` all'interno del percorso deve essere sostituito da `/`, ad esempio `C:\Users` da `C:/Users`.

## Creare policy SAPL

### Informazioni di base

I documenti di policy archiviati devono rispettare alcune regole:

- Il PDP SAPL caricherà solo documenti con suffisso `.sapl`.
- Ogni documento contiene esattamente una policy o un policy set.
- Le policy e i policy set di primo livello devono avere nomi univoci tra tutti i documenti.
- Tutti i documenti `.sapl` devono essere sintatticamente corretti, altrimenti il PDP potrebbe ricadere su una decisione predefinita determinata dall'algoritmo indicato nella configurazione `pdp.json`.

Un documento di policy SAPL contiene i seguenti elementi minimi:

* La *keyword* `policy`, che dichiara che il documento contiene una policy. Imparerai più avanti cosa sono i policy set.
* Un *nome* di policy univoco, in modo che il PDP possa distinguerla dalle altre policy.
* La keyword *entitlement*, `permit` oppure `deny`, che determina il risultato della decisione restituito dal PDP quando la policy è applicabile e il suo body valuta a `true`.

Gli altri elementi opzionali saranno spiegati più avanti.

### Prime policy SAPL: permit all o deny all

Le policy più basilari consentono o negano tutte le action senza ispezionare alcun attributo.

Inizia con una policy "permit all". Aggiungi un file `permit_all.sapl` alla cartella `resources/policies` del progetto Maven con il contenuto seguente:

```sapl
policy "permit all" permit
```

Come descritto sopra, il documento inizia con la keyword `policy`, che indica che il documento contiene una policy. Questa keyword è seguita dal *nome* della policy come stringa, in questo caso `"permit all"`. Il nome della policy è seguito dall'*entitlement*, in questo caso `permit`.

In questa guida non abbiamo descritto alcuna regola nella policy. Di conseguenza, tutte le sue regole sono soddisfatte e la policy dice al PDP di restituire una decisione `permit`, indipendentemente dai dettagli degli attributi contenuti nella authorization subscription o da eventuali attributi esterni provenienti dai PIP. Questo tipo di policy è pericoloso e poco pratico per i sistemi di produzione. Tuttavia, durante lo sviluppo è utile poter eseguire test rapidi senza che l'autorizzazione intralci il lavoro.

Riavvia l'applicazione, autenticati con un utente qualsiasi e accedi di nuovo a <http://localhost:8080/api/books/1>.

Ora dovresti ottenere i dati del libro 1:

```json
{
    "id"        : 1,
    "name"      : "Clifford: It's Pool Time!",
    "ageRating" : 0,
    "content"   : "*Woof*"
}
```

Il log dovrebbe apparire così:

```text
[...] : === PDP Decision ===
[...] : Subscription   : { ... }
[...] : Decision       : PERMIT
[...] : PDP ID         : default
[...] : Documents:
[...] :   permit all -> PERMIT
```

Il log mostra che il PDP ha trovato un documento di policy corrispondente (`permit all`) e che questo ha valutato a `PERMIT`. Poiché questa è l'unica policy e non ha condizioni, la policy `"permit all"` corrisponde sempre e restituisce sempre il proprio entitlement.

Poiché questo è l'unico documento corrispondente e restituisce `permit`, il PDP restituisce `PERMIT`. Il PEP consente quindi l'esecuzione del metodo repository.

Crea una policy "deny all" accanto a questa. Aggiungi un file `deny_all.sapl` alla cartella `resources/policies`:

```sapl
policy "deny all" deny
```

Riavvia l'applicazione, autenticati con un utente qualsiasi e accedi di nuovo a <http://localhost:8080/api/books/1>.

L'applicazione nega l'accesso. Il log mostra che entrambe le policy hanno corrisposto, ma il combining algorithm `PRIORITY_DENY` dà precedenza alla decisione `deny`:

```text
[...] : === PDP Decision ===
[...] : Subscription   : { ... }
[...] : Decision       : DENY
[...] : PDP ID         : default
[...] : Documents:
[...] :   permit all -> PERMIT
[...] :   deny all -> DENY
```

Questo è il comportamento secure-by-default: quando sono presenti sia permit sia deny, deny vince. Il motore SAPL implementa diversi combining algorithm per risolvere decisioni in conflitto (vedi [SAPL Documentation: Combining Algorithms](https://sapl.io/docs/latest/2_5_CombiningAlgorithms/)).

I tre campi nella configurazione dell'algoritmo in `pdp.json` controllano aspetti ortogonali: `votingMode` determina la priorità tra permit e deny, `defaultDecision` è il fallback quando nessuna policy corrisponde e `errorHandling` controlla se gli errori di valutazione vengono propagati o assorbiti silenziosamente.

Rinomina `deny_all.sapl` in `deny_all.sapl.off` e `permit_all.sapl` in `permit_all.sapl.off`. Dopo la rinomina, ricompila con `mvn clean compile` prima di riavviare. Il `clean` è necessario perché le risorse compilate nella directory `target/` non vengono rimosse da una build normale. Senza di esso, i vecchi file `.sapl` restano nel classpath e il PDP li carica ancora. L'accesso al libro dovrebbe ora essere negato perché il PDP carica solo documenti con il suffisso `.sapl` e non resta alcuna policy corrispondente.

Il PDP può anche restituire `INDETERMINATE` se si è verificato un errore durante la valutazione della policy. Il PEP nega l'accesso per ogni decisione diversa da un `PERMIT` esplicito. Ulteriori informazioni sui diversi risultati di una valutazione di policy si trovano nella [documentazione SAPL](https://sapl.io/docs/latest/).

In questa sezione hai imparato come interagiscono un PEP e un PDP in SAPL e come il PDP combina gli esiti di policy diverse. Nel passaggio successivo imparerai a scrivere policy più pratiche e a capire esattamente quando una policy è *applicabile* a una authorization subscription.

### Creare policy specifiche del dominio

Per prima cosa, aggiungi un PEP `@PreEnforce` al metodo `findAll` del `BookRepository`:

```java
public interface BookRepository {

    @PreEnforce
    List<Book> findAll();

    @PreEnforce
    Optional<Book> findById(Long id);

    Book save(Book entity);
}
```

Scriviamo una policy a partire dall'affermazione in linguaggio naturale "Solo Bob può vedere le voci dei singoli libri". Partire dal linguaggio naturale è utile perché rende esplicita la regola prevista prima di codificarla in SAPL. Crea un documento di policy `permit_bob_for_books.sapl` nella cartella delle policy sotto resources e traduci l'affermazione in un documento di policy SAPL come segue:

```sapl
policy "only bob may see individual book entries"
permit
    action.java.name == "findById" & action.java.declaringTypeName =~ ".*BookRepository$";
    subject.name == "bob";
```

Ora ricompila con `mvn clean compile` (clean è necessario per rimuovere dalla directory target eventuali file `.sapl.off` compilati in precedenza), riavvia ed effettua il login come Bob. Dovresti vedere una pagina di errore con stato 403. Questo accade perché il login reindirizza a `/api/books`, che chiama `findAll`, e nessuna policy corrisponde a quel metodo.

Ora accedi direttamente a un singolo libro su <http://localhost:8080/api/books/1>. L'accesso verrà concesso e il log apparirà così:

```text
[...] : === PDP Decision ===
[...] : Subscription   : { ... }
[...] : Decision       : PERMIT
[...] : PDP ID         : default
[...] : Documents:
[...] :   only bob may see individual book entries -> PERMIT
```

Ora vai a <http://localhost:8080/logout> ed effettua il logout. Poi accedi come Zoe e prova ad aprire <http://localhost:8080/api/books/1>.

L'applicazione nega l'accesso:

```text
[...] : === PDP Decision ===
[...] : Subscription   : { ... }
[...] : Decision       : DENY
[...] : PDP ID         : default
```

Il processo decisionale del PDP ora appare diverso. Per prima cosa, esamina perché non ci sono documenti applicabili quando si accede a `/api/books` o dopo un login riuscito.

Se osservi la policy, le condizioni che seguono `permit` contengono due regole separate da punti e virgola. La prima condizione `action.java.name == "findById" & action.java.declaringTypeName =~ ".*BookRepository$"` agisce come regola di scoping che determina se la policy è rilevante per la authorization subscription data. Il PDP valuta le condizioni restanti solo se questa prima condizione è `true`. Come visto nell'esempio `"permit all"`, se non sono presenti condizioni, la policy si applica sempre.

In questo caso, la *target expression* esamina due attributi dell'action nella subscription. Controlla se `action.java.name` è uguale a `"findById"` e se `action.java.declaringTypeName` corrisponde all'espressione regolare `".*BookRepository$"`. In altre parole, la stringa dell'attributo deve terminare con `BookRepository`. SAPL usa l'operatore di confronto regex `=~` per questo controllo.

**Nota**: Nel JSON della authorization subscription, gli oggetti annidati compaiono come valori oggetto dentro altri oggetti. Nelle espressioni di policy SAPL, navighi queste strutture annidate con la dot notation. Ad esempio, `"action": {"java": {"name": "findById"}}` nella subscription diventa `action.java.name` nella policy.

Queste due espressioni spiegano perché il PDP ha identificato il documento di policy `"permit_bob_for_books.sapl"` come applicabile quando si accede a singoli libri, ma non trova un documento corrispondente quando si accede all'intera lista.

Nota che SAPL distingue tra operatori booleani lazy, `&&` e `||` per AND e OR, e operatori booleani eager, `&` e `|`. Le *target expression* permettono solo operatori eager, un requisito per indicizzare efficientemente policy set più grandi.

Il PDP valuta la policy completa quando l'utente tenta di accedere al singolo libro. Il *policy body* è la lista di condizioni che segue `permit` o `deny`. Contiene un numero arbitrario di regole o assegnazioni di variabili, ognuna terminata dallo statement terminator di SAPL. Ogni regola è un'espressione booleana. Il body nel suo insieme valuta a `true` quando tutte le sue regole valutano a `true`. Le regole vengono valutate in modo lazy dall'alto verso il basso.

Nelle situazioni sopra, la regola che controlla il nome di Bob è `true` solo quando Bob accede al libro.

In questa sezione hai imparato quando un documento SAPL è applicabile e come le condizioni nel policy body determinano la decisione di autorizzazione.

Successivamente imparerai a personalizzare la authorization subscription e a usare funzioni temporali per concedere l'accesso solo ai libri adatti all'età.

### Applicare la classificazione per età dei singoli libri

Prima di continuare, disattiva tutte le policy esistenti nel progetto eliminandole o aggiungendo il suffisso `.off` al nome del file.

L'obiettivo di questa sezione è concedere l'accesso solo ai libri appropriati per l'età dell'utente. Per prendere questa decisione, il PDP ha bisogno della data di nascita dell'utente (attributo del subject), della classificazione per età del libro (attributo della resource) e della data corrente (attributo dell'environment). Quando esamini la authorization subscription inviata negli esempi precedenti, noterai che al momento nella subscription è disponibile solo la data di nascita dell'utente. Come possiamo rendere disponibili gli altri attributi al PDP nelle policy?

In generale, esistono due possibili sorgenti per gli attributi: la authorization subscription o i Policy Information Point (PIP).

Considera la classificazione per età del libro. Questa informazione non è nota al PEP prima di eseguire la query. Pertanto, nel `BookRepository`, sostituisci `@PreEnforce` su `findById` con un'annotazione `@PostEnforce` come segue:

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

Questa annotazione cambia il flusso di enforcement:

* Invoca prima il metodo.
* Costruisci una authorization subscription personalizzata con [Spring Expression Language (SpEL)](https://docs.spring.io/spring-framework/docs/current/reference/html/core.html#expressions).
* Sottoscriviti al PDP con la authorization subscription personalizzata.
* Applica la decisione.

Quando abbiamo ispezionato la authorization subscription generata automaticamente in origine, l'oggetto risultante era relativamente grande e tecnico. Qui i parametri dell'annotazione `@PostEnforce` aiutano a creare una authorization subscription più precisa, aderente al dominio dell'applicazione.

Il parametro `subject = "authentication.getPrincipal()"` estrae l'oggetto principal dall'oggetto authentication e lo usa come oggetto subject nella subscription.

Il parametro `action = "'read book'"` imposta l'oggetto action nella subscription sulla costante stringa `read book`.

Infine, il parametro `resource = "returnObject"` imposta l'oggetto resource nella subscription sul risultato dell'invocazione del metodo. Poiché questa resource è l'entità libro, contiene automaticamente il suo attributo `ageRating`.

Dopo aver identificato questi oggetti, il PEP usa l'`ObjectMapper` nell'application context Spring per serializzare gli oggetti in JSON.

La authorization subscription risultante sarà simile a questa:

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

Questa authorization subscription è molto più gestibile e pratica del tentativo automatico dell'integrazione Spring senza personalizzazioni.

La policy che scriveremo per applicare il vincolo di età del libro introdurrà diversi nuovi concetti:

* Definizione di variabili di attributo locali
* Uso di Policy Information Point
* Librerie di funzioni

Crea un documento di policy `check_age.sapl` come segue:

```sapl
policy "check age"
permit
    action == "read book";
    var birthday  = subject.birthday;
    var today     = time.dateOf(|<time.now>);
    var age       = time.timeBetween(birthday, today, "years");
    age >= resource.ageRating;
```

Nella sua prima condizione, la policy `check age` limita la propria applicabilità a tutte le authorization subscription con l'action `read book`.

La policy definisce poi una variabile di attributo locale chiamata `birthday` e la assegna all'attributo `subject.birthday`.

La riga successiva assegna la data corrente alla variabile `today`. In SAPL, le parentesi angolari `<ATTRIBUTE_IDENTIFIER>` indicano un attribute stream. Si tratta di una subscription a una sorgente di attributi esterna fornita da un Policy Information Point (PIP). In questo caso, l'identificatore `time.now` accede all'ora corrente in UTC dall'orologio di sistema.

In questa guida non abbiamo bisogno di uno stream di aggiornamenti temporali. Ci serve solo il primo evento nell'attribute stream. Anteporre il simbolo pipe alle parentesi angolari `|<>` prende il primo evento e poi annulla la sottoscrizione al PIP. Le librerie temporali in SAPL usano stringhe ISO 8601 per rappresentare il tempo. La funzione `time.dateOf` estrae quindi la componente data dal timestamp ottenuto dal PIP.

La policy calcola l'età del subject in anni usando la funzione `time.timeBetween` e le variabili definite.

Il motore valuta le regole di assegnazione delle variabili dall'alto verso il basso. Ogni regola può accedere alle variabili definite sopra di essa. Le regole di assegnazione valutano a `true` a meno che si verifichi un errore durante la valutazione.

Infine, la policy confronta `age` con `resource.ageRating`. La condizione valuta a `true` quando l'età del subject è almeno pari alla classificazione per età del libro.

Ad esempio, se effettui il login come Zoe e accedi al primo libro, i log mostreranno:

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

Sotto ogni policy che ha risolto un attributo esterno, il report elenca il valore dell'attributo visto dal PDP durante la valutazione. Questo fa parte dell'output `print-text-report` ed è indipendente da `print-trace`.

Tuttavia, se Alice tenta di accedere al libro quattro, l'accesso viene negato perché la condizione sull'età valuta a `false` e la policy non è applicabile:

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

La policy può essere scritta in modo più compatto usando un'istruzione `import`:

```sapl
import time.timeBetween
import time.dateOf
policy "check age compact"
permit
    action == "read book";
    var age = timeBetween(subject.birthday, dateOf(|<time.now>), "years");
    age >= resource.ageRating;
```

Gli import ti permettono di usare un nome più breve al posto del nome fully qualified delle funzioni archiviate nelle librerie SAPL.

Ad esempio, l'istruzione `import time.timeBetween` importa la funzione `timeBetween` dalla libreria time, rendendola disponibile con il suo nome semplice. Puoi anche importare singoli attribute finder o usare `'library name' as 'alias'` per creare alias.

## Trasformare e vincolare gli output con policy SAPL

In questa parte del tutorial userai le policy per modificare i risultati delle query e attivare effetti collaterali con i constraint.

SAPL può allegare constraint a una decisione di autorizzazione. Un constraint indica al PEP di svolgere lavoro aggiuntivo mentre applica quella decisione. SAPL distingue tre tipi di constraint:

* *Obligation*: un'istruzione obbligatoria. Se il PEP non può soddisfarla, non deve concedere l'accesso.
* *Advice*: un'istruzione opzionale. Se il PEP non può soddisfarla, la decisione di autorizzazione originale resta valida.
* *Transformation*: una forma speciale di obligation in cui il PEP deve sostituire la resource a cui si accede con l'oggetto resource fornito nella decisione di autorizzazione.

Per una decisione `PERMIT`, le obligation non risolte impediscono al PEP di concedere l'accesso. Gli advice non risolti no.

Ad esempio, qualunque medico può accedere alla cartella clinica di un paziente in caso di emergenza. Tuttavia, il sistema deve registrare l'accesso se il medico non è il medico curante di quel paziente, attivando un processo di audit. Questo scenario è spesso chiamato "break glass".

### Usare le transformation nelle policy SAPL

L'entità Book include già un campo `content`. Vogliamo modificare le policy della biblioteca in modo che gli utenti troppo giovani per un libro non vengano respinti del tutto. Invece, dovrebbe essere mascherato solo il contenuto del libro richiesto. Per implementare questa modifica, aggiungi il seguente documento di policy `check_age_transform.sapl` alle policy dell'applicazione:

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

Questa policy introduce l'espressione `transform`.

Se il policy body valuta a `true`, il valore JSON prodotto dall'istruzione `transform` viene aggiunto alla decisione di autorizzazione come proprietà `resource`. Questa proprietà indica al PEP di restituire la resource sostitutiva fornita al posto del risultato originale del metodo. Non modifica l'entità libro archiviata.

In questo caso, l'operatore di filtro `|-` viene applicato all'oggetto `resource`. L'operatore di filtro seleziona singole parti di un valore JSON per manipolarle, ad esempio applicando una funzione al valore selezionato. Qui l'operatore seleziona la chiave `content` della resource e la sostituisce con una versione che lascia visibili solo i primi tre caratteri e sostituisce il resto con un quadrato nero ("\\u2588" in Unicode). L'espressione di selezione è potente. Consulta la [documentazione SAPL](https://sapl.io/docs/latest/) per una spiegazione completa.

Assicurati che la policy originale di controllo dell'età sia ancora presente. Riavvia ed effettua il login come Alice.

Quando accedi a <http://localhost:8080/api/books/1>, otterrai:

```json
{
    "id"        : 1,
    "name"      : "Clifford: It's Pool Time!",
    "ageRating" : 0,
    "content"   : "*Woof*"
}
```

Alice ha solo tre anni. Quando richiede il libro su <http://localhost:8080/api/books/4>, il contenuto viene mascherato perché è troppo giovane per leggerlo:

```json
{
    "id"        : 4,
    "name"      : "The Three-Body Problem",
    "ageRating" : 14,
    "content"   : "Spa████████████"
}
```

I log per questo tentativo di accesso appaiono così:

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

Entrambi i documenti di policy vengono valutati per la subscription. La policy `check age` valuta a `NOT_APPLICABLE` perché Alice non è abbastanza grande per leggere "The Three-Body Problem". La policy `check age transform` valuta a `PERMIT` con una resource trasformata. Di conseguenza, il PEP sostituisce la resource originale con quella della decisione, che contiene il contenuto mascherato.

### Usare obligation e advice nelle policy SAPL

La policy `check age transform` con l'istruzione `transform` è stato il primo esempio di policy che indica al PEP di concedere l'accesso solo se vengono applicate contemporaneamente istruzioni aggiuntive.

Ora aggiungi una obligation a questa policy. Il sistema dovrebbe anche registrare le richieste per libri che l'utente è troppo giovane per leggere. Questo dà ai genitori l'opportunità di discutere prima il libro con i figli.

Per farlo, modifica la policy `check_age_transform.sapl` come segue:

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

Ora effettua il login come Alice e prova ad accedere a <http://localhost:8080/api/books/2>.

L'accesso verrà negato e i log appariranno come segue:

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

Il PDP ha restituito `PERMIT`, ma il PEP ha comunque negato l'accesso perché la decisione di autorizzazione conteneva una obligation di logging. SAPL rappresenta obligation e advice come oggetti JSON, e l'applicazione deve fornire handler per i tipi di constraint che usa. Poiché nessun handler era ancora in grado di comprendere e applicare la obligation di logging, il PEP ha negato l'accesso.

Per supportare la obligation di logging, implementa un *constraint handler provider*:

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

L'integrazione SAPL Spring consegna i constraint handler tramite *signal* emessi in punti ben definiti del ciclo di vita del PEP. Esempi di signal sono `DecisionSignal` (il momento in cui la decisione arriva al PEP), `OutputSignal` (per ogni risultato emesso dal metodo protetto) e alcuni signal specifici HTTP se il PEP si trova su un percorso HTTP. Ogni provider dichiara a quale signal o a quali signal si collegano i propri handler e con quale priorità.

Un `ConstraintHandlerProvider` è l'unica interfaccia implementata da ogni provider. Il suo unico metodo, `getConstraintHandlers`, riceve il valore del constraint e l'insieme dei tipi di signal che il PEP distribuito emette effettivamente. Il provider restituisce una lista vuota quando non riconosce il constraint, oppure una lista non vuota di voci `ScopedConstraintHandler` quando lo riconosce. Ogni voce associa un handler al tipo di signal a cui si collega e a una priorità che ordina l'esecuzione. Un singolo provider può restituire diverse voci per signal differenti se un constraint guida handler coordinati lungo il ciclo di vita.

L'handler stesso esiste in tre forme, espresse come sotto-interfacce sealed di `ConstraintHandler`:

* `Runner` è un `Runnable` per effetti collaterali fire-and-forget (logging, emissione di audit).
* `Consumer<T>` osserva un valore di signal tipizzato senza modificarlo (ispeziona la decisione, osserva un elemento emesso).
* `Mapper<T>` è un `UnaryOperator<T>` che trasforma un valore di signal (riscrive un response body, filtra una collection restituita).

Nel caso del logging, l'handler è un effetto collaterale collegato al `DecisionSignal`. L'helper statico `ConstraintHandlerProvider.constraintTypeAndSignal` combina due controlli: il constraint deve essere del tipo atteso e il PEP distribuito deve emettere il signal atteso. Il provider restituisce un `Runner` che stampa il campo `message` della obligation tramite SLF4J.

Dopo aver effettuato il login come Alice e aver acceduto a <http://localhost:8080/api/books/2>, l'accesso viene concesso e ora i log contengono la riga seguente:

```text
[...] : Attention, alice accessed the book 'The Rescue Mission: (Pokemon: Kalos Reader #1)'.
```

Proviamo un altro esempio di obligation.

Dopo un login riuscito, `/api/books` è ancora negato perché non abbiamo ancora implementato una policy per il metodo `findAll`. Abbiamo bisogno di una policy che permetta all'utente di elencare i libri adatti alla sua età. Questa volta non sostituiamo la resource con un'istruzione `transform`. In una biblioteca reale, ciò potrebbe richiedere al PEP di elaborare centinaia di record. Invece, indichiamo al PEP di restituire solo determinati libri.

Per prima cosa, completa `@PreEnforce` su `findAll` nel `BookRepository` come segue:

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

L'idea è la stessa del metodo `findById`. Il parametro `subject = "authentication.getPrincipal()"` estrae l'oggetto principal e lo usa come oggetto subject nella subscription. Il parametro `action = "'list books'"` imposta l'oggetto action sulla stringa `list books`. Poiché `@PreEnforce` viene eseguito prima del metodo, non esiste ancora un valore di ritorno. Il PEP lascia la resource assente o la deriva dal contesto disponibile.

Per restituire solo i libri accessibili, scrivi una policy come segue:

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

Usiamo la classe `ContentFilterPredicateProvider` già fornita nel motore SAPL. Questa classe filtra un oggetto JSON ed estrae i nodi che corrispondono alle condizioni specificate.

La obligation seleziona questo provider con l'assegnazione `"type" : "jsonContentFilterPredicate"`. Il campo `conditions` specifica poi una o più condizioni da controllare. Qui il provider controlla l'array per individuare nodi JSON che contengono l'elemento `ageRating` e la cui classificazione per età è minore o uguale all'età dell'utente che accede. Nella risposta restano solo i nodi corrispondenti.

Se hai bisogno di un comportamento personalizzato, puoi implementare un tuo *constraint handler provider*:

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

La forma rispecchia il provider di logging, ma l'handler ora è un `Mapper<Object>` collegato all'`OutputSignal`. `OutputSignal` è il signal per-risultato che il PEP emette una volta che il metodo protetto ha prodotto il proprio valore di ritorno. Un `Mapper` trasforma quel valore prima che il PEP lo rilasci. `SignalType.findIn` cerca nell'insieme di signal del PEP distribuito un `OutputSignal` di qualunque tipo di valore. Poiché `findAll` restituisce `List<Book>` (vedi la modifica a `JpaBookRepository` fatta in precedenza nel tutorial), il PEP distribuito emette un `OutputSignal` il cui tipo di valore è la lista, e il nostro `Mapper` riceve a runtime la lista popolata.

Il mapper applica il predicato sull'età e restituisce un nuovo `ArrayList<Book>` che contiene solo le voci che il subject è autorizzato a vedere. Se nessuna voce corrisponde, restituire un `List<Book>` vuoto è accettabile perché la policy su `findAll` ha già permesso la richiesta. La obligation restringe solo l'insieme dei risultati. Il mapper lascia immodificata la lista originale e restituisce una copia filtrata.

Ora effettua il login come Bob e vedrai la seguente lista di libri:

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

## Creare un policy set

Un policy set SAPL raggruppa policy e le valuta con il proprio combining algorithm. Il risultato del set viene poi combinato con i risultati di altre policy o policy set di primo livello. I policy set usano la stessa famiglia di algoritmi della risoluzione finale dei conflitti, incluso l'algoritmo `first or abstain errors propagate`.

**Nota**: A differenza del file `pdp.json`, gli algoritmi nei policy set devono essere scritti in forma di linguaggio naturale minuscola.

Un policy set SAPL è composto dai seguenti elementi:

* la *keyword* `set`, che dichiara che il documento contiene un policy set
* un *nome* di policy set univoco, in modo che il PDP possa distinguerlo dagli altri policy set
* un *combining algorithm*
* una *target expression* opzionale
* assegnazioni di variabili opzionali
* due o più policy

Come piccolo esempio, crea un file `check_age_by_id_set.sapl`. Solo una delle due policy della sezione precedente, `'check age compact'` e `'check age transform'`, può essere applicabile alla volta. Quindi creiamo un policy set che processi entrambe le policy.

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

Le regole per le policy all'interno di un set sono le stesse delle policy di primo livello. Ogni condizione termina con lo statement terminator di SAPL. La seconda policy del set ha una singola condizione direttamente dopo `permit`.

Disattiva i due documenti di policy `'check_age_compact.sapl'` e `'check_age_transform.sapl'` con l'estensione `.off` e riavvia l'applicazione.

Effettua il login come Bob e accedi a <http://localhost:8080/api/books/3>. I log appaiono così:

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

Il policy set valuta entrambe le sub-policy. `check age compact set` corrisponde (Bob è abbastanza grande), mentre `check age transform set` non si applica. Il set usa `first or abstain errors propagate`, quindi la prima sub-policy applicabile determina l'esito.

Ora accedi a <http://localhost:8080/api/books/4>. I log mostrano:

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

La policy `check age transform set` corrisponde per prima (età di Bob < 14), quindi il set restituisce il suo risultato includendo la obligation e la resource trasformata con contenuto mascherato. La seconda policy nel set non viene valutata perché la prima era già applicabile.

## Combinare obligation, advice e transformation

Per le policy di primo livello, SAPL raccoglie le obligation e gli advice da tutte le policy il cui risultato corrisponde alla decisione di autorizzazione finale. I policy set sono diversi: non tutte le policy interne vengono necessariamente valutate, quindi vengono raccolti solo obligation e advice delle policy interne valutate con risultato corrispondente.

Un altro caso speciale riguarda le *transformation*. Non è possibile combinare più istruzioni transformation tramite più policy. SAPL non restituirà la decisione `PERMIT` se più di una policy valuta a `PERMIT` e almeno una di esse contiene un'istruzione transformation. Questo si chiama **transformation uncertainty**.

Puoi scaricare il progetto demo dal [repository GitHub di questo tutorial](https://github.com/heutelbeck/sapl-tutorial-01-spring).

## Conclusioni

In questa serie di tutorial hai imparato le basi del controllo degli accessi basato su attributi e come proteggere un'applicazione Spring con SAPL.

Puoi ottenere molto di più con SAPL, incluse infrastrutture di autorizzazione flessibili e distribuite all'interno di un'organizzazione. I prossimi tutorial di questa serie si concentreranno su obligation più complesse, testing, tipi di dati reactive, data streaming, personalizzazione delle UI in base alle policy e applicazioni basate sul framework Axon.

Sentiti libero di partecipare alla discussione con gli sviluppatori e la community sul nostro [Discord Server](https://discord.gg/pRXEVWm3xM).
