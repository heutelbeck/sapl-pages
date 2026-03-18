---
layout: sapl
title: "FastMCP Server Authorization (Python) - SAPL Scenarios"
---

## FastMCP Server Authorization (Python)

FastMCP is the standard Python framework for building MCP servers. SAPL's Python SDK adds `@pre_enforce` and `@post_enforce` decorators that authorize tool calls, resource access, and prompt requests directly inside the FastMCP server.

### What this demo shows

- Per-tool authorization with `@pre_enforce` decorators on FastMCP tool handlers
- Per-resource and per-prompt access control
- Constraint handlers for response transformation (redaction, filtering)
- Streaming enforcement modes (enforce_till_denied, enforce_drop_while_denied, enforce_recoverable_if_denied)
- Remote PDP via HTTP with Server-Sent Events for streaming decisions
- JWT/ABAC integration for user identity

### Architecture

The FastMCP server connects to a remote SAPL Node PDP via the HTTP API. Authorization decisions stream over Server-Sent Events. The `@pre_enforce` decorator intercepts each MCP operation, builds an authorization subscription from the request context, and enforces the decision including any obligations. No proxy, no sidecar. The authorization logic is part of the server application.

### Run the demo

```
git clone https://github.com/heutelbeck/sapl-python-demos
cd sapl-python-demos/fastmcp_demo
docker compose up -d
pip install -r requirements.txt
python main.py
```

Full source: [sapl-python-demos/fastmcp_demo](https://github.com/heutelbeck/sapl-python-demos/tree/main/fastmcp_demo)

### Related

- [RAG Pipeline Authorization](/scenarios/ai-rag/)
- [MCP Tool Access Authorization](/scenarios/ai-mcp/)
- [Human-in-the-Loop Approval](/scenarios/ai-hitl/)
