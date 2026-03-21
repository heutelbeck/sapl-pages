---
layout: sapl
title: "Multi-Framework Authorization - SAPL Guides"
description: "Same SAPL policies, same authorization behavior, any stack. Tabbed code examples across Spring, Flask, FastAPI, Django, Tornado, NestJS, and .NET."
---

## Multi-Framework Authorization

Write your authorization policies once. Enforce them identically in Spring, Flask, FastAPI, Django, Tornado, NestJS, and .NET. Every framework passes the same 28-endpoint test suite with identical behavior.

### How this works

SAPL separates the authorization decision (PDP) from enforcement (PEP). Each framework SDK implements the same PEP behavior: subscribe to the PDP, enforce decisions, handle obligations and advice, apply constraint handlers. The [PEP Implementation Specification](/docs/8_1_PEPImplementationSpecification/) specifies this contract. All SDKs listed below are built against it.

Each pattern in this guide links to the relevant specification section. For framework-specific details, see the SDK documentation:

| Framework | SDK Documentation | Demo |
|-----------|------------------|------|
| Spring | [Spring SDK](/docs/6_3_Spring/) | [spring-demo](https://github.com/heutelbeck/sapl-demos/tree/master/spring-demo) |
| Flask | [Flask SDK](/docs/6_6_Flask/) | [flask_demo](https://github.com/heutelbeck/sapl-python-demos/tree/main/flask_demo) |
| FastAPI | [FastAPI SDK](/docs/6_7_FastAPI/) | [fastapi_demo](https://github.com/heutelbeck/sapl-python-demos/tree/main/fastapi_demo) |
| Django | [Django SDK](/docs/6_5_Django/) | [django_demo](https://github.com/heutelbeck/sapl-python-demos/tree/main/django_demo) |
| Tornado | [Tornado SDK](/docs/6_8_Tornado/) | [tornado_demo](https://github.com/heutelbeck/sapl-python-demos/tree/main/tornado_demo) |
| NestJS | [NestJS SDK](/docs/6_4_NestJS/) | [sapl-nestjs-demo](https://github.com/heutelbeck/sapl-nestjs-demo) |
| .NET | [.NET SDK](/docs/6_10_DotNet/) | [sapl-dotnet-demos](https://github.com/heutelbeck/sapl-dotnet-demos) |

The examples below show Spring, Flask, FastAPI, NestJS, and .NET side-by-side. Django and Tornado follow the same Python decorator pattern as Flask and FastAPI. Their full implementations are in the demo repositories linked above.

### The patterns

Each pattern shows the application code across frameworks, the shared SAPL policy, and what happens at runtime.

### 1. Manual PDP call

The simplest integration: call the PDP directly and inspect the decision. No annotations, no decorators. Useful for understanding the subscription model. ([Spec: Basic Request-Response Enforcement](/docs/8_1_PEPImplementationSpecification/#42-basic-request-response-enforcement))

<div class="code-tabs">
  <div class="tab-bar">
    <button class="tab active" data-tab="spring" data-lang="java">Spring</button>
    <button class="tab" data-tab="flask" data-lang="python">Flask</button>
    <button class="tab" data-tab="fastapi" data-lang="python">FastAPI</button>
    <button class="tab" data-tab="nestjs" data-lang="javascript">NestJS</button>
    <button class="tab" data-tab="dotnet" data-lang="java">.NET</button>
  </div>
  <div class="tab-content active" id="tab-spring" data-lang="java">
<pre class="cm-source"><code>@GetMapping("/api/hello")
Mono&lt;HelloResponse&gt; getHello() {
    var subscription = AuthorizationSubscription.of("anonymous", "read", "hello");
    return pdp.decideOnce(subscription).flatMap(decision -&gt; {
        if (decision.decision() == Decision.PERMIT
                &amp;&amp; decision.obligations().isEmpty()
                &amp;&amp; decision.resource() instanceof UndefinedValue) {
            return Mono.just(new HelloResponse("hello"));
        }
        return Mono.error(new ResponseStatusException(HttpStatus.FORBIDDEN));
    });
}</code></pre>
  </div>
  <div class="tab-content" id="tab-flask" data-lang="python">
<pre class="cm-source"><code>@basic_bp.route("/hello")
def get_hello():
    subscription = AuthorizationSubscription(
        subject="anonymous", action="read", resource="hello",
    )
    decision = asyncio.run(sapl.pdp_client.decide_once(subscription))
    if decision.decision == Decision.PERMIT \
            and not decision.obligations and not decision.has_resource:
        return jsonify({"message": "hello"})
    abort(403)</code></pre>
  </div>
  <div class="tab-content" id="tab-fastapi" data-lang="python">
<pre class="cm-source"><code>@router.get("/hello")
async def get_hello(request: Request):
    subscription = AuthorizationSubscription(
        subject="anonymous", action="read", resource="hello",
    )
    decision = await pdp_client.decide_once(subscription)
    if decision.decision == Decision.PERMIT \
            and not decision.obligations and not decision.has_resource:
        return {"message": "hello"}
    raise HTTPException(status_code=403)</code></pre>
  </div>
  <div class="tab-content" id="tab-nestjs" data-lang="javascript">
<pre class="cm-source"><code>@Get('hello')
async getHello() {
    const decision = await this.pdpService.decideOnce({
        subject: 'anonymous', action: 'read', resource: 'hello',
    });
    if (decision.decision === 'PERMIT'
            &amp;&amp; !decision.obligations?.length
            &amp;&amp; decision.resource == null) {
        return { message: 'hello' };
    }
    throw new ForbiddenException();
}</code></pre>
  </div>
  <div class="tab-content" id="tab-dotnet" data-lang="java">
<pre class="cm-source"><code>[HttpGet("hello")]
public async Task&lt;IActionResult&gt; GetHello()
{
    var decision = await _pdp.DecideOnceAsync(
        AuthorizationSubscription.Create("anonymous", "read", "hello"));
    if (decision.Decision == Decision.Permit
            &amp;&amp; (decision.Obligations is null || decision.Obligations.Count == 0)
            &amp;&amp; !decision.Resource.HasValue)
        return Ok(new { message = "hello" });
    return StatusCode(403);
}</code></pre>
  </div>
</div>

```sapl
policy "permit-read-hello"
permit
  action == "read";
  resource == "hello";
```

Every framework creates the same subscription `{subject: "anonymous", action: "read", resource: "hello"}`, gets back `PERMIT`, and returns `{"message": "hello"}`.

### 2. Declarative enforcement with content filtering

One annotation or decorator replaces the manual PDP call. The framework handles the decision, and SAPL's built-in content filter blackens the SSN before the response reaches the client. ([Spec: PreEnforce](/docs/8_1_PEPImplementationSpecification/#71-preenforce-pre-method-authorization), [Content Filtering](/docs/8_1_PEPImplementationSpecification/#87-content-filtering-built-in-handler))

<div class="code-tabs">
  <div class="tab-bar">
    <button class="tab active" data-tab="spring" data-lang="java">Spring</button>
    <button class="tab" data-tab="flask" data-lang="python">Flask</button>
    <button class="tab" data-tab="fastapi" data-lang="python">FastAPI</button>
    <button class="tab" data-tab="nestjs" data-lang="javascript">NestJS</button>
    <button class="tab" data-tab="dotnet" data-lang="java">.NET</button>
  </div>
  <div class="tab-content active" id="tab-spring" data-lang="java">
<pre class="cm-source"><code>@GetMapping("/api/patient/{patientId}")
@PreEnforce(action = "'readPatient'", resource = "'patient'")
Mono&lt;Patient&gt; getPatient(@PathVariable String patientId) {
    return Mono.justOrEmpty(Patients.findById(patientId));
}</code></pre>
  </div>
  <div class="tab-content" id="tab-flask" data-lang="python">
<pre class="cm-source"><code>@basic_bp.route("/patient/&lt;patient_id&gt;")
@pre_enforce(action="readPatient", resource="patient")
def get_patient(patient_id: str):
    for p in PATIENTS:
        if p["id"] == patient_id:
            return dict(p)
    abort(404)</code></pre>
  </div>
  <div class="tab-content" id="tab-fastapi" data-lang="python">
<pre class="cm-source"><code>@router.get("/patient/{patient_id}")
@pre_enforce(action="readPatient", resource="patient")
async def get_patient(request: Request, patient_id: str):
    for p in PATIENTS:
        if p["id"] == patient_id:
            return dict(p)
    raise HTTPException(status_code=404)</code></pre>
  </div>
  <div class="tab-content" id="tab-nestjs" data-lang="javascript">
<pre class="cm-source"><code>@PreEnforce({ action: 'readPatient', resource: 'patient' })
@Get('patient/:id')
getPatient(@Param('id') id: string) {
    return this.patientService.getPatientById(id);
}</code></pre>
  </div>
  <div class="tab-content" id="tab-dotnet" data-lang="java">
<pre class="cm-source"><code>[HttpGet("patient/{id}")]
[PreEnforce(Action = "readPatient", Resource = "patient")]
public IActionResult GetPatient(string id)
{
    var patient = PatientData.Find(id);
    return patient is null ? NotFound() : Ok(patient);
}</code></pre>
  </div>
</div>

The endpoint returns the full patient record. The policy permits but attaches a content filter obligation:

```sapl
policy "permit-read-patient"
permit
  action == "readPatient";
  resource == "patient";
obligation
  {
    "type": "filterJsonContent",
    "actions": [
      {
        "type": "blacken",
        "path": "$.ssn",
        "discloseRight": 4
      }
    ]
  }
```

The application code never touches the SSN. The framework applies the filter after the method returns, before the response is sent. The client receives `"ssn": "XXXXX6789"` instead of `"ssn": "123-45-6789"`.

### 3. Argument manipulation via constraint handler

The policy caps the transfer amount at 5000. A `MethodInvocationConstraintHandler` modifies the method argument before execution. The application code sees the already-capped value. ([Spec: Handler Types](/docs/8_1_PEPImplementationSpecification/#81-handler-types))

<div class="code-tabs">
  <div class="tab-bar">
    <button class="tab active" data-tab="spring" data-lang="java">Spring</button>
    <button class="tab" data-tab="flask" data-lang="python">Flask</button>
    <button class="tab" data-tab="fastapi" data-lang="python">FastAPI</button>
    <button class="tab" data-tab="nestjs" data-lang="javascript">NestJS</button>
    <button class="tab" data-tab="dotnet" data-lang="java">.NET</button>
  </div>
  <div class="tab-content active" id="tab-spring" data-lang="java">
<pre class="cm-source"><code>// Service method - the handler caps `amount` before this runs
@PreEnforce(action = "'transfer'", resource = "'account'")
public Mono&lt;TransferResult&gt; doTransfer(Double amount, String recipient) {
    return Mono.just(new TransferResult(amount, recipient, "completed"));
}</code></pre>
  </div>
  <div class="tab-content" id="tab-flask" data-lang="python">
<pre class="cm-source"><code># The handler caps `amount` in kwargs before this runs
@pre_enforce(action="transfer", resource="account")
def do_transfer(amount: float = 10000.0, recipient: str = "default-account"):
    return {"transferred": amount, "recipient": recipient, "status": "completed"}</code></pre>
  </div>
  <div class="tab-content" id="tab-fastapi" data-lang="python">
<pre class="cm-source"><code># The handler caps `amount` in kwargs before this runs
@router.post("/transfer")
@pre_enforce(action="transfer", resource="account")
async def transfer(request: Request, amount: float = 10000.0,
                   recipient: str = "default-account"):
    return {"transferred": amount, "recipient": recipient, "status": "completed"}</code></pre>
  </div>
  <div class="tab-content" id="tab-nestjs" data-lang="javascript">
<pre class="cm-source"><code>// The handler caps `amount` in the request before this runs
@Post('transfer')
@PreEnforce({ action: 'transfer', resource: 'account' })
transfer(@Query('amount') amount: string) {
    return { transferred: Number(amount), recipient: 'default-account',
             status: 'completed' };
}</code></pre>
  </div>
  <div class="tab-content" id="tab-dotnet" data-lang="java">
<pre class="cm-source"><code>// The handler caps `amount` via HttpContext before this runs
[HttpPost("transfer")]
[PreEnforce(Action = "transfer", Resource = "account")]
public IActionResult Transfer([FromQuery] double amount)
{
    return Ok(new { transferred = amount, status = "completed" });
}</code></pre>
  </div>
</div>

```sapl
policy "permit-transfer"
permit
  action == "transfer";
  resource == "account";
obligation
  {
    "type": "capTransferAmount",
    "maxAmount": 5000
  }
obligation
  {
    "type": "logAccess",
    "message": "Fund transfer executed"
  }
```

A `POST /api/transfer?amount=8000` results in `{"transferred": 5000}`. The policy also logs the access as a second obligation. Both obligations must be fulfilled for the permit to take effect. ([Spec: Obligation vs Advice](/docs/8_1_PEPImplementationSpecification/#83-obligation-vs-advice-error-semantics))

### 4. Field redaction via mapping handler

A `MappingConstraintHandler` transforms the response after the method returns. The policy names which fields to redact. The handler replaces their values with `[REDACTED]`. ([Spec: Handler Composition](/docs/8_1_PEPImplementationSpecification/#84-handler-composition))

<div class="code-tabs">
  <div class="tab-bar">
    <button class="tab active" data-tab="spring" data-lang="java">Spring</button>
    <button class="tab" data-tab="flask" data-lang="python">Flask</button>
    <button class="tab" data-tab="fastapi" data-lang="python">FastAPI</button>
    <button class="tab" data-tab="nestjs" data-lang="javascript">NestJS</button>
    <button class="tab" data-tab="dotnet" data-lang="java">.NET</button>
  </div>
  <div class="tab-content active" id="tab-spring" data-lang="java">
<pre class="cm-source"><code>@GetMapping("/redacted")
@PreEnforce(action = "'readRedacted'", resource = "'redacted'")
Mono&lt;FinancialRecord&gt; getRedacted() {
    return Mono.just(new FinancialRecord(
        "John Smith", "987-65-4321", "4111-1111-1111-1111",
        "john@example.com", 1500.0));
}</code></pre>
  </div>
  <div class="tab-content" id="tab-flask" data-lang="python">
<pre class="cm-source"><code>@constraints_bp.route("/redacted")
@pre_enforce(action="readRedacted", resource="redacted")
def get_redacted():
    return {"name": "John Smith", "ssn": "987-65-4321",
            "creditCard": "4111-1111-1111-1111",
            "email": "john@example.com", "balance": 1500.0}</code></pre>
  </div>
  <div class="tab-content" id="tab-fastapi" data-lang="python">
<pre class="cm-source"><code>@router.get("/redacted")
@pre_enforce(action="readRedacted", resource="redacted")
async def get_redacted(request: Request):
    return {"name": "John Smith", "ssn": "987-65-4321",
            "creditCard": "4111-1111-1111-1111",
            "email": "john@example.com", "balance": 1500.0}</code></pre>
  </div>
  <div class="tab-content" id="tab-nestjs" data-lang="javascript">
<pre class="cm-source"><code>@PreEnforce({ action: 'readRedacted', resource: 'redacted' })
@Get('redacted')
getRedacted() {
    return { name: 'John Smith', ssn: '987-65-4321',
             creditCard: '4111-1111-1111-1111',
             email: 'john@example.com', balance: 1500.0 };
}</code></pre>
  </div>
  <div class="tab-content" id="tab-dotnet" data-lang="java">
<pre class="cm-source"><code>[HttpGet("redacted")]
[PreEnforce(Action = "readRedacted", Resource = "redacted")]
public IActionResult GetRedacted()
{
    return Ok(new { name = "John Smith", ssn = "987-65-4321",
        creditCard = "4111-1111-1111-1111",
        email = "john@example.com", balance = 1500.0 });
}</code></pre>
  </div>
</div>

```sapl
policy "permit-redacted"
permit
  action == "readRedacted";
  resource == "redacted";
obligation
  {
    "type": "redactFields",
    "fields": ["ssn", "creditCard"]
  }
```

The response arrives with `"ssn": "[REDACTED]"` and `"creditCard": "[REDACTED]"`. The `name`, `email`, and `balance` fields pass through unchanged. The policy decides which fields to redact, not the application code.

### 5. Recoverable SSE streaming

The PDP continuously re-evaluates the policy. When the decision changes from PERMIT to DENY, events are suspended. When it flips back, events resume. The stream stays open throughout. ([Spec: EnforceRecoverableIfDenied](/docs/8_1_PEPImplementationSpecification/#75-enforcerecoverableifdenied-streaming-suspendresume-with-notification))

<div class="code-tabs">
  <div class="tab-bar">
    <button class="tab active" data-tab="spring" data-lang="java">Spring</button>
    <button class="tab" data-tab="flask" data-lang="python">Flask</button>
    <button class="tab" data-tab="fastapi" data-lang="python">FastAPI</button>
    <button class="tab" data-tab="nestjs" data-lang="javascript">NestJS</button>
    <button class="tab" data-tab="dotnet" data-lang="java">.NET</button>
  </div>
  <div class="tab-content active" id="tab-spring" data-lang="java">
<pre class="cm-source"><code>// Controller uses SDK utility to emit suspend/restore signals
Flux&lt;ServerSentEvent&lt;Object&gt;&gt; heartbeatRecoverable() {
    return recoverWith(
            streamingService.heartbeatRecoverable().cast(Object.class),
            e -&gt; {}, () -&gt; new StreamSignal("ACCESS_SUSPENDED", "Waiting for re-authorization"),
            r -&gt; {}, () -&gt; new StreamSignal("ACCESS_RESTORED", "Authorization restored"))
            .map(StreamingController::toSse);
}

// Service - signalAccessRecovery emits AccessRecoveredException on DENY-to-PERMIT
@EnforceRecoverableIfDenied(action = "'stream:heartbeat'", resource = "'heartbeat'",
        signalAccessRecovery = true)
public Flux&lt;HeartbeatEvent&gt; heartbeatRecoverable() {
    return Flux.interval(Duration.ofSeconds(2))
            .map(tick -&gt; new HeartbeatEvent(seq.getAndIncrement(),
                    Instant.now().toString()));
}</code></pre>
  </div>
  <div class="tab-content" id="tab-flask" data-lang="python">
<pre class="cm-source"><code>@streaming_bp.route("/heartbeat/recoverable")
@enforce_recoverable_if_denied(
    action="stream:heartbeat", resource="heartbeat",
    on_stream_deny=lambda d: {"type": "ACCESS_SUSPENDED",
                               "message": "Waiting for re-authorization"},
    on_stream_recover=lambda d: {"type": "ACCESS_RESTORED",
                                  "message": "Authorization restored"},
)
def heartbeat_recoverable():
    return heartbeat_source()</code></pre>
  </div>
  <div class="tab-content" id="tab-fastapi" data-lang="python">
<pre class="cm-source"><code>@router.get("/heartbeat/recoverable")
@enforce_recoverable_if_denied(
    action="stream:heartbeat", resource="heartbeat",
    on_stream_deny=lambda d: {"type": "ACCESS_SUSPENDED",
                               "message": "Waiting for re-authorization"},
    on_stream_recover=lambda d: {"type": "ACCESS_RESTORED",
                                  "message": "Authorization restored"},
)
async def heartbeat_recoverable(request: Request):
    return heartbeat_source()</code></pre>
  </div>
  <div class="tab-content" id="tab-nestjs" data-lang="javascript">
<pre class="cm-source"><code>@EnforceRecoverableIfDenied({
    action: 'stream:heartbeat', resource: 'heartbeat',
    onStreamDeny: (_d, sub) =&gt; sub.next({ data: JSON.stringify(
        { type: 'ACCESS_SUSPENDED', message: 'Waiting for re-authorization' }) }),
    onStreamRecover: (_d, sub) =&gt; sub.next({ data: JSON.stringify(
        { type: 'ACCESS_RESTORED', message: 'Authorization restored' }) }),
})
heartbeatRecoverable(): Observable&lt;any&gt; {
    return interval(2000).pipe(map(i =&gt; ({ data: JSON.stringify(
        { seq: i, ts: new Date().toISOString() }) })));
}</code></pre>
  </div>
  <div class="tab-content" id="tab-dotnet" data-lang="java">
<pre class="cm-source"><code>[HttpGet("heartbeat/recoverable")]
public async Task HeartbeatRecoverable()
{
    var stream = _streamingService
        .HeartbeatRecoverable(HttpContext.RequestAborted);
    var withSignals = stream.RecoverWith(
        onDenyItem: () =&gt; (object)new { type = "ACCESS_SUSPENDED",
            message = "Waiting for re-authorization" },
        onRecoverItem: () =&gt; (object)new { type = "ACCESS_RESTORED",
            message = "Authorization restored" });
    await WriteSseAsync(withSignals);
}</code></pre>
  </div>
</div>

The policy uses the `<time.now>` PIP to cycle between PERMIT and DENY on 20-second boundaries:

```sapl
policy "streaming-heartbeat-time-based"
permit
  action == "stream:heartbeat";
  resource == "heartbeat";
  var second = time.secondOf(<time.now>);
  second >= 0 && second < 20 || second >= 40;
obligation
  {
    "type": "logAccess",
    "message": "Streaming heartbeat access"
  }
```

The PDP subscribes to `<time.now>` and pushes new decisions as the time condition changes. The client sees heartbeat events during PERMIT windows, `ACCESS_SUSPENDED` when the decision flips to DENY, and `ACCESS_RESTORED` when it flips back. No reconnection, no polling.

### How it runs

Each demo includes a `docker-compose.yml` that starts Keycloak for JWT-based tests. The Python, NestJS, and .NET demos connect to a SAPL Node PDP over HTTP. The Spring demo uses an embedded PDP with policies on the classpath. All demos share the same 23 SAPL policy files.

A single test script validates all 28 endpoints produce identical behavior:

```
Total: 28 | Passed: 28 | Failed: 0 | Skipped: 0
```

### Related

- [PEP Implementation Specification](/docs/8_1_PEPImplementationSpecification/): the contract all SDKs implement
- [Spring Security guide](/guides/spring/): deeper dive into Spring-specific patterns
- [Policy Operations](/guides/policy-ops/): git versioning, bundle signing, remote deployment
