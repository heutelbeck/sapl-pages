---
layout: sapl
title: "Human-in-the-Loop Approval - SAPL Scenarios"
description: "Policy-driven human approval workflows for AI agent operations. The policy decides when confirmation is needed, not the application code. Spring AI, SAPL obligations."
---

## Human-in-the-Loop Approval

Some AI agent operations are too sensitive for automatic authorization. A policy might permit the operation in principle but require a human to confirm it before execution. SAPL handles this through obligations that trigger approval workflows without changing application code.

### What this demo shows

- Policy-driven human approval requirements for specific tool calls
- Obligation-based approval workflow (the policy decides when approval is needed, not the application)
- Approval thresholds based on operation parameters (e.g., actions affecting patient data above a sensitivity level)
- Integration with Spring AI
- Clinical trial domain: clinician actions on patient data require principal investigator approval

### Architecture

The MCP server uses `@PreEnforce` annotations. When a policy requires human approval, it attaches an obligation that pauses execution and notifies an approver. The constraint handler implements the approval workflow. The application code is unaware of the approval requirement. Different policies can require approval for different operations based on context.

### Run the demo

```
git clone https://github.com/heutelbeck/sapl-demos
cd sapl-demos/hitl-clinical-trial
docker compose up -d
mvn spring-boot:run
```

Full source: [sapl-demos/hitl-clinical-trial](https://github.com/heutelbeck/sapl-demos/tree/main/hitl-clinical-trial)

### Related

- [RAG Pipeline Authorization](/scenarios/ai-rag/)
- [MCP Tool Access Authorization](/scenarios/ai-mcp/)
- [FastMCP Server Authorization (Python)](/scenarios/ai-fastmcp/)
