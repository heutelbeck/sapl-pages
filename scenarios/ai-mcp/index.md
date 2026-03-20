---
layout: sapl
title: "MCP Server Authorization - SAPL Scenarios"
description: "Per-tool, per-resource, per-prompt authorization for MCP servers with SAPL. Constraint handlers, stealth mode, JWT/ABAC, and fine-grained access control in Python FastMCP servers."
---

## MCP Server Authorization

### The problem

MCP servers expose capabilities to AI agents: tools that query data, but also tools that send emails, trigger deployments, actuate physical systems, or delete records. In industrial and smart home environments, an MCP tool call can open a valve, unlock a door, or shut down a production line. The risk is not limited to data confidentiality. An unauthorized tool call can cause physical harm.

The agent connecting to the server might run on a user's laptop, inside a cloud IDE, or in a third-party SaaS product. It crosses a trust boundary every time it connects. The protocol has no built-in concept of "this user is allowed to call this tool but not that one." Every agent that can reach the server can call every tool, read every resource, and use every prompt.

Network-level protection (API keys, VPN, IP allowlists) controls who can connect but not what they can do once connected. An API key that grants access to the server grants access to everything on it. This is the opposite of zero trust: a single credential grants blanket access across capabilities with wildly different risk profiles. A data analytics server might expose a tool for querying anonymized statistics alongside a tool for exporting customer email addresses alongside a tool for permanently deleting datasets. A smart home server might expose a temperature reading alongside a door lock control. Treating all of these the same is a design failure, but the protocol gives you no mechanism to distinguish them.

Five concrete problems follow:

**An agent can call tools the user should not have access to.** A marketing analyst's agent can call `purge_dataset` because the server does not check whether the user behind the agent has the authority to delete data. The LLM decides which tools to call based on the prompt, not the user's permissions.

**An agent can extract more data than intended.** A tool that accepts a `limit` parameter can be called with `limit=100000`. The LLM might request all customer records to "be thorough." There is no enforcement point between the LLM's decision and the tool's execution.

**Tool discovery leaks the attack surface.** MCP's `tools/list` endpoint returns every registered tool. An unauthorized agent can enumerate all capabilities, including destructive ones, even if it cannot call them. Knowing that `purge_dataset` exists tells an attacker what the server can do.

**There is no audit trail for agent actions.** When an agent calls a tool, the server executes it. There is no record of who requested it, what policy allowed it, or what the parameters were. When something goes wrong, there is no way to reconstruct what happened.

**Allow/deny is not enough.** Some tools should be accessible but with constraints. An analyst should be able to query customer data, but the result count should be capped. An export should be permitted, but the response should exclude confidential classification levels. Binary access control cannot express these requirements.

### How SAPL solves this

SAPL runs inside the FastMCP server as middleware. Every tool call, resource read, and prompt access is intercepted before execution. The middleware builds an authorization subscription from the request context (JWT claims, tool name, arguments, tags) and queries the PDP. The decision determines not just whether the operation proceeds, but how.

This scenario walks through each problem above and shows the policy and code that addresses it.

### The demo: an analytics platform

The demo models an internal data analytics platform. Three departments (marketing, engineering, compliance) use an MCP server that exposes 7 tools, 6 resources, and 3 prompts.

| User | Role | Department | What they should be able to do |
|------|------|-----------|------|
| Mara | Analyst | Marketing | Customer data (capped), exports, reports |
| Felix | Engineer | Engineering | ML models, pipelines, catalogs |
| Diana | Compliance | Compliance | Everything, with full audit logging |
| Sam | Intern | (none) | Public data only |

Infrastructure: Keycloak issues JWTs with role and department claims. SAPL Node evaluates policies via HTTP. The FastMCP server runs `SAPLMiddleware` that intercepts every operation.

### Per-tool authorization: who can call what

**The problem.** Without per-tool gating, every authenticated user can call every tool. The LLM driving the agent picks tools based on the conversation, not the user's role. A prompt injection or an over-eager LLM can trigger tools the user never intended to use.

**The solution.** Tag components by domain. Write policies that match tags to roles. The middleware evaluates the policy before the tool executes.

```python
@mcp.tool(tags={"engineering"})
@pre_enforce()
def manage_pipelines(action: str, pipeline_id: str) -> dict:
    return {"pipeline_id": pipeline_id, "status": action}
```

```
policy "engineering-access"
permit
    "engineering" in resource.tags;
    "ENGINEER" in subject.realm_access.roles;
```

Felix (engineer) can manage pipelines. Mara (analyst) cannot. The policy checks the JWT role claim and the component tag. The tool code has no authorization logic.

### Argument capping: preventing data exfiltration

**The problem.** A tool that queries customer data accepts a `limit` parameter. The LLM can request `limit=100000` to "get all the data." The tool has no way to know whether the caller should be allowed to retrieve that much. Hardcoding a cap in the tool breaks legitimate use cases for compliance officers who need full exports. The limit should depend on who is asking, not on the tool's implementation.

**The solution.** The policy attaches an obligation that caps the limit. A constraint handler modifies the argument before the tool runs.

```
policy "analyst-customer-queries"
permit
    resource.name == "query_customer_data";
    "ANALYST" in subject.realm_access.roles;
obligation
{
    "type": "limitResults",
    "maxLimit": 5
}
```

The `LimitResultsProvider` constraint handler intercepts the call, sees `limit=100` in the arguments, clamps it to 5, and lets the tool proceed. The tool receives `limit=5` and returns at most 5 records. The analyst never sees the full dataset. Diana (compliance) has a different policy with no limit obligation. Same tool, different behavior, driven by policy.

This is GDPR Article 5(1)(c) data minimization enforced at the authorization layer, not hardcoded in the application.

### Result filtering: controlling what the response contains

**The problem.** A `list_data_exports` tool returns exports with different classification levels: public, internal, confidential, restricted. An analyst should see public and internal exports. An intern should see only public. The tool returns the full list because it does not know who is calling. Filtering in the tool means authorization logic in application code, duplicated across every tool that returns classified data.

**The solution.** The policy attaches a filter obligation. A constraint handler removes elements that do not match the allowed classification levels.

```
policy "analyst-export-listing"
permit
    resource.name == "list_data_exports";
    "ANALYST" in subject.realm_access.roles;
obligation
{
    "type": "filterByClassification",
    "allowedLevels": ["public", "internal"]
}
```

The `FilterByClassificationProvider` inspects each element in the returned list and removes those whose `classification` field is not in `["public", "internal"]`. The tool returns 10 exports. The analyst sees 6. The intern's policy allows only `["public"]` and sees 3. The tool code is identical for all callers.

### Content redaction: showing data without exposing PII

**The problem.** A tool returns customer records with names, email addresses, and credit card numbers. An analyst needs to see the records to do their job, but they do not need the full credit card number or email address. Denying access entirely blocks legitimate work. Permitting full access violates data minimization. The tool returns the same data for every caller because it does not know the authorization context. Building per-role response variants into the tool means authorization logic in application code.

**The solution.** The policy attaches a redaction obligation. A `RedactFieldsProvider` mapping handler walks the return value recursively and blackens the named fields, regardless of nesting depth.

```
policy "analyst-customer-queries"
permit
    resource.name == "query_customer_data";
    "ANALYST" in subject.realm_access.roles;
obligation
{
    "type": "redactFields",
    "fields": ["email", "card_number"],
    "mode": "blacken",
    "discloseRight": 4
}
```

The tool returns full records. The analyst sees redacted data:

```json
{
  "customer_id": "C-10042",
  "name": "Alice Johnson",
  "email": "XXXXXXXXXXXXXXXXXXXXX.com",
  "card_number": "XXXXXXXXXXXX0366",
  "segment": "high_value",
  "lifetime_value": 1250.0
}
```

Card numbers show only the last 4 digits. Email addresses are blackened with the last 4 characters visible. Diana (compliance) has a different policy with no redaction obligation and sees the full data, including `alice.johnson@example.com` and `4532015112830366`.

The handler supports three modes: `blacken` (mask characters, optionally disclose left or right), `replace` (swap with a fixed string), and `delete` (remove the field entirely). The handler walks dicts and lists recursively, so it works regardless of how deeply the fields are nested in the response structure. The tool code never changes.

### Stealth mode: hiding capabilities from unauthorized users

**The problem.** MCP's `tools/list` returns every registered tool to every connected client. An agent operated by an intern can see that `purge_dataset` and `export_csv` exist, even if calling them would be denied. This is an information leak. The agent (or an attacker probing via the agent) learns the server's full capability surface. For sensitive operations, the existence of the tool is itself sensitive information.

**The solution.** Mark sensitive components as `stealth=True`. Unauthorized users do not see them in listings, and direct calls return `NotFoundError` indistinguishable from a non-existent tool.

```python
@mcp.tool(tags={"pii", "export"})
@pre_enforce(action="export_data", stealth=True)
def export_csv(query_ref: str, columns: str = "all") -> dict:
    return {"query_ref": query_ref, "rows_exported": 2847}
```

Sam (intern) calls `tools/list` and sees 4 tools. Mara (analyst) sees 6. Diana (compliance) sees all 7. Sam does not know that `export_csv`, `query_customer_data`, or `purge_dataset` exist. If Sam guesses the name and calls `export_csv` directly, the server returns the same `NotFoundError` as for a tool that was never registered.

### Audit logging: knowing what happened and why

**The problem.** An agent calls a tool. The tool executes. There is no record of who authorized it, what policy matched, or what the agent was trying to do. When a dataset is deleted or customer data is exported, the compliance team has no way to reconstruct the decision chain. Logging in the tool code is incomplete because the tool does not know the authorization context. Logging at the network level misses the policy rationale.

**The solution.** Attach logging obligations to both permit and deny decisions. The policy decides what to log and when.

```
policy "compliance-purge"
permit
    resource.name == "purge_dataset";
    "COMPLIANCE" in subject.realm_access.roles;
obligation
{
    "type": "logAccess",
    "message": "Dataset purge executed",
    "subject": subject.preferred_username,
    "action": action
}

policy "default-deny"
deny
obligation
{
    "type": "logAccess",
    "message": "Unauthorized access attempt denied",
    "subject": subject.preferred_username,
    "action": action
}
```

Every permitted purge is logged with the username and action. Every denied access attempt is logged. The audit trail covers both outcomes. The `AccessLoggingProvider` handler executes the obligation. The tool code and the server code contain no logging logic. The policy controls what is recorded.

### Post-enforcement: deciding based on the result

**The problem.** Some authorization decisions depend on what the tool returns, not just who called it. An ML model execution might produce output with different sensitivity levels. The policy needs to see the actual result to decide whether the caller should receive it. Pre-enforcement cannot do this because the tool has not run yet.

**The solution.** Use `@post_enforce`. The tool runs first. The PDP sees the return value in the subscription and makes its decision. If denied, the result is suppressed.

```python
@mcp.tool(tags={"engineering"})
@post_enforce(resource=lambda ctx: {
    "name": ctx.component.name,
    "model": ctx.arguments.get("model_id"),
    "result_summary": ctx.return_value,
})
def run_model(model_id: str, dataset: str) -> dict:
    return {"model_id": model_id, "status": "completed", "accuracy": 0.924}
```

The policy can inspect `resource.result_summary` and deny based on the content. If denied, the caller never sees the result. Use `@post_enforce` when the decision depends on what the tool produces. Use `@pre_enforce` (the default) when the decision depends only on who is calling and with what arguments.

### Two authorization paths

The demo includes two server implementations:

**Middleware server** (`SAPLMiddleware`). A single middleware intercepts all operations. Supports the full constraint handler lifecycle: argument modification, result filtering, access logging, stealth mode, finalize callbacks, post-enforcement. This is the recommended path for production servers.

**Per-component auth server** (`auth=sapl()`). Each tool, resource, and prompt has its own `auth=sapl()` check. Binary permit/deny only. No argument modification, no result filtering, no stealth mode. Useful for simpler setups or when adopting authorization incrementally. Components without `auth=sapl()` pass through with no PDP call.

Both paths use the same policies and the same PDP. The difference is what the enforcement point can do with the decision.

### Run the demo

**Prerequisites:** Docker (for Keycloak and SAPL Node) and Python 3.12+ (for the FastMCP server and demo script).

```
git clone https://github.com/heutelbeck/sapl-python-demos
cd sapl-python-demos/fastmcp_demo
docker compose up -d
pip install -r requirements.txt
python demo.py
```

The demo script waits for Keycloak and SAPL Node to become healthy, launches the middleware server, acquires JWT tokens for all four users from Keycloak, exercises every tool, resource, and prompt across all users, and generates a `demo-report.md` with the full decision matrix.

Full source: [sapl-python-demos/fastmcp_demo](https://github.com/heutelbeck/sapl-python-demos/tree/main/fastmcp_demo)

### Related

- [FastMCP SDK Documentation](/docs/latest/6_9_FastMCP/) - full API reference, handler types, configuration, troubleshooting
- [AI Tool Authorization](/scenarios/ai-tools/) - per-tool authorization in Spring AI (same pattern, Java)
- [RAG Pipeline Authorization](/scenarios/ai-rag/) - dynamic query rewriting for retrieval-augmented generation
- [Human-in-the-Loop Approval](/scenarios/ai-hitl/) - policy-driven approval workflows for AI tool calls
