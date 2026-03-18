---
layout: sapl
title: "RAG Pipeline Authorization - SAPL Scenarios"
description: "Document-level access control for retrieval-augmented generation. Filter and redact retrieved content before it reaches the LLM. Spring AI, pgvector, SAPL policies."
---

## RAG Pipeline Authorization

Retrieval-augmented generation (RAG) pipelines retrieve documents from a knowledge base and feed them to an LLM. Without authorization, any user can retrieve any document. SAPL adds document-level access control to the retrieval step and can transform the retrieved content before it reaches the model.

### What this demo shows

- Policy-driven document filtering during vector similarity search
- Content transformation via obligations (redact sensitive fields before they reach the LLM)
- Integration with Spring AI and pgvector
- Clinical trial domain: researchers access only the trial data they are authorized to see

### Architecture

The application uses Spring AI with a pgvector-backed vector store. SAPL policies control which documents a user can retrieve based on their role, department, and the document's classification level. The `filterJsonContent` obligation redacts sensitive fields from retrieved documents before they are passed to the LLM context.

### Run the demo

```
git clone https://github.com/heutelbeck/sapl-demos
cd sapl-demos/rag-clinical-trial
docker compose up -d
mvn spring-boot:run
```

Full source: [sapl-demos/rag-clinical-trial](https://github.com/heutelbeck/sapl-demos/tree/main/rag-clinical-trial)

### Related

- [MCP Tool Access Authorization](/scenarios/ai-mcp/)
- [Human-in-the-Loop Approval](/scenarios/ai-hitl/)
- [FastMCP Server Authorization (Python)](/scenarios/ai-fastmcp/)
