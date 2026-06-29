---
layout: sapl
lang: fr
ref: spring-guide
title: "Spring Security avec SAPL: Guides SAPL"
description: "Sécuriser une application Spring Boot avec SAPL et le contrôle d'accès par attributs. Autorisation au niveau des méthodes, restrictions d'âge, transformation de contenu, obligations et policy sets."
permalink: /fr/guides/spring/
sitemap: false
robots: noindex,nofollow
---

## Sécurité des méthodes Spring Boot avec SAPL

Ce guide explique comment sécuriser une application Spring Boot avec SAPL. Vous allez ajouter une autorisation fondée sur des policies aux méthodes d'un repository JPA, écrire des policies qui appliquent des restrictions d'âge, transformer et filtrer des résultats de requêtes selon les attributs de l'utilisateur, et implémenter des constraint handlers pour les obligations.

Le guide suppose une connaissance de base de Spring Boot. Pour un rappel sur les concepts ABAC et l'architecture de SAPL, consultez la [documentation](https://sapl.io/docs/latest/).

Le code source complet est disponible sur [github.com/heutelbeck/sapl-tutorial-01-spring](https://github.com/heutelbeck/sapl-tutorial-01-spring).

## Configuration du projet

Commencez par créer une application Spring Boot simple. Ouvrez [Spring Initializr](https://start.spring.io/) et ajoutez les dépendances suivantes:

* **Spring Web** (pour fournir une API REST permettant de tester votre application)
* **Spring Data JPA** (pour développer le modèle de domaine de votre application)
* **H2 Database** (comme base de données en mémoire simple pour prendre en charge l'application)
* **Lombok** (pour éliminer une partie du code répétitif)
* **Spring Boot DevTools** (pour améliorer le processus de développement)

Ce tutoriel utilise Maven comme outil de build et Java comme langage de programmation.

Sélectionnez Java 21 et Spring Boot 4.1.0 ou une version plus récente dans l'Initializr.

Vos paramètres Initializr devraient maintenant ressembler à ceci:

![Spring Initializr](/assets/guides/spring/spring_initializr.webp)

Cliquez sur "GENERATE." Votre navigateur téléchargera le modèle de projet sous forme de fichier ".zip".

Décompressez le projet et importez-le dans votre IDE préféré.

### Ajout des dépendances SAPL

SAPL fournit un module bill of materials qui maintient la compatibilité des versions des modules SAPL. Après avoir ajouté le bloc suivant à votre `pom.xml`, vous n'avez plus besoin de déclarer la `<version>` de chaque dépendance SAPL:

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

Une application qui utilise SAPL a besoin d'un Policy Decision Point (PDP) et d'un ou plusieurs Policy Enforcement Points (PEP). Le PDP prend les décisions d'autorisation. Vous pouvez l'intégrer à votre application, ou l'exécuter comme serveur dédié et déléguer les décisions à ce service distant. Ce tutoriel utilise un PDP embarqué qui prend les décisions localement à partir de policies stockées dans les ressources de l'application. SAPL s'intègre aussi à Spring Security, ce qui vous permet de déclarer des PEP sur des beans Spring avec des annotations. Ajoutez la dépendance starter suivante à votre projet:

```xml
    <dependency>
        <groupId>io.sapl</groupId>
        <artifactId>sapl-spring-boot-starter</artifactId>
    </dependency>
```

Les versions publiées de SAPL sont disponibles depuis Maven Central. Pour les builds non publiés, ajoutez le dépôt Central Portal snapshots et utilisez la version `x.y.z-SNAPSHOT` correspondante.

L'exemple actuel utilise Spring Boot 4.1.0 et SAPL 4.1.1. Les versions de Spring Boot et de SAPL ne sont pas couplées.

Pour utiliser l'Argon2 Password Encoder, ajoutez la dépendance suivante:

```xml
    <dependency>
        <groupId>org.bouncycastle</groupId>
        <artifactId>bcpkix-jdk18on</artifactId>
        <version>1.84</version>
    </dependency>
```

Créez un dossier `policies` sous `src/main/resources`, puis créez dans ce dossier un fichier nommé `pdp.json`:

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

L'objet `algorithm` sélectionne l'algorithme de combinaison utilisé pour résoudre les résultats d'évaluation de policies contradictoires. Les trois champs contrôlent des préoccupations orthogonales:

* `votingMode` détermine quel type de décision est prioritaire lorsque des votes permit et deny sont tous deux présents.
* `defaultDecision` est le repli lorsqu'aucune policy ne correspond à la subscription.
* `errorHandling` contrôle ce qui se passe lorsque des erreurs d'évaluation de policy surviennent (`PROPAGATE` rend les erreurs visibles, `ABSTAIN` les ignore silencieusement).

Cette configuration est volontairement restrictive: deny est prioritaire, la décision par défaut est deny, et les erreurs sont propagées. C'est la posture secure-by-default. Vous écrirez des policies permit explicites pour accorder l'accès.

Le répertoire `policies` et le fichier `pdp.json` sont requis pour que le PDP embarqué démarre. Sans eux, l'application échouera au démarrage.

Vous pouvez utiliser la propriété `variables` pour définir des variables d'environnement, comme la configuration des Policy Information Points (PIP). Toutes les policies peuvent accéder au contenu de ces variables.

Ce fichier termine la configuration Maven de base. Vous pouvez maintenant commencer à implémenter l'application.

## Le domaine du projet

Le domaine est une bibliothèque dans laquelle les utilisateurs peuvent consulter un livre uniquement s'ils satisfont à son âge minimal requis. Si Spring Boot, JPA et Spring Security vous sont déjà familiers, passez directement à [Sécuriser les méthodes de repository avec SAPL](#Method-Security).

### Définir l'entité Book et le repository

Commencez par définir une entité de livre contenant un ID, un nom, une classification d'âge et un contenu. Vous pouvez utiliser les annotations Lombok pour générer les getters, setters et constructeurs:

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

Définissez une interface de repository correspondante. Pour l'instant, incluez seulement `findAll`, `findById` et `save`:

```java
public interface BookRepository {
    List<Book> findAll();
    Optional<Book> findById(Long id);
    Book save(Book entity);
}
```

Définissez un bean de repository correspondant afin que Spring Data puisse instancier une implémentation de votre interface:

```java
@Repository
// Important: interface order matters for detecting SAPL annotations.
public interface JpaBookRepository extends BookRepository, ListCrudRepository<Book, Long>  { }
```

Nous utilisons `ListCrudRepository` au lieu de `CrudRepository` afin que `findAll()` retourne une `List<Book>` plutôt qu'un `Iterable<Book>`. Le constraint handler que nous écrirons plus tard pour filtrer des collections a besoin d'un type de conteneur reconnaissable sur lequel opérer.

### Exposer les livres avec un contrôleur REST

Exposez les livres au moyen d'un contrôleur REST simple. L'annotation Lombok `@RequiredArgsConstructor` crée un constructeur pour l'injection de dépendance du repository:

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

### Créer une implémentation personnalisée de `LibraryUser`

Étendez maintenant la classe `User` de `org.springframework.security.core.userdetails` afin de créer une implémentation personnalisée `LibraryUser` contenant la date de naissance de l'utilisateur de la bibliothèque.

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

Pour vous assurer que la classe personnalisée `LibraryUser` est stockée dans le contexte de sécurité, implémentez un `LibraryUserDetailsService` personnalisé. Pour ce tutoriel, un `UserDetailsService` en mémoire simple suffit:

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

### Créer une classe de configuration

Créez une classe `SecurityConfiguration` avec les annotations Spring `@Configuration` et `@EnableWebSecurity`. Cette classe fournit des méthodes qui sont traitées automatiquement dans le contexte de Spring Security.

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

### Générer des données de test au démarrage de l'application

La configuration par défaut avec H2 et JPA crée une base de données volatile en mémoire. Pour alimenter la base de données à chaque démarrage de l'application, créez un `CommandLineRunner`. Cette classe s'exécute une fois que le contexte d'application a été chargé avec succès:

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

Le domaine de l'application est complet, et vous pouvez tester l'application. Construisez-la avec `mvn clean install`, puis exécutez-la avec `mvn spring-boot:run` en ligne de commande ou au moyen d'une configuration d'exécution dans votre IDE.

Après le démarrage de l'application, allez à <http://localhost:8080/api/books>. Le navigateur vous redirige vers la page de connexion. Utilisez l'un des utilisateurs ci-dessus pour vous connecter. Vous devriez voir une liste de tous les livres:

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

Jusqu'ici, ce tutoriel n'a utilisé aucune fonctionnalité de SAPL, et vous avez simplement créé une application Spring Boot de base. Notez que nous n'avons ajouté explicitement aucune dépendance à Spring Security. L'intégration Spring de SAPL possède une dépendance transitive à Spring Security, ce qui l'a activé pour l'application.

## Sécuriser les méthodes de repository avec SAPL

### <a name="Method-Security"></a> Configurer la sécurité des méthodes

SAPL étend les fonctionnalités de sécurité des méthodes de Spring Security. Pour activer la sécurité des méthodes SAPL pour des décisions d'autorisation individuelles, ajoutez l'annotation `@EnableSaplMethodSecurity` à votre classe `SecurityConfiguration`.

```java
@Configuration
@EnableWebSecurity
@EnableSaplMethodSecurity
public class SecurityConfiguration {
    ...
}
```

### Ajouter le premier PEP

L'intégration SAPL Spring Boot utilise des annotations pour ajouter des PEP aux méthodes et aux classes. Ce tutoriel utilise les deux variantes `@PreEnforce` et `@PostEnforce`. Selon l'annotation, le PEP s'exécute avant ou après l'exécution de la méthode. Comme premier exemple, ajoutez `@PreEnforce` à la méthode `findById` de l'interface `BookRepository`:

```java
public interface BookRepository {
    List<Book> findAll();

    @PreEnforce
    Optional<Book> findById(Long id);

    Book save(Book entity);
}
```

### Activer la sortie console

Ajoutez `io.sapl.pdp.embedded.print-text-report=true` à votre fichier `application.properties`. Le rapport texte journalise chaque décision PDP avec la subscription, le résultat de décision et les documents de policy qui ont correspondu. Vous pouvez aussi choisir `...print-json-report` pour une variante lisible par machine ou `...print-trace` pour une trace d'évaluation complète incluant la résolution d'attributs. `print-trace` est l'explication la plus détaillée et n'est recommandée qu'en dernier recours pour le dépannage.

La sortie du rapport texte ressemble à ceci:

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

Pour chaque décision, vous voyez quels documents ont été évalués et leurs résultats individuels. Pour les policy sets, les résultats des sous-policies sont listés sous le nom du set. Si une policy a résolu des attributs depuis des Policy Information Points pendant l'évaluation, ces valeurs apparaissent sous un bloc `Attributes:` par document. Les obligations et advice sont listés lorsqu'ils sont présents dans la décision.

Pour une sortie de débogage supplémentaire, par exemple pour voir quels documents de policy sont chargés au démarrage, vous pouvez utiliser `logging.level.io.sapl=DEBUG` dans votre `application.properties`.

Redémarrez l'application, connectez-vous, puis naviguez vers <http://localhost:8080/api/books/1>. Vous devriez maintenant voir une page d'erreur incluant l'énoncé: `There was an unexpected error (type=Forbidden, status=403).`

Inspectez la console pour voir ce qui s'est passé en arrière-plan. Les logs devraient contenir des messages semblables aux suivants:

```text
[...] : === PDP Decision ===
[...] : Timestamp      : 2026-05-18T12:36:42.66151139+02:00
[...] : Subscription Id: ebd3533d-853e-3b48-de3e-0f2af18cc21a
[...] : Subscription   : { ... large JSON object ... }
[...] : Decision       : DENY
[...] : PDP ID         : default
```

Le log contient la subscription d'autorisation (un grand objet JSON), la décision prise par le PDP, un horodatage et l'identifiant du PDP. La décision est `DENY` parce qu'aucune policy n'existe encore et que l'algorithme de combinaison utilise deny par défaut.

La subscription n'est pas très lisible dans le log. Appliquons un peu de mise en forme pour décomposer les parties principales de l'objet de subscription:

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

Note: Spring Security 7 ajoute automatiquement une authority `FACTOR_PASSWORD` à l'authentification lorsque l'utilisateur se connecte avec un mot de passe. Cela fait partie du framework d'authentification multifacteur.

Sans configuration spécifique, la subscription est un grand objet avec des redondances importantes. Le moteur SAPL et l'intégration Spring ne possèdent pas de connaissance métier de l'application, le PEP rassemble donc toutes les informations qu'il peut trouver et qui pourraient raisonnablement décrire le subject, l'action et la resource dans une subscription d'autorisation.

Par défaut, le PEP tente de convertir directement l'objet `Authentication` du `SecurityContext` de Spring en objet JSON pour le `subject`. C'est une approche raisonnable dans la plupart des cas et, comme vous pouvez le voir, `subject.principal.birthday` contient les données que vous avez précédemment définies pour la classe personnalisée `LibraryUser` et les rend disponibles au PDP.

Les objets `action` et `resource` sont presque identiques. Sans connaissance métier, le PEP ne peut recueillir que des informations techniques depuis le contexte de l'application.

Commençons par l'action et les informations Java qui lui sont associées. Le PEP peut utiliser les noms et les types des classes et méthodes protégées pour décrire l'action. Par exemple, le nom de méthode `findById` peut être traité comme un verbe qui décrit l'action, tandis que l'argument `1` est un attribut de cette action.

En même temps, l'argument `1` peut également être interprété comme l'ID de la resource. Le PEP ne sait pas quelles valeurs du contexte Java sont pertinentes pour l'application, il ajoute donc à l'action et à la resource toutes les informations qu'il peut recueillir.

Si la méthode protégée s'exécute dans le cadre d'une requête HTTP, cette requête peut aussi décrire l'action ou la resource. Par exemple, la méthode HTTP `GET` peut décrire l'action, tandis que l'URL identifie naturellement une resource.

Ce type d'objet de subscription est gaspilleur. Plus loin, vous apprendrez à personnaliser la subscription afin qu'elle soit plus compacte et mieux alignée avec le domaine de votre application. Pour l'instant, conservez la configuration par défaut.

## Stocker des policies SAPL pour un PDP embarqué

Le log de la console montre que le PDP n'a trouvé aucun document de policy correspondant à la subscription d'autorisation parce qu'aucune policy n'existe encore. Avec un PDP embarqué, les policies peuvent être stockées avec les ressources de l'application ou quelque part sur le système de fichiers de l'hôte. Les policies dans les ressources de l'application sont statiques à l'exécution une fois que l'application a été construite et démarrée. Les policies sur le système de fichiers sont surveillées par le PDP, et les modifications peuvent prendre effet à l'exécution.

La configuration par défaut d'un PDP embarqué est la première option, les policies de l'application sont donc actuellement embarquées dans les ressources.

Pour utiliser des policies basées sur le système de fichiers, ajoutez `io.sapl.pdp.embedded.pdp-config-type = DIRECTORY` au fichier `application.properties`.

Le fichier `pdp.json` et les policies peuvent être stockés dans des dossiers différents. Configurez l'emplacement de `pdp.json` avec `io.sapl.pdp.embedded.config-path` et l'emplacement des policies avec `io.sapl.pdp.embedded.policies-path`. Les deux propriétés exigent un chemin de système de fichiers valide vers le dossier qui contient les fichiers.

**Note:** `\` dans le chemin doit être remplacé par `/`, par exemple `C:\Users` par `C:/Users`.

## Créer des policies SAPL

### Informations de base

Les documents de policy stockés doivent respecter certaines règles:

- Le PDP SAPL ne chargera que les documents portant le suffixe `.sapl`.
- Chaque document contient exactement une policy ou un policy set.
- Les policies et policy sets de premier niveau doivent avoir des noms uniques parmi tous les documents.
- Tous les documents `.sapl` doivent être syntaxiquement corrects, sinon le PDP peut revenir à une décision par défaut déterminée par l'algorithme donné dans la configuration `pdp.json`.

Un document de policy SAPL contient les éléments minimaux suivants:

* Le *mot-clé* `policy`, qui déclare que le document contient une policy. Vous découvrirez les policy sets plus tard.
* Un *nom* de policy unique afin que le PDP puisse la distinguer des autres policies.
* Le mot-clé *entitlement*, soit `permit` soit `deny`, qui détermine le résultat de décision que le PDP retourne lorsque la policy est applicable et que son corps s'évalue à `true`.

D'autres éléments optionnels seront expliqués plus loin.

### Premières policies SAPL: Permit All ou Deny All

Les policies les plus élémentaires autorisent ou refusent toutes les actions sans inspecter aucun attribut.

Commencez par une policy "permit all". Ajoutez un fichier `permit_all.sapl` au dossier `resources/policies` du projet Maven avec le contenu suivant:

```sapl
policy "permit all" permit
```

Comme décrit ci-dessus, le document commence par le mot-clé `policy`, qui indique que le document contient une policy. Ce mot-clé est suivi du *nom* de policy sous forme de chaîne, dans ce cas `"permit all"`. Le nom de policy est suivi de l'*entitlement*, dans ce cas `permit`.

Dans ce guide, nous n'avons décrit aucune règle dans la policy. Toutes ses règles sont donc satisfaites, et la policy indique au PDP de retourner une décision `permit`, indépendamment des détails des attributs contenus dans la subscription d'autorisation ou de tout attribut externe provenant de PIP. Ce type de policy est dangereux et peu pratique pour les systèmes de production. Cependant, il est utile pendant le développement pour pouvoir effectuer des tests rapides sans que l'autorisation gêne le travail.

Redémarrez l'application, authentifiez-vous avec n'importe quel utilisateur, puis accédez de nouveau à <http://localhost:8080/api/books/1>.

Vous devriez maintenant obtenir les données du livre 1:

```json
{
    "id"        : 1,
    "name"      : "Clifford: It's Pool Time!",
    "ageRating" : 0,
    "content"   : "*Woof*"
}
```

Le log devrait ressembler à ceci:

```text
[...] : === PDP Decision ===
[...] : Subscription   : { ... }
[...] : Decision       : PERMIT
[...] : PDP ID         : default
[...] : Documents:
[...] :   permit all -> PERMIT
```

Le log montre que le PDP a trouvé un document de policy correspondant (`permit all`) et qu'il s'est évalué à `PERMIT`. Comme c'est la seule policy et qu'elle n'a aucune condition, la policy `"permit all"` correspond toujours et retourne toujours son entitlement.

Comme c'est le seul document correspondant et qu'il retourne `permit`, le PDP retourne `PERMIT`. Le PEP autorise alors l'exécution de la méthode du repository.

Créez une policy "deny all" à côté. Ajoutez un fichier `deny_all.sapl` au dossier `resources/policies`:

```sapl
policy "deny all" deny
```

Redémarrez l'application, authentifiez-vous avec n'importe quel utilisateur, puis accédez de nouveau à <http://localhost:8080/api/books/1>.

L'application refuse l'accès. Le log montre que les deux policies ont correspondu, mais l'algorithme de combinaison `PRIORITY_DENY` donne la priorité à la décision `deny`:

```text
[...] : === PDP Decision ===
[...] : Subscription   : { ... }
[...] : Decision       : DENY
[...] : PDP ID         : default
[...] : Documents:
[...] :   permit all -> PERMIT
[...] :   deny all -> DENY
```

C'est le comportement secure-by-default: lorsque permit et deny sont tous deux présents, deny l'emporte. Le moteur SAPL implémente plusieurs algorithmes de combinaison pour résoudre les décisions contradictoires (voir [Documentation SAPL: Combining Algorithms](https://sapl.io/docs/latest/2_5_CombiningAlgorithms/)).

Les trois champs de la configuration d'algorithme dans `pdp.json` contrôlent des préoccupations orthogonales: `votingMode` détermine la priorité entre permit et deny, `defaultDecision` est le repli lorsqu'aucune policy ne correspond, et `errorHandling` contrôle si les erreurs d'évaluation se propagent ou sont absorbées silencieusement.

Renommez `deny_all.sapl` en `deny_all.sapl.off` et `permit_all.sapl` en `permit_all.sapl.off`. Après le renommage, reconstruisez avec `mvn clean compile` avant de redémarrer. Le `clean` est nécessaire parce que les ressources compilées dans le répertoire `target/` ne sont pas supprimées par un build normal. Sans cela, les anciens fichiers `.sapl` restent dans le classpath et le PDP les charge encore. L'accès au livre devrait maintenant être refusé parce que le PDP ne charge que les documents avec le suffixe `.sapl` et qu'aucune policy correspondante ne reste.

Le PDP peut également retourner `INDETERMINATE` si une erreur est survenue pendant l'évaluation de policy. Le PEP refuse l'accès pour toute décision autre qu'un `PERMIT` explicite. Des informations supplémentaires sur les différents résultats d'une évaluation de policy sont disponibles dans la [documentation SAPL](https://sapl.io/docs/latest/).

Dans cette section, vous avez appris comment un PEP et un PDP interagissent dans SAPL et comment le PDP combine les résultats de différentes policies. À l'étape suivante, vous apprendrez à écrire des policies plus pratiques et à quel moment exactement une policy est *applicable* à une subscription d'autorisation.

### Créer des policies spécifiques au domaine

Commencez par ajouter un PEP `@PreEnforce` à la méthode `findAll` du `BookRepository`:

```java
public interface BookRepository {

    @PreEnforce
    List<Book> findAll();

    @PreEnforce
    Optional<Book> findById(Long id);

    Book save(Book entity);
}
```

Écrivons une policy à partir de l'énoncé en langage naturel "Only Bob can see individual book entries". Partir du langage naturel est utile parce que cela rend la règle visée explicite avant de l'encoder en SAPL. Créez un document de policy `permit_bob_for_books.sapl` dans le dossier policies sous resources, puis traduisez l'énoncé en document de policy SAPL comme suit:

```sapl
policy "only bob may see individual book entries"
permit
    action.java.name == "findById" & action.java.declaringTypeName =~ ".*BookRepository$";
    subject.name == "bob";
```

Reconstruisez maintenant avec `mvn clean compile` (clean est nécessaire pour supprimer du répertoire target tout ancien fichier `.sapl.off` déjà compilé), redémarrez, puis connectez-vous comme Bob. Vous devriez voir une page d'erreur avec le statut 403. Cela se produit parce que la connexion redirige vers `/api/books`, qui appelle `findAll`, et qu'aucune policy ne correspond à cette méthode.

Accédez maintenant directement à un livre individuel à l'adresse <http://localhost:8080/api/books/1>. L'accès sera accordé, et le log ressemble à ceci:

```text
[...] : === PDP Decision ===
[...] : Subscription   : { ... }
[...] : Decision       : PERMIT
[...] : PDP ID         : default
[...] : Documents:
[...] :   only bob may see individual book entries -> PERMIT
```

Allez maintenant à <http://localhost:8080/logout> et déconnectez-vous. Connectez-vous ensuite comme Zoe et essayez d'accéder à <http://localhost:8080/api/books/1>.

L'application refuse l'accès:

```text
[...] : === PDP Decision ===
[...] : Subscription   : { ... }
[...] : Decision       : DENY
[...] : PDP ID         : default
```

Le processus de décision du PDP est maintenant différent. Examinons d'abord pourquoi il n'y a aucun document applicable lors de l'accès à `/api/books` ou après une connexion réussie.

Si vous regardez la policy, les conditions qui suivent `permit` contiennent deux règles séparées par des points-virgules. La première condition `action.java.name == "findById" & action.java.declaringTypeName =~ ".*BookRepository$"` agit comme une règle de portée qui détermine si la policy est pertinente pour la subscription d'autorisation donnée. Le PDP n'évalue les conditions restantes que si cette première condition vaut `true`. Comme dans l'exemple `"permit all"`, si aucune condition n'est présente, la policy s'applique toujours.

Dans ce cas, la *target expression* examine deux attributs de l'action dans la subscription. Elle vérifie si `action.java.name` est égal à `"findById"` et si `action.java.declaringTypeName` correspond à l'expression régulière `".*BookRepository$"`. En d'autres termes, la chaîne d'attribut doit se terminer par `BookRepository`. SAPL utilise l'opérateur de comparaison regex `=~` pour cette vérification.

**Note**: Dans le JSON de subscription d'autorisation, les objets imbriqués apparaissent comme valeurs d'objet à l'intérieur d'autres objets. Dans les expressions de policy SAPL, vous naviguez dans ces structures imbriquées avec la notation pointée. Par exemple, `"action": {"java": {"name": "findById"}}` dans la subscription devient `action.java.name` dans la policy.

Ces deux expressions expliquent pourquoi le PDP a identifié le document de policy `"permit_bob_for_books.sapl"` comme applicable lors de l'accès à des livres individuels, mais ne trouve pas de document correspondant lors de l'accès à la liste entière.

Notez que SAPL distingue les opérateurs booléens paresseux, `&&` et `||` pour AND et OR, et les opérateurs booléens immédiats, `&` et `|`. Les *target expressions* n'autorisent que les opérateurs immédiats, une exigence pour indexer efficacement de grands policy sets.

Le PDP évalue la policy complète lorsque l'utilisateur tente d'accéder au livre individuel. Le *policy body* est la liste des conditions qui suivent `permit` ou `deny`. Il contient un nombre arbitraire de règles ou d'affectations de variables, chacune se terminant par le terminateur d'instruction SAPL. Chaque règle est une expression booléenne. Le body dans son ensemble s'évalue à `true` lorsque toutes ses règles s'évaluent à `true`. Les règles sont évaluées paresseusement de haut en bas.

Dans les situations ci-dessus, la règle qui vérifie le nom de Bob n'est `true` que lorsque Bob accède au livre.

Dans cette section, vous avez appris quand un document SAPL est applicable et comment les conditions du policy body déterminent la décision d'autorisation.

Vous allez maintenant apprendre à personnaliser la subscription d'autorisation et à utiliser des fonctions temporelles pour accorder l'accès uniquement à des livres adaptés à l'âge.

### Appliquer la classification d'âge des livres individuels

Avant de continuer, désactivez toutes les policies existantes de votre projet en les supprimant ou en ajoutant le suffixe `.off` au nom de fichier.

L'objectif de cette section est d'accorder l'accès uniquement aux livres adaptés à l'âge de l'utilisateur. Pour prendre cette décision, le PDP a besoin de la date de naissance de l'utilisateur (attribut du subject), de la classification d'âge du livre (attribut de la resource) et de la date courante (attribut de l'environnement). Lorsque vous examinez la subscription d'autorisation envoyée dans les exemples précédents, vous remarquerez que seule la date de naissance de l'utilisateur est actuellement disponible dans la subscription. Comment rendre les autres attributs disponibles au PDP dans les policies?

De manière générale, il existe deux sources potentielles d'attributs: la subscription d'autorisation ou les Policy Information Points (PIP).

Prenons la classification d'âge du livre. Cette information n'est pas connue du PEP avant l'exécution de la requête. Par conséquent, dans le `BookRepository`, remplacez le `@PreEnforce` sur `findById` par une annotation `@PostEnforce` comme suit:

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

Cette annotation modifie le flux d'enforcement:

* Invoquer d'abord la méthode.
* Construire une subscription d'autorisation personnalisée avec [Spring Expression Language (SpEL)](https://docs.spring.io/spring-framework/docs/current/reference/html/core.html#expressions).
* S'abonner au PDP avec la subscription d'autorisation personnalisée.
* Appliquer la décision.

Lorsque nous avons inspecté la subscription d'autorisation générée automatiquement, l'objet résultant était relativement grand et technique. Ici, les paramètres de l'annotation `@PostEnforce` aident à créer une subscription d'autorisation plus précise et adaptée au domaine de l'application.

Le paramètre `subject = "authentication.getPrincipal()"` extrait l'objet principal depuis l'objet d'authentification et l'utilise comme objet subject dans la subscription.

Le paramètre `action = "'read book'"` définit l'objet action dans la subscription sur la constante de chaîne `read book`.

Enfin, le paramètre `resource = "returnObject"` définit l'objet resource dans la subscription sur le résultat de l'invocation de méthode. Comme cette resource est l'entité livre, elle contient automatiquement son attribut `ageRating`.

Après avoir identifié ces objets, le PEP utilise l'`ObjectMapper` du contexte d'application Spring pour sérialiser les objets en JSON.

La subscription d'autorisation résultante ressemblera à ceci:

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

Cette subscription d'autorisation est beaucoup plus maniable et pratique que les déductions automatiques effectuées par l'intégration Spring sans aucune personnalisation.

La policy que nous allons écrire pour appliquer la restriction d'âge du livre introduira plusieurs nouveaux concepts:

* Définition de variables d'attribut locales
* Utilisation des Policy Information Points
* Bibliothèques de fonctions

Créez un document de policy `check_age.sapl` comme suit:

```sapl
policy "check age"
permit
    action == "read book";
    var birthday  = subject.birthday;
    var today     = time.dateOf(|<time.now>);
    var age       = time.timeBetween(birthday, today, "years");
    age >= resource.ageRating;
```

Dans sa première condition, la policy `check age` limite son applicabilité à toutes les subscriptions d'autorisation dont l'action est `read book`.

La policy définit ensuite une variable d'attribut locale nommée `birthday` et lui affecte l'attribut `subject.birthday`.

La ligne suivante affecte la date courante à la variable `today`. Dans SAPL, les chevrons `<ATTRIBUTE_IDENTIFIER>` désignent un flux d'attributs. Il s'agit d'une subscription à une source d'attribut externe fournie par un Policy Information Point (PIP). Dans ce cas, l'identifiant `time.now` accède à l'heure courante en UTC depuis l'horloge système.

Dans ce guide, nous n'avons pas besoin d'un flux de mises à jour temporelles. Nous avons seulement besoin du premier événement du flux d'attributs. Préfixer les chevrons avec le symbole pipe `|<>` prend le premier événement puis se désabonne du PIP. Les bibliothèques temporelles de SAPL utilisent des chaînes ISO 8601 pour représenter le temps. La fonction `time.dateOf` extrait ensuite le composant date de l'horodatage récupéré depuis le PIP.

La policy calcule l'âge du subject en années avec la fonction `time.timeBetween` et les variables définies.

Le moteur évalue les règles d'affectation de variables de haut en bas. Chaque règle a accès aux variables définies au-dessus d'elle. Les règles d'affectation s'évaluent à `true`, sauf si une erreur survient pendant l'évaluation.

Enfin, la policy compare `age` à `resource.ageRating`. La condition s'évalue à `true` lorsque l'âge du subject est au moins égal à la classification d'âge du livre.

Par exemple, si vous vous connectez comme Zoe et accédez au premier livre, les logs montreront:

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

Sous chaque policy qui a résolu un attribut externe, le rapport liste la valeur d'attribut que le PDP a vue pendant l'évaluation. Cela fait partie de la sortie `print-text-report` et est indépendant de `print-trace`.

Cependant, si Alice tente d'accéder au livre quatre, l'accès est refusé parce que la condition d'âge s'évalue à `false` et que la policy n'est pas applicable:

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

La policy peut être écrite plus compactement avec une instruction `import`:

```sapl
import time.timeBetween
import time.dateOf
policy "check age compact"
permit
    action == "read book";
    var age = timeBetween(subject.birthday, dateOf(|<time.now>), "years");
    age >= resource.ageRating;
```

Les imports vous permettent d'utiliser un nom plus court au lieu du nom pleinement qualifié des fonctions stockées dans les bibliothèques SAPL.

Par exemple, l'instruction `import time.timeBetween` importe la fonction `timeBetween` depuis la bibliothèque time, ce qui la rend disponible sous son nom simple. Vous pouvez aussi importer des attribute finders individuels ou utiliser `'library name' as 'alias'` pour créer un alias.

## Transformer et contraindre les sorties avec des policies SAPL

Dans cette partie du tutoriel, vous utiliserez des policies pour modifier les résultats de requêtes et déclencher des effets de bord avec des contraintes.

SAPL peut attacher des contraintes à une décision d'autorisation. Une contrainte indique au PEP d'effectuer un travail supplémentaire lorsqu'il applique cette décision. SAPL distingue trois types de contraintes:

* *Obligation*: une instruction obligatoire. Si le PEP ne peut pas l'exécuter, il ne doit pas accorder l'accès.
* *Advice*: une instruction optionnelle. Si le PEP ne peut pas l'exécuter, la décision d'autorisation originale reste valable.
* *Transformation*: une forme spéciale d'obligation dans laquelle le PEP doit remplacer la resource accédée par l'objet resource fourni dans la décision d'autorisation.

Pour une décision `PERMIT`, les obligations non résolues empêchent le PEP d'accorder l'accès. Les advice non résolus ne l'empêchent pas.

Par exemple, tout médecin peut accéder au dossier médical d'un patient en cas d'urgence. Cependant, le système doit journaliser l'accès si le médecin n'est pas le médecin traitant de ce patient, ce qui déclenche un processus d'audit. C'est souvent appelé un scénario "break glass".

### Utiliser des transformations dans les policies SAPL

L'entité Book contient déjà un champ `content`. Nous voulons modifier les policies de la bibliothèque afin que les utilisateurs trop jeunes pour un livre ne soient pas purement et simplement refusés. À la place, seul le contenu du livre demandé doit être masqué. Pour implémenter cette modification, ajoutez le document de policy `check_age_transform.sapl` suivant aux policies de l'application:

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

Cette policy introduit l'expression `transform`.

Si le policy body s'évalue à `true`, la valeur JSON produite par l'instruction `transform` est ajoutée à la décision d'autorisation comme propriété `resource`. Cette propriété indique au PEP de retourner la resource de remplacement fournie au lieu du résultat original de la méthode. Elle ne modifie pas l'entité livre stockée.

Dans ce cas, l'opérateur de filtre `|-` est appliqué à l'objet `resource`. L'opérateur de filtre sélectionne des parties individuelles d'une valeur JSON pour les manipuler, par exemple en appliquant une fonction à la valeur sélectionnée. Ici, l'opérateur sélectionne la clé `content` de la resource et la remplace par une version qui laisse visibles seulement les trois premiers caractères et remplace le reste par un carré noir ("\\u2588" en Unicode). L'expression de sélection est puissante. Consultez la [documentation SAPL](https://sapl.io/docs/latest/) pour une explication complète.

Assurez-vous que la policy originale de vérification d'âge est toujours en place. Redémarrez et connectez-vous comme Alice.

Lorsque vous accédez à <http://localhost:8080/api/books/1>, vous obtiendrez:

```json
{
    "id"        : 1,
    "name"      : "Clifford: It's Pool Time!",
    "ageRating" : 0,
    "content"   : "*Woof*"
}
```

Alice n'a que trois ans. Lorsqu'elle demande le livre à <http://localhost:8080/api/books/4>, le contenu est masqué parce qu'elle est trop jeune pour le lire:

```json
{
    "id"        : 4,
    "name"      : "The Three-Body Problem",
    "ageRating" : 14,
    "content"   : "Spa████████████"
}
```

Les logs de cette tentative d'accès ressemblent à ceci:

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

Les deux documents de policy sont évalués pour la subscription. La policy `check age` s'évalue à `NOT_APPLICABLE` parce qu'Alice n'est pas assez âgée pour lire "The Three-Body Problem". La policy `check age transform` s'évalue à `PERMIT` avec une resource transformée. Par conséquent, le PEP remplace la resource originale par celle de la décision, qui contient le contenu masqué.

### Utiliser obligations et advice dans les policies SAPL

La policy `check age transform` avec l'instruction `transform` était le premier exemple d'une policy qui demande au PEP d'accorder l'accès seulement si des instructions supplémentaires sont appliquées en même temps.

Ajoutez maintenant une obligation à cette policy. Le système doit aussi journaliser les demandes de livres que l'utilisateur est trop jeune pour lire. Cela donne aux parents l'occasion de discuter d'abord du livre avec leurs enfants.

Pour cela, modifiez la policy `check_age_transform.sapl` comme suit:

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

Connectez-vous maintenant comme Alice et essayez d'accéder à <http://localhost:8080/api/books/2>.

L'accès sera refusé, et les logs ressemblent à ce qui suit:

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

Le PDP a retourné `PERMIT`, mais le PEP a tout de même refusé l'accès parce que la décision d'autorisation contenait une obligation de journalisation. SAPL représente les obligations et advice sous forme d'objets JSON, et l'application doit fournir des handlers pour les types de contraintes qu'elle utilise. Comme aucun handler ne pouvait encore comprendre et appliquer l'obligation de journalisation, le PEP a refusé l'accès.

Pour prendre en charge l'obligation de journalisation, implémentez un *constraint handler provider*:

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

L'intégration SAPL Spring fournit les constraint handlers au moyen de *signals* déclenchés à des points bien définis du cycle de vie du PEP. Des exemples de signals sont `DecisionSignal` (le moment où la décision arrive au PEP), `OutputSignal` (pour chaque résultat émis par la méthode protégée), ainsi que quelques signals spécifiques à HTTP si le PEP se trouve sur un chemin HTTP. Chaque provider déclare à quel ou quels signals ses handlers s'attachent et avec quelle priorité.

Un `ConstraintHandlerProvider` est l'interface unique que chaque provider implémente. Sa seule méthode, `getConstraintHandlers`, reçoit la valeur de contrainte et l'ensemble de types de signals que le PEP déployé émet réellement. Le provider retourne une liste vide lorsqu'il ne reconnaît pas la contrainte, ou une liste non vide d'entrées `ScopedConstraintHandler` lorsqu'il la reconnaît. Chaque entrée associe un handler au type de signal auquel il s'attache et à une priorité qui ordonne l'exécution. Un même provider peut retourner plusieurs entrées pour différents signals si une contrainte pilote des handlers coordonnés sur l'ensemble du cycle de vie.

Le handler lui-même existe sous trois formes, exprimées comme sous-interfaces sealed de `ConstraintHandler`:

* `Runner` est un `Runnable` pour les effets de bord fire-and-forget (journalisation, émission d'audit).
* `Consumer<T>` observe une valeur de signal typée sans la modifier (inspecter la décision, regarder un élément émis).
* `Mapper<T>` est un `UnaryOperator<T>` qui transforme une valeur de signal (réécrire un corps de réponse, filtrer une collection retournée).

Dans le cas de la journalisation, le handler est un effet de bord attaché au `DecisionSignal`. L'aide statique `ConstraintHandlerProvider.constraintTypeAndSignal` combine deux vérifications: la contrainte doit être du type attendu, et le PEP déployé doit émettre le signal attendu. Le provider retourne un `Runner` qui imprime le champ `message` de l'obligation via SLF4J.

Après vous être connecté comme Alice et avoir accédé à <http://localhost:8080/api/books/2>, l'accès est accordé, et les logs contiennent maintenant la ligne suivante:

```text
[...] : Attention, alice accessed the book 'The Rescue Mission: (Pokemon: Kalos Reader #1)'.
```

Essayons un autre exemple d'obligation.

Après une connexion réussie, `/api/books` est toujours refusé parce que nous n'avons pas encore implémenté de policy pour la méthode `findAll`. Nous avons besoin d'une policy qui laisse l'utilisateur lister les livres adaptés à son âge. Cette fois, nous ne remplaçons pas la resource avec une instruction `transform`. Dans une vraie bibliothèque, cela pourrait obliger le PEP à traiter des centaines d'enregistrements. À la place, nous demandons au PEP de retourner seulement certains livres.

Commencez par compléter le `@PreEnforce` sur `findAll` dans le `BookRepository` comme suit:

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

L'idée est la même que pour la méthode `findById`. Le paramètre `subject = "authentication.getPrincipal()"` extrait l'objet principal et l'utilise comme objet subject dans la subscription. Le paramètre `action = "'list books'"` définit l'objet action sur la chaîne `list books`. Comme `@PreEnforce` s'exécute avant la méthode, il n'y a pas encore de valeur de retour. Le PEP laisse la resource absente ou la déduit du contexte disponible.

Pour retourner seulement les livres accessibles, écrivez une policy comme suit:

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

Nous utilisons la classe `ContentFilterPredicateProvider`, qui est déjà fournie dans le moteur SAPL. Cette classe filtre un objet JSON et extrait les nœuds qui correspondent aux conditions indiquées.

L'obligation sélectionne ce provider avec l'affectation `"type" : "jsonContentFilterPredicate"`. Le champ `conditions` spécifie ensuite une ou plusieurs conditions à vérifier. Ici, le provider vérifie dans le tableau les nœuds JSON qui contiennent l'élément `ageRating` et dont la classification d'âge est inférieure ou égale à l'âge de l'utilisateur qui accède. Seuls les nœuds correspondants restent dans la réponse.

Si vous avez besoin d'un comportement personnalisé, vous pouvez implémenter votre propre *constraint handler provider*:

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

La forme reflète celle du logging provider, mais le handler est maintenant un `Mapper<Object>` attaché au `OutputSignal`. `OutputSignal` est le signal par résultat que le PEP émet une fois que la méthode protégée a produit sa valeur de retour. Un `Mapper` transforme cette valeur avant que le PEP ne la libère. `SignalType.findIn` recherche dans l'ensemble de signals du PEP déployé un `OutputSignal` de n'importe quel type de valeur. Comme `findAll` retourne `List<Book>` (voir la modification de `JpaBookRepository` plus tôt dans le tutoriel), le PEP déployé émet un `OutputSignal` dont le type de valeur est la liste, et notre `Mapper` reçoit la liste remplie à l'exécution.

Le mapper applique le prédicat d'âge et retourne une nouvelle `ArrayList<Book>` contenant seulement les entrées que le subject est autorisé à voir. Si aucune entrée ne correspond, retourner une `List<Book>` vide est acceptable parce que la policy sur `findAll` a déjà autorisé la requête. L'obligation ne fait que restreindre l'ensemble de résultats. Le mapper laisse la liste originale inchangée et retourne une copie filtrée.

Connectez-vous maintenant comme Bob, et vous verrez la liste de livres suivante:

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

## Créer un policy set

Un policy set SAPL regroupe des policies et les évalue avec son propre algorithme de combinaison. Le résultat du set est ensuite combiné avec les résultats d'autres policies ou policy sets de premier niveau. Les policy sets utilisent la même famille d'algorithmes que la résolution finale des conflits, y compris l'algorithme `first or abstain errors propagate`.

**Note**: Contrairement au fichier `pdp.json`, les algorithmes dans les policy sets doivent être écrits en minuscules sous forme de langage naturel.

Un policy set SAPL se compose des éléments suivants:

* le *mot-clé* `set`, qui déclare que le document contient un policy set
* un *nom* de policy set unique, afin que le PDP puisse le distinguer des autres policy sets
* un *algorithme de combinaison*
* une *target expression* optionnelle
* des affectations de variables optionnelles
* deux policies ou plus

Comme petit exemple, créez un fichier `check_age_by_id_set.sapl`. Une seule des deux policies de la section précédente, `'check age compact'` et `'check age transform'`, peut être applicable à la fois. Créons donc un policy set qui traite ces deux policies.

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

Les règles des policies dans un set sont les mêmes que celles des policies de premier niveau. Chaque condition se termine par le terminateur d'instruction SAPL. La deuxième policy du set possède une seule condition directement après `permit`.

Désactivez les deux documents de policy `'check_age_compact.sapl'` et `'check_age_transform.sapl'` avec l'extension `.off`, puis redémarrez l'application.

Connectez-vous comme Bob et accédez à <http://localhost:8080/api/books/3>. Les logs ressemblent à ceci:

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

Le policy set évalue les deux sous-policies. `check age compact set` correspond (Bob est assez âgé), tandis que `check age transform set` ne s'applique pas. Le set utilise `first or abstain errors propagate`, la première sous-policy applicable détermine donc le résultat.

Accédez maintenant à <http://localhost:8080/api/books/4>. Les logs montrent:

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

La policy `check age transform set` correspond en premier (âge de Bob < 14), le set retourne donc son résultat, y compris l'obligation et la resource transformée avec le contenu masqué. La deuxième policy du set n'est pas évaluée parce que la première était déjà applicable.

## Combiner obligations, advice et transformations

Pour les policies de premier niveau, SAPL collecte les obligations et advice de toutes les policies dont le résultat correspond à la décision d'autorisation finale. Les policy sets sont différents: toutes les policies internes ne sont pas nécessairement évaluées, donc seules les obligations et advice des policies internes évaluées avec le résultat correspondant sont collectés.

Un autre cas particulier concerne les *transformations*. Il n'est pas possible de combiner plusieurs instructions de transformation à travers plusieurs policies. SAPL ne retournera pas la décision `PERMIT` si plus d'une policy s'évalue à `PERMIT` et qu'au moins l'une d'elles contient une instruction de transformation. C'est ce qu'on appelle l'**incertitude de transformation**.

Vous pouvez télécharger le projet de démonstration depuis le [dépôt GitHub de ce tutoriel](https://github.com/heutelbeck/sapl-tutorial-01-spring).

## Conclusions

Dans cette série de tutoriels, vous avez appris les bases du contrôle d'accès par attributs et comment sécuriser une application Spring avec SAPL.

Vous pouvez faire bien davantage avec SAPL, notamment mettre en place des infrastructures d'autorisation distribuées et flexibles à l'échelle d'une organisation. Les prochains tutoriels de cette série porteront sur des obligations plus complexes, les tests, les types de données réactifs, le streaming de données, la personnalisation d'interfaces utilisateur fondée sur des policies, et les applications basées sur le framework Axon.

N'hésitez pas à échanger avec les développeurs et la communauté sur notre [Discord Server](https://discord.gg/pRXEVWm3xM).
