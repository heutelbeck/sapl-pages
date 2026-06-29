---
layout: sapl
lang: es
ref: spring-guide
title: "Spring Security con SAPL: Guías SAPL"
description: "Protege una aplicación Spring Boot con control de acceso basado en atributos usando SAPL. Autorización a nivel de método, políticas basadas en edad, transformación de contenido, obligaciones y policy sets."
permalink: /es/guides/spring/
sitemap: false
robots: noindex,nofollow
---

## Seguridad de métodos en Spring Boot con SAPL

Esta guía explica cómo proteger una aplicación Spring Boot con SAPL. Añadirás autorización basada en políticas a métodos de repositorios JPA, escribirás políticas que aplican restricciones de edad, transformarás y filtrarás resultados de consultas según atributos del usuario, e implementarás constraint handlers para obligaciones.

La guía presupone conocimientos básicos de Spring Boot. Para obtener contexto sobre los conceptos de ABAC y la arquitectura de SAPL, consulta la [documentación](https://sapl.io/docs/latest/).

El código fuente completo está disponible en [github.com/heutelbeck/sapl-tutorial-01-spring](https://github.com/heutelbeck/sapl-tutorial-01-spring).

## Configuración del proyecto

Primero, crea una aplicación Spring Boot sencilla. Abre [Spring Initializr](https://start.spring.io/) y añade las siguientes dependencias:

* **Spring Web** (para proporcionar una API REST con la que probar tu aplicación)
* **Spring Data JPA** (para desarrollar el modelo de dominio de tu aplicación)
* **H2 Database** (como base de datos simple en memoria para dar soporte a la aplicación)
* **Lombok** (para eliminar parte del código repetitivo)
* **Spring Boot DevTools** (para mejorar el proceso de desarrollo)

Este tutorial usa Maven como herramienta de build y Java como lenguaje de programación.

Selecciona Java 21 y Spring Boot 4.1.0 o una versión más reciente en Initializr.

Tus ajustes de Initializr deberían verse ahora más o menos así:

![Spring Initializr](/assets/guides/spring/spring_initializr.webp)

Haz clic en "GENERATE". Tu navegador descargará la plantilla del proyecto como un archivo ".zip".

Descomprime el proyecto e impórtalo en tu IDE preferido.

### Añadir dependencias SAPL

SAPL proporciona un módulo bill of materials que mantiene compatibles las versiones de los módulos SAPL. Después de añadir el siguiente bloque a tu `pom.xml`, no necesitas declarar la `<version>` de cada dependencia SAPL:

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

Una aplicación que usa SAPL necesita un Policy Decision Point (PDP) y uno o más Policy Enforcement Points (PEPs). El PDP toma decisiones de autorización. Puedes incrustarlo en tu aplicación o ejecutarlo como servidor dedicado y delegar las decisiones en ese servicio remoto. Este tutorial usa un PDP incrustado que toma decisiones localmente a partir de políticas almacenadas en los recursos de la aplicación. SAPL también se integra con Spring Security, de modo que puedes declarar PEPs en beans de Spring mediante anotaciones. Añade la siguiente dependencia starter a tu proyecto:

```xml
    <dependency>
        <groupId>io.sapl</groupId>
        <artifactId>sapl-spring-boot-starter</artifactId>
    </dependency>
```

Las versiones publicadas de SAPL están disponibles en Maven Central. Para builds no publicados, añade el repositorio Central Portal snapshots y usa la versión `x.y.z-SNAPSHOT` correspondiente.

El ejemplo actual usa Spring Boot 4.1.0 y SAPL 4.1.1. Las versiones de Spring Boot y SAPL no están acopladas.

Para usar Argon2 Password Encoder, añade la siguiente dependencia:

```xml
    <dependency>
        <groupId>org.bouncycastle</groupId>
        <artifactId>bcpkix-jdk18on</artifactId>
        <version>1.84</version>
    </dependency>
```

Crea una carpeta `policies` bajo `src/main/resources` y luego crea en esa carpeta un archivo llamado `pdp.json`:

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

El objeto `algorithm` selecciona el algoritmo de combinación para resolver resultados de evaluación de políticas en conflicto. Los tres campos controlan aspectos independientes:

* `votingMode` determina qué tipo de decisión tiene prioridad cuando hay votos tanto de permit como de deny.
* `defaultDecision` es el valor de reserva cuando ninguna política coincide con la subscription.
* `errorHandling` controla qué ocurre cuando se producen errores de evaluación de políticas (`PROPAGATE` hace visibles los errores, `ABSTAIN` los descarta silenciosamente).

Esta configuración es deliberadamente restrictiva: deny tiene prioridad, el valor predeterminado es deny y los errores se propagan. Esta es la postura secure-by-default. Escribirás políticas permit explícitas para conceder acceso.

El directorio `policies` y el archivo `pdp.json` son necesarios para que el PDP incrustado arranque. Sin ellos, la aplicación fallará durante el inicio.

Puedes usar la propiedad `variables` para definir variables de entorno, como la configuración de Policy Information Points (PIPs). Todas las políticas pueden acceder al contenido de estas variables.

Este archivo completa la configuración básica de Maven. Ahora puedes empezar a implementar la aplicación.

## El dominio del proyecto

El dominio es una biblioteca en la que los usuarios pueden ver un libro solo si cumplen su requisito de edad mínima. Si ya conoces Spring Boot, JPA y Spring Security, salta a [Proteger métodos de repositorio con SAPL](#Method-Security).

### Definir la entidad Book y el repositorio

Primero, define una entidad de libro que contenga un ID, un nombre, una clasificación por edad y contenido. Puedes usar anotaciones de Lombok para generar getters, setters y constructores:

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

Define una interfaz de repositorio correspondiente. Por ahora, incluye solo `findAll`, `findById` y `save`:

```java
public interface BookRepository {
    List<Book> findAll();
    Optional<Book> findById(Long id);
    Book save(Book entity);
}
```

Define un bean de repositorio correspondiente para que Spring Data pueda instanciar una implementación de tu interfaz:

```java
@Repository
// Important: interface order matters for detecting SAPL annotations.
public interface JpaBookRepository extends BookRepository, ListCrudRepository<Book, Long>  { }
```

Usamos `ListCrudRepository` en lugar de `CrudRepository` para que `findAll()` devuelva un `List<Book>` en vez de `Iterable<Book>`. El constraint handler que escribiremos más adelante para filtrar colecciones necesita un tipo contenedor reconocible sobre el que operar.

### Exponer los libros con un controlador REST

Expón los libros mediante un controlador REST sencillo. La anotación de Lombok `@RequiredArgsConstructor` crea un constructor para la inyección de dependencias del repositorio:

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

### Crear una implementación personalizada de `LibraryUser`

Ahora extiende la clase `User` de `org.springframework.security.core.userdetails` para crear una implementación personalizada de `LibraryUser` que contenga la fecha de nacimiento del usuario de la biblioteca.

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

Para asegurarte de que la clase personalizada `LibraryUser` se almacene en el contexto de seguridad, implementa un `LibraryUserDetailsService` personalizado. Para este tutorial, basta con un `UserDetailsService` simple en memoria:

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

### Crear una clase de configuración

Crea una clase `SecurityConfiguration` con las anotaciones de Spring `@Configuration` y `@EnableWebSecurity`. Esta clase proporciona métodos que se procesan automáticamente en el contexto de Spring Security.

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

### Generar datos de prueba al iniciar la aplicación

La configuración predeterminada con H2 y JPA crea una base de datos volátil en memoria. Para sembrar la base de datos cada vez que la aplicación arranca, crea un `CommandLineRunner`. Esta clase se ejecuta una vez que el contexto de la aplicación se ha cargado correctamente:

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

El dominio de la aplicación está completo y ya puedes probarla. Compílala con `mvn clean install` y luego ejecútala con `mvn spring-boot:run` en la línea de comandos o con una configuración de ejecución en tu IDE.

Después de que la aplicación arranque, ve a <http://localhost:8080/api/books>. El navegador te redirige a la página de login. Usa uno de los usuarios anteriores para iniciar sesión. Deberías ver una lista de todos los libros:

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

Hasta ahora, este tutorial no ha usado ninguna característica de SAPL y solo has creado una aplicación Spring Boot básica. Ten en cuenta que no añadimos explícitamente ninguna dependencia de Spring Security. La integración de SAPL con Spring tiene una dependencia transitiva de Spring Security, que lo activó para la aplicación.

## Proteger métodos de repositorio con SAPL

### <a name="Method-Security"></a> Configurar la seguridad de métodos

SAPL amplía las características de seguridad de métodos de Spring Security. Para activar la seguridad de métodos SAPL para decisiones de autorización individuales, añade la anotación `@EnableSaplMethodSecurity` a tu clase `SecurityConfiguration`.

```java
@Configuration
@EnableWebSecurity
@EnableSaplMethodSecurity
public class SecurityConfiguration {
    ...
}
```

### Añadir el primer PEP

La integración SAPL Spring Boot usa anotaciones para añadir PEPs a métodos y clases. Este tutorial usa las dos variantes `@PreEnforce` y `@PostEnforce`. Según la anotación, el PEP se ejecuta antes o después de la ejecución del método. Como primer ejemplo, añade `@PreEnforce` al método `findById` de la interfaz `BookRepository`:

```java
public interface BookRepository {
    List<Book> findAll();

    @PreEnforce
    Optional<Book> findById(Long id);

    Book save(Book entity);
}
```

### Activar la salida de consola

Añade `io.sapl.pdp.embedded.print-text-report=true` a tu archivo `application.properties`. El informe de texto registra cada decisión del PDP con la subscription, el resultado de la decisión y qué documentos de política coincidieron. También puedes seleccionar `...print-json-report` para una variante legible por máquina o `...print-trace` para una traza de evaluación completa que incluye la resolución de atributos. `print-trace` es la explicación más detallada y solo se recomienda como último recurso para resolver problemas.

La salida del informe de texto se ve así:

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

Para cada decisión, ves qué documentos se evaluaron y sus resultados individuales. En el caso de policy sets, los resultados de subpolíticas se listan bajo el nombre del set. Si una política resolvió atributos de Policy Information Points durante la evaluación, esos valores aparecen bajo un bloque `Attributes:` por documento. Las obligaciones y el advice se listan cuando están presentes en la decisión.

Para obtener salida de depuración adicional, por ejemplo qué documentos de política se cargan al iniciar, puedes usar `logging.level.io.sapl=DEBUG` en tu `application.properties`.

Reinicia la aplicación, inicia sesión y navega a <http://localhost:8080/api/books/1>. Ahora deberías ver una página de error que incluye el texto: `There was an unexpected error (type=Forbidden, status=403).`

Inspecciona la consola para ver qué ocurrió entre bastidores. Los logs deberían contener entradas similares a las siguientes:

```text
[...] : === PDP Decision ===
[...] : Timestamp      : 2026-05-18T12:36:42.66151139+02:00
[...] : Subscription Id: ebd3533d-853e-3b48-de3e-0f2af18cc21a
[...] : Subscription   : { ... large JSON object ... }
[...] : Decision       : DENY
[...] : PDP ID         : default
```

El log contiene la authorization subscription (un objeto JSON grande), la decisión tomada por el PDP, una marca de tiempo y el identificador del PDP. La decisión es `DENY` porque aún no existe ninguna política y el algoritmo de combinación deniega por defecto.

La subscription no es muy legible en el log. Apliquemos algo de formato para desglosar las partes clave del objeto de subscription:

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

Nota: Spring Security 7 añade automáticamente una autoridad `FACTOR_PASSWORD` a la autenticación cuando el usuario inicia sesión con una contraseña. Esto forma parte del framework de autenticación multifactor.

Sin ninguna configuración específica, la subscription es un objeto grande con redundancias importantes. El motor SAPL y la integración con Spring no tienen conocimiento de dominio sobre la aplicación, por lo que el PEP recopila toda la información que puede encontrar y que podría describir razonablemente el subject, la action y el resource en una authorization subscription.

De forma predeterminada, el PEP intenta convertir directamente el objeto `Authentication` del `SecurityContext` de Spring en un objeto JSON para el `subject`. Es un enfoque razonable en la mayoría de los casos y, como puedes ver, `subject.principal.birthday` contiene los datos que definiste antes para la clase personalizada `LibraryUser` y los pone a disposición del PDP.

Los objetos `action` y `resource` son casi idénticos. Sin conocimiento de dominio, el PEP solo puede recopilar información técnica del contexto de la aplicación.

Empecemos por la action y su información Java asociada. El PEP puede usar los nombres y tipos de clases y métodos protegidos para describir la action. Por ejemplo, el nombre del método `findById` puede tratarse como un verbo que describe la action, mientras que el argumento `1` es un atributo de esa action.

Al mismo tiempo, el argumento `1` también puede interpretarse como el ID del resource. El PEP no sabe qué valores del contexto Java son relevantes para la aplicación, así que añade toda la información que puede recopilar tanto a la action como al resource.

Si el método protegido se ejecuta como parte de una solicitud HTTP, esa solicitud también puede describir la action o el resource. Por ejemplo, el método HTTP `GET` puede describir la action, mientras que la URL identifica naturalmente un resource.

Este tipo de objeto de subscription es derrochador. Más adelante aprenderás a personalizar la subscription para que sea más compacta y esté mejor alineada con el dominio de tu aplicación. Por ahora, mantén la configuración predeterminada.

## Almacenar políticas SAPL para un PDP incrustado

El log de consola muestra que el PDP no encontró ningún documento de política que coincidiera con la authorization subscription porque aún no existe ninguna política. Con un PDP incrustado, las políticas pueden almacenarse junto con los recursos de la aplicación o en algún lugar del sistema de archivos del host. Las políticas en los recursos de la aplicación son estáticas en tiempo de ejecución una vez que la aplicación se ha compilado y arrancado. Las políticas en el sistema de archivos son monitorizadas por el PDP, y los cambios pueden surtir efecto en tiempo de ejecución.

La configuración predeterminada de un PDP incrustado es la primera opción, así que las políticas de la aplicación están actualmente incrustadas en los recursos.

Para usar políticas basadas en el sistema de archivos, añade `io.sapl.pdp.embedded.pdp-config-type = DIRECTORY` al archivo `application.properties`.

El archivo `pdp.json` y las políticas pueden almacenarse en carpetas distintas. Configura la ubicación de `pdp.json` con `io.sapl.pdp.embedded.config-path` y la ubicación de las políticas con `io.sapl.pdp.embedded.policies-path`. Ambas propiedades requieren una ruta válida del sistema de archivos a la carpeta que contiene los archivos.

**Nota:** `\` dentro de la ruta debe reemplazarse por `/`, por ejemplo `C:\Users` por `C:/Users`.

## Crear políticas SAPL

### Información básica

Los documentos de política almacenados deben cumplir algunas reglas:

- El SAPL PDP solo cargará documentos que tengan el sufijo `.sapl`.
- Cada documento contiene exactamente una política o un policy set.
- Las políticas y policy sets de nivel superior deben tener nombres únicos entre todos los documentos.
- Todos los documentos `.sapl` deben ser sintácticamente correctos, o el PDP puede volver a una decisión predeterminada determinada por el algoritmo dado en la configuración `pdp.json`.

Un documento de política SAPL contiene los siguientes elementos mínimos:

* La *keyword* `policy`, que declara que el documento contiene una política. Aprenderás sobre policy sets más adelante.
* Un *name* de política único para que el PDP pueda distinguirlo de otras políticas.
* La keyword de *entitlement*, ya sea `permit` o `deny`, que determina el resultado de decisión que el PDP devuelve cuando la política es aplicable y su cuerpo se evalúa como `true`.

Otros elementos opcionales se explicarán más adelante.

### Primeras políticas SAPL: permitir todo o denegar todo

Las políticas más básicas permiten o deniegan todas las acciones sin inspeccionar ningún atributo.

Empieza con una política "permit all". Añade un archivo `permit_all.sapl` a la carpeta `resources/policies` del proyecto Maven con el siguiente contenido:

```sapl
policy "permit all" permit
```

Como se describió arriba, el documento empieza con la keyword `policy`, que indica que el documento contiene una política. A esta keyword le sigue el *name* de la política como string, en este caso `"permit all"`. Al nombre de la política le sigue el *entitlement*, en este caso `permit`.

En esta guía no hemos descrito ninguna regla en la política. Por lo tanto, todas sus reglas se satisfacen y la política le dice al PDP que devuelva una decisión `permit`, sin importar los detalles de los atributos contenidos en la authorization subscription ni ningún atributo externo de PIPs. Este tipo de política es peligrosa y no es muy práctica para sistemas de producción. Sin embargo, durante el desarrollo es útil poder realizar pruebas rápidas sin que la autorización se interponga.

Reinicia la aplicación, autentícate con cualquier usuario y accede de nuevo a <http://localhost:8080/api/books/1>.

Ahora deberías obtener los datos del libro 1:

```json
{
    "id"        : 1,
    "name"      : "Clifford: It's Pool Time!",
    "ageRating" : 0,
    "content"   : "*Woof*"
}
```

El log debería verse así:

```text
[...] : === PDP Decision ===
[...] : Subscription   : { ... }
[...] : Decision       : PERMIT
[...] : PDP ID         : default
[...] : Documents:
[...] :   permit all -> PERMIT
```

El log muestra que el PDP encontró un documento de política coincidente (`permit all`) y que se evaluó como `PERMIT`. Como esta es la única política y no tiene condiciones, la política `"permit all"` siempre coincide y siempre devuelve su entitlement.

Como este es el único documento coincidente y devuelve `permit`, el PDP devuelve `PERMIT`. Entonces el PEP permite que se ejecute el método del repositorio.

Crea junto a ella una política "deny all". Añade un archivo `deny_all.sapl` a la carpeta `resources/policies`:

```sapl
policy "deny all" deny
```

Reinicia la aplicación, autentícate con cualquier usuario y accede de nuevo a <http://localhost:8080/api/books/1>.

La aplicación deniega el acceso. El log muestra que ambas políticas coincidieron, pero el algoritmo de combinación `PRIORITY_DENY` da precedencia a la decisión `deny`:

```text
[...] : === PDP Decision ===
[...] : Subscription   : { ... }
[...] : Decision       : DENY
[...] : PDP ID         : default
[...] : Documents:
[...] :   permit all -> PERMIT
[...] :   deny all -> DENY
```

Este es el comportamiento secure-by-default: cuando están presentes tanto permit como deny, deny gana. El motor SAPL implementa varios algoritmos de combinación para resolver decisiones en conflicto (consulta [SAPL Documentation: Combining Algorithms](https://sapl.io/docs/latest/2_5_CombiningAlgorithms/)).

Los tres campos de la configuración del algoritmo en `pdp.json` controlan aspectos independientes: `votingMode` determina la prioridad entre permit y deny, `defaultDecision` es el valor de reserva cuando ninguna política coincide, y `errorHandling` controla si los errores de evaluación se propagan o se absorben silenciosamente.

Cambia el nombre de `deny_all.sapl` a `deny_all.sapl.off` y de `permit_all.sapl` a `permit_all.sapl.off`. Después de renombrarlos, recompila con `mvn clean compile` antes de reiniciar. El `clean` es necesario porque los recursos compilados del directorio `target/` no se eliminan con un build normal. Sin él, los archivos `.sapl` antiguos permanecen en el classpath y el PDP todavía los carga. El acceso al libro debería estar denegado ahora porque el PDP solo carga documentos con el sufijo `.sapl` y ya no queda ninguna política coincidente.

El PDP también puede devolver `INDETERMINATE` si ocurrió un error durante la evaluación de políticas. El PEP deniega el acceso para toda decisión que no sea un `PERMIT` explícito. Puedes encontrar información adicional sobre los diferentes resultados de una evaluación de políticas en la [documentación de SAPL](https://sapl.io/docs/latest/).

En esta sección aprendiste cómo interactúan un PEP y un PDP en SAPL y cómo el PDP combina los resultados de distintas políticas. En el siguiente paso, aprenderás a escribir políticas más prácticas y exactamente cuándo una política es *aplicable* a una authorization subscription.

### Crear políticas específicas de dominio

Primero, añade un PEP `@PreEnforce` al método `findAll` del `BookRepository`:

```java
public interface BookRepository {

    @PreEnforce
    List<Book> findAll();

    @PreEnforce
    Optional<Book> findById(Long id);

    Book save(Book entity);
}
```

Escribamos una política a partir de la declaración en lenguaje natural "Only Bob can see individual book entries". Partir del lenguaje natural es útil porque deja explícita la regla prevista antes de codificarla en SAPL. Crea un documento de política `permit_bob_for_books.sapl` en la carpeta de políticas bajo resources, y traduce la declaración a un documento de política SAPL de la siguiente manera:

```sapl
policy "only bob may see individual book entries"
permit
    action.java.name == "findById" & action.java.declaringTypeName =~ ".*BookRepository$";
    subject.name == "bob";
```

Ahora recompila con `mvn clean compile` (clean es necesario para eliminar del directorio target cualquier archivo `.sapl.off` compilado anteriormente), reinicia e inicia sesión como Bob. Deberías ver una página de error con estado 403. Esto ocurre porque el login redirige a `/api/books`, que llama a `findAll`, y ninguna política coincide con ese método.

Ahora accede directamente a un libro individual en <http://localhost:8080/api/books/1>. Se concederá el acceso y el log se ve así:

```text
[...] : === PDP Decision ===
[...] : Subscription   : { ... }
[...] : Decision       : PERMIT
[...] : PDP ID         : default
[...] : Documents:
[...] :   only bob may see individual book entries -> PERMIT
```

Ahora ve a <http://localhost:8080/logout> y cierra sesión. Luego inicia sesión como Zoe e intenta acceder a <http://localhost:8080/api/books/1>.

La aplicación deniega el acceso:

```text
[...] : === PDP Decision ===
[...] : Subscription   : { ... }
[...] : Decision       : DENY
[...] : PDP ID         : default
```

El proceso de toma de decisiones del PDP ahora se ve diferente. Primero, examina por qué no hay documentos aplicables al acceder a `/api/books` o después de un login correcto.

Si observas la política, las condiciones que siguen a `permit` contienen dos reglas separadas por punto y coma. La primera condición `action.java.name == "findById" & action.java.declaringTypeName =~ ".*BookRepository$"` actúa como una regla de alcance que determina si la política es relevante para la authorization subscription dada. El PDP solo evalúa las condiciones restantes si esta primera condición es `true`. Como se vio en el ejemplo `"permit all"`, si no hay condiciones, la política siempre aplica.

En este caso, la *target expression* examina dos atributos de la action en la subscription. Comprueba si `action.java.name` es igual a `"findById"` y si `action.java.declaringTypeName` coincide con la expresión regular `".*BookRepository$"`. En otras palabras, el string del atributo debe terminar en `BookRepository`. SAPL usa el operador de comparación regex `=~` para esta comprobación.

**Nota**: En el JSON de la authorization subscription, los objetos anidados aparecen como valores de objeto dentro de otros objetos. En las expresiones de políticas SAPL, navegas estas estructuras anidadas con notación de punto. Por ejemplo, `"action": {"java": {"name": "findById"}}` en la subscription se convierte en `action.java.name` en la política.

Estas dos expresiones explican por qué el PDP ha identificado el documento de política `"permit_bob_for_books.sapl"` como aplicable al acceder a libros individuales, pero no encuentra un documento coincidente al acceder a la lista completa.

Ten en cuenta que SAPL distingue entre operadores booleanos lazy, `&&` y `||` para AND y OR, y operadores booleanos eager, `&` y `|`. Las *target expressions* solo permiten operadores eager, un requisito para indexar eficientemente policy sets más grandes.

El PDP evalúa la política completa cuando el usuario intenta acceder al libro individual. El *policy body* es la lista de condiciones que siguen a `permit` o `deny`. Contiene un número arbitrario de reglas o asignaciones de variables, cada una terminada con el terminador de sentencia de SAPL. Cada regla es una expresión booleana. El body completo se evalúa como `true` cuando todas sus reglas se evalúan como `true`. Las reglas se evalúan de forma lazy de arriba abajo.

En las situaciones anteriores, la regla que comprueba el nombre de Bob solo es `true` cuando Bob accede al libro.

En esta sección aprendiste cuándo es aplicable un documento SAPL y cómo las condiciones del policy body determinan la decisión de autorización.

A continuación, aprenderás a personalizar la authorization subscription y a usar funciones temporales para conceder acceso solo a libros adecuados para la edad.

### Aplicar la clasificación por edad de libros individuales

Antes de continuar, desactiva todas las políticas existentes en tu proyecto eliminándolas o añadiendo el sufijo `.off` al nombre de archivo.

El objetivo de esta sección es conceder acceso solo a libros apropiados para la edad del usuario. Para tomar esta decisión, el PDP necesita la fecha de nacimiento del usuario (atributo del subject), la clasificación por edad del libro (atributo del resource) y la fecha actual (atributo del environment). Cuando examinas la authorization subscription enviada en los ejemplos anteriores, notarás que actualmente solo está disponible en la subscription la fecha de nacimiento del usuario. ¿Cómo podemos poner los otros atributos a disposición del PDP en las políticas?

En general, existen dos fuentes potenciales de atributos: la authorization subscription o los Policy Information Points (PIPs).

Considera la clasificación por edad del libro. Esta información no la conoce el PEP antes de ejecutar la consulta. Por lo tanto, en el `BookRepository`, reemplaza el `@PreEnforce` en `findById` por una anotación `@PostEnforce` como sigue:

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

Esta anotación cambia el flujo de enforcement:

* Invocar el método primero.
* Construir una authorization subscription personalizada con [Spring Expression Language (SpEL)](https://docs.spring.io/spring-framework/docs/current/reference/html/core.html#expressions).
* Suscribirse al PDP con la authorization subscription personalizada.
* Aplicar la decisión.

Cuando inspeccionamos la authorization subscription original generada automáticamente, el objeto resultante era relativamente grande y técnico. Aquí, los parámetros de la anotación `@PostEnforce` ayudan a crear una authorization subscription más precisa que coincide con el dominio de la aplicación.

El parámetro `subject = "authentication.getPrincipal()"` extrae el objeto principal del objeto de autenticación y lo usa como objeto subject en la subscription.

El parámetro `action = "'read book'"` establece el objeto action de la subscription en la constante string `read book`.

Por último, el parámetro `resource = "returnObject"` establece el objeto resource de la subscription en el resultado de la invocación del método. Como este resource es la entidad libro, contiene automáticamente su atributo `ageRating`.

Después de identificar estos objetos, el PEP usa el `ObjectMapper` del contexto de la aplicación Spring para serializar los objetos a JSON.

La authorization subscription resultante se verá parecida a esta:

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

Esta authorization subscription es mucho más manejable y práctica que las conjeturas automáticas que realiza la integración de Spring sin ninguna personalización.

La política que escribiremos para aplicar la restricción de edad del libro introducirá varios conceptos nuevos:

* Definición de variables de atributos locales
* Uso de Policy Information Points
* Librerías de funciones

Crea un documento de política `check_age.sapl` como sigue:

```sapl
policy "check age"
permit
    action == "read book";
    var birthday  = subject.birthday;
    var today     = time.dateOf(|<time.now>);
    var age       = time.timeBetween(birthday, today, "years");
    age >= resource.ageRating;
```

En su primera condición, la política `check age` limita su aplicabilidad a todas las authorization subscriptions con la action `read book`.

La política define entonces una variable de atributo local llamada `birthday` y le asigna el atributo `subject.birthday`.

La siguiente línea asigna la fecha actual a la variable `today`. En SAPL, los corchetes angulares `<ATTRIBUTE_IDENTIFIER>` denotan un flujo de atributos. Esto es una suscripción a una fuente externa de atributos proporcionada por un Policy Information Point (PIP). En este caso, el identificador `time.now` accede a la hora actual en UTC desde el reloj del sistema.

En esta guía no necesitamos un flujo de actualizaciones de tiempo. Solo necesitamos el primer evento del flujo de atributos. Anteponer el símbolo de tubería a los corchetes angulares `|<>` toma el primer evento y luego cancela la suscripción al PIP. Las librerías de tiempo en SAPL usan strings ISO 8601 para representar el tiempo. La función `time.dateOf` extrae entonces el componente de fecha de la marca de tiempo recuperada del PIP.

La política calcula la edad del subject en años usando la función `time.timeBetween` y las variables definidas.

El engine evalúa las reglas de asignación de variables de arriba abajo. Cada regla tiene acceso a las variables definidas por encima. Las reglas de asignación se evalúan como `true` salvo que ocurra un error durante la evaluación.

Finalmente, la política compara `age` con `resource.ageRating`. La condición se evalúa como `true` cuando la edad del subject es al menos la clasificación por edad del libro.

Por ejemplo, si inicias sesión como Zoe y accedes al primer libro, los logs mostrarán:

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

Debajo de cada política que resolvió un atributo externo, el informe lista el valor de atributo que el PDP vio durante la evaluación. Esto forma parte de la salida `print-text-report` y es independiente de `print-trace`.

Sin embargo, si Alice intenta acceder al libro cuatro, el acceso se deniega porque la condición de edad se evalúa como `false` y la política no es aplicable:

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

La política puede escribirse de forma más compacta usando una sentencia `import`:

```sapl
import time.timeBetween
import time.dateOf
policy "check age compact"
permit
    action == "read book";
    var age = timeBetween(subject.birthday, dateOf(|<time.now>), "years");
    age >= resource.ageRating;
```

Los imports te permiten usar un nombre más corto en lugar del nombre completamente cualificado de funciones almacenadas en librerías SAPL.

Por ejemplo, la sentencia `import time.timeBetween` importa la función `timeBetween` de la librería de tiempo y la deja disponible bajo su nombre simple. También puedes importar attribute finders individuales o usar `'library name' as 'alias'` para crear alias.

## Transformar y restringir salidas con políticas SAPL

En esta parte del tutorial, usarás políticas para cambiar resultados de consultas y activar efectos secundarios con constraints.

SAPL puede adjuntar constraints a una decisión de autorización. Un constraint le indica al PEP que realice trabajo adicional mientras aplica esa decisión. SAPL distingue tres tipos de constraints:

* *Obligation*: una instrucción obligatoria. Si el PEP no puede cumplirla, no debe conceder acceso.
* *Advice*: una instrucción opcional. Si el PEP no puede cumplirla, la decisión de autorización original se mantiene.
* *Transformation*: una forma especial de obligation en la que el PEP debe reemplazar el resource accedido por el objeto resource suministrado en la decisión de autorización.

Para una decisión `PERMIT`, las obligations no resueltas impiden que el PEP conceda acceso. El advice no resuelto no lo impide.

Por ejemplo, cualquier médico puede acceder a la historia clínica de un paciente en una emergencia. Sin embargo, el sistema debe registrar el acceso si el médico no es el médico tratante de ese paciente, activando un proceso de auditoría. Esto suele llamarse un escenario "break glass".

### Usar transformaciones en políticas SAPL

La entidad Book ya incluye un campo `content`. Queremos cambiar las políticas de la biblioteca para que a los usuarios demasiado jóvenes para un libro no se les deniegue el acceso por completo. En su lugar, solo debería enmascararse el contenido del libro solicitado. Para implementar este cambio, añade el siguiente documento de política `check_age_transform.sapl` a las políticas de la aplicación:

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

Esta política introduce la expresión `transform`.

Si el policy body se evalúa como `true`, el valor JSON producido por la sentencia `transform` se añade a la decisión de autorización como propiedad `resource`. Esa propiedad le indica al PEP que devuelva el resource de reemplazo suministrado en lugar del resultado original del método. No modifica la entidad libro almacenada.

En este caso, el operador de filtro `|-` se aplica al objeto `resource`. El operador de filtro selecciona partes individuales de un valor JSON para manipularlas, por ejemplo aplicando una función al valor seleccionado. Aquí, el operador selecciona la clave `content` del resource y la reemplaza por una versión que deja visibles solo los tres primeros caracteres y sustituye el resto por un cuadrado negro ("\\u2588" en Unicode). La expresión de selección es potente. Consulta la [documentación de SAPL](https://sapl.io/docs/latest/) para una explicación completa.

Asegúrate de que la política original de comprobación de edad siga activa. Reinicia e inicia sesión como Alice.

Al acceder a <http://localhost:8080/api/books/1>, obtendrás:

```json
{
    "id"        : 1,
    "name"      : "Clifford: It's Pool Time!",
    "ageRating" : 0,
    "content"   : "*Woof*"
}
```

Alice tiene solo tres años. Cuando solicita el libro en <http://localhost:8080/api/books/4>, el contenido se enmascara porque es demasiado joven para leerlo:

```json
{
    "id"        : 4,
    "name"      : "The Three-Body Problem",
    "ageRating" : 14,
    "content"   : "Spa████████████"
}
```

Los logs de este intento de acceso se ven así:

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

Ambos documentos de política se evalúan para la subscription. La política `check age` se evalúa como `NOT_APPLICABLE` porque Alice no tiene edad suficiente para leer "The Three-Body Problem". La política `check age transform` se evalúa como `PERMIT` con un resource transformado. Como resultado, el PEP reemplaza el resource original por el de la decisión, que contiene el contenido enmascarado.

### Usar obligations y advice en políticas SAPL

La política `check age transform` con la sentencia `transform` fue el primer ejemplo de una política que instruye al PEP para conceder acceso solo si se aplican al mismo tiempo instrucciones adicionales.

Ahora añade una obligation a esta política. El sistema también debería registrar solicitudes de libros para los que el usuario es demasiado joven. Esto da a los padres la oportunidad de hablar primero sobre el libro con sus hijos.

Para hacerlo, modifica la política `check_age_transform.sapl` como sigue:

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

Ahora inicia sesión como Alice e intenta acceder a <http://localhost:8080/api/books/2>.

El acceso se denegará y los logs se verán así:

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

El PDP devolvió `PERMIT`, pero el PEP aun así denegó el acceso porque la decisión de autorización contenía una obligación de logging. SAPL representa obligations y advice como objetos JSON, y la aplicación debe proporcionar handlers para los tipos de constraint que usa. Como todavía ningún handler podía entender y aplicar la obligación de logging, el PEP denegó el acceso.

Para dar soporte a la obligación de logging, implementa un *constraint handler provider*:

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

La integración SAPL Spring entrega constraint handlers mediante *signals* disparadas en puntos bien definidos del ciclo de vida del PEP. Ejemplos de signals son `DecisionSignal` (el momento en que la decisión llega al PEP), `OutputSignal` (por cada resultado emitido del método protegido) y algunas signals específicas de HTTP si el PEP está en una ruta HTTP. Cada provider declara a qué signal o signals se adjuntan sus handlers y con qué prioridad.

Un `ConstraintHandlerProvider` es la única interfaz que implementa cada provider. Su único método, `getConstraintHandlers`, recibe el valor del constraint y el conjunto de tipos de signal que el PEP desplegado realmente dispara. El provider devuelve una lista vacía cuando no reconoce el constraint, o una lista no vacía de entradas `ScopedConstraintHandler` cuando sí lo reconoce. Cada entrada empareja un handler con el tipo de signal al que se adjunta y una prioridad que ordena la ejecución. Un único provider puede devolver varias entradas para diferentes signals si un constraint dirige handlers coordinados a lo largo del ciclo de vida.

El handler en sí aparece en tres formas, expresadas como subinterfaces selladas de `ConstraintHandler`:

* `Runner` es un `Runnable` para efectos secundarios fire-and-forget (logging, emisión de auditoría).
* `Consumer<T>` observa un valor de signal tipado sin cambiarlo (inspeccionar la decisión, mirar un elemento emitido).
* `Mapper<T>` es un `UnaryOperator<T>` que transforma un valor de signal (reescribir un cuerpo de respuesta, filtrar una colección devuelta).

En el caso del logging, el handler es un efecto secundario adjunto al `DecisionSignal`. El helper estático `ConstraintHandlerProvider.constraintTypeAndSignal` combina dos comprobaciones: el constraint debe ser del tipo esperado y el PEP desplegado debe disparar la signal esperada. El provider devuelve un `Runner` que imprime el campo `message` de la obligation mediante SLF4J.

Después de iniciar sesión como Alice y acceder a <http://localhost:8080/api/books/2>, se concede el acceso y los logs ahora contienen la siguiente línea:

```text
[...] : Attention, alice accessed the book 'The Rescue Mission: (Pokemon: Kalos Reader #1)'.
```

Probemos otro ejemplo de obligación.

Después de un login correcto, `/api/books` sigue denegado porque todavía no hemos implementado una política para el método `findAll`. Necesitamos una política que permita al usuario listar libros adecuados para su edad. Esta vez no reemplazamos el resource con una instrucción `transform`. En una biblioteca real, eso podría requerir que el PEP procese cientos de registros. En su lugar, instruimos al PEP para que devuelva solo ciertos libros.

Primero, completa el `@PreEnforce` en `findAll` dentro de `BookRepository` como sigue:

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

La idea es la misma que para el método `findById`. El parámetro `subject = "authentication.getPrincipal()"` extrae el objeto principal y lo usa como objeto subject en la subscription. El parámetro `action = "'list books'"` establece el objeto action en el string `list books`. Como `@PreEnforce` se ejecuta antes del método, aún no hay valor de retorno. El PEP deja el resource ausente o lo deriva del contexto disponible.

Para devolver solo libros accesibles, escribe una política como sigue:

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

Usamos la clase `ContentFilterPredicateProvider`, que ya proporciona el motor SAPL. Esta clase filtra un objeto JSON y extrae nodos que coinciden con las condiciones especificadas.

La obligation selecciona este provider con la asignación `"type" : "jsonContentFilterPredicate"`. El campo `conditions` especifica entonces una o más condiciones que comprobar. Aquí, el provider comprueba el array en busca de nodos JSON que contengan el elemento `ageRating` y cuya clasificación por edad sea menor o igual que la edad del usuario que accede. Solo los nodos coincidentes permanecen en la respuesta.

Si necesitas comportamiento personalizado, puedes implementar tu propio *constraint handler provider*:

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

La forma refleja el provider de logging, pero ahora el handler es un `Mapper<Object>` adjunto al `OutputSignal`. `OutputSignal` es la signal por resultado que el PEP dispara una vez que el método protegido ha producido su valor de retorno. Un `Mapper` transforma ese valor antes de que el PEP lo libere. `SignalType.findIn` busca en el conjunto de signals del PEP desplegado un `OutputSignal` de cualquier tipo de valor. Como `findAll` devuelve `List<Book>` (consulta el cambio de `JpaBookRepository` anterior en el tutorial), el PEP desplegado dispara un `OutputSignal` cuyo tipo de valor es la lista, y nuestro `Mapper` recibe la lista poblada en tiempo de ejecución.

El mapper aplica el predicado de edad y devuelve un nuevo `ArrayList<Book>` que contiene solo las entradas que el subject tiene permitido ver. Si ninguna entrada coincide, devolver un `List<Book>` vacío es aceptable porque la política sobre `findAll` ya permitió la solicitud. La obligación solo estrecha el conjunto de resultados. El mapper deja la lista original sin modificar y devuelve una copia filtrada.

Ahora inicia sesión como Bob y verás la siguiente lista de libros:

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

## Crear un policy set

Un SAPL policy set agrupa políticas y las evalúa con su propio algoritmo de combinación. Luego, el resultado del set se combina con resultados de otras políticas o policy sets de nivel superior. Los policy sets usan la misma familia de algoritmos que la resolución final de conflictos, incluido el algoritmo `first or abstain errors propagate`.

**Nota**: A diferencia del archivo `pdp.json`, los algoritmos en policy sets deben escribirse en forma de lenguaje natural en minúsculas.

Un SAPL policy set consta de los siguientes elementos:

* la *keyword* `set`, que declara que el documento contiene un policy set
* un *name* de policy set único, para que el PDP pueda distinguirlo de otros policy sets
* un *combining algorithm*
* una *target expression* opcional
* asignaciones de variables opcionales
* dos o más políticas

Como ejemplo pequeño, crea un archivo `check_age_by_id_set.sapl`. Solo una de las dos políticas de la sección anterior, `'check age compact'` y `'check age transform'`, puede ser aplicable a la vez. Por lo tanto, creemos un policy set que procese ambas políticas.

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

Las reglas de las políticas dentro de un set son las mismas que para las políticas de nivel superior. Cada condición termina con el terminador de sentencia de SAPL. La segunda política del set tiene una sola condición directamente después de `permit`.

Desactiva los dos documentos de política `'check_age_compact.sapl'` y `'check_age_transform.sapl'` con la extensión `.off` y reinicia la aplicación.

Inicia sesión como Bob y accede a <http://localhost:8080/api/books/3>. Los logs se ven así:

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

El policy set evalúa ambas subpolíticas. `check age compact set` coincide (Bob tiene edad suficiente), mientras que `check age transform set` no aplica. El set usa `first or abstain errors propagate`, así que la primera subpolítica aplicable determina el resultado.

Ahora accede a <http://localhost:8080/api/books/4>. Los logs muestran:

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

La política `check age transform set` coincide primero (edad de Bob < 14), así que el set devuelve su resultado incluyendo la obligación y el resource transformado con contenido enmascarado. La segunda política del set no se evalúa porque la primera ya era aplicable.

## Combinar obligations, advice y transformaciones

Para políticas de nivel superior, SAPL recopila las obligations y el advice de todas las políticas cuyo resultado coincide con la decisión de autorización final. Los policy sets son diferentes: no todas las políticas internas se evalúan necesariamente, por lo que solo se recopilan obligations y advice de políticas internas evaluadas con el resultado coincidente.

Otro caso especial se refiere a las *transformations*. No es posible combinar múltiples sentencias de transformación mediante varias políticas. SAPL no devolverá la decisión `PERMIT` si más de una política se evalúa como `PERMIT` y al menos una de ellas contiene una sentencia de transformación. Esto se llama **transformation uncertainty**.

Puedes descargar el proyecto de demostración desde el [repositorio de GitHub de este tutorial](https://github.com/heutelbeck/sapl-tutorial-01-spring).

## Conclusiones

En esta serie de tutoriales, has aprendido los fundamentos del control de acceso basado en atributos y cómo proteger una aplicación Spring con SAPL.

Puedes lograr mucho más con SAPL, incluidas infraestructuras de autorización flexibles y distribuidas en toda una organización. Los siguientes tutoriales de esta serie se centrarán en obligations más complejas, testing, tipos de datos reactivos, streaming de datos, personalización de UIs basada en políticas y aplicaciones basadas en el framework Axon.

No dudes en participar con los desarrolladores y la comunidad en nuestro [Discord Server](https://discord.gg/pRXEVWm3xM).
