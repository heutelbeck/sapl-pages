---
layout: sapl
lang: fr
ref: spring-guide
title: "Spring Security avec SAPL: Guides SAPL"
description: "Securiser une application Spring Boot avec SAPL et le controle d acces par attributs. Autorisation au niveau methode, restrictions d age, transformations, obligations et policy sets."
permalink: /fr/guides/spring/
sitemap: false
robots: noindex,nofollow
---

## Securite des methodes Spring Boot avec SAPL

Ce guide montre comment securiser une application Spring Boot avec SAPL. Vous ajoutez une autorisation fondee sur des policies aux methodes d un repository JPA, vous ecrivez des policies qui appliquent des restrictions d age, vous transformez les resultats et vous filtrez des listes selon les attributs de l utilisateur.

Le guide suppose une connaissance de base de Spring Boot. Pour le contexte sur ABAC et l architecture de SAPL, consultez la [documentation](https://sapl.io/docs/latest/).

Le code source complet est disponible sur [github.com/heutelbeck/sapl-tutorial-01-spring](https://github.com/heutelbeck/sapl-tutorial-01-spring).

## Configuration du projet

Commencez par creer une application Spring Boot simple. Ouvrez [Spring Initializr](https://start.spring.io/) et ajoutez les dependances suivantes:

* **Spring Web** pour exposer une API REST
* **Spring Data JPA** pour le modele de domaine
* **H2 Database** comme base de donnees en memoire
* **Lombok** pour reduire le code boilerplate
* **Spring Boot DevTools** pour faciliter le developpement

Utilisez Maven comme outil de build et Java comme langage.

Selectionnez Java 21 et Spring Boot 4.1.0 ou une version plus recente.

![Spring Initializr](/assets/guides/spring/spring_initializr.webp)

Telechargez le projet, decompressez le fichier et importez le projet dans votre IDE.

### Dependances SAPL

SAPL fournit un module Bill of Materials. Il permet de ne pas declarer separement la version de chaque module SAPL:

```xml
    <dependencyManagement>
        <dependencies>
            <dependency>
                <groupId>io.sapl</groupId>
                <artifactId>sapl-bom</artifactId>
                <version>4.1.0</version>
                <type>pom</type>
                <scope>import</scope>
            </dependency>
        </dependencies>
    </dependencyManagement>
```

Ajoutez ensuite le starter Spring Boot de SAPL:

```xml
    <dependency>
        <groupId>io.sapl</groupId>
        <artifactId>sapl-spring-boot-starter</artifactId>
    </dependency>
```

Les versions publiees de SAPL sont disponibles sur Maven Central. Pour les builds non publies, vous pouvez ajouter le repository Central Portal snapshots et utiliser la version `x.y.z-SNAPSHOT` correspondante.

Cet exemple utilise Spring Boot 4.1.0 et SAPL 4.1.0. Le fait que les numeros de version correspondent est accidentel. Les versions de Spring Boot et de SAPL ne sont pas couplees.

Pour utiliser l Argon2 Password Encoder, ajoutez aussi Bouncy Castle:

```xml
    <dependency>
        <groupId>org.bouncycastle</groupId>
        <artifactId>bcpkix-jdk18on</artifactId>
        <version>1.84</version>
    </dependency>
```

Creez un dossier `policies` sous `src/main/resources` et ajoutez un fichier `pdp.json`:

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

## Modele de domaine

L application represente une petite bibliotheque. Chaque livre a une classification par age et ne peut etre lu completement que si l utilisateur connecte est assez age.

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

Le repository sera securise plus tard avec des annotations SAPL:

```java
public interface BookRepository {

    List<Book> findAll();

    Optional<Book> findById(Long id);

    Book save(Book entity);
}
```

Le repository Spring Data implemente ces methodes:

```java
public interface JpaBookRepository extends BookRepository, ListCrudRepository<Book, Long> {
}
```

## Utilisateurs et configuration de securite

L application d exemple utilise trois utilisateurs avec des ages differents. La date de naissance devient un attribut du subject dans la decision SAPL.

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

Activez Spring Security et SAPL Method Security dans une classe de configuration:

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

## Premiers Policy Enforcement Points

SAPL ajoute des Policy Enforcement Points avec des annotations sur les methodes ou les classes. Pour l acces a un livre individuel, `@PostEnforce` est utilise parce que la classification par age n est connue qu apres le chargement du livre:

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

`subject` extrait l utilisateur connecte depuis l authentification Spring Security. `action` definit un nom d action metier. Pour `findById`, `resource` pointe vers le livre charge.

## Restrictions d age pour les livres individuels

Une policy simple autorise l acces lorsque l utilisateur est assez age:

```sapl
import time.timeBetween
import time.dateOf
policy "check age"
permit
    action == "read book";
    var age = timeBetween(subject.birthday, dateOf(|<time.now>), "years");
    age >= resource.ageRating;
```

Si l utilisateur est trop jeune, SAPL peut aussi transformer la ressource. Dans cet exemple, le contenu est masque apres les trois premiers caracteres et une obligation de journalisation est ajoutee:

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

Pour traiter l obligation de journalisation, enregistrez un provider de gestion de contraintes:

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

## Filtrer les listes

Pour `findAll`, la decision est prise avant l appel de methode. La policy autorise l appel et ajoute une obligation pour filtrer la valeur retour:

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

Le `ContentFilterPredicateProvider` integre filtre la liste retournee afin que seuls les livres adaptes a l age restent visibles.

## Policy Set

Les deux policies pour les livres individuels peuvent etre regroupees dans un policy set:

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

Le policy set utilise `first or abstain errors propagate`. Des qu une policy interne est applicable, elle determine le resultat du set.

## Comportement attendu

Apres la mise en place, les cas principaux sont les suivants:

* Les utilisateurs anonymes sont rediriges vers la page de connexion.
* Bob voit uniquement les livres dont la classification est inferieure ou egale a 10.
* Alice voit uniquement le livre classe 0.
* Zoe peut lire tous les livres individuels en entier.
* Bob et Alice recoivent un contenu masque lorsque la classification est trop elevee.

La version anglaise contient le parcours complet avec des explications et des extraits de logs supplementaires.
