---
layout: sapl
title: "Policy Operations - SAPL Scenarios"
description: "Ship authorization policies like you ship code. Version, test, sign, and deploy policies using Git, your CI system, and the monitoring stack you already run."
---

## Ship Policies Like You Ship Code

Your team already has a way to version code, run tests, publish artifacts, and monitor production. Authorization policies should flow through the same process.

This scenario shows a policy pipeline built entirely from standard tools: Git for versioning, CI for testing and signing, HTTP for distribution, Prometheus for metrics, and structured logging for audit trails. The only new component is the SAPL CLI and runtime. Everything else is already in your infrastructure.

### The problem

Authorization logic changes as regulations tighten, roles evolve, and new resources appear. Most teams handle these changes outside their established development workflow:

- Policy authors use a proprietary editor instead of VS Code or IntelliJ.
- Policies live in a proprietary dashboard instead of Git.
- Testing means manual review instead of automated test suites with coverage analysis.
- Deployment means clicking buttons in a vendor UI instead of pushing through a pipeline.
- Monitoring means a separate dashboard instead of the Grafana or Kibana you already run.
- Audit trails live in someone else's cloud instead of your log aggregator.

Every proprietary tool added for authorization is another system your team has to learn, operate, secure, and pay for. The alternative is to treat policies like any other artifact in your software delivery process: write them in your editor, version them in your repository, test them in your CI, monitor them in your observability stack.

### How it works

<img src="/assets/scenarios/policy-ops/pipeline.svg" alt="Policy pipeline: git push to CI pipeline to GitHub Release to SAPL Node, with testing, signing, and observability at each stage" style="width: 100%; max-width: 900px;">

**Author.** Write policies and tests in your existing editor. The [SAPL Language Server](/docs/latest/7_1_GettingStarted/) provides syntax highlighting, code completion, inline validation, and quick fixes for VS Code, IntelliJ, Neovim, and any other LSP-capable editor. Policy authors get the same development experience they have for application code.

**Version.** Policies and tests live in Git. Every change is a commit with an author, timestamp, and diff. Pull requests gate changes through review. Any git forge works: GitHub, GitLab, Gitea, Bitbucket.

**Test.** The SAPL CLI discovers all `.sapl` policies and `.sapltest` test files, runs every scenario, and enforces coverage quality gates. The [testing DSL](/docs/latest/5_0_TestingSAPLPolicies/) supports mocking of attributes and functions, streaming scenarios with multiple decision steps, and call count verification. If any test fails or coverage is below threshold, the pipeline stops and no bundle is published.

**Sign.** The CLI packages policies into a `.saplbundle` archive and signs it with an Ed25519 key. The private key is a CI secret. The public key is committed to the repository. The bundle is verified before publishing.

**Distribute.** The signed bundle is uploaded to a GitHub Release. Any HTTP server works (S3, Artifactory, Nginx, GitLab Releases). SAPL Node loads bundles from the URL and uses HTTP ETag for efficient change detection. Two modes are supported: interval-based polling for static servers, and long-poll for servers that hold the connection until a new bundle is available.

**Run.** SAPL Node serves authorization decisions via HTTP API. When it detects a new bundle, it verifies the signature and hot-reloads the policies. No restart, no manual intervention. For multi-tenant deployments, a single repository can publish multiple bundles (one per tenant), each with its own pdpId, combining algorithm, and fetch interval.

**Observe.** Every authorization decision is logged as structured output to stdout: which policies matched, what the combining algorithm produced, and why. Route these logs to your existing aggregator (ELK, Loki, Splunk, CloudWatch, Datadog) with no proprietary integration.

The node exposes standard [monitoring endpoints](/docs/latest/7_7_Monitoring/):

- `/actuator/health` with liveness and readiness probes for Kubernetes or any orchestrator
- `/actuator/prometheus` with metrics on decision rates, error rates, and bundle reload events for Grafana, Alertmanager, or any Prometheus-compatible tool
- Configurable evaluation reports (`print-text-report`, `print-json-report`, `print-trace`) for debugging and audit

No proprietary dashboard. No separate monitoring tool. The same Grafana instance that monitors your application monitors your authorization.

### The scenario in action

#### Testing catches mistakes

The test suite includes an integration test that loads all policies together with `pdp.json` through the combining algorithm. This catches configuration errors that unit tests miss:

```sapltest
requirement "combined policy evaluation with pdp.json" {
    given
        - configuration "."

    scenario "unmatched action denied by default"
        given
            - attribute "nowMock" <time.now> emits "t1"
            - function time.secondOf(any) maps to 5
        when "user" attempts { "java": { "name": "deleteEverything" } } on "resource"
        expect deny;
}
```

A broken `pdp.json` (wrong combining algorithm, invalid field) fails this test before the bundle is ever built.

#### Coverage gates prevent blind spots

The pipeline enforces quality gates:

- 100% policy set hit ratio -- every policy set is evaluated by at least one test
- 100% policy hit ratio -- every individual policy is matched by at least one test
- 80% condition hit ratio -- most condition branches are exercised

If coverage drops below these thresholds, the pipeline fails with exit code 3 and no bundle is published.

#### Signed bundles prevent tampering

Every bundle is signed with an Ed25519 key. The SAPL Node verifies the signature before loading. If the bundle is modified in transit or on the server, the node rejects it.

```bash
sapl bundle verify -b default.saplbundle -k signing.pub
```

#### Decisions are observable

With `print-text-report` enabled, the node logs a human-readable evaluation report for every decision:

```text
--- PDP Decision ---
Subscription   : {"subject"="user", "action"={"http"={"contextPath"="/string"}}, "resource"="resource"}
Decision       : PERMIT
Obligations    : [{"suffix"="HELLO MODIFICATION"}]
Documents:
  modify string arguments -> PERMIT
  patients -> NOT_APPLICABLE
  demo set -> NOT_APPLICABLE
  classified documents -> NOT_APPLICABLE
```

These logs go to stdout. Route them to your existing log aggregator with no proprietary integration. Prometheus metrics are available at `/actuator/prometheus` for alerting on decision rates, error rates, and bundle reload events.

#### Live policy updates via streaming

A running SAPL Node loads bundles from the configured URL using HTTP ETag for change detection. In polling mode, it checks at a configurable interval. In long-poll mode, the server holds the connection until a new bundle is available, delivering near-instant updates. When the pipeline publishes a new bundle, the node downloads it, verifies its signature, and hot-reloads the policies. Active streaming subscriptions re-evaluate and emit updated decisions automatically.

For example, changing the obligation suffix in a policy from `"HELLO MODIFICATION"` to `"UPDATED VIA GITOPS"`, pushing to main, and waiting for the pipeline to publish the new bundle results in the streaming output changing from:

```json
{"decision":"PERMIT","obligations":[{"suffix":"HELLO MODIFICATION"}]}
```

to:

```json
{"decision":"PERMIT","obligations":[{"suffix":"UPDATED VIA GITOPS"}]}
```

No restart, no redeployment. The `configurationId` in each bundle includes the Git commit hash for traceability.

### Run the demo

Fork the demo repository and follow the setup instructions:

[**sapl-gitops-demo on GitHub**](https://github.com/heutelbeck/sapl-gitops-demo)

The repository includes four policy sets with streaming tests, a GitHub Actions pipeline with coverage gates and Ed25519 signing, and instructions for running a local SAPL Node that loads the published bundle.

### Related

- [SAPL Testing](/docs/latest/5_0_TestingSAPLPolicies/) -- test DSL reference with mocking, streaming, and coverage
- [Remote Bundles](/docs/latest/7_4_RemoteBundles/) -- configuring SAPL Node for remote bundle loading
- [Monitoring](/docs/latest/7_7_Monitoring/) -- structured logging, Prometheus metrics, health endpoints
- [setup-sapl GitHub Action](https://github.com/heutelbeck/setup-sapl) -- install the SAPL CLI in GitHub Actions workflows
- [Spring Security scenario](/scenarios/spring/) -- securing a Spring Boot application with SAPL
- [AI scenarios](/scenarios/ai-rag/) -- authorization for RAG pipelines, tool calling, and human-in-the-loop
