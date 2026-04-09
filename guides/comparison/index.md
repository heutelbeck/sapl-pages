---
layout: sapl
title: "Authorization Engine Comparison - SAPL vs Cedar, OPA, OpenFGA, Cerbos"
description: "Feature and performance comparison of open-source authorization engines. SAPL, Cedar, OPA, OpenFGA, and Cerbos compared on access control models, streaming, obligations, testing, deployment, framework integration, AI support, and evaluation latency."
---

<style>
  .cmp-hero { background: var(--color-bg-card); border-left: 4px solid var(--color-primary); padding: 1.4rem 1.8rem; margin: 1.5rem 0 2rem; border-radius: 0 8px 8px 0; }
  .cmp-hero h3 { margin-top: 0; color: var(--color-primary); }
  .cmp-hero ul { margin: 0.8rem 0 0; padding-left: 1.2rem; }
  .cmp-hero li { margin-bottom: 0.5rem; line-height: 1.5; }
  .cmp-hero .num { font-size: 1.15rem; font-weight: 700; }
  .cmp-note { background: var(--color-bg-card); border-left: 4px solid var(--color-accent); padding: 0.8rem 1.2rem; margin: 1rem 0; border-radius: 0 6px 6px 0; font-size: 0.9rem; }
  .cmp-chart { background: var(--color-bg-card); border-radius: 8px; padding: 1.5rem; margin: 1.5rem 0; }
  .cmp-chart h3 { margin-top: 0; }
  .cmp-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
  @media (max-width: 900px) { .cmp-row { grid-template-columns: 1fr; } }
  .cmp-table-wrap { overflow-x: auto; margin: 1.5rem 0; }
  .cmp-table { width: 100%; border-collapse: collapse; font-size: 0.9rem; }
  .cmp-table th, .cmp-table td { padding: 0.6rem 0.8rem; border: 1px solid var(--color-border, rgba(128,128,128,0.25)); text-align: left; vertical-align: top; }
  .cmp-table th { background: var(--color-bg-card); font-weight: 600; position: sticky; top: 0; }
  .cmp-table th:first-child { min-width: 180px; }
  .cmp-table td:first-child { font-weight: 500; }
  .cmp-table tr:nth-child(even) { background: var(--color-bg-card); }
  .cmp-section { border-left: 3px solid var(--color-primary); padding-left: 0.6rem; font-weight: 600; background: var(--color-bg-card); }
  .cmp-strengths { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 1rem; margin: 1.5rem 0; }
  .cmp-strengths > div { background: var(--color-bg-card); border-radius: 8px; padding: 1rem 1.2rem; }
  .cmp-strengths h4 { margin: 0 0 0.4rem; color: var(--color-primary); font-size: 0.95rem; }
  .cmp-strengths p { margin: 0; font-size: 0.88rem; line-height: 1.45; }
  .cmp-env { background: var(--color-bg-card); padding: 1rem 1.5rem; border-radius: 6px; font-family: monospace; font-size: 0.85rem; margin: 1rem 0; }
  .cmp-table td.cmp-yes { background: rgba(46, 160, 67, 0.15); }
  .cmp-table td.cmp-partial { background: rgba(210, 167, 30, 0.15); }
  .cmp-table td.cmp-no { background: rgba(210, 70, 50, 0.10); }
</style>

## Authorization Engine Comparison

Five open-source authorization engines, compared on features, integration depth, and evaluation performance. The engines represent different design traditions: purpose-built policy languages (SAPL, Cedar), general-purpose policy engines (OPA/Rego), relationship-based authorization (OpenFGA), and policy-as-YAML (Cerbos).

<div class="cmp-hero">
  <h3>Summary</h3>
  <ul>
    <li><span class="num">Performance.</span> SAPL delivers sub-microsecond median evaluation latency, 10x faster than Cedar and orders of magnitude faster than OPA and OpenFGA in the <a href="https://arxiv.org/abs/2403.04651">Cedar OOPSLA benchmark scenarios</a>. As a deployed server, SAPL sustains over 2M decisions/sec (8 cores, JVM) with 35 &micro;s p50 latency, even at 10,000 policies. See the <a href="/guides/performance/">full performance benchmarks</a>.</li>
    <li><span class="num">Streaming.</span> Only SAPL supports streaming authorization (ASBAC). Applications subscribe once and receive updated decisions as policies, attributes, or external data change. All other engines are request-response only.</li>
    <li><span class="num">Decisions beyond permit/deny.</span> Obligations and advice were introduced by the XACML standard. SAPL carries this concept forward with a modern policy language. Decisions include structured instructions for query rewriting, data filtering, field redaction, audit logging, and approval workflows. Among the engines compared here, none of the others include obligations or advice in the decision. Cerbos adds limited output expressions.</li>
    <li><span class="num">Framework integration.</span> SAPL provides enforcement annotations or decorators for 7 frameworks (Spring, Django, FastAPI, Flask, NestJS, .NET, FastMCP) including streaming enforcement and database query rewriting. OPA provides enforcement middleware for Spring Boot and ASP.NET Core. OpenFGA has a Spring Boot starter with <code>@PreAuthorize</code>. Cedar has Express.js middleware with OpenAPI schema generation. Cerbos covers 8 languages as API clients with query plan adapters for Prisma, SQLAlchemy, and Drizzle. See the <a href="#integration-depth">integration depth table</a> for details.</li>
    <li><span class="num">Verification and testing.</span> All engines provide ways to gain confidence in policy correctness, with different approaches. Cedar offers formal verification via Lean proofs for mathematically provable security properties. The NIST NGAC standard also explores this area. SAPL has a behavior-driven testing language (SAPLTest) with given/when/expect/then blocks, declarative mocking, streaming assertions, and coverage reporting. OPA has a built-in Rego test runner with coverage. Cerbos uses YAML test suites. OpenFGA has CLI model tests.</li>
    <li><span class="num">AI and agent authorization.</span> SAPL provides a dedicated FastMCP SDK for MCP server authorization. Spring AI tool methods can be secured via the existing SAPL Spring Boot integration. RAG and human-in-the-loop patterns use standard SAPL features (obligations, query rewriting). Cedar offers MCP schema generation. OpenFGA and Cerbos document RAG patterns.</li>
    <li><span class="num">Deployment.</span> SAPL, OPA, OpenFGA, and Cerbos ship standalone server binaries. SAPL, Cedar, and OPA can also be embedded as libraries. Cedar is embeddable only with no standalone server.</li>
  </ul>
</div>

### What Each Engine Does Well

Every engine in this comparison is a serious, maintained open-source project. Each reflects different design priorities, and the right choice depends on your requirements.

<div class="cmp-strengths">
  <div>
    <h4>SAPL</h4>
    <p>Fastest evaluation. Only engine with streaming authorization and first-class obligations/advice. Deep framework integrations with method-level enforcement. Extensible with custom functions and attribute finders. Behavior-driven testing language with coverage.</p>
  </div>
  <div>
    <h4>Cedar</h4>
    <p>Formal verification via Lean proofs. Mathematically provable security properties about policy sets. Purpose-built language with strong static typing. Backed by AWS.</p>
  </div>
  <div>
    <h4>OPA / Rego</h4>
    <p>Broadest cloud-native ecosystem. First-class Kubernetes (Gatekeeper), Envoy, Terraform, Docker, and Kafka integrations. CNCF graduated. Domain-agnostic: policies beyond just authorization.</p>
  </div>
  <div>
    <h4>OpenFGA</h4>
    <p>Google Zanzibar model for relationship-based access control at scale. Purpose-built for ReBAC with transitive relationship traversal. CNCF incubating. Used in production by Auth0, Grafana Labs, Docker.</p>
  </div>
  <div>
    <h4>Cerbos</h4>
    <p>Stateless PDP with zero-dependency YAML policies. GitOps-native with file/git-based policy storage. Widest SDK coverage (8 languages). Kubernetes sidecar and DaemonSet patterns.</p>
  </div>
</div>


### Performance Comparison

These benchmarks reproduce the experimental setup from the [Cedar OOPSLA 2024 paper](https://arxiv.org/abs/2403.04651) (Cutler et al., Section 5, Figure 14), adding SAPL to the original comparison of Cedar, OPA, and OpenFGA. The same three application scenarios, the same entity generators, the same request distributions. All engines evaluate equivalent authorization models and produce identical allow/deny decisions for every request.

Each data point represents 100,000 authorization requests across 200 randomly generated entity stores. Evaluation time measures the core `is_authorized()` operation: no parsing, no entity loading. SAPL, Cedar, and OPA are evaluated as embedded libraries. OpenFGA is evaluated over HTTP to a local in-memory server, as in the original Cedar paper.

<div class="cmp-note">
The Cedar paper's original claim: "Cedar is 28.7x to 35.2x faster than OpenFGA and 42.8x to 80.8x faster than Rego." Adding SAPL to the same benchmark, SAPL is 8 to 10x faster than Cedar.
</div>

<div class="cmp-chart">
  <h3>Google Drive: Median and p99 Evaluation Latency</h3>
  <p style="font-size:0.85rem;margin-top:0">5 policies. Users share Documents and Folders with transitive view access. Entity graph scales with N (users, groups, documents, folders).</p>
  <canvas id="gdriveChart"></canvas>
</div>

<div class="cmp-chart">
  <h3>GitHub: Median and p99 Evaluation Latency</h3>
  <p style="font-size:0.85rem;margin-top:0">8 policies. Users and Teams with read/triage/write/maintain/admin on Repositories and Organizations. Entity graph scales with N.</p>
  <canvas id="githubChart"></canvas>
</div>

<div class="cmp-chart">
  <h3>TinyTodo: Median and p99 Evaluation Latency</h3>
  <p style="font-size:0.85rem;margin-top:0">4 policies. Users and Teams sharing todo Lists. Entity graph scales with N.</p>
  <canvas id="tinytodoChart"></canvas>
</div>

<div class="cmp-note">
The occasional spikes in SAPL's p99 line are JVM garbage collection pauses. The median is unaffected, confirming that GC events are rare and do not impact typical request latency. For SAPL's standalone performance (embedded throughput, server throughput over HTTP and RSocket, policy scaling to 10,000 policies, JVM vs native image), see the <a href="/guides/performance/">full performance benchmarks</a>.
</div>

### Benchmark Environment

<div class="cmp-env">
CPU: Intel Core i9-13900KS (8 P-cores + 16 E-cores, 32 logical)<br>
Clock: All P-cores pinned to 4.0 GHz (constant frequency, no turbo/throttle noise)<br>
JVM: OpenJDK 25.0.2 (HotSpot C2) for SAPL<br>
Cedar: v4.10 and v3.0.1 (Rust), OPA: Rego v0.61.0 (Go), OpenFGA: latest (Go in-memory store)<br>
OS: NixOS Linux 6.18.19<br>
Protocol: 200 entity stores per data point, 500 requests per store (100,000 total)<br>
Metric: Core is_authorized() time, excluding I/O, parsing, and entity loading
</div>


### Feature Comparison

<div class="cmp-table-wrap">
<table class="cmp-table">
<thead>
<tr><th>Feature</th><th>SAPL</th><th>Cedar</th><th>OPA</th><th>OpenFGA</th><th>Cerbos</th></tr>
</thead>
<tbody>

<tr><td class="cmp-section" colspan="6">Authorization Models</td></tr>
<tr>
  <td>RBAC</td>
  <td>Yes</td>
  <td>Yes</td>
  <td>Yes</td>
  <td>Yes (via ReBAC)</td>
  <td>Yes</td>
</tr>
<tr>
  <td>ABAC</td>
  <td>Yes</td>
  <td>Yes</td>
  <td>Yes</td>
  <td>Partial (CEL conditions)</td>
  <td>Yes</td>
</tr>
<tr>
  <td>ReBAC</td>
  <td>Yes</td>
  <td>Yes</td>
  <td>Yes</td>
  <td>Yes</td>
  <td>No</td>
</tr>
<tr>
  <td>ACL</td>
  <td>Yes</td>
  <td>Yes</td>
  <td>Yes</td>
  <td>Yes (via tuples)</td>
  <td>Yes</td>
</tr>
<tr>
  <td>Location-based (GIS / geometry)</td>
  <td>Yes (built-in geo functions)</td>
  <td>No</td>
  <td>No</td>
  <td>No</td>
  <td>No</td>
</tr>
<tr>
  <td>Streaming (ASBAC)</td>
  <td>Yes</td>
  <td>No</td>
  <td>No</td>
  <td>No</td>
  <td>No</td>
</tr>

<tr><td class="cmp-section" colspan="6">Policy Language</td></tr>
<tr>
  <td>Language type</td>
  <td>SAPL (purpose-built)</td>
  <td>Cedar (purpose-built)</td>
  <td>Rego (Datalog-derived)</td>
  <td>DSL + JSON</td>
  <td>YAML + CEL conditions</td>
</tr>
<tr>
  <td>Human-readable syntax</td>
  <td>Yes</td>
  <td>Yes</td>
  <td>Moderate (Datalog)</td>
  <td>Moderate (DSL/JSON)</td>
  <td>Yes (YAML)</td>
</tr>
<tr>
  <td>Hot-reload policies</td>
  <td>Yes (active subscriptions re-evaluate)</td>
  <td>Manual (reconstruct authorizer with new policy set)</td>
  <td>Yes (bundles)</td>
  <td>N/A (API-driven)</td>
  <td>Yes (file watch)</td>
</tr>
<tr>
  <td>Custom functions</td>
  <td>Yes</td>
  <td>No (extension types only)</td>
  <td>Yes (Rego + Go plugins)</td>
  <td>No</td>
  <td>No (built-in CEL only)</td>
</tr>

<tr><td class="cmp-section" colspan="6">Decision Model</td></tr>
<tr>
  <td>Decision protocol</td>
  <td>Streaming + request-response</td>
  <td>Request-response</td>
  <td>Request-response</td>
  <td>Request-response</td>
  <td>Request-response</td>
</tr>
<tr>
  <td>Obligations / advice</td>
  <td>Yes (first-class constructs)</td>
  <td>No</td>
  <td>No</td>
  <td>No</td>
  <td>Output expressions (limited)</td>
</tr>
<tr>
  <td>External data during evaluation</td>
  <td>Yes (HTTP, MQTT, clock, custom PIPs)</td>
  <td>No (pre-loaded entity store)</td>
  <td>Yes (http.send, bundles)</td>
  <td>No (pre-loaded tuples)</td>
  <td>No (pre-loaded data)</td>
</tr>
<tr>
  <td>Data filtering / query rewriting</td>
  <td>Yes (JPA, R2DBC, MongoDB via obligations)</td>
  <td>No</td>
  <td>Partial evaluation</td>
  <td>ListObjects / ListUsers API</td>
  <td>PlanResources API</td>
</tr>
<tr>
  <td>Data transformation</td>
  <td>Yes (resource transformation via obligations)</td>
  <td>No</td>
  <td>Arbitrary structured output</td>
  <td>No</td>
  <td>Output expressions</td>
</tr>

<tr><td class="cmp-section" colspan="6">Verification and Testing</td></tr>
<tr>
  <td>Formal verification</td>
  <td>No</td>
  <td>Yes (Lean proofs)</td>
  <td>No</td>
  <td>No</td>
  <td>No</td>
</tr>
<tr>
  <td>Testing framework</td>
  <td>Behavior-driven DSL (SAPLTest)</td>
  <td>CLI validation + analysis</td>
  <td>Built-in Rego test runner</td>
  <td>CLI model tests</td>
  <td>YAML test suites</td>
</tr>
<tr>
  <td>Coverage reporting</td>
  <td>Yes</td>
  <td>No</td>
  <td>Yes</td>
  <td>No</td>
  <td>No</td>
</tr>
<tr>
  <td>Mocking support</td>
  <td>Yes (declarative PIP + function mocking)</td>
  <td>No</td>
  <td>No (test with fixtures)</td>
  <td>No</td>
  <td>No</td>
</tr>

<tr><td class="cmp-section" colspan="6">Deployment</td></tr>
<tr>
  <td>Embeddable library</td>
  <td>Yes (JVM)</td>
  <td>Yes (Rust, Java via JNI, community Go/WASM)</td>
  <td>Yes (Go)</td>
  <td>Server-oriented (Go library exists)</td>
  <td>No</td>
</tr>
<tr>
  <td>Standalone server</td>
  <td>Yes (HTTP + RSocket)</td>
  <td>No (library only)</td>
  <td>Yes (HTTP)</td>
  <td>Yes (HTTP + gRPC)</td>
  <td>Yes (HTTP + gRPC)</td>
</tr>
<tr>
  <td>Native binary (no runtime needed)</td>
  <td>Yes (GraalVM native image)</td>
  <td>Yes (Rust)</td>
  <td>Yes (Go)</td>
  <td>Yes (Go)</td>
  <td>Yes (Go)</td>
</tr>
<tr>
  <td>Implementation language</td>
  <td>Java / JVM</td>
  <td>Rust</td>
  <td>Go</td>
  <td>Go</td>
  <td>Go</td>
</tr>

<tr><td class="cmp-section" colspan="6">Operations</td></tr>
<tr>
  <td>Health / readiness probes</td>
  <td>Yes (Actuator: liveness, readiness, startup)</td>
  <td>No (library)</td>
  <td>Yes (/health endpoint)</td>
  <td>Yes (gRPC + HTTP probes)</td>
  <td>Yes (/_cerbos/health + CLI)</td>
</tr>
<tr>
  <td>Decision logging</td>
  <td>Yes (structured JSON with subscription, decision, obligations)</td>
  <td>No (library)</td>
  <td>Yes (remote HTTP, console, custom plugins)</td>
  <td>Yes (changelog API + structured logs)</td>
  <td>Yes (File, Kafka, Local DB, Hub)</td>
</tr>
<tr>
  <td>Prometheus metrics</td>
  <td>Yes (decisions, latency, active subscriptions)</td>
  <td>No (library)</td>
  <td>Yes (bundle loading, request latency)</td>
  <td>Yes</td>
  <td>Yes (+ OTLP push)</td>
</tr>
<tr>
  <td>Signed policy bundles</td>
  <td>Yes (Ed25519)</td>
  <td>No</td>
  <td>Yes (JWT + HMAC/RSA/ECDSA)</td>
  <td>No</td>
  <td>No (Git-based versioning)</td>
</tr>
<tr>
  <td>Evaluation diagnostics</td>
  <td>Yes (full trace, JSON report, text report)</td>
  <td>Determining policies + error details</td>
  <td>Yes (explain modes, OpenTelemetry)</td>
  <td>OpenTelemetry tracing</td>
  <td>Yes (matched policy, AST, OpenTelemetry)</td>
</tr>

<tr><td class="cmp-section" colspan="6">SDKs and Integrations</td></tr>
<tr>
  <td>Language SDKs</td>
  <td>Java, Python, JS, C#</td>
  <td>Rust, Go, Java, JS</td>
  <td>Go, Java, JS, C#</td>
  <td>Java, JS, Go, Python, C#</td>
  <td>Go, Java, JS, C#, PHP, Python, Ruby, Rust</td>
</tr>
<tr>
  <td>Framework integrations</td>
  <td>Spring, Django, FastAPI, Flask, NestJS, .NET, FastMCP</td>
  <td>Express.js</td>
  <td>Spring Boot, ASP.NET Core, Kubernetes, Envoy, Terraform, Docker, Kafka</td>
  <td>Spring Boot</td>
  <td>Query plan adapters (Prisma, SQLAlchemy, Drizzle)</td>
</tr>
<tr>
  <td>Kubernetes</td>
  <td>Via server deployment</td>
  <td>Admission control (deprecated PoC)</td>
  <td>Gatekeeper (CNCF), admission control</td>
  <td>Helm chart</td>
  <td>Sidecar, DaemonSet, Helm chart</td>
</tr>

<tr><td class="cmp-section" colspan="6">AI and Agent Authorization</td></tr>
<tr><td colspan="6" style="font-size:0.82rem;font-style:italic;border-left:none">All engines can authorize AI operations via their standard APIs. This section compares dedicated integrations and documented patterns.</td></tr>
<tr>
  <td>Tool call authorization</td>
  <td>Dedicated (Spring AI integration)</td>
  <td>Via standard API</td>
  <td>Via standard API</td>
  <td>Via standard API</td>
  <td>Via standard API</td>
</tr>
<tr>
  <td>RAG pipeline authorization</td>
  <td>Dedicated (obligation-driven query rewriting)</td>
  <td>Via standard API</td>
  <td>Via standard API</td>
  <td>Documented patterns</td>
  <td>Documented recipe</td>
</tr>
<tr>
  <td>Human-in-the-loop</td>
  <td>Dedicated (obligation-driven approval workflows)</td>
  <td>Via standard API</td>
  <td>Via standard API</td>
  <td>Via standard API</td>
  <td>Via standard API</td>
</tr>
<tr>
  <td>MCP server authorization</td>
  <td>Dedicated (FastMCP SDK, decorators)</td>
  <td>Dedicated (schema generation, analysis server)</td>
  <td>Via standard API</td>
  <td>Documented patterns</td>
  <td>Via standard API</td>
</tr>

</tbody>
</table>
</div>

<div class="cmp-note">
All information based on official documentation and public repositories as of April 2026. Entries marked with links are verifiable. If you believe an entry is inaccurate, please <a href="https://github.com/heutelbeck/sapl-pages/issues">open an issue</a>.
</div>


### Integration Depth

Raw SDK counts are misleading. A client library that sends HTTP requests to a PDP is fundamentally different from a framework integration with enforcement annotations, streaming support, or database query rewriting. This table shows what each engine's integrations actually provide.

<div class="cmp-table-wrap">
<table class="cmp-table">
<thead>
<tr><th>Framework</th><th>Enforcement</th><th>Streaming</th><th>Query Rewriting</th></tr>
</thead>
<tbody>

<tr><td class="cmp-section" colspan="4">SAPL</td></tr>
<tr>
  <td>Spring</td>
  <td>AOP annotations + AuthorizationManager with automatic obligation handling</td>
  <td>Yes (streaming annotations)</td>
  <td>R2DBC, MongoDB (deep query language integration), JPA and others (obligation-driven parameter rewriting)</td>
</tr>
<tr>
  <td>Django</td>
  <td>Full SDK with decorators and middleware</td>
  <td>Yes</td>
  <td>Obligation-driven parameter rewriting</td>
</tr>
<tr>
  <td>FastAPI</td>
  <td>Full SDK with decorators</td>
  <td>Yes</td>
  <td>Obligation-driven parameter rewriting</td>
</tr>
<tr>
  <td>Flask</td>
  <td>Full SDK with decorators</td>
  <td>Yes</td>
  <td>Obligation-driven parameter rewriting</td>
</tr>
<tr>
  <td>NestJS</td>
  <td>Full SDK with guards and decorators</td>
  <td>Yes</td>
  <td>Obligation-driven parameter rewriting</td>
</tr>
<tr>
  <td>.NET</td>
  <td>Full SDK with middleware</td>
  <td>Yes</td>
  <td>Obligation-driven parameter rewriting</td>
</tr>
<tr>
  <td>FastMCP (Python)</td>
  <td>Full SDK with decorators for tools, resources, prompts</td>
  <td>No</td>
  <td>Obligation-driven parameter rewriting</td>
</tr>

<tr><td class="cmp-section" colspan="4">Cedar</td></tr>
<tr>
  <td>Express.js</td>
  <td>Route-level middleware with OpenAPI schema generation and starter policy generation</td>
  <td>No</td>
  <td>No</td>
</tr>
<tr>
  <td>Java, Go, Rust</td>
  <td>Evaluation library only (no framework enforcement)</td>
  <td>No</td>
  <td>No</td>
</tr>

<tr><td class="cmp-section" colspan="4">OPA / Rego</td></tr>
<tr>
  <td>Spring Boot</td>
  <td>AuthorizationManager (Spring Security)</td>
  <td>No</td>
  <td>No</td>
</tr>
<tr>
  <td>ASP.NET Core</td>
  <td>OpaAuthorizationMiddleware (HTTP pipeline enforcement)</td>
  <td>No</td>
  <td>No</td>
</tr>
<tr>
  <td>Kubernetes, Envoy, Terraform, Docker, Kafka</td>
  <td>Infrastructure-level enforcement (Gatekeeper, sidecar plugins)</td>
  <td>No</td>
  <td>Partial evaluation (generates filter conditions)</td>
</tr>
<tr>
  <td>Java, TypeScript, C#, Go</td>
  <td>API client only</td>
  <td>No</td>
  <td>No</td>
</tr>

<tr><td class="cmp-section" colspan="4">OpenFGA</td></tr>
<tr>
  <td>Spring Boot</td>
  <td>AOP annotations (Spring Security)</td>
  <td>No</td>
  <td>ListObjects / ListUsers API</td>
</tr>
<tr>
  <td>JS, Python, Java, C#, Go</td>
  <td>API client only</td>
  <td>No</td>
  <td>No</td>
</tr>

<tr><td class="cmp-section" colspan="4">Cerbos</td></tr>
<tr>
  <td>Go, Java, JS, C#, PHP, Python, Ruby, Rust</td>
  <td>API client only</td>
  <td>No</td>
  <td>Prisma, SQLAlchemy, Drizzle (query plan adapters)</td>
</tr>

</tbody>
</table>
</div>

<div class="cmp-note">
SAPL is the only engine with first-class constraint handling (obligations and advice that drive data filtering, field redaction, audit logging). Cerbos offers output expressions and OPA can return structured data, but enforcement remains application-side. SAPL SDKs execute constraints automatically.
</div>


### Methodology and Sources

**Benchmark code.** All benchmark code, scenario generators, and analysis tools are open source. The Cedar OOPSLA benchmark harness is at [cedar-policy/cedar-examples](https://github.com/cedar-policy/cedar-examples). Our fork with the SAPL engine integration is at [heutelbeck/cedar-benchmarks](https://github.com/heutelbeck/cedar-benchmarks) (branches `sapl-engine` for Cedar 3.0 and `sapl-engine-4.10` for Cedar 4.10).

**Engine documentation.** Feature claims are based on official documentation: [SAPL](https://sapl.io), [Cedar](https://www.cedarpolicy.com/), [OPA](https://www.openpolicyagent.org/), [OpenFGA](https://openfga.dev/), [Cerbos](https://www.cerbos.dev/).

**Cedar paper.** Cutler et al., "Cedar: A New Language for Expressive, Fast, Safe, and Analyzable Authorization (Extended Version)," [arXiv:2403.04651](https://arxiv.org/abs/2403.04651), OOPSLA 2024.

<script src="/guides/performance/chart.umd.min.js"></script>
<script>
const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
Chart.defaults.color = isDark ? '#e0e0e0' : '#333';
Chart.defaults.borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

const ENGINE_COLORS = {
  sapl:    '#027080',
  cedar:   '#5a9a68',
  cedar3:  '#a0c8a8',
  rego:    '#4a90d9',
  openfga: '#e07050'
};

async function load(file) {
  const r = await fetch('/guides/comparison/data/' + file);
  return r.json();
}

function buildChart(canvasId, data, xLabel) {
  function ds(engine, label, pct) {
    const color = ENGINE_COLORS[engine];
    const dashed = pct === 'p99';
    const key = engine + '_' + (pct === 'median' ? 'med' : pct);
    return {
      label: label + ' ' + pct,
      data: data.map(d => ({ x: d.n, y: d[key] })),
      borderColor: color,
      backgroundColor: 'transparent',
      borderDash: dashed ? [6, 3] : [],
      pointRadius: dashed ? 3 : 5,
      pointStyle: dashed ? 'rect' : 'circle',
      showLine: true,
      tension: 0.3
    };
  }
  new Chart(document.getElementById(canvasId), {
    type: 'scatter',
    data: {
      datasets: [
        ds('sapl', 'SAPL', 'median'), ds('sapl', 'SAPL', 'p99'),
        ds('cedar', 'Cedar 4.10', 'median'), ds('cedar', 'Cedar 4.10', 'p99'),
        ds('cedar3', 'Cedar 3.0', 'median'), ds('cedar3', 'Cedar 3.0', 'p99'),
        ds('rego', 'OPA/Rego', 'median'), ds('rego', 'OPA/Rego', 'p99'),
        ds('openfga', 'OpenFGA', 'median'), ds('openfga', 'OpenFGA', 'p99'),
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: 'top' } },
      scales: {
        x: { type: 'linear', title: { display: true, text: xLabel },
             min: data[0].n, ticks: { callback: function(v) { return v; },
             autoSkip: false, stepSize: 1 },
             afterBuildTicks: function(axis) { axis.ticks = data.map(d => ({ value: d.n })); } },
        y: { type: 'logarithmic', title: { display: true, text: 'Latency (\u00B5s)' },
             ticks: { callback: function(v) {
               if (v >= 1000) return (v / 1000).toFixed(0) + ' ms';
               if (v >= 1) return v.toFixed(0) + ' \u00B5s';
               return (v * 1000).toFixed(0) + ' ns';
             }}}
      }
    }
  });
}

async function main() {
  const [gdrive, github, tinytodo] = await Promise.all([
    load('gdrive.json'), load('github.json'), load('tinytodo.json')
  ]);
  buildChart('gdriveChart', gdrive, 'Number of Users, Groups, Documents, and Folders');
  buildChart('githubChart', github, 'Number of Users, Teams, Repos, and Orgs');
  buildChart('tinytodoChart', tinytodo, 'Number of Users, Teams, and Lists');
}
main();

// Re-render on theme change
const observer = new MutationObserver(() => {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  Chart.defaults.color = dark ? '#e0e0e0' : '#333';
  Chart.defaults.borderColor = dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  Object.values(Chart.instances).forEach(c => c.destroy());
  main();
});
observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

// Auto-color feature table cells
document.querySelectorAll('.cmp-table td').forEach(td => {
  if (td.classList.contains('cmp-section')) return;
  if (td === td.parentElement.firstElementChild) return;
  const t = td.textContent.trim().toLowerCase();
  if (t === 'no' || t === '\u2014' || t === '\u2013' || t === '-' || t === '') {
    td.classList.add('cmp-no');
  } else if (t.startsWith('partial') || t.startsWith('limited') || t.includes('only') || t.includes('via ') || t.includes('deprecated')) {
    td.classList.add('cmp-partial');
  } else if (t.startsWith('yes') || t.length > 0) {
    td.classList.add('cmp-yes');
  }
});
</script>
