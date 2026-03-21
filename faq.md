---
layout: sapl
title: FAQ - SAPL
description: "Frequently asked questions about SAPL: what it does, streaming authorization, ABAC, deployment, AI agent authorization, policy testing, and how it compares to OPA, Cedar, and Cerbos."
permalink: /faq/
---

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    { "@type": "Question", "name": "What is SAPL?",
      "acceptedAnswer": { "@type": "Answer", "text": "An open-source authorization engine with a human-readable policy language, streaming decisions, and a dedicated testing DSL. Runs embedded or standalone. Integrates with Spring, Django, NestJS, FastAPI, .NET, and more." } },
    { "@type": "Question", "name": "What is attribute-based access control (ABAC)?",
      "acceptedAnswer": { "@type": "Answer", "text": "ABAC makes access decisions based on attributes of the subject, action, resource, and environment. More expressive than RBAC because rules can reference any combination of attributes." } },
    { "@type": "Question", "name": "What is streaming authorization (ASBAC)?",
      "acceptedAnswer": { "@type": "Answer", "text": "Applications subscribe to decisions and the PDP pushes updates when attributes or policies change. No polling, no stale decisions." } },
    { "@type": "Question", "name": "When do I need streaming vs one-shot decisions?",
      "acceptedAnswer": { "@type": "Answer", "text": "One-shot for REST endpoints and tool calls. Streaming for long-lived sessions, WebSocket connections, MQTT, collaborative editing, or any scenario where context can change during the session." } },
    { "@type": "Question", "name": "What happens when a policy changes during an active session?",
      "acceptedAnswer": { "@type": "Answer", "text": "The PDP re-evaluates all affected subscriptions and pushes updated decisions. No restart, no polling. Active sessions see the change immediately." } },
    { "@type": "Question", "name": "How does streaming work over HTTP?",
      "acceptedAnswer": { "@type": "Answer", "text": "SAPL Node exposes a decide-once endpoint for single JSON decisions and a decide endpoint for Server-Sent Events streams that push updates as decisions change." } },
    { "@type": "Question", "name": "What are obligations and advice?",
      "acceptedAnswer": { "@type": "Answer", "text": "Structured instructions attached to permit decisions. Obligations must be fulfilled or the permit is revoked. Advice is optional. Examples: redact fields, rewrite database queries, log access, require human approval." } },
    { "@type": "Question", "name": "What is fine-grained authorization?",
      "acceptedAnswer": { "@type": "Answer", "text": "Authorization that goes beyond permit/deny. SAPL decisions carry obligations and advice for data filtering, field redaction, query rewriting, audit logging, and approval workflows." } },
    { "@type": "Question", "name": "How does SAPL compare to OPA, Cedar, and Cerbos?",
      "acceptedAnswer": { "@type": "Answer", "text": "SAPL has streaming decisions (unique), obligations/advice, a dedicated testing DSL with coverage, and deep framework integrations. OPA uses Rego, Cedar focuses on formal verification, Cerbos uses YAML. None support streaming or obligations." } },
    { "@type": "Question", "name": "How do I deploy SAPL?",
      "acceptedAnswer": { "@type": "Answer", "text": "Six modes: embedded in a JVM application, SAPL Node standalone server, Docker container, CLI tool for development and CI, framework SDKs for Python/JS/.NET, and browser-based playground." } },
    { "@type": "Question", "name": "Can SAPL run embedded without a server?",
      "acceptedAnswer": { "@type": "Answer", "text": "Yes. Add sapl-spring-boot-starter to your Spring Boot application. Switching between embedded and remote PDP is a configuration change, not a code change." } },
    { "@type": "Question", "name": "Does SAPL support multi-tenant deployments?",
      "acceptedAnswer": { "@type": "Answer", "text": "Yes. A single SAPL Node serves multiple tenants, each with its own policy bundle, combining algorithm, and PDP configuration." } },
    { "@type": "Question", "name": "How does SAPL work with my identity provider?",
      "acceptedAnswer": { "@type": "Answer", "text": "SAPL handles authorization, not authentication. Framework integrations extract the principal from the security context. SAPL Node supports OAuth2/JWT and locally managed API keys for PDP API access." } },
    { "@type": "Question", "name": "How do I test SAPL policies?",
      "acceptedAnswer": { "@type": "Answer", "text": "A dedicated behavior-driven testing DSL. Write .sapltest files with given/when/expect scenarios. Mock attribute sources, emit streaming changes, assert decision sequences. Coverage reporting with CI quality gates." } },
    { "@type": "Question", "name": "How do I manage policies in production?",
      "acceptedAnswer": { "@type": "Answer", "text": "Multiple options: filesystem, classpath, remote signed bundles via Git and CI, or a custom bundle server implementing the open wire protocol. Hot-reload without restart." } },
    { "@type": "Question", "name": "What languages and frameworks does SAPL support?",
      "acceptedAnswer": { "@type": "Answer", "text": "Deep framework integrations for Spring Boot, Django, Flask, FastAPI, Tornado, NestJS, .NET, and FastMCP with annotations, decorators, constraint handlers, query rewriting, and streaming enforcement. Language clients for Java, Python, JS, .NET." } },
    { "@type": "Question", "name": "Can SAPL authorize AI agent operations?",
      "acceptedAnswer": { "@type": "Answer", "text": "Yes. Per-tool authorization for Spring AI, dynamic query rewriting for RAG pipelines across any data source, human-in-the-loop approval workflows, and MCP server authorization." } },
    { "@type": "Question", "name": "How does SAPL control what data reaches the LLM in a RAG pipeline?",
      "acceptedAnswer": { "@type": "Answer", "text": "Obligations rewrite retrieval queries at the database level. Works with vector databases, RDBMS (JPA, R2DBC), MongoDB, and any data source. Also supports post-retrieval transformation for sources without query-level filtering." } },
    { "@type": "Question", "name": "How does human-in-the-loop approval work?",
      "acceptedAnswer": { "@type": "Answer", "text": "The policy returns PERMIT with an approval obligation. Execution pauses until a human confirms. The policy controls which actions need approval, auto-approve rules, and timeout. The LLM gets distinct errors for denial vs timeout." } },
    { "@type": "Question", "name": "Is SAPL production-ready?",
      "acceptedAnswer": { "@type": "Answer", "text": "Yes. Deployed in production across European research and industry projects. Developed at FTK in Dortmund, Germany. Professional support, consulting, training, and custom integration available." } },
    { "@type": "Question", "name": "Is SAPL open source?",
      "acceptedAnswer": { "@type": "Answer", "text": "Yes. Apache License 2.0. Self-hosted, no vendor lock-in, no external dependencies. Source code on GitHub." } },
    { "@type": "Question", "name": "How do I get started?",
      "acceptedAnswer": { "@type": "Answer", "text": "Try the browser playground, download the CLI binary, add sapl-spring-boot-starter to a Spring project, or explore the demo repository." } }
  ]
}
</script>

## What is SAPL?

SAPL (Streaming Attribute Policy Language) is an open-source authorization engine. It provides a human-readable policy language, a policy decision point (PDP) that can run embedded in your application or as a standalone server, a dedicated testing DSL with coverage reporting, and framework integrations for Spring, Django, NestJS, FastAPI, Flask, .NET, and more.

SAPL implements attribute-based access control (ABAC) with a streaming extension: decisions update automatically when attributes or policies change. Applications subscribe to decisions and the PDP pushes updates, rather than requiring the application to poll.

## What is attribute-based access control (ABAC)?

ABAC determines whether a subject is permitted to perform an action on a resource, based on attributes of all three.

- **Subject:** a user, a machine, another application, or a service. Attributes include roles, department, clearance level, site affiliation.
- **Action:** any operation the subject wants to perform. This can be a CRUD operation, a domain-specific action like "approve loan", or a technical action like an HTTP method or function call.
- **Resource:** the entity the action is directed at. A URL, a database record, a domain object, a tool in an AI agent framework.
- **Environment:** contextual attributes like current time, IP address, system load, or threat level.

Together, these four entities and their attributes form an authorization subscription. ABAC evaluates rules against these attributes to decide whether the action is permitted. Because rules can reference any attribute, ABAC is strictly more expressive than role-based access control (RBAC). It can also express RBAC, mandatory access control (MAC), and domain-specific models.

## What is streaming authorization (ASBAC)?

Most authorization engines evaluate a request and return a single decision. If the context changes afterward (a policy update, an attribute change, a session condition shift), the decision goes stale until the application explicitly re-checks. Two problems follow:

- **Confidentiality risk.** A user retains access after their permissions should have been revoked.
- **Availability risk.** A user does not gain access they should have until they refresh or the application polls.

SAPL uses a publish-subscribe pattern instead. The application subscribes to a decision, and the PDP pushes updates whenever underlying attributes or policies change. This is attribute stream-based access control (ASBAC).

For applications that only need a single decision (a REST endpoint, a one-shot tool call), SAPL works like any other authorization engine. The streaming capability is there when you need it without adding overhead when you do not.

## When do I need streaming vs one-shot decisions?

**One-shot** is sufficient when the authorization context does not change during the operation. A REST API endpoint, a tool call, a database query. The application asks once, gets a decision, and acts on it.

**Streaming** is needed when the context can change while the operation is still active:

- A user is connected via WebSocket and their role changes mid-session.
- An MQTT subscription is active and a geofence attribute changes as the user moves.
- A collaborative editing session is open and a policy update restricts access to certain document sections.
- A threat level changes and all active API sessions need immediate re-evaluation.
- A security officer enables an emergency override and all connected dashboards should reflect the new permissions instantly.

In each of these cases, the application subscribes once. The PDP pushes updated decisions as they happen. The enforcement point reacts to each update. No polling, no re-querying, no coordination with other services.

## What happens when a policy changes during an active session?

The PDP detects the change, re-evaluates all affected subscriptions, and pushes updated decisions to every connected enforcement point. No restart, no notification mechanism, no polling. Active sessions see the new decision immediately.

This works the same way for attribute changes (an external data source reports a new value) and policy changes (an operator deploys a new version). Both trigger re-evaluation.

## How does streaming work over HTTP?

SAPL Node exposes two HTTP endpoints:

- **`/api/pdp/decide-once`** returns a single JSON decision and closes the connection. Standard request-response.
- **`/api/pdp/decide`** returns a Server-Sent Events (SSE) stream. The first event is the initial decision. Subsequent events are pushed whenever the decision changes. The connection stays open until the client disconnects.

Any HTTP client that supports SSE can consume streaming decisions. The SAPL language clients for Java, Python, JavaScript, and .NET handle SSE automatically.

## What are obligations and advice?

Obligations and advice are structured JSON instructions attached to a PERMIT decision. They let the policy do more than allow or deny.

- **Obligations** must be fulfilled by the application for the permit to take effect. If any obligation handler fails or is missing, the permit is revoked to a deny. Examples: redact sensitive fields from the response, rewrite a database query to filter rows, log the access to an audit trail, require human approval before execution.
- **Advice** is optional. The application should attempt to fulfill it, but failure does not revoke the permit.

Your application registers constraint handlers that execute obligations and advice automatically. The application code itself contains no authorization logic. The policy decides what happens, the framework enforces it.

RAG query rewriting and human-in-the-loop approval both work this way. They are obligations attached to a PERMIT decision, not separate mechanisms bolted on.

## What is fine-grained authorization?

Several factors determine how fine-grained an authorization system is:

- **Model expressiveness.** Can the system express complex combinations of conditions (time + location + role + resource classification), or only simple role checks?
- **Decision richness.** Can the system do more than permit or deny? SAPL decisions can carry obligations and advice for data filtering, field redaction, audit logging, and approval workflows.
- **Information access.** Can the system access rich context (protocol details, domain objects, external data sources) or only a user ID and a role list?
- **Content-level control.** Can the system filter or transform the data itself, not just gate access to it?

SAPL covers all four. Policies reference external attribute sources (databases, HTTP APIs, MQTT brokers), produce decisions with obligations and advice, and transform data through constraint handlers.

## How does SAPL compare to other authorization engines?

Streaming is a structural difference, not a feature toggle. OPA, Cedar, and Cerbos evaluate a request and return a decision. If the context changes, the application has to re-query. SAPL lets the application subscribe once. The PDP pushes updated decisions whenever policies, attributes, or external data change. Long-lived sessions, WebSocket connections, MQTT streams, collaborative editing: none of them need to poll. Policy updates take effect across all active subscriptions immediately, without application-side logic. No other authorization engine works this way. For simple request-response use cases, SAPL works the same as any traditional engine, with no extra overhead. You pick the right protocol for each situation. The [interactive demo on the homepage](/) shows streaming decisions changing in real time as a threat level attribute toggles.

Obligations and advice are a second structural difference. OPA, Cedar, and Cerbos return allow or deny. SAPL decisions carry structured instructions that the framework executes. Rewrite database queries (JPA, R2DBC, MongoDB). Filter and transform response data. Redact fields. Trigger audit logging. Require human approval. The application code has none of this logic. The policy declares it, the constraint handlers enforce it. Combine this with streaming and a policy change does not just revoke access to an active session. It can change how data is filtered or transformed for every connected user, in real time, with no deployment.

Framework integration depth is the third difference. OPA, Cedar, and Cerbos give you HTTP or gRPC client libraries. You build the enforcement layer yourself: interceptors, filters, error handling, response transformation. SAPL ships that layer. Method-level annotations and decorators. Automatic constraint handler execution. Database query rewriting at the SQL and MQL level. Collection filtering. Three streaming enforcement modes (terminal denial, recoverable, signal-based). Multi-subscription and batch evaluation. Adopting SAPL in a Spring Boot or Django application means adding an annotation, not building authorization middleware from scratch.

|                                 | SAPL                                                  | OPA                               | Cedar                        | Cerbos                                      |
|---------------------------------|-------------------------------------------------------|-----------------------------------|------------------------------|---------------------------------------------|
| **Policy language**             | SAPL (readable, purpose-built)                        | Rego (Datalog-derived)            | Cedar (purpose-built)        | YAML                                        |
| **Decision protocol**           | Streaming (pub-sub) + request-response                | Request-response only             | Request-response only        | Request-response only                       |
| **Testing**                     | Dedicated DSL + coverage                              | Test with Rego                    | Formal verification          | YAML test suites                            |
| **Deployment**                  | Embedded or standalone                                | Sidecar or standalone             | Library                      | Sidecar or standalone                       |
| **Obligations/advice**          | Yes                                                   | No                                | No                           | No                                          |
| **External data at evaluation** | Yes (HTTP, MQTT, clock, JWT PIPs)                     | Yes (http.send, push API)         | No (pre-loaded entity store) | Yes (external API sources)                  |
| **Custom functions**            | Yes (hot-loadable)                                    | Yes (Rego functions + Go plugins) | No (extension types only)    | No (built-in CEL functions only)            |
| **Native platform**             | Java / JVM                                            | Go, Wasm                          | Rust, Wasm                   | Go                                          |
| **Language clients**            | Java, Python, JS, .NET                                | Go, Java, JS, Swift               | Rust, Go, Java, JS           | Go, Java, JS, Python, Ruby, PHP, .NET, Rust |
| **Framework integrations**      | Spring, Django, FastAPI, Flask, NestJS, .NET, FastMCP | Kubernetes (Gatekeeper), Envoy    | Kubernetes                   | Query plan adapters (Prisma, SQLAlchemy)    |

## Can SAPL authorize AI agent operations?

Yes. SAPL provides authorization for AI agents at multiple levels:

- **Tool calling.** Per-tool permit/deny decisions for Spring AI tool methods. The policy sees the tool name, parameters, and user context. See the [AI Tool Authorization guide](https://sapl.io/guides/ai-tools/).
- **RAG pipelines.** Dynamic query rewriting at the retrieval boundary. The RAG guide demonstrates this with a vector database, but the same obligation mechanism protects any retrieval path: RDBMS (JPA, R2DBC), NoSQL (MongoDB), graph databases, or semantic search. Documents the user is not authorized to see are excluded at the query level before they reach the LLM. See the [RAG guide](https://sapl.io/guides/ai-rag/).
- **Human-in-the-loop.** Policy-driven approval workflows where the decision is PERMIT with an obligation that pauses execution until a human confirms. The policy decides which actions need approval, whether auto-approve is allowed, and how long to wait. See the [HITL guide](https://sapl.io/guides/ai-hitl/).
- **MCP servers.** Authorize tool calls, resource access, and prompt arguments inside MCP servers with decorators and constraint handlers. See the [MCP guide](https://sapl.io/guides/ai-mcp/).

## How does SAPL control what data reaches the LLM in a RAG pipeline?

SAPL policies attach obligations that rewrite the retrieval query before it executes. The RAG guide demonstrates this with a vector database (pgvector): a policy for a site investigator adds filter expressions that exclude the participant registry and restrict results to the investigator's own site. The WHERE clause is modified at the database level. Documents the user is not authorized to see are never retrieved, never enter the application, and never reach the LLM context window.

The same mechanism works for any data source behind the retrieval. SAPL's Spring Data integrations rewrite queries for JPA (SQL), R2DBC (reactive SQL), and MongoDB (MQL) at the query level. If your RAG pipeline retrieves from an RDBMS, a document store, or a graph database, the obligation-based query rewriting pattern applies. The constraint handler translates policy obligations into the query language of whatever data source backs the retrieval.

Pre-retrieval filtering is the strongest option because the data never leaves the database. SAPL also supports post-retrieval transformation via `@PostEnforce` and response transformation obligations: filter collection elements, redact fields, or modify return values after retrieval. Use query rewriting where possible, post-retrieval transformation where the data source lacks query-level filtering. Both are policy-driven, not hardcoded.

See the [RAG guide](https://sapl.io/guides/ai-rag/) for a full walkthrough with vector search.

## How does human-in-the-loop approval work?

The policy returns PERMIT with an obligation of type `humanApprovalRequired`. A constraint handler intercepts this obligation, pauses tool execution, and presents an approval dialog to the operator. The dialog shows the tool name, a human-readable summary, and the full parameters composed from the authorization subscription by the policy.

If the operator approves, the tool executes normally. If the operator denies or the request times out, the obligation fails and the PERMIT is revoked. The LLM receives a semantically meaningful error distinguishing "operator denied" from "approval timed out."

The policy controls which actions need approval, whether the user's auto-approve preference can bypass the dialog, and the timeout duration. The application code has no approval logic. See the [HITL guide](https://sapl.io/guides/ai-hitl/) for a full walkthrough.

## How do I deploy SAPL?

Six usage modes:

- **Embedded PDP.** Add `sapl-pdp` (or `sapl-spring-boot-starter`) as a dependency to any JVM application (Java, Kotlin, Scala). The PDP evaluates policies in-process. No network hop, no sidecar, no serialization overhead, no separate service to operate. Policies are loaded from the classpath, the filesystem, or remote bundles.
- **SAPL Node (standalone server).** Run the `sapl` binary as a PDP server. Applications query it via HTTP (request-response or SSE streaming). Useful when multiple services share the same policies or when the application is not on the JVM.
- **Docker.** SAPL Node is available as a container image. Deploy to Kubernetes, ECS, Cloud Run, or any container runtime.
- **CLI tool.** The `sapl` binary evaluates policies on the command line (`sapl decide-once`, `sapl decide`), runs tests (`sapl test`), creates and signs bundles (`sapl bundle`), and generates credentials. The same binary runs the server and the CLI. One download for development, CI, and production.
- **Framework SDKs.** For Python, JavaScript, and .NET applications, SAPL SDKs connect to a SAPL Node server and provide native enforcement (decorators, guards, attributes) with streaming support. The PDP runs as SAPL Node, the enforcement runs in your application.
- **Playground.** The [online playground](https://playground.sapl.io/) runs entirely in the browser. Write policies, create subscriptions, observe decisions. No installation required.

All modes support the full policy language, obligations, and advice. Embedded and SAPL Node support streaming decisions. Pick the mode that fits your architecture.

## Can SAPL run embedded without a server?

Yes. Add `sapl-spring-boot-starter` to your Spring Boot application and the embedded PDP is auto-configured. Policies are loaded from the classpath or filesystem and can be hot-reloaded. No HTTP, no sidecar, no separate deployment. For non-Spring JVM applications, add `sapl-pdp` directly.

Switching between embedded and remote PDP is a configuration change, not a code change. The same `@PreEnforce` and `@PostEnforce` annotations work with both. Start embedded during development, switch to SAPL Node in production if your architecture requires a shared PDP, and switch back if it does not. No application code changes.

## Does SAPL support multi-tenant deployments?

Yes. A single SAPL Node can serve multiple tenants, each with its own policy bundle, combining algorithm, and PDP configuration. Bundles are identified by `pdpId`. Each tenant's policies are loaded, verified, and evaluated independently.

## How does SAPL work with my identity provider?

SAPL does not replace your identity provider. Authentication (who is the user) is handled by your IdP (Keycloak, Auth0, Entra ID, Okta, etc.). SAPL handles authorization (what the user is allowed to do).

**In your application:** The framework integration extracts the authenticated principal from the security context (Spring Security, Django auth, NestJS guards) and passes it to the PDP as the `subject` of the authorization subscription. JWT claims, roles, and other identity attributes are available in policies. SAPL also includes a built-in JWT PIP that can extract and verify claims from tokens at evaluation time.

**For PDP API access:** When applications query a SAPL Node server, the server needs to authenticate the calling application. SAPL Node supports OAuth2/JWT bearer tokens for seamless integration with your existing identity infrastructure. For simpler setups or development, SAPL Node also supports locally managed API keys on a per-PDP level. See the [Security documentation](https://sapl.io/docs/latest/7_6_Security/) for details.

## How do I test SAPL policies?

SAPL is the only authorization engine with a dedicated testing language designed for behavior-driven policy verification. Tests describe scenarios in terms of the domain ("when a user attempts to read during an emergency"), not implementation details ("when method X is called with parameter Y"). This makes tests readable by policy authors and auditors, not just developers.

Write `.sapltest` files alongside your `.sapl` policies:

```
scenario "permit when threat level is emergency"
    given
        - attribute "statusMock" "status".<mqtt.messages> emits "emergency"
    when "user" attempts "read" on "time"
    expect permit;
```

The `given/when/expect` structure reads like a specification. Mock external attribute sources (HTTP, MQTT, databases), emit sequences of streaming values over time, and assert that decisions change correctly as attributes evolve. For streaming authorization this matters: you need to prove that a policy transitions correctly between permit and deny as conditions change, not just that it gives the right answer for one static input.

The `sapl test` CLI runs tests and reports coverage:

```
sapl test --dir ./policies --policy-hit-ratio 100 --condition-hit-ratio 80
```

Coverage thresholds (policy-hit ratio, condition-hit ratio) act as quality gates in CI. If a policy or condition branch is not exercised by any test, the build fails. The [`setup-sapl`](https://github.com/heutelbeck/setup-sapl) GitHub Action installs the CLI on any runner. For Java projects, tests can also run as JUnit 5 tests inside `mvn verify`.

OPA tests are written in Rego (the same language as policies), which means tests are as hard to read as the policies themselves. Cedar relies on formal verification (proving mathematical properties) rather than behavioral testing. Cerbos uses YAML test fixtures. SAPL's testing DSL operates at a higher abstraction level: describe the scenario, not the implementation.

See the [Testing documentation](https://sapl.io/docs/latest/5_0_TestingSAPLPolicies/) for the full DSL reference.

## How do I manage policies in production?

SAPL supports multiple policy source models. Choose the one that fits your operational workflow:

**Filesystem.** Policies live as `.sapl` files on disk. The PDP watches the directory and hot-reloads on changes. Simple for development and single-node deployments.

**Classpath.** Policies are bundled inside your application JAR. Versioned with the application. No external files to manage.

**Remote bundles (Git + CI + HTTP).** The most common production workflow. Policies are plain text files in a Git repository. CI runs tests, signs the bundle, and publishes it to any HTTP server (GitHub Releases, S3, Artifactory, Nginx, or a custom server). SAPL Node loads bundles with signature verification and hot-reloads without restart. Active streaming subscriptions re-evaluate immediately. Two loading modes: interval-based polling for static servers, and long-poll for servers that push updates as they become available.

**Custom bundle server.** The [bundle wire protocol](https://sapl.io/docs/latest/7_5_BundleWireProtocol/) is an open HTTP API. You can build a custom bundle server that integrates with your existing policy management infrastructure, approval workflows, or multi-environment promotion pipelines. SAPL Node consumes from any server that implements the protocol.

A typical Git-based workflow:

1. **Author** policies in any editor with LSP support (IntelliJ, VS Code, Neovim). The language server provides syntax highlighting, diagnostics, completions, and formatting.
2. **Test** with `sapl test` locally and in CI. Enforce coverage thresholds as quality gates.
3. **Sign** the policy bundle with an Ed25519 key. The private key is a CI secret.
4. **Publish** the signed bundle to your HTTP server of choice.
5. **Load** in SAPL Node. Signature verified, policies hot-reloaded, active subscriptions re-evaluated.

See the [Policy Operations guide](https://sapl.io/guides/policy-ops/) for a complete walkthrough with a working CI pipeline.

## What languages and frameworks does SAPL support?

SAPL provides two levels of integration: deep framework integrations that go far beyond simple allow/deny gating, and language clients that connect to a SAPL Node PDP server.

**Framework integrations:**

- [Spring Boot](https://sapl.io/docs/latest/6_3_Spring/) - `@PreEnforce`, `@PostEnforce` annotations, reactive Spring WebFlux support, embedded PDP, constraint handler framework for obligations/advice
- [Django](https://sapl.io/docs/latest/6_5_Django/) - decorators with request context, constraint handlers, streaming SSE enforcement
- [Flask](https://sapl.io/docs/latest/6_6_Flask/) - decorators, constraint handlers, streaming SSE enforcement
- [FastAPI](https://sapl.io/docs/latest/6_7_FastAPI/) - decorators with lambda resource builders, constraint handlers, streaming SSE enforcement
- [Tornado](https://sapl.io/docs/latest/6_8_Tornado/) - decorators, constraint handlers, streaming SSE enforcement
- [NestJS](https://sapl.io/docs/latest/6_4_NestJS/) - guards and interceptors, constraint handlers, streaming SSE enforcement
- [.NET](https://sapl.io/docs/latest/6_10_DotNet/) - attributes with subscription customizers, constraint handlers, streaming SSE enforcement
- [FastMCP](https://sapl.io/docs/latest/6_9_FastMCP/) - MCP server tool/resource/prompt authorization with constraint handlers

Other authorization engines give you an HTTP client and leave the rest to you. SAPL integrations go much deeper:

- **Method-level enforcement** with annotations/decorators that intercept before or after execution.
- **Constraint handlers** that automatically execute obligations and advice (data transformation, field redaction, logging, approval workflows).
- **Response transformation** where policies modify the return value of a method (filter fields, redact content, attach metadata).
- **Database query rewriting** for Spring Data JPA, R2DBC (SQL), and MongoDB. Policies attach obligations that add WHERE clauses or filter expressions to database queries at the query level, not post-retrieval. Row-level security enforced before data leaves the database.
- **Collection filtering** where policies filter elements from returned collections based on per-element authorization decisions.
- **Streaming enforcement modes** across all SDKs: terminal denial (stream ends on deny), recoverable (stream pauses and resumes), and signal-based (application reacts to decision changes). Three modes with different trade-offs for different use cases.
- **Multi-subscription and batch** where a single PDP connection evaluates multiple authorization subscriptions concurrently, reducing overhead for applications with many enforcement points. Batch mode evaluates a set of subscriptions in one call for scenarios like rendering a UI with many permission-dependent elements.

**Language clients** (connect to [SAPL Node](https://sapl.io/docs/latest/7_0_SaplNode/) via HTTP/SSE):

- Java, Python, JavaScript/TypeScript, .NET

SAPL Node serves both request-response and streaming (Server-Sent Events) over HTTP. Any language with an HTTP client can talk to it. The clients above add idiomatic wrappers with streaming support built in.

## Is SAPL production-ready?

Yes. SAPL runs in production across European research and industry projects, protecting critical infrastructure and sensitive personal data. It is developed at [FTK](https://ftk.de) (Research Institute for Telecommunication and Cooperation) in Dortmund, Germany. Professional support, consulting, training, and custom integration work are available. See the [Support page](https://sapl.io/support/).

## Is SAPL open source?

Yes. [Apache License 2.0](https://opensource.org/license/apache-2-0). Source code on [GitHub](https://github.com/heutelbeck/sapl-policy-engine). No vendor lock-in, no external dependencies. Nothing leaves your infrastructure. Run the PDP embedded in your application or as a standalone server you operate.

## How do I get started?

1. **Try it in the browser.** The [Playground](https://playground.sapl.io/) requires no installation.
2. **Try it on the command line.** Download the `sapl` binary from the [releases page](https://github.com/heutelbeck/sapl-policy-engine/releases) and follow the [Getting Started guide](https://sapl.io/docs/latest/1_2_GettingStarted/).
3. **Add it to a Spring Boot project.** Follow the [Spring Security guide](https://sapl.io/guides/spring/) for a step-by-step walkthrough.
4. **Explore the demos.** The [demo repository](https://github.com/heutelbeck/sapl-demos) has runnable examples for all integration patterns.
5. **Talk to us.** [Request a demo](https://sapl.io/support/) tailored to your use case.
