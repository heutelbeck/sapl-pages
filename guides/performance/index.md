---
layout: sapl
title: "SAPL Performance - Throughput, Latency, and Scaling Benchmarks"
description: "Performance benchmarks for the SAPL authorization engine: 2M decisions/sec over RSocket, 35 microsecond latency, near-constant scaling to 10,000 policies. JVM and native image compared across HTTP, RSocket, and embedded deployment modes."
---

<style>
  .perf-tldr { background: var(--color-bg-card); border-left: 4px solid var(--color-primary); padding: 1.2rem 1.5rem; margin: 1.5rem 0; border-radius: 0 6px 6px 0; }
  .perf-tldr h3 { margin-top: 0; color: var(--color-primary); }
  .perf-tldr .num { font-size: 1.3rem; font-weight: 700; }
  .perf-chart { background: var(--color-bg-card); border-radius: 8px; padding: 1.5rem; margin: 1.5rem 0; }
  .perf-chart h3 { margin-top: 0; }
  .perf-row { display: grid; grid-template-columns: 1fr 1fr; gap: 1.5rem; }
  @media (max-width: 768px) { .perf-row { grid-template-columns: 1fr; } }
  .perf-env { background: var(--color-bg-card); padding: 1rem 1.5rem; border-radius: 6px; font-family: monospace; font-size: 0.85rem; margin: 1rem 0; }
  .perf-note { background: var(--color-bg-card); border-left: 4px solid var(--color-accent); padding: 0.8rem 1.2rem; margin: 1rem 0; border-radius: 0 6px 6px 0; font-size: 0.9rem; }
</style>

## Performance

[SAPL](https://sapl.io) is an attribute-based access control (ABAC) policy engine with streaming authorization support. This page documents SAPL's performance characteristics across deployment modes (embedded, HTTP, RSocket), runtimes (JVM, native image), and numbers of policies (1 to 10,000 policies). All numbers are from automated, reproducible benchmarks on controlled hardware.

SAPL ships as a single native binary (`sapl`) and as a JVM application (`sapl-node.jar`). Both provide the same functionality. Choose based on your deployment model.

<div class="perf-tldr">
  <h3>JVM Runtime</h3>
  <p>
  Running on the JVM with HotSpot C2 JIT unlocks peak throughput for
  extreme-scale deployments. The JIT compiler optimizes the hot evaluation
  path at runtime, achieving roughly 2x the throughput of the native binary
  for sustained workloads.
  </p>
  <ul>
    <li><span class="num">2M</span> RSocket decisions/sec (8 P-cores, 9905 policies)</li>
    <li><span class="num">35 &#956;s</span> p50 server latency at typical load</li>
    <li><span class="num">15M</span> embedded in-process decisions/sec (single thread)</li>
    <li><span class="num">179-374 ns</span> embedded p50 per-decision latency (RBAC to 9905 policies)</li>
  </ul>
  <p>
  Choose JVM when you need maximum throughput per node, when embedding the
  PDP directly into a Spring application, or when the application already
  runs on the JVM.
  </p>
</div>

<div class="perf-tldr">
  <h3>Native Binary</h3>
  <p>
  The native binary is a self-contained executable compiled with GraalVM
  ahead-of-time. No JVM, no runtime dependencies, no classpath. Install via
  <code>deb</code>, <code>rpm</code>, or copy the binary.
  Ideal for sidecar containers, CLI tooling, and environments where a JVM
  is not available or not desired.
  </p>
  <ul>
    <li><span class="num">900K</span> RSocket decisions/sec (8 P-cores, 9905 policies)</li>
    <li><span class="num">45 &#956;s</span> p50 server latency at a typical load</li>
  </ul>
  <p>
  For context: at 900K decisions/sec, a single SAPL instance can authorize
  every request for hundreds of concurrent applications without becoming
  a bottleneck. The native binary is the recommended deployment for most
  use cases.
  </p>
</div>

<div class="perf-tldr">
  <h3>Policy Scaling</h3>
  <ul>
    <li><span class="num">1.6x</span> throughput degradation from 38 to 9905 policies in the hospital scenario</li>
  </ul>
  <p>
  The SMTDD index exploits structural overlap in policy sets. When policies
  share common attribute checks (e.g. role, department, resource type), the
  index collapses them into multi-way HashMap lookups. This is the common
  case for real-world deployments where policies are organized around
  a finite set of attributes.
  </p>
  <p>
  The near-flat scaling shown here is not guaranteed for all policy
  structures. Policies with entirely disjoint predicates or complex
  non-equality conditions will fall back to standard binary decision
  nodes with less favorable scaling. The AUTO index mode selects the
  best strategy for the given policy set automatically.
  </p>
</div>

### Test Environment

<div class="perf-env">
CPU: Intel Core i9-13900KS (8 P-cores + 16 E-cores, 32 logical)<br>
Clock: All P-cores pinned to 4.0 GHz (constant frequency, no turbo/throttle noise)<br>
JVM: OpenJDK 25.0.2 (HotSpot C2)<br>
Native: GraalVM native-image (same JDK base)<br>
OS: NixOS Linux 6.18.19<br>
Pinning: Server on P-cores (taskset), client on E-cores<br>
Thermal: Cool-down between runs to prevent frequency scaling
</div>

<div class="perf-note">
Quick-profile results (10s measurement, 2 forks). Full-profile numbers with longer
measurement windows and convergence checking are being collected.
</div>

### Benchmark Scenarios

All scenarios use realistic policy structures. The **hospital** scenarios model a healthcare access control system where policies guard patient records by role (doctor, nurse, admin), resource type (record, lab result), department, and action. The number of departments scales linearly, producing 33N+5 policies for N departments. This provides a controlled policy scaling curve from 38 to 9905 policies. Hospital-300 with 9905 policies is a deliberate stress test; typical production deployments use far fewer policies.

The **github**, **gdrive**, and **tinytodo** scenarios are SAPL equivalents of the Cedar OOPSLA 2024 benchmark suite ([Cutler et al., 2024](https://arxiv.org/abs/2403.04651), Section 5, Figure 14). In these scenarios, the scaling factor N refers to the number of *entities per type* (users, teams, repos, etc.), not the number of policies. The policies are a small fixed set; the entity graph grows with N. Cedar uses templates to encode per-entity permissions; SAPL uses compile-time constant folding to achieve equivalent performance with static policies.

| Scenario | Scale | Policies | Description |
|----------|-------|----------|-------------|
| baseline | - | 1 | Single unconditional deny policy |
| rbac | - | 1 | Role-based access with IN-operator permission lookup |
| hospital-N | N departments | 33N+5 | Hospital ABAC: role, resource type, department, and action guards |
| hospital-1 | 1 dept | 38 | |
| hospital-5 | 5 depts | 170 | |
| hospital-50 | 50 depts | 1655 | |
| hospital-100 | 100 depts | 3305 | |
| hospital-300 | 300 depts | 9905 | |
| **Cedar OOPSLA equivalents** | N = entities/type | | |
| github-N | N entities/type | 8 | GitHub repository permissions (Cedar Fig. 14b) |
| gdrive-N | N entities/type | 5 | Google Drive file sharing (Cedar Fig. 14a) |
| tinytodo-N | N entities/type | 4 | Todo app with team sharing (Cedar Fig. 14c) |

### Embedded Throughput & Latency

In-process policy evaluation with no network overhead. The PDP is embedded directly in the application JVM. This represents the pure evaluation cost.

<div class="perf-row">
  <div class="perf-chart">
    <h3>JVM - Throughput by Scenario and Threads</h3>
    <canvas id="embeddedJvmChart"></canvas>
  </div>
  <div class="perf-chart">
    <h3>Native - Throughput by Scenario and Threads</h3>
    <canvas id="embeddedNativeChart"></canvas>
  </div>
</div>

<div class="perf-row">
  <div class="perf-chart">
    <h3>JVM - Per-Decision Latency, single thread (JMH SampleTime)</h3>
    <canvas id="embeddedLatencyJvmChart"></canvas>
  </div>
  <div class="perf-chart">
    <h3>Native - Per-Decision Latency, single thread</h3>
    <canvas id="embeddedLatencyNativeChart"></canvas>
  </div>
</div>

### Index Strategy Comparison (single thread, embedded)

Three indexing strategies: NAIVE (linear scan), CANONICAL (predicate-based), and SMTDD (semantic multi-terminal decision diagram). SMTDD collapses equality predicates into HashMap lookups for near-constant cost regardless of policy count.

<div class="perf-row">
  <div class="perf-chart">
    <h3>Hospital Scaling: Throughput vs Policy Count (JVM)</h3>
    <canvas id="hospitalScalingJvmChart"></canvas>
  </div>
  <div class="perf-chart">
    <h3>Hospital Scaling: Throughput vs Policy Count (Native)</h3>
    <canvas id="hospitalScalingNativeChart"></canvas>
  </div>
</div>

### Server Throughput

Server deployment over HTTP/JSON and RSocket/protobuf. RSocket provides significantly higher throughput due to binary framing, connection multiplexing, and zero-copy payload handling.

<div class="perf-chart">
  <h3>Server Throughput: HTTP vs RSocket, JVM vs Native (best config per scenario)</h3>
  <canvas id="serverComparisonChart"></canvas>
</div>

### Server Latency at Load

RSocket latency at controlled load fractions. The load generator sends requests at 1%, 10%, 50%, and 90% of measured saturation throughput and records per-request service time. At typical load (1-10% of capacity), p50 latency is 35-37 &#956;s regardless of policy count.

<div class="perf-row">
  <div class="perf-chart">
    <h3>Hospital-300 (9905 policies) - JVM</h3>
    <canvas id="latencyHospitalJvmChart"></canvas>
  </div>
  <div class="perf-chart">
    <h3>Hospital-300 (9905 policies) - Native</h3>
    <canvas id="latencyHospitalNativeChart"></canvas>
  </div>
</div>

<div class="perf-row">
  <div class="perf-chart">
    <h3>GitHub-10 (Cedar equivalent) - JVM</h3>
    <canvas id="latencyGithubJvmChart"></canvas>
  </div>
  <div class="perf-chart">
    <h3>GitHub-10 (Cedar equivalent) - Native</h3>
    <canvas id="latencyGithubNativeChart"></canvas>
  </div>
</div>

### JVM vs Native Image

GraalVM native image provides sub-second startup but loses HotSpot C2 JIT optimizations for sustained throughput. JVM is approximately 2x faster for embedded evaluation across all scenarios.

<div class="perf-chart">
  <h3>Embedded Throughput: JVM vs Native (1 thread)</h3>
  <canvas id="jvmVsNativeChart"></canvas>
</div>

### Methodology

**Measurement**

- **Embedded:** JMH (JVM) and custom timing loops (native) with convergence-based fork count.
- **Server throughput:** wrk2 with constant-rate saturation (HTTP) and reactive load generator (RSocket).
- **Server latency:** Rate-limited reactive load generator (Flux.interval) at percentages of measured saturation. Per-request service time (send-to-response).

**CPU Isolation**

- All P-cores frequency-locked to 4.0 GHz to eliminate turbo boost variance and thermal throttling
- Server pinned to P-cores via taskset (1, 4, or 8 P-cores)
- Client pinned to E-cores to prevent contention
- Thermal cool-down between runs to prevent frequency scaling artifacts

**Statistics**

- 95% confidence intervals via t-distribution
- Coefficient of variation (CoV) for convergence detection
- Latency percentiles: p50, p90, p99, p99.9, max

**Reproducing These Results**

All benchmark code, scenario generators, runner scripts, and analysis tools are open source in the [sapl-policy-engine](https://github.com/heutelbeck/sapl-policy-engine) repository:

- `sapl-benchmark/` - JMH benchmark harness and scenario generators
- `sapl-benchmark/scripts/` - Runner scripts for all benchmark types
- `sapl-benchmark/scripts/lib/bench.py` - Statistics, convergence, and data aggregation
- `sapl-benchmark/scripts/lib/profiles/` - Quality (quick/full) and experiment profiles

```
./sapl-benchmark/scripts/build.sh
./sapl-benchmark/scripts/run-all.sh ./results
```

<script src="chart.umd.min.js"></script>
<script>
// Theme-aware colors that work in both light and dark mode
const CL = {
  primary: getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim() || '#027080',
  accent: getComputedStyle(document.documentElement).getPropertyValue('--color-accent').trim() || '#8f9cc1',
  primaryLight: getComputedStyle(document.documentElement).getPropertyValue('--color-primary-light').trim() || '#7bbdbc',
};
// Chart palette: use theme primary + distinguishable companions
const PAL = {
  teal: CL.primary,
  blue: '#4a90d9',
  coral: '#e07050',
  amber: '#d4a030',
  purple: CL.accent,
  green: '#5a9a68',
  grey: '#888',
  pink: '#c06080'
};
const THREAD_COLORS = [PAL.teal, PAL.coral, PAL.green, PAL.amber, PAL.purple, PAL.blue, PAL.grey, PAL.pink];
const INDEX_COLORS = { NAIVE: PAL.grey, CANONICAL: PAL.amber, SMTDD: PAL.teal };
const PCORE_COLORS = { 1: PAL.teal, 4: PAL.green, 8: PAL.coral };

const SCENARIO_ORDER = ['baseline', 'rbac', 'hospital-1', 'hospital-5', 'hospital-50', 'hospital-100', 'hospital-300',
  'github-10', 'github-100', 'gdrive-10', 'gdrive-50', 'tinytodo-10', 'tinytodo-50'];

function sortScenarios(list) {
  return list.sort((a, b) => {
    const ia = SCENARIO_ORDER.indexOf(a);
    const ib = SCENARIO_ORDER.indexOf(b);
    return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);
  });
}

function fmtOps(v) {
  if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M';
  if (v >= 1e3) return (v / 1e3).toFixed(0) + 'K';
  return v.toFixed(0);
}

// Detect dark mode for chart defaults
const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
Chart.defaults.color = isDark ? '#e0e0e0' : '#333';
Chart.defaults.borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';

async function load(path) {
  const r = await fetch('/guides/performance/data/' + path);
  return r.json();
}

async function main() {
  const [ejvm, enat, ijvm, inat, lljvm, llnat, shjvm, shnat, srjvm, srnat] = await Promise.all([
    load('embedded-jvm.json'), load('embedded-native.json'),
    load('index-jvm.json'), load('index-native.json'),
    load('latency-at-load-jvm.json'), load('latency-at-load-native.json'),
    load('server-http-jvm.json'), load('server-http-native.json'),
    load('server-rsocket-jvm.json'), load('server-rsocket-native.json'),
  ]);

  function embeddedChart(id, data) {
    const fork = data.filter(d => d.type === 'fork');
    const scenarios = sortScenarios([...new Set(fork.map(d => d.scenario))]);
    const threads = [...new Set(fork.map(d => parseInt(d.threads)))].sort((a, b) => a - b);
    new Chart(document.getElementById(id), {
      type: 'bar',
      data: {
        labels: scenarios,
        datasets: threads.map((t, i) => ({
          label: t + 't',
          data: scenarios.map(s => { const d = fork.find(r => r.scenario === s && parseInt(r.threads) === t); return d ? d.mean_ops_s : 0; }),
          backgroundColor: THREAD_COLORS[i],
        }))
      },
      options: { responsive: true, plugins: { legend: { position: 'top' } },
        scales: { y: { title: { display: true, text: 'ops/s' }, ticks: { callback: fmtOps } } } }
    });
  }
  embeddedChart('embeddedJvmChart', ejvm);
  embeddedChart('embeddedNativeChart', enat);

  function embeddedLatencyChart(id, data) {
    const fork = data.filter(d => d.type === 'fork' && parseInt(d.threads) === 1 && d.p50_ns > 0);
    const scenarios = sortScenarios([...new Set(fork.map(d => d.scenario))]);
    new Chart(document.getElementById(id), {
      type: 'bar',
      data: {
        labels: scenarios,
        datasets: [
          { label: 'p50', data: scenarios.map(s => { const d = fork.find(r => r.scenario === s); return d ? d.p50_ns : 0; }), backgroundColor: PAL.teal },
          { label: 'p99', data: scenarios.map(s => { const d = fork.find(r => r.scenario === s); return d ? d.p99_ns : 0; }), backgroundColor: PAL.amber },
        ]
      },
      options: { responsive: true, plugins: { legend: { position: 'top' } },
        scales: { y: { title: { display: true, text: 'ns/decision' }, ticks: { callback: v => v >= 1000 ? (v/1000).toFixed(0) + ' \u03BCs' : v + ' ns' } } } }
    });
  }
  embeddedLatencyChart('embeddedLatencyJvmChart', ejvm);
  embeddedLatencyChart('embeddedLatencyNativeChart', enat);

  function hospitalScalingChart(id, data) {
    const fork = data.filter(d => d.type === 'fork');
    const policyMap = { 'hospital-1': 38, 'hospital-5': 170, 'hospital-50': 1655, 'hospital-100': 3305, 'hospital-300': 9905 };
    const hospitals = ['hospital-1', 'hospital-5', 'hospital-50', 'hospital-100', 'hospital-300'];
    const strategies = ['NAIVE', 'CANONICAL', 'SMTDD'];
    new Chart(document.getElementById(id), {
      type: 'scatter',
      data: {
        datasets: strategies.map(s => ({
          label: s,
          data: hospitals.map(h => { const d = fork.find(r => r.scenario === h && r.indexing === s); return d ? { x: policyMap[h], y: d.mean_ops_s } : null; }).filter(Boolean),
          borderColor: INDEX_COLORS[s], backgroundColor: INDEX_COLORS[s], showLine: true, tension: 0.3, pointRadius: 5,
        }))
      },
      options: { responsive: true, plugins: { legend: { position: 'top' } },
        scales: {
          x: { type: 'logarithmic', title: { display: true, text: 'Policies' }, ticks: { callback: fmtOps } },
          y: { type: 'logarithmic', title: { display: true, text: 'ops/s (log)' }, ticks: { callback: fmtOps } }
        } }
    });
  }
  hospitalScalingChart('hospitalScalingJvmChart', ijvm);
  hospitalScalingChart('hospitalScalingNativeChart', inat);

  {
    function bestPerScenario(data) {
      const fork = data.filter(d => d.type === 'fork');
      const scenarios = sortScenarios([...new Set(fork.map(d => d.scenario))]);
      const result = {};
      for (const s of scenarios) {
        const points = fork.filter(d => d.scenario === s);
        const best = points.reduce((a, b) => a.mean_ops_s > b.mean_ops_s ? a : b);
        result[s] = best.mean_ops_s;
      }
      return result;
    }
    const httpJvm = bestPerScenario(shjvm);
    const httpNat = bestPerScenario(shnat);
    const rsJvm = bestPerScenario(srjvm);
    const rsNat = bestPerScenario(srnat);
    const scenarios = sortScenarios([...new Set([...Object.keys(httpJvm), ...Object.keys(rsJvm)])]);
    new Chart(document.getElementById('serverComparisonChart'), {
      type: 'bar',
      data: {
        labels: scenarios,
        datasets: [
          { label: 'HTTP JVM', data: scenarios.map(s => httpJvm[s] || 0), backgroundColor: PAL.teal },
          { label: 'HTTP Native', data: scenarios.map(s => httpNat[s] || 0), backgroundColor: PAL.green },
          { label: 'RSocket JVM', data: scenarios.map(s => rsJvm[s] || 0), backgroundColor: PAL.coral },
          { label: 'RSocket Native', data: scenarios.map(s => rsNat[s] || 0), backgroundColor: PAL.amber },
        ]
      },
      options: { responsive: true, plugins: { legend: { position: 'top' } },
        scales: { y: { title: { display: true, text: 'req/s (best config)' }, ticks: { callback: fmtOps } } } }
    });
  }

  function latencyChart(id, data, scenario) {
    const points = data.filter(d => d.type === 'loadtest' && d.label.startsWith(scenario + '_'));
    const pcoresSet = [...new Set(points.map(d => {
      const m = d.label.match(/_(\d+)p_/); return m ? parseInt(m[1]) : 0;
    }))].filter(p => p > 0).sort((a, b) => a - b);
    const datasets = [];
    for (const pc of pcoresSet) {
      const pcPoints = points.filter(d => d.label.includes('_' + pc + 'p_')).sort((a, b) => a.mean_ops_s - b.mean_ops_s);
      datasets.push({
        label: pc + 'P p50', data: pcPoints.map(p => ({ x: p.mean_ops_s, y: p.p50_ns / 1000 })),
        borderColor: PCORE_COLORS[pc] || PAL.grey, backgroundColor: 'transparent', pointRadius: 5, showLine: true, tension: 0.3,
      });
      datasets.push({
        label: pc + 'P p99', data: pcPoints.map(p => ({ x: p.mean_ops_s, y: p.p99_ns / 1000 })),
        borderColor: PCORE_COLORS[pc] || PAL.grey, borderDash: [5, 5], backgroundColor: 'transparent', pointRadius: 3, showLine: true, tension: 0.3,
      });
    }
    new Chart(document.getElementById(id), {
      type: 'scatter', data: { datasets },
      options: { responsive: true, plugins: { legend: { position: 'top' } },
        scales: {
          x: { type: 'logarithmic', title: { display: true, text: 'Throughput (req/s)' }, ticks: { callback: fmtOps } },
          y: { type: 'logarithmic', title: { display: true, text: 'Latency' },
            ticks: { callback: v => v >= 1000 ? (v / 1000).toFixed(0) + ' ms' : v.toFixed(0) + ' \u03BCs' } }
        } }
    });
  }
  latencyChart('latencyHospitalJvmChart', lljvm, 'hospital-300');
  latencyChart('latencyHospitalNativeChart', llnat, 'hospital-300');
  latencyChart('latencyGithubJvmChart', lljvm, 'github-10');
  latencyChart('latencyGithubNativeChart', llnat, 'github-10');

  {
    const jvm1t = ejvm.filter(d => d.type === 'fork' && parseInt(d.threads) === 1);
    const nat1t = enat.filter(d => d.type === 'fork' && parseInt(d.threads) === 1);
    const scenarios = sortScenarios([...new Set(jvm1t.map(d => d.scenario))]);
    new Chart(document.getElementById('jvmVsNativeChart'), {
      type: 'bar',
      data: {
        labels: scenarios,
        datasets: [
          { label: 'JVM', data: scenarios.map(s => { const d = jvm1t.find(r => r.scenario === s); return d ? d.mean_ops_s : 0; }), backgroundColor: PAL.teal },
          { label: 'Native', data: scenarios.map(s => { const d = nat1t.find(r => r.scenario === s); return d ? d.mean_ops_s : 0; }), backgroundColor: PAL.coral },
        ]
      },
      options: { responsive: true, plugins: { legend: { position: 'top' } },
        scales: { y: { title: { display: true, text: 'ops/s' }, ticks: { callback: fmtOps } } } }
    });
  }
}

// Re-render on theme change
const observer = new MutationObserver(() => {
  const dark = document.documentElement.getAttribute('data-theme') === 'dark';
  Chart.defaults.color = dark ? '#e0e0e0' : '#333';
  Chart.defaults.borderColor = dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  const color = dark ? '#e0e0e0' : '#333';
  const border = dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)';
  Object.values(Chart.instances).forEach(c => {
    c.options.color = color;
    c.options.scales && Object.values(c.options.scales).forEach(s => {
      if (s.ticks) s.ticks.color = color;
      if (s.title) s.title.color = color;
      s.grid = s.grid || {};
      s.grid.color = border;
    });
    if (c.options.plugins && c.options.plugins.legend) c.options.plugins.legend.labels = { ...(c.options.plugins.legend.labels || {}), color };
    c.update();
  });
});
observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

main();
</script>
