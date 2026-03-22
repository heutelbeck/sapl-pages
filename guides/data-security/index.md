---
layout: sapl
title: "Data-Level Security - SAPL Guides"
description: "Policies that reshape data, not just allow or deny. SAPL obligations modify method arguments, filter collections, blacken fields, and rewrite database queries before the application sees the result."
---

<link rel="stylesheet" href="/assets/css/anim.css">

## Data-Level Security

### The policy decides what the data looks like

Most authorization systems answer a binary question: can this user do this thing? SAPL answers a richer one: can this user do this thing, and if so, what should the data look like?

A PERMIT decision can carry obligations that transform the method's input before execution, or reshape its output after execution. The application code does not implement these transformations. It implements the business logic. The policy decides what gets capped, what gets redacted, and what gets filtered. Change the policy, change the data. No code change. No redeployment.

This applies everywhere a PEP intercepts a method call: REST endpoints, service layer methods, database queries, AI tool calls, and MCP server tools. An AI agent calling a patient lookup tool gets the same obligation-driven redaction as a nurse accessing the same data through a web UI. The policy is the same. The enforcement mechanism is the same.

The examples in this guide are from the polyglot demo suite: [spring-demo](https://github.com/heutelbeck/sapl-demos/tree/main/spring-demo), [Python demos](https://github.com/heutelbeck/sapl-python-demos) (FastAPI, Flask, Django, Tornado), the [NestJS demo](https://github.com/heutelbeck/sapl-nestjs-demo), and the [FastMCP demo](https://github.com/heutelbeck/sapl-python-demos/tree/main/fastmcp_demo). All implement the same constraint handler patterns and share the same SAPL policies.

### Two interception points

The PEP sits between the caller and the protected method. It enforces obligations at two distinct points in the execution chain:

{% include data-security/execution-chain.html %}

The caller can be a web request, a service method, an AI agent invoking a tool, or an MCP client calling a server tool. The PEP does not care. It intercepts the method, evaluates the policy, and applies obligations.

**Pre-invocation** handlers modify the method's arguments before it executes. When the method is a database query, this means the query itself changes. The database only returns authorized rows. Unauthorized data never leaves the database, never crosses the network, and never enters the application's memory. When the method is an AI tool call, the policy can cap parameters, inject constraints, or narrow the scope of the operation before the tool runs. This is the strongest form of data-level security.

**Post-invocation** handlers transform or filter the method's return value after it executes. The method runs with its original arguments, retrieves the full result, and the PEP applies redaction, field removal, or collection filtering before returning to the caller. When an AI agent calls a patient lookup tool, the response is redacted before the LLM ever sees the data. This is simpler to implement but means the full dataset is retrieved first. For large result sets, this has performance and security implications: the data briefly exists in the application's memory before filtering.

Both interception points use the same policy. The obligation type determines which handler runs. The annotation determines which points are available:

| Annotation | PRE (modify arguments) | POST (filter response) |
|------------|----------------------|----------------------|
| `@PreEnforce` | Yes | No |
| `@PostEnforce` | No | Yes |
| `@QueryEnforce` | Yes (query rewriting) | Yes (result filtering) |

`@PreEnforce` evaluates the policy before the method runs. It can modify arguments but never sees the return value. `@PostEnforce` evaluates the policy after the method runs, using the return value as part of the authorization subscription. It can transform the response but cannot modify the arguments. `@QueryEnforce` does both: it rewrites the query before execution and can filter the result set after.

### Pre-invocation: modifying arguments

A fund transfer endpoint accepts an amount. The policy permits the transfer but caps the amount at 5,000:

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
```

The method is annotated with `@PreEnforce`, which tells the PEP to evaluate the policy and apply obligations before the method executes:

<div class="code-tabs">
  <div class="tab-bar">
    <button class="tab active" data-tab="pep-spring" data-lang="java">Spring</button>
    <button class="tab" data-tab="pep-python" data-lang="python">Python</button>
    <button class="tab" data-tab="pep-nestjs" data-lang="javascript">NestJS</button>
  </div>
  <div class="tab-content active" id="tab-pep-spring" data-lang="java">
<pre class="cm-source"><code>@PreEnforce(action = "'transfer'", resource = "'account'")
public Mono&lt;TransferResult&gt; doTransfer(Double amount, String recipient) {
    return Mono.just(new TransferResult(amount, recipient, "completed"));
}</code></pre>
  </div>
  <div class="tab-content" id="tab-pep-python" data-lang="python">
<pre class="cm-source"><code>@pre_enforce(action="transfer", resource="account")
def do_transfer(amount: float = 10000.0, recipient: str = "default"):
    return {"transferred": amount, "recipient": recipient, "status": "completed"}</code></pre>
  </div>
  <div class="tab-content" id="tab-pep-nestjs" data-lang="javascript">
<pre class="cm-source"><code>@Post('transfer')
@PreEnforce({ action: 'transfer', resource: 'account' })
transfer(@Query('amount') amount: string, @Query('recipient') recipient: string) {
    return { transferred: Number(amount), recipient, status: 'completed' };
}</code></pre>
  </div>
</div>

The application registers a constraint handler that the PEP calls when it encounters the `capTransferAmount` obligation. The handler modifies the method's arguments before the method runs. The endpoint function never sees the original value.

<div class="code-tabs">
  <div class="tab-bar">
    <button class="tab active" data-tab="handler-spring" data-lang="java">Spring</button>
    <button class="tab" data-tab="handler-python" data-lang="python">Python</button>
    <button class="tab" data-tab="handler-nestjs" data-lang="javascript">NestJS</button>
  </div>
  <div class="tab-content active" id="tab-handler-spring" data-lang="java">
<pre class="cm-source"><code>@Component
class CapTransferHandler implements MethodInvocationConstraintHandlerProvider {

    @Override
    public boolean isResponsible(Value constraint) {
        return constraint instanceof ObjectValue obj
            &amp;&amp; obj.get("type") instanceof TextValue t
            &amp;&amp; "capTransferAmount".equals(t.value());
    }

    @Override
    public Consumer&lt;ReflectiveMethodInvocation&gt; getHandler(Value constraint) {
        var maxAmount = ((NumberValue) ((ObjectValue) constraint).get("maxAmount"))
            .value().doubleValue();
        return invocation -&gt; {
            var args = invocation.getArguments();
            for (int i = 0; i &lt; args.length; i++) {
                if (args[i] instanceof Double d &amp;&amp; d &gt; maxAmount) {
                    args[i] = maxAmount;
                    invocation.setArguments(args);
                    return;
                }
            }
        };
    }
}</code></pre>
  </div>
  <div class="tab-content" id="tab-handler-python" data-lang="python">
<pre class="cm-source"><code>class CapTransferHandler:

    def is_responsible(self, constraint):
        return isinstance(constraint, dict) \
            and constraint.get("type") == "capTransferAmount"

    def get_handler(self, constraint):
        max_amount = constraint.get("maxAmount", 0)

        def handler(context):
            if "amount" in context.kwargs:
                requested = float(context.kwargs["amount"])
                if requested &gt; max_amount:
                    context.kwargs["amount"] = max_amount
                return
            for i, arg in enumerate(context.args):
                if isinstance(arg, (int, float)) and arg &gt; max_amount:
                    context.args[i] = max_amount
                    return

        return handler</code></pre>
  </div>
  <div class="tab-content" id="tab-handler-nestjs" data-lang="javascript">
<pre class="cm-source"><code>@Injectable()
@SaplConstraintHandler('methodInvocation')
export class CapTransferHandler implements MethodInvocationConstraintHandlerProvider {

  isResponsible(constraint: any): boolean {
    return constraint?.type === 'capTransferAmount';
  }

  getHandler(constraint: any): (context: MethodInvocationContext) =&gt; void {
    const maxAmount = constraint.maxAmount;
    return (context) =&gt; {
      const requested = Number(context.args[0]);
      if (requested &gt; maxAmount) {
        context.args[0] = maxAmount;
      }
    };
  }
}</code></pre>
  </div>
</div>

The request `POST /api/transfer?amount=8000` reaches the endpoint with `amount = 5000`. The policy capped it. The endpoint processed it. The client received the result. All three frameworks produce the same output from the same policy.

### Post-invocation: built-in content filtering

For common data transformations, no custom handler is needed. SAPL ships a built-in `filterJsonContent` obligation that supports three actions on any JSON path:

```sapl
policy "permit-patient-full"
permit
  action == "readPatientFull";
  resource == "patientFull";
obligation
  {
    "type": "filterJsonContent",
    "actions": [
      { "type": "blacken", "path": "$.ssn", "discloseRight": 4 },
      { "type": "delete", "path": "$.internal_notes" },
      { "type": "replace", "path": "$.email", "replacement": "redacted@example.com" }
    ]
  }
```

The endpoint returns a patient record. The PEP applies the obligation:

| Field            | Original               | After obligation       |
|------------------|------------------------|------------------------|
| `ssn`            | `123-45-6789`          | `XXXXXXXX6789`         |
| `internal_notes` | `"Patient history..."` | (deleted)              |
| `email`          | `jane@hospital.org`    | `redacted@example.com` |

No handler code. The obligation type `filterJsonContent` is registered by the SDK. The policy author controls what gets blackened, deleted, or replaced.

### Post-invocation: filtering collections

When the endpoint returns a list, an obligation can filter elements by a policy-defined criterion. A classification filter removes documents the user should not see:

```sapl
policy "permit-documents"
permit
  action == "readDocuments";
  resource == "documents";
obligation
  {
    "type": "filterByClassification",
    "maxLevel": "INTERNAL"
  }
```

The endpoint returns four documents:

```json
[
  { "title": "Q3 Report",     "classification": "PUBLIC" },
  { "title": "Org Chart",     "classification": "INTERNAL" },
  { "title": "Merger Plan",   "classification": "CONFIDENTIAL" },
  { "title": "Board Minutes", "classification": "SECRET" }
]
```

The client receives two:

```json
[
  { "title": "Q3 Report",  "classification": "PUBLIC" },
  { "title": "Org Chart",  "classification": "INTERNAL" }
]
```

The handler is a `FilterPredicateConstraintHandlerProvider` in Spring, a `FilterPredicateConstraintHandlerProvider` in Python, and the equivalent in NestJS. Each checks the element's `classification` against the policy-specified `maxLevel` and excludes elements that exceed it. Elements without a classification are excluded (fail-closed).

### AI tool calls and MCP servers

The same obligation mechanisms apply when an AI agent calls a tool or an MCP client calls a server tool. The PEP intercepts the tool invocation, evaluates the policy, and applies obligations. The AI agent or LLM never sees unauthorized data.

Pre-invocation: a policy caps the number of results an AI agent can request from a search tool. The `limitResults` handler modifies the `limit` parameter before the tool executes. The LLM asked for 1000 results. The tool received 50. The agent does not know the limit was applied.

Post-invocation: a policy redacts PII from patient records before they reach the LLM. The tool returns the full record. The PEP blackens the SSN and removes the address. The LLM generates its response from the redacted data. The original data never enters the model's context window.

This is the same `filterJsonContent` obligation, the same `MethodInvocationConstraintHandlerProvider`, and the same `MappingConstraintHandlerProvider` shown above. The FastMCP demo implements all of these handlers for MCP tool calls. See the [AI Tool Authorization](/guides/ai-tools/) and [MCP Server Authorization](/guides/ai-mcp/) guides for the full AI-specific walkthrough.

### Pre-invocation at the database: query rewriting

When the method being protected is a database query, argument transformation becomes row-level security. Spring's `@QueryEnforce` annotation integrates SAPL with R2DBC and MongoDB to rewrite queries before they reach the database. The database only returns rows the user is authorized to see. No post-query filtering. No data leakage through pagination.

`@PreEnforce` and `@PostEnforce` use Spring AOP to intercept any method on any Spring bean. `@QueryEnforce` works differently. It hooks into Spring Data's repository proxy pipeline via `RepositoryFactoryCustomizer`, which means it understands the query semantics of the method it protects. It knows whether the method uses a `@Query` annotation or a Spring Data method-name query, and it transforms the query before the database executes it. The obligation conditions become part of the SQL WHERE clause or MongoDB filter document. The database only returns authorized rows.

```java
@Repository
public interface BookRepository extends R2dbcRepository<Book, Long> {
    @QueryEnforce(action = "'findAll'")
    Flux<Book> findAll();
}
```

The policy attaches query conditions as obligations. The SDK translates these into WHERE clauses or MongoDB filter documents. The application code does not construct these conditions. The policy does.

#### SQL (R2DBC)

The `r2dbcQueryManipulation` obligation injects SQL WHERE clause fragments into the query:

```sapl
set "book listing"
first or abstain errors propagate
for action == "findAll"

policy "deny if scope null or empty"
deny
    subject.principal.dataScope in [null, undefined, []];

policy "enforce filtering"
permit
obligation {
    "type": "r2dbcQueryManipulation",
    "conditions": [
        "category IN " + string.replace(
            string.replace(
                standard.toString(subject.principal.dataScope),
                "[", "("),
            "]", ")")
    ]
}
```

A user with `dataScope: [1, 2, 3]` triggers the obligation `"conditions": ["category IN (1, 2, 3)"]`. The SDK appends this as a WHERE clause. The original `SELECT * FROM books` becomes `SELECT * FROM books WHERE category IN (1, 2, 3)`.

The obligation supports additional fields beyond conditions:

| Field | Purpose | Example |
|-------|---------|---------|
| `conditions` | SQL WHERE fragments (AND-combined) | `["active = true", "role = 'USER'"]` |
| `selection` | Column projection (whitelist or blacklist) | `{"type": "whitelist", "columns": ["id", "name"]}` |
| `transformations` | SQL functions applied to columns | `{"firstname": "UPPER", "email": "LOWER"}` |
| `alias` | Table alias for qualified column names | `"p"` |

#### MongoDB

The `mongoQueryManipulation` obligation injects MongoDB query documents:

```sapl
set "book listing"
first or abstain errors propagate
for action == "findAll"

policy "deny if scope null or empty"
deny
    subject.principal.dataScope in [null, undefined, []];

policy "enforce filtering"
permit
obligation {
    "type"       : "mongoQueryManipulation",
    "conditions" : [
        "{ 'category' : { '$in' : " + subject.principal.dataScope + " } }"
    ]
}
```

The conditions are MongoDB query documents as JSON strings. Multiple conditions are AND-combined. The SDK merges them with the repository method's existing `@Query` annotation.

| Field        | Purpose                                   | Example                                                      |
|--------------|-------------------------------------------|--------------------------------------------------------------|
| `conditions` | MongoDB query documents (AND-combined)    | `["{ 'status': 'active' }", "{ 'price': { '$lte': 100 } }"]` |
| `selection`  | Field projection (whitelist or blacklist) | `{"type": "blacklist", "columns": ["password", "ssn"]}`      |

Both R2DBC and MongoDB query rewriting use built-in constraint handlers. No custom handler code is needed. The policy author writes the conditions, and the SDK applies them to the database query.

For JPA (blocking), the same result is achieved using `@PreEnforce` with a custom `MethodInvocationConstraintHandlerProvider` that modifies the method's filter parameter before execution (as shown in the argument modification section above).

See the [queryrewriting demos](https://github.com/heutelbeck/sapl-demos) for working examples with each database technology.

### Seven handler types

The examples above show three of the seven constraint handler types available in every SDK:

| Type                 | Phase           | What it does                          | Example                            |
|----------------------|-----------------|---------------------------------------|------------------------------------|
| **MethodInvocation** | Pre-invocation  | Modifies arguments before method runs | Cap transfer amount, rewrite query |
| **Mapping**          | Post-invocation | Transforms return value               | Redact fields, reshape response    |
| **FilterPredicate**  | Post-invocation | Filters collection elements           | Classification filter              |
| **Runnable**         | On decision     | Side effect (no data access)          | Log access                         |
| **Consumer**         | Post-invocation | Observes return value (read-only)     | Audit trail                        |
| **ErrorHandler**     | On error        | Observes exception                    | Notify on error                    |
| **ErrorMapping**     | On error        | Transforms exception                  | Add support URL                    |

All seven are available in Spring, Python (Flask, FastAPI, Django, Tornado), NestJS, and .NET. The `filterJsonContent` built-in handles the most common case (blacken, delete, replace on JSON paths) without any custom handler code.

### Related

- [SDK Integrations](/docs/latest/6_0_Integrations/): handler registration and lifecycle for each framework
- [Streaming Authorization](/guides/streaming/): obligations that change mid-stream as conditions change
- [Multi-Framework Authorization](/guides/multi-framework/): the same 28 endpoints across 7 frameworks
- [spring-demo](https://github.com/heutelbeck/sapl-demos/tree/main/spring-demo): all handler implementations in Java
- [Python demos](https://github.com/heutelbeck/sapl-python-demos): the same handlers in Flask, FastAPI, Django, Tornado
- [NestJS demo](https://github.com/heutelbeck/sapl-nestjs-demo): the same handlers in TypeScript
