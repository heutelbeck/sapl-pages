---
layout: sapl
title: "Human-in-the-Loop Approval - SAPL Scenarios"
description: "Policy-driven human approval workflows for AI agent operations. SAPL obligations trigger confirmation dialogs for sensitive actions without changing application code. Spring AI."
---

## Human-in-the-Loop Approval

### What this scenario is about

An AI assistant handling adverse events in a clinical trial needs to do more than read data. It needs to act: notify participants and their emergency contacts, suspend a participant from treatment, export safety reports to the ethics committee. These are not hypothetical capabilities. They are the reason the assistant exists. A safety officer dealing with a severe adverse event at 2 AM needs the AI to execute a multi-step safety protocol, not just describe what should happen.

But an AI agent that can autonomously notify a patient's emergency contact, suspend their treatment, and file a report with the ethics committee is an AI agent that can cause real harm if it acts incorrectly. A hallucinated participant ID, a misclassified severity level, or a prompt injection that triggers the wrong protocol could result in unnecessary panic for a family, premature treatment suspension, or a regulatory filing based on fabricated data.

The question is not whether the AI should have access to these tools. It should. The question is: which of these actions should execute immediately, which should pause for human confirmation, and which must always require a human to explicitly approve, regardless of any convenience settings? And critically: who decides? The application developer at compile time, or the policy at runtime?

This scenario demonstrates how SAPL obligations turn authorization decisions into approval workflows. The policy does not just permit or deny. It permits with conditions. The condition is: a human must confirm this action before it executes. The application code does not know which actions require approval. The policy decides. If the organization's risk tolerance changes, the policy changes. The code does not.

### The problem

AI agents that can only read data are limited. The value of an AI assistant in a safety-critical domain comes from its ability to act: send notifications, update records, trigger workflows, file reports. But every action an agent takes is an action a human did not review.

The common approach to human-in-the-loop is to build it into the application. The developer decides which operations need confirmation, writes the dialog logic, wires it into the UI. This works until the requirements change. A new regulation requires approval for actions that were previously automatic. A risk assessment determines that certain operations need mandatory confirmation even when the user has enabled auto-approve for convenience. Each change requires a code change, a deployment, and a test cycle.

A more subtle problem is the conflation of "not permitted" and "needs approval." Some systems implement human-in-the-loop by denying the action and then providing a separate escalation path. This is architecturally wrong. A denied action is forbidden. It should not happen regardless of who approves it. An action that needs approval is permitted in principle but requires confirmation before execution. These are different authorization states with different semantics, different audit implications, and different user experiences. Conflating them means the system cannot distinguish between "this action is prohibited by policy" and "this action is allowed but the organization requires a human to confirm it first."

### Where HITL fits: the authorization spectrum

The [tool authorization](/scenarios/ai-tools/) and [RAG](/scenarios/ai-rag/) scenarios control what data reaches the AI. This scenario controls what the AI does with it.

In the tool authorization scenario, SAPL decides whether a tool call executes at all. The decision is binary: permit or deny. In the RAG scenario, SAPL rewrites the retrieval query to control which documents reach the LLM. The decision shapes the data. In this scenario, SAPL goes further: the decision is permit, but with a condition that must be fulfilled before the action takes effect.

These three patterns cover the full lifecycle of an AI interaction:

| Pattern | Controls | Decision |
|---------|----------|----------|
| RAG authorization | What data reaches the LLM | Permit with query rewriting |
| Tool authorization | Which tools the LLM can call | Permit or deny per tool call |
| HITL authorization | Which actions execute without confirmation | Permit, permit with approval, or deny |

They are complementary. A real system might use all three: RAG filtering to control what the model sees, tool gating to control which tools it can invoke, and HITL approval to require human confirmation for the most consequential actions.

### The demo: a clinical trial safety assistant

This scenario uses a clinical trial safety response system. A multi-site study on adolescent depression (CT-2025-001) has reported four adverse events ranging from mild headaches to severe suicidal ideation. An AI assistant helps the safety officer respond to these events by retrieving data, identifying required actions, and executing the safety protocol.

The assistant has six tools:

| Tool | What it does | Approval |
|------|-------------|----------|
| List adverse events | Shows all active events with severity and status | None (immediate) |
| Get adverse event details | Retrieves clinical details for a specific event | None (immediate) |
| Get safety guidelines | Returns the study's safety response protocol | None (immediate) |
| Notify participant or contact | Sends a notification to a participant or emergency contact | Required (can be auto-approved) |
| Suspend participant | Halts a participant's treatment protocol | Mandatory (always requires explicit confirmation) |
| Export safety report | Files a report with the Data Safety Monitoring Board | None (immediate) |

The first three tools are read-only. They execute immediately. The notification tool requires approval, but the safety officer can enable auto-approve for convenience during a multi-step protocol. The suspension tool always requires explicit human confirmation, even when auto-approve is enabled, because suspending a participant's treatment is irreversible and has immediate clinical consequences.

This three-tier model is not hardcoded in the application. It is expressed entirely in SAPL policies:

```sapl
policy "permit-read-tools"
permit
  action in ["listAdverseEvents", "getAdverseEvent", "getSafetyGuidelines"];

policy "permit-notify-with-approval"
permit
  action == "notifyParticipant";
obligation
  { "type": "humanApprovalRequired" }

policy "permit-suspend-with-mandatory-approval"
permit
  action == "suspendParticipant";
obligation
  { "type": "humanApprovalRequired", "noAutoApprove": true, "timeout": "PT120S" }
```

If the organization decides that safety report exports should also require approval, a single policy change adds the obligation. No application code changes. No redeployment of the assistant. The constraint handler that implements the approval dialog already exists. The policy simply activates it for a new action.

The demo includes an auto-approve toggle and an action log so you can observe how the assistant progresses through a multi-step safety protocol, pausing for confirmation where the policy requires it. The complete source code is available at [sapl-demos/hitl-clinical-trial](https://github.com/heutelbeck/sapl-demos/tree/main/hitl-clinical-trial).

### The scenario in action

The following interactions demonstrate how policy-driven approval workflows guide an AI assistant through a safety-critical protocol, requiring human judgment at the right moments without blocking routine operations.

**The AI executes a multi-step safety protocol**

![The AI assistant works through the severe adverse event protocol, pausing for human approval on safety-critical actions.](/assets/scenarios/ai-hitl/01_safety_protocol.png)

The safety officer asks the assistant to handle AE-001, a severe adverse event involving suicidal ideation. The assistant retrieves the event details and safety guidelines (immediate, no approval needed), then begins executing the protocol. It notifies the emergency contact, notifies the participant, and attempts to suspend the participant from treatment. Each notification pauses for approval. The suspension requires mandatory confirmation regardless of the auto-approve setting.

**Auto-approve speeds up routine confirmations but mandatory actions still pause**

![With auto-approve enabled, notifications execute automatically but the suspension still requires explicit confirmation.](/assets/scenarios/ai-hitl/02_auto_approve_still_asks.png)

The safety officer enables auto-approve for convenience during a busy shift. The assistant processes the protocol again. Notifications are auto-approved and execute without interruption. But when the assistant reaches the suspension action, the approval dialog appears regardless. The policy has marked this action as `noAutoApprove: true`. The auto-approve toggle is a user preference. The policy overrides it for actions where the organization has determined that human judgment is non-negotiable.

**The assistant adapts when an action is denied**

![The AI assistant reports partial completion after the safety officer denies the suspension action.](/assets/scenarios/ai-hitl/03_partial_completion.png)

The safety officer approves the notifications but denies the suspension. The assistant does not crash, retry, or ignore the denial. It reports what it accomplished (notifications sent, safety report exported) and what it could not do (suspension denied by the operator). The conversation continues. The safety officer can ask follow-up questions, re-attempt the suspension later, or take manual action. The assistant treats the denial as a fact, not an error.

**The approval dialog with countdown**

![The approval dialog shows the action details, recipient, message content, and a countdown timer.](/assets/scenarios/ai-hitl/04_approval_dialog.png)

Each approval dialog shows what the AI wants to do: which tool, what parameters, what the effect will be. The safety officer sees the recipient, the message content, and the clinical context before deciding. A countdown timer auto-denies the action if no response is given within the timeout period. For mandatory approvals, the timeout is configurable per policy (120 seconds for suspension). This prevents the system from blocking indefinitely if the operator steps away.

### How SAPL solves this

The mechanism is SAPL obligations. An obligation is a machine-readable instruction attached to a PERMIT decision that the application must fulfill before the permit takes effect. If the obligation is not fulfilled, the PERMIT becomes a DENY. This is enforced by the framework, not by application logic.

For human-in-the-loop, the obligation is `{"type": "humanApprovalRequired"}`. A registered constraint handler intercepts this obligation, pauses the tool execution, and triggers an approval workflow. The tool method is already authorized (the decision is PERMIT), but execution is suspended until the human responds.

```java
@PreEnforce(action = "'notifyParticipant'",
            resource = "{'recipient': #recipient, 'message': #message}")
@Tool(description = "Sends a notification to a participant or emergency contact.")
public String notifyParticipant(String recipient, String message) {
    // This code does not know about approvals.
    // The obligation handler pauses execution before this method runs.
    notificationService.send("Notified " + recipient, "Notification sent: " + message);
    return "Notification sent to " + recipient + ": " + message;
}
```

The `@PreEnforce` annotation triggers SAPL policy evaluation. The policy returns PERMIT with an obligation. The constraint handler intercepts the obligation, presents an approval dialog to the user, and blocks until the user responds. If approved, the method executes normally. If denied or timed out, the obligation fails, the PERMIT is revoked, and the tool returns an access denied response to the LLM.

The tool method itself contains no approval logic. It does not know whether it will be auto-approved, manually approved, or denied. That decision is made by the policy and enforced by the framework.

### Permit with conditions, not deny with workarounds

The architectural distinction matters. In this system, there are three clearly separated states:

| State | Policy decision | What happens |
|-------|----------------|--------------|
| **Permitted** | PERMIT, no obligation | Action executes immediately |
| **Permitted with approval** | PERMIT + approval obligation | Action pauses for human confirmation, then executes or is revoked |
| **Denied** | DENY (or no matching policy) | Action is forbidden, no approval path exists |

These are not three flavors of the same thing. They have different semantics, different audit trails, and different user experiences.

A DENY means the action is prohibited. No amount of human approval changes this. The user does not see an approval dialog for a denied action because there is nothing to approve. The policy has determined that this action should not happen in this context.

A PERMIT with an approval obligation means the action is authorized in principle. The organization has determined that a human should verify the specific parameters before execution. The approval dialog is not a workaround for insufficient permissions. It is a procedural safeguard for an action that is within the user's authority.

This distinction is lost in systems that implement human-in-the-loop by denying the action and then providing a separate escalation mechanism. In those systems, "denied because you lack permission" and "denied because approval is required" produce the same decision, the same audit log entry, and the same user experience. The operator cannot tell whether they need to request access or simply confirm their intent. The compliance officer cannot distinguish between unauthorized access attempts and routine approval workflows in the audit trail.

SAPL keeps these states separate because they are separate. The policy language can express "permit this action for this role" and "permit this action for this role but require confirmation" and "deny this action regardless" as three distinct rules with three distinct outcomes.

### Obligation properties shape the workflow

The approval obligation is not a boolean flag. It carries properties that the constraint handler interprets:

```sapl
obligation
  { "type": "humanApprovalRequired",
    "noAutoApprove": true,
    "timeout": "PT120S" }
```

`noAutoApprove` overrides the user's auto-approve preference. This lets the policy distinguish between actions where approval is a formality (the user may choose to auto-approve for efficiency) and actions where the organization mandates that a human actively reads the parameters and clicks approve. The user's convenience preference does not override organizational risk policy.

`timeout` sets how long the system waits for a response before auto-denying. A 120-second timeout for treatment suspension gives the operator time to review clinical details. A shorter timeout for routine notifications keeps the workflow moving. If the operator does not respond, the action is denied. The system does not hang indefinitely.

These properties are policy-driven. The application code implements one generic approval handler. The policy decides which actions need approval, whether auto-approve is allowed, and how long to wait. Changing the timeout from 120 seconds to 300 seconds is a policy edit, not a code change.

### Audit trail

Every approval decision is logged: who was asked, what action was proposed, what parameters were passed, whether the human approved or denied, and how long the decision took. Combined with the SAPL policy decision log, this creates a complete chain of accountability: the policy decided that approval was required, the system presented the action to the operator, and the operator approved or denied it within a specific timeframe.

TODO: audit log examples

Beyond infrastructure-level audit logging, SAPL obligations can model domain-driven constraints and events triggered by authorization decisions. A policy can mandate that when a safety-critical action is approved, a record is created in the trial management system. Or that when an operator denies a suspension, the Chief Investigator is notified for follow-up. These are not logging side effects bolted onto the application. They are authorization requirements expressed in policy and enforced by the framework.

### Run the demo

```
git clone https://github.com/heutelbeck/sapl-demos
cd sapl-demos/hitl-clinical-trial
mvn spring-boot:run
```

### Related

- [Spring SDK Documentation](/docs/latest/6_3_Spring/): the SAPL Spring Boot SDK used in this demo
- [AI Tool Authorization](/scenarios/ai-tools/): per-tool authorization for the same clinical trial domain
- [RAG Pipeline Authorization](/scenarios/ai-rag/): document-level access control for retrieval-augmented generation
- [MCP Server Authorization](/scenarios/ai-mcp/): the same authorization model for MCP servers
