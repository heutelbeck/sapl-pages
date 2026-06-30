#!/usr/bin/env python3
"""Convert a raw benchmark results trace into the performance-guide JSON datasets.

Usage:
    python3 convert.py <raw-dir> <out-dir>

<raw-dir> holds the experiment result folders produced by sapl-benchmark
(embedded-jvm-quick-*, server-rsocket-tcp-jvm-quick-*, latency-at-load-*, ...),
i.e. a copy of the benchmark `results/` tree. <out-dir> receives the ten chart
files the guide fetches (embedded/index/server-http/server-rsocket/
latency-at-load, each jvm and native).

The converter is profile-agnostic: it reads whatever forks/measurement the run
used. To refresh a version, drop its results under <version>/raw and run this.
"""
import sys, os, re, glob, json, math, statistics

# t value for a 95% CI by degrees of freedom (forks-1); 1.96 for large samples.
T95 = {1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571, 6: 2.447, 7: 2.365}


def comment(lines, key):
    for ln in lines:
        m = re.match(r'#\s*' + re.escape(key) + r'\s*:?\s*(.*)', ln)
        if m:
            return m.group(1).strip()
    return None


def fork_values(lines):
    out = []
    for ln in lines:
        if re.match(r'^\d+,', ln):
            try:
                out.append(float(ln.split(',')[1]))
            except (ValueError, IndexError):
                pass
    return out


def latency_ns(lines, pct):
    v = comment(lines, f'Latency {pct} (ns)')
    return int(v) if v and v.isdigit() else 0


def parse_standard(path, embedded):
    """One throughput CSV -> one chart entry. embedded=True fills method/indexing/threads."""
    lines = open(path).read().splitlines()
    name = os.path.basename(path)
    vals = fork_values(lines)
    if not vals:
        return None
    mean = statistics.mean(vals)
    sd = statistics.stdev(vals) if len(vals) > 1 else 0.0
    n = len(vals)
    cov = (sd / mean * 100.0) if mean else 0.0
    half = T95.get(n - 1, 1.96) * sd / math.sqrt(n) if n > 1 else 0.0
    entry = {
        "file": name, "type": "fork",
        "scenario": name.split('_')[0],
        "method": "", "indexing": "", "threads": "",
        "mean_ops_s": mean,
        "ci_lower": mean - half, "ci_upper": mean + half,
        "cov_pct": cov, "forks": n,
        "p50_ns": latency_ns(lines, 'p50'),
        "p90_ns": latency_ns(lines, 'p90'),
        "p99_ns": latency_ns(lines, 'p99'),
        "permit": comment(lines, 'Decisions PERMIT') or "",
        "deny": comment(lines, 'Decisions DENY') or "",
    }
    if embedded:
        # {scenario}_[seed{N}_]{INDEXING}_[unroll_]{method}_{T}t.csv
        m = re.match(r'.+?_(?:seed\d+_)?([A-Z]+)_(?:unroll_)?(\w+?)_(\d+)t$',
                     name[:-4])
        if m:
            entry["indexing"], entry["method"], entry["threads"] = \
                m.group(1), m.group(2), m.group(3)
    return entry


def parse_loadtest(path):
    """One latency-at-load loadtest CSV -> one chart entry."""
    lines = open(path).read().splitlines()
    data = next((l for l in lines if re.match(r'^[a-z].*,', l)
                 and not l.startswith('method,')), None)
    if not data:
        return None
    f = data.split(',')

    def num(i):
        try:
            return int(f[i])
        except (ValueError, IndexError):
            return 0

    def fnum(i):
        try:
            return float(f[i])
        except (ValueError, IndexError):
            return 0.0
    meas = comment(lines, 'Measurement') or ""
    return {
        "file": os.path.basename(path), "type": "loadtest",
        "label": comment(lines, 'Label') or "",
        "protocol": comment(lines, 'Protocol') or "",
        "concurrency": int(comment(lines, 'Concurrency') or 0),
        "connections": int(comment(lines, 'Connections') or 0),
        "measurement_s": meas.replace(' s', '').strip(),
        "mean_ops_s": fnum(2),
        "p50_ns": num(12), "p90_ns": num(13), "p99_ns": num(14),
        "p999_ns": num(15), "max_ns": num(16),
    }


# output file -> (raw dir glob, parser)
DATASETS = {
    "embedded-jvm":         ("embedded-jvm-*",            "embedded"),
    "embedded-native":      ("embedded-native-*",         "embedded"),
    "index-jvm":            ("index-comparison-jvm-*",    "embedded"),
    "index-native":         ("index-comparison-native-*", "embedded"),
    "server-http-jvm":      ("server-http-jvm-*",         "server"),
    "server-http-native":   ("server-http-native-*",      "server"),
    "server-rsocket-jvm":   ("server-rsocket-tcp-jvm-*",  "server"),
    "server-rsocket-native": ("server-rsocket-tcp-native-*", "server"),
    "latency-at-load-jvm":    ("latency-at-load-jvm-*",    "loadtest"),
    "latency-at-load-native": ("latency-at-load-native-*", "loadtest"),
}


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    raw, out = sys.argv[1], sys.argv[2]
    os.makedirs(out, exist_ok=True)
    for stem, (pattern, kind) in DATASETS.items():
        entries, seen = [], set()
        # Multiple raw dirs may match (e.g. a re-run); dedupe by file name,
        # keeping the first (earliest dir, sorted) so a fuller earlier run is
        # not overwritten by a partial later one.
        for d in sorted(glob.glob(os.path.join(raw, pattern))):
            for csv in sorted(glob.glob(os.path.join(d, '*.csv'))):
                base = os.path.basename(csv)
                if base == 'summary.csv' or base in seen:
                    continue
                e = (parse_loadtest(csv) if kind == 'loadtest'
                     else parse_standard(csv, kind == 'embedded'))
                if e:
                    seen.add(base)
                    entries.append(e)
        with open(os.path.join(out, stem + '.json'), 'w') as fh:
            json.dump(entries, fh, indent=1)
        print(f"  {stem}.json: {len(entries)} entries")


if __name__ == '__main__':
    main()
