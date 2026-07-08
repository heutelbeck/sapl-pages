---
layout: sapl
title: "Data-Level Security - SAPL Guides"
description: "Policies that reshape data, not just allow or deny. SAPL obligations modify method arguments, filter collections, blacken fields, and rewrite database queries before the application sees the result."
---

## Data-Level Security

### The policy decides what the data looks like

Most authorization systems answer a binary question: can this user do this thing? SAPL answers a richer one: can this user do this thing, and if so, what should the data look like?

A PERMIT decision can carry obligations that transform the method's input before execution, or reshape its output after execution. The application code does not implement these transformations. It implements the business logic. The policy decides what gets capped, what gets redacted, and what gets filtered. Change the policy, change the data. No code change. No redeployment.

This applies everywhere a PEP intercepts a method call: REST endpoints, service layer methods, database queries, AI tool calls, and MCP server tools. An AI agent calling a patient lookup tool gets the same obligation-driven redaction as a nurse accessing the same data through a web UI. The policy is the same. The enforcement mechanism is the same.

The examples in this guide are from the polyglot demo suite: [spring-demo](https://github.com/heutelbeck/sapl-demos/tree/main/spring-demo), [Python demos](https://github.com/heutelbeck/sapl-python-demos) (FastAPI, Flask, Django, Tornado), the [NestJS demo](https://github.com/heutelbeck/sapl-nestjs-demo), and the [FastMCP demo](https://github.com/heutelbeck/sapl-python-demos/tree/main/fastmcp_demo). All implement the same constraint handler patterns and share the same SAPL policies.

### Two interception points

The PEP sits between the caller and the protected method. It enforces obligations at two distinct points in the execution chain:

![Execution chain: Caller to PRE (modify arguments) to Method to POST (filter response), with return path back to caller](/assets/guides/data-security/execution-chain.svg)

The caller can be a web request, a service method, an AI agent invoking a tool, or an MCP client calling a server tool. The PEP does not care. It intercepts the method, evaluates the policy, and applies obligations.

**Pre-invocation** handlers modify the method's arguments before it executes. When the method is a database query, this means the query itself changes. The database only returns authorized rows. Unauthorized data never leaves the database, never crosses the network, and never enters the application's memory. When the method is an AI tool call, the policy can cap parameters, inject constraints, or narrow the scope of the operation before the tool runs. This is the strongest form of data-level security.

**Post-invocation** handlers transform or filter the method's return value after it executes. The method runs with its original arguments, retrieves the full result, and the PEP applies redaction, field removal, or collection filtering before returning to the caller. When an AI agent calls a patient lookup tool, the response is redacted before the LLM ever sees the data. This is simpler to implement but means the full dataset is retrieved first. For large result sets, this has performance and security implications: the data briefly exists in the application's memory before filtering.

Both interception points use the same policy. The obligation type determines which handler runs. The annotation determines which points are available:

| Annotation | PRE (modify arguments) | POST (filter response) |
|------------|----------------------|----------------------|
| `@PreEnforce` | Yes | No |
| `@PostEnforce` | No | Yes |
| `@StreamEnforce` (streaming) | No | Yes (per item) |

`@PreEnforce` evaluates the policy before the method runs. It can modify arguments but never sees the return value. `@PostEnforce` evaluates the policy after the method runs, using the return value as part of the authorization subscription. It can transform the response but cannot modify the arguments. The streaming annotation `@StreamEnforce` applies the post-invocation point to every item the stream emits, so redaction obligations follow each element on its way to the client. Query rewriting needs no annotation of its own. A query-rewriting obligation on a `@PreEnforce` decision rewrites database queries while they are in flight, as shown further below.

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

When the method being protected is a database query, argument transformation becomes row-level security. The database only returns rows the user is authorized to see. No post-query filtering. No data leakage through pagination.

Query rewriting needs no dedicated annotation. You annotate the calling service method with `@PreEnforce` as usual, and the policy attaches a query-rewriting obligation. While that decision is being enforced, every query the method issues is intercepted, the obligation is merged into it, and the rewritten query is what reaches the driver. In Spring, the Boot starter activates this transparently when it sees `R2dbcRepository` or `ReactiveMongoTemplate` on the classpath. It wraps `DatabaseClient` for R2DBC and `ReactiveMongoTemplate` for MongoDB, so derived queries, `@Query` methods, and direct `databaseClient.sql(...)` calls all run through the wrapped bean. No repository annotations are needed.

```java
@Service
public class BookService {

    @PreEnforce(action = "'findAll'")
    public Flux<Book> findAll() {
        return bookRepository.findAll();
    }
}
```

Three rules hold for every backend and SDK. The obligation can only narrow the user's query, never widen it, because it is AND-combined with whatever the user already requested. A malformed or unsupported obligation denies the decision, fail closed. And the integration must be registered before its obligations take effect, because a decision carrying a query-rewriting obligation with no matching integration is denied rather than silently unfiltered.

#### SQL

The `sql:queryRewriting` obligation carries typed criteria that become WHERE predicates:

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
    "type": "sql:queryRewriting",
    "criteria": [{
        "column": "category",
        "op": "in",
        "value": subject.principal.dataScope
    }]
}
```

A user with `dataScope: [1, 2, 3]` turns the original `SELECT * FROM books` into `SELECT * FROM books WHERE category IN (1, 2, 3)`. The policy author writes the criteria, the SDK applies them, and the application code never sees the difference.

| Field | Purpose | Example |
|-------|---------|---------|
| `criteria` | Typed conditions, AND-joined, groupable with `and`/`or` | `{"column": "status", "op": "=", "value": "active"}` |
| `conditions` | Raw SQL fragments for what the typed language cannot express | `["created_at > CURRENT_TIMESTAMP - INTERVAL '7 days'"]` |
| `columns` | SELECT projection narrowing, intersected with the query's own projection | `["id", "name"]` |

#### MongoDB

The `mongo:queryRewriting` obligation mirrors the SQL form without the `columns` projection:

```sapl
policy "enforce filtering"
permit
obligation {
    "type": "mongo:queryRewriting",
    "criteria": [{
        "column": "category",
        "op": "in",
        "value": subject.principal.dataScope
    }]
}
```

Typed criteria accept the same operators as SQL except `like` and `notLike`. For pattern matching, the `conditions` escape hatch carries raw query fragments with `$regex`, each merged into the query inside a top-level `$and`. Fragments must be strict JSON with double quotes, and a fragment that fails to parse denies the decision.

Because the obligation format is identical across SDKs, the same policy produces the same narrowing everywhere that backend appears: `sql:queryRewriting` works on the Spring R2DBC integration and the Python SQLAlchemy integration, and `mongo:queryRewriting` works on Spring, the Python `sapl_pymongo` integration, the NestJS Mongoose integration, and the PHP Doctrine ODM integration.

One caution applies in every stack. Database access that bypasses the wrapped bean or session, such as a raw connection or an unwrapped second client, is not intercepted and runs unfiltered. Keep enforced reads on the integrated path, or you own row-level security manually for the paths outside it.

For JPA (blocking), the same result is achieved using `@PreEnforce` with a custom `MethodInvocationConstraintHandlerProvider` that modifies the method's filter parameter before execution (as shown in the argument modification section above). See [Query Rewriting](/docs/latest/6_12_QueryRewriting/) for the full obligation reference and the per-integration coverage notes.

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

- [SDK Integrations](/docs/latest/6_0_SDKsAndAPIs/): handler registration and lifecycle for each framework
- [Streaming Authorization](/guides/streaming/): obligations that change mid-stream as conditions change
- [Multi-Framework Authorization](/guides/multi-framework/): the same 28 endpoints across 7 frameworks
- [spring-demo](https://github.com/heutelbeck/sapl-demos/tree/main/spring-demo): all handler implementations in Java
- [Python demos](https://github.com/heutelbeck/sapl-python-demos): the same handlers in Flask, FastAPI, Django, Tornado
- [NestJS demo](https://github.com/heutelbeck/sapl-nestjs-demo): the same handlers in TypeScript
