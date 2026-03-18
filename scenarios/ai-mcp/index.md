---
layout: sapl
title: "MCP Tool Access Authorization - SAPL Scenarios"
description: "Per-tool authorization for MCP servers with SAPL. Control which tools AI agents can call, transform responses via obligations, filter tool visibility. Spring AI."
---

## MCP Tool Access Authorization

MCP servers expose tools that AI agents can call. Without authorization, any agent can call any tool with any parameters. SAPL adds per-tool, per-parameter access control with obligations that can transform tool responses, require approval, or enforce audit trails.

### What this demo shows

- Per-tool authorization based on user role and tool parameters
- Tool visibility filtering (agents only see tools they are allowed to call)
- Obligation-driven response transformation (redact fields from tool output)
- Integration with Spring AI MCP server
- Clinical trial domain: controlling which tools a researcher or clinician can invoke

### Architecture

The MCP server is a Spring AI application with `@PreEnforce` on tool methods. SAPL policies evaluate the user identity, tool name, and call parameters. The PDP runs embedded in the same process. Obligations can modify tool responses before they reach the agent.

### Run the demo

```
git clone https://github.com/heutelbeck/sapl-demos
cd sapl-demos/mcp-clinical-trial
docker compose up -d
mvn spring-boot:run
```

Full source: [sapl-demos/mcp-clinical-trial](https://github.com/heutelbeck/sapl-demos/tree/main/mcp-clinical-trial)

### Related

- [RAG Pipeline Authorization](/scenarios/ai-rag/)
- [Human-in-the-Loop Approval](/scenarios/ai-hitl/)
- [FastMCP Server Authorization (Python)](/scenarios/ai-fastmcp/)
