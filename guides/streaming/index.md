---
layout: sapl
title: "Streaming Authorization - SAPL Guides"
description: "Authorization decisions that update in real time. SAPL subscribes to live attribute streams and pushes new decisions to your application as conditions change. No polling, no stale permissions."
---

<link rel="stylesheet" href="/assets/css/anim.css">

<!-- Shared SVG defs (filters used by both animations) -->
{% include streaming/svg-defs.html %}

## Streaming Authorization

### What this guide covers

A trader streams live market data over a WebSocket. Regulations require access only from the trading floor. The trader walks to the cafeteria. The decision changes to SUSPEND and the stream pauses. When they return, a fresh PERMIT resumes it. When the market closes, a DENY ends it for good. No polling. No reconnection. No stale permissions.

<div class="anim-controls">
  <button id="geo-btn-play" title="Play" aria-label="Play" class="btn-stacked"><span class="btn-icon">&#9654;</span><span class="btn-label">Play</span></button>
  <button id="geo-btn-step" title="Step" aria-label="Step" class="btn-stacked"><span class="btn-icon" style="font-size:13px"><span style="letter-spacing:-3px">&#9654;&#9616;</span></span><span class="btn-label">Step</span></button>
  <button id="geo-btn-reset" title="Reset" aria-label="Reset" class="btn-stacked"><span class="btn-icon" style="font-weight:bold">&#8634;</span><span class="btn-label">Reset</span></button>
  <span class="anim-step-counter" id="geo-step-counter"></span>
  <span><label for="geo-speed-slider" style="font-size:12px;color:var(--color-text-secondary)">Speed</label>
  <input type="range" id="geo-speed-slider" min="0.25" max="3" step="0.25" value="1" autocomplete="off" style="width:80px;vertical-align:middle;">
  <span id="geo-speed-label" style="font-size:12px;color:var(--color-text-secondary);font-variant-numeric:tabular-nums;width:38px;display:inline-block;text-align:right">1x</span></span>
</div>
{% include streaming/geo-svg.html %}
<script src="/assets/js/anim-trader.js"></script>

### The problem

Traditional authorization is request-response. The application asks "can this user do this thing?" and receives a yes or no. The interaction ends. For a REST API that returns a JSON response in 50 milliseconds, this is fine. The authorization decision outlives the request by zero seconds.

But modern applications have long-lived connections. WebSockets stay open for hours. Server-Sent Event streams run indefinitely. MQTT subscriptions persist across sessions. A permission check at connection time says nothing about whether the user should still have access 10 minutes later, or 10 hours later.

The common workaround is polling. Re-check authorization every N seconds. This creates three problems:

First, latency. If you poll every 30 seconds, a revoked user has up to 30 seconds of unauthorized access. For market data, patient records, or classified information, that window is not acceptable.

Second, load. If you have 10,000 open streams and poll every 10 seconds, your authorization service handles 1,000 requests per second just for re-checks. These are not productive requests. They are the system asking the same question over and over and mostly getting the same answer.

Third, complexity. The polling interval is a tuning parameter with no good value. Too fast wastes resources. Too slow leaks access. Different streams need different intervals. The application developer is now writing authorization scheduling logic instead of application logic.

### Why decisions become streams

The streaming decision is not a feature bolted onto a request-response system. It is the natural consequence of how SAPL policies work.

A SAPL policy can reference live data using the angle bracket syntax:

```sapl
policy "permit while on trading floor"
permit
  action == "stream_market_data";
  var pos = subject.deviceId.<traccar.position>; // GeoJSON position. pos is a stream.
  geo.within(pos, tradingFloorZone);             // tradingFloorZone is a GEOJson polygon.
```

The expression `subject.deviceId.<traccar.position>` does not fetch the trader's location once. It subscribes to it. The [Traccar PIP](/docs/latest/pip_traccar/) pushes GeoJSON position updates whenever the trader's device reports a new position. Every time the location changes, the [`geo.within`](/docs/latest/lib_geo/) check re-evaluates against the trading floor geofence. If the trader walks out, the check fails and a new decision reaches the PEP. What that decision should be is itself a policy question. The next section introduces the vocabulary for answering it. The animation above shows the sequence, including the case where the trader moves on the floor and no new decision is emitted because `geo.within` still returns true.

This is why the decision is a stream. Not because the PDP was designed to push updates, but because the policy's inputs are streams. The decision is a reactive function of live data.

Three things can cause a decision to change:

**Attribute streams from PIPs.** Any `<pip.attribute>` expression in a policy creates a subscription. When the PIP emits a new value, the policy re-evaluates. The Traccar PIP polls the GPS tracker at a configurable interval (down to 250ms) and emits GeoJSON positions. A clearance PIP might push once a year. The PDP handles both the same way.

```sapl
// Location stream: re-evaluates on every position update
var pos = subject.deviceId.<traccar.position>;
geo.within(pos, tradingFloorZone);

// Business hours: emits true/false only at boundary crossings, no polling
<time.localTimeIsBetween("08:00", "18:00")>;

// Clearance status: re-evaluates when clearance changes
<hr.clearance(subject.id)> == "active";
```

**Policy changes.** When you push a new policy bundle (via git, file system, or remote server), the PDP picks it up and re-evaluates all active subscriptions against the new rules. The trader's open stream does not need to reconnect. The same subscription, evaluated against the new policy, might produce a different decision.

**PDP configuration changes.** Variables, combining algorithms, and default decisions defined in the PDP configuration can change at runtime. When configuration changes, affected policies are re-compiled. The compiler applies constant and function folding based on the new variable values, and all active subscriptions are re-evaluated.

The PDP composes all these input streams internally. When any input changes, it re-evaluates the policy. But it only emits a new decision if the result actually changed. If the trader moves 10 meters within the trading floor, the location PIP emits, the policy re-evaluates, the geofence check still passes, and the PDP emits nothing. The application is not disturbed by irrelevant changes. The animation above shows this: the trader moves on the floor, the PIP sends coordinates, but no new decision arrives because `geo.within` still returns true.

### Permit, suspend, deny

Think about what should happen when the trader steps off the floor. Terminating the WebSocket feels wrong. The trader has done nothing that ends their entitlement. They will be back in five minutes, and forcing the client to reconnect and renegotiate its session buys no security. But leaving the stream running would leak data the trader must not see right now. A model that only knows PERMIT and DENY forces a choice between these two bad options.

SAPL has a third verb. A policy votes `permit`, `deny`, or `suspend`:

| Verb | Meaning | Effect on a stream |
|------|---------|--------------------|
| `permit` | Access is granted | Data flows |
| `suspend` | Access is paused | Data stops flowing, the subscription stays alive, the next PERMIT resumes it |
| `deny` | Access has ended | The stream terminates |

DENY is terminal. SUSPEND is temporary. Whether losing access is the end of the story or a pause in it depends on who is asking, what they are asking for, and the situation they are in. That knowledge lives in the policies, not in the application code. So SAPL puts the choice where the knowledge is. The policy author decides, rule by rule.

Here is the complete rule set for the trader:

```sapl
set "market data access"
first or deny
for action == "stream_market_data"

policy "deny outside trading hours"
deny
    !<time.localTimeIsBetween("08:00", "18:00")>;

policy "permit on the trading floor"
permit
    var pos = subject.deviceId.<traccar.position>;
    geo.within(pos, tradingFloorZone);

policy "suspend while off the floor"
suspend
```

The set uses `first or deny`. Policies are evaluated top to bottom and the first one that applies wins. The last policy has no condition, so it applies whenever the two above it do not. It is the fallback.

Follow the trader through a day. The market opens at 08:00 and the trader is on the floor. The deny policy does not apply, the permit policy does. Data flows. At 11:30 the trader walks to the cafeteria. The geofence check fails, evaluation falls through to the fallback, and the PDP emits SUSPEND. The PEP stops forwarding market data but keeps every connection open. Ten minutes later the trader is back on the floor. The geofence check passes, the PDP emits PERMIT, and data resumes on the same WebSocket. At 18:00 the trading day ends. The deny policy now applies. The stream terminates, because after hours there is nothing to wait for.

One property makes the new verb safe to adopt everywhere. A PEP that cannot pause, such as a request-response endpoint that gets one decision and acts on it, treats SUSPEND exactly like DENY. The same policy set protects a REST endpoint and a WebSocket without modification.

### Decisions carry more than a verb

A decision is more than its verb. It carries obligations: machine-readable instructions that the PEP must fulfill before the decision takes effect. If the PEP cannot fulfill an obligation, the PERMIT becomes a DENY. This is enforced by the framework, not by application logic.

In a streaming context, obligations can change without the decision changing. The decision stays PERMIT, but what the data looks like when it reaches the client adapts in real time.

Consider a nurse monitoring patient records. Under routine conditions, the policy permits access but attaches an obligation to blacken the address and phone number. The nurse sees names, diagnoses, and vitals, but not contact details. Privacy by default.

```sapl
set "patient records"
first or deny
for action == "stream_records"

    var severity = <patient.severity(resource.patientId)>;

policy "stream records full access"
permit
    severity == "critical";

policy "stream records with redaction"
permit
    severity == "routine";
obligation
    {
        "type": "filterJsonContent",
        "actions": [{
        "type": "blacken",
        "path": "$.addr"
    }, {
        "type": "blacken",
        "path": "$.phone"
    }]
    }
```

The policy set uses `first or deny`. When the severity PIP emits `"routine"`, the first policy ("full access") does not match, so the second policy applies and the obligation blackens address and phone. When severity changes to `"critical"`, the first policy matches with no obligations. The PDP emits a new decision, the PEP swaps constraint handlers, and the next record arrives unfiltered. The nurse can now see the full address and phone number to coordinate emergency response.

The stream never paused. The decision never changed to DENY. But the data reaching the client adapted to the current clinical situation. When the situation stabilizes, the PIP emits the new severity, the redaction policy applies again, and the filter obligation returns.

<div class="anim-controls">
  <button id="obl-btn-play" title="Play" aria-label="Play" class="btn-stacked"><span class="btn-icon">&#9654;</span><span class="btn-label">Play</span></button>
  <button id="obl-btn-step" title="Step" aria-label="Step" class="btn-stacked"><span class="btn-icon" style="font-size:13px"><span style="letter-spacing:-3px">&#9654;&#9616;</span></span><span class="btn-label">Step</span></button>
  <button id="obl-btn-reset" title="Reset" aria-label="Reset" class="btn-stacked"><span class="btn-icon" style="font-weight:bold">&#8634;</span><span class="btn-label">Reset</span></button>
  <span class="anim-step-counter" id="obl-step-counter"></span>
  <span><label for="obl-speed-slider" style="font-size:12px;color:var(--color-text-secondary)">Speed</label>
  <input type="range" id="obl-speed-slider" min="0.25" max="3" step="0.25" value="1" autocomplete="off" style="width:80px;vertical-align:middle;">
  <span id="obl-speed-label" style="font-size:12px;color:var(--color-text-secondary);font-variant-numeric:tabular-nums;width:38px;display:inline-block;text-align:right">1x</span></span>
</div>
{% include streaming/obl-svg.html %}
<script src="/assets/js/anim-obligation.js"></script>

### How the PEP enforces the stream

On the application side, a single annotation wraps the data source. In Spring:

```java
@StreamEnforce(signalTransitions = true)
public Flux<MarketData> marketData() {
    return marketDataSource.stream();
}
```

The PEP behind `@StreamEnforce` is a small state machine with four states. It starts in Pending and does not touch the data source until the first decision arrives. PERMIT moves it to Permitting and data flows. SUSPEND moves it to Suspended and data stops. DENY moves it to Terminated and the stream ends. Four states are easy to reason about, easy to test, and easy to verify, and the decision verb from the PDP drives every transition:

| PDP decision | Effect on the stream |
|------|---------|
| PERMIT | Items flow to the client |
| SUSPEND | Items are dropped silently, the subscription stays open, the next PERMIT resumes the flow |
| DENY | The stream terminates with an access denied error |
| INDETERMINATE, NOT_APPLICABLE | The stream terminates, fail closed |

Two flags on the annotation cover the choices that genuinely belong to the application. Both default to `false`.

**signalTransitions** decides whether the client hears about suspend and resume boundaries. Left at the default, the client sees data while permitted and silence while suspended. Set to `true`, the PEP emits a signal at every boundary: access suspended when the stream pauses, access granted when it resumes. Dashboards and interactive UIs opt in so they can tell the user why the data stopped. A helper class, `TransitionSignals`, turns these signals into plain callbacks.

**pauseRapDuringSuspend** decides what happens upstream during a suspension. Left at the default, the data source stays subscribed and the PEP discards items before they reach the client. Resuming is instant. Set to `true`, the PEP unsubscribes from the data source when the stream suspends and resubscribes when it resumes. That stops upstream side effects during the pause and pays for it with resubscription latency.

If you know SAPL 4.0, this replaces the three enforcement annotations. `@EnforceTillDenied` is the default behavior. `@EnforceDropWhileDenied` is a policy that says `suspend` instead of `deny`. `@EnforceRecoverableIfDenied` is that same policy plus `signalTransitions = true`. The enforcement mode moved out of the code and into the policy, where it can depend on who is asking and why.

### Fail-closed by design

Every edge case resolves to a terminal denial:

- The PDP is unreachable or the connection drops mid-stream: the stream terminates.
- The PDP reports an evaluation error (INDETERMINATE) or finds no matching policy (NOT_APPLICABLE): the stream terminates.
- An obligation arrives that no registered handler understands: the stream terminates. The PEP cannot fulfill what it does not understand.
- An obligation handler fails while processing an item: the stream terminates.

Only an explicit SUSPEND from the PDP pauses the stream instead of ending it. Suspension is a deliberate policy decision, never a fallback for something going wrong. Operators who want subscriptions without policy coverage to pause rather than terminate can set the default decision to `suspend` in the PDP configuration. That produces a real SUSPEND decision, so the behavior stays visible in the policy layer instead of hiding in PEP settings.

The PEP never guesses. The PEP never caches a stale PERMIT across a connection failure. The PEP never silently ignores an obligation it cannot handle. The default is closed. Access requires active, continuous confirmation.

### Related

- [SDK Integrations](/docs/latest/6_0_SDKsAndAPIs/): enforcement annotations and streaming modes across all supported frameworks
- [Multi-Framework Authorization](/guides/multi-framework/): suspend-aware SSE streaming across 7 frameworks
- [Human-in-the-Loop Approval](/guides/ai-hitl/): obligations that pause execution for human confirmation
- [Policy Operations](/guides/policy-ops/): live policy updates via streaming bundles
- [AI Tool Authorization](/guides/ai-tools/): per-tool authorization for AI agents
