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

A trader streams live market data over a WebSocket. Regulations require access only from the trading floor. The trader walks to the cafeteria. The authorization decision changes. The stream suspends. When they return, it resumes. No polling. No reconnection. No stale permissions.

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

The expression `subject.deviceId.<traccar.position>` does not fetch the trader's location once. It subscribes to it. The [Traccar PIP](/docs/4.0.0/pip_traccar/) pushes GeoJSON position updates whenever the trader's device reports a new position. Every time the location changes, the [`geo.within`](/docs/4.0.0/lib_geo/) check re-evaluates against the trading floor geofence. If the trader walks out, the check fails, the decision changes to DENY, and the PEP suspends the stream. The animation above shows this sequence, including the case where the trader moves on the floor and no new decision is emitted because `geo.within` still returns true.

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

### Decisions carry more than permit or deny

A decision is more than PERMIT or DENY. It carries obligations: machine-readable instructions that the PEP must fulfill before the decision takes effect. If the PEP cannot fulfill an obligation, the PERMIT becomes a DENY. This is enforced by the framework, not by application logic.

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

### Three enforcement modes

The animations above show the recoverable pattern: the PEP signals access changes to the client and resumes when access returns. SAPL provides three modes that cover all practical scenarios:

| Mode | On DENY | Client awareness | Recovery | Use case |
|------|---------|-----------------|----------|----------|
| **EnforceTillDenied** | Stream terminates | Yes (error signal) | None | Atomic operations, data exports |
| **EnforceDropWhileDenied** | Data silently dropped | No (just a gap) | Automatic, silent | Real-time feeds, monitoring |
| **EnforceRecoverableIfDenied** | Data dropped, signal sent | Yes (suspend/restore signals) | Automatic, with notification | Interactive UIs, dashboards |

**EnforceTillDenied** is terminal. The moment authorization is revoked, the stream ends. Use this when partial results are meaningless: a data export that becomes unauthorized mid-transfer should stop, not pause.

**EnforceDropWhileDenied** keeps the stream alive but silently discards data during denied periods. The client sees a gap but receives no notification. Use this for feeds where temporary gaps are acceptable, or where the client should not be informed that data is being withheld. The recoverable mode offers full transparency. This mode offers deliberate opacity.

**EnforceRecoverableIfDenied** is the full pattern shown in the animations. On denial, the PEP sends "access suspended." On recovery, "access restored." The data source stays subscribed throughout. When access returns, data resumes immediately without re-establishing the connection.

The choice of mode is a deployment decision, not a code change. The same data source, the same policy, the same constraint handlers work with any mode.

### Fail-closed by design

Every edge case resolves to denial:

- PDP unreachable: INDETERMINATE (deny). Retry with exponential backoff.
- Obligation has no registered handler: deny. The PEP cannot fulfill what it does not understand.
- Obligation handler throws an exception: deny the current item (or terminate, depending on mode).
- PDP connection drops mid-stream: emit INDETERMINATE, suspend, reconnect.

The PEP never guesses. The PEP never caches a stale PERMIT across a connection failure. The PEP never silently ignores an obligation it cannot handle. The default is closed. Access requires active, continuous confirmation.

### Related

- [SDK Integrations](/docs/latest/6_0_Integrations/): enforcement annotations and streaming modes across all supported frameworks
- [Multi-Framework Authorization](/guides/multi-framework/): recoverable SSE streaming across 7 frameworks
- [Human-in-the-Loop Approval](/guides/ai-hitl/): obligations that pause execution for human confirmation
- [Policy Operations](/guides/policy-ops/): live policy updates via streaming bundles
- [AI Tool Authorization](/guides/ai-tools/): per-tool authorization for AI agents
