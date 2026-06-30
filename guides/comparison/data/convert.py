#!/usr/bin/env python3
"""Convert raw Cedar/OOPSLA benchmark CSVs into the comparison-guide JSON datasets.

Usage:
    python3 convert.py <raw-dir> <out-dir>

<raw-dir> holds one subfolder per Cedar version, named cedar-<version>
(e.g. cedar-4.10, cedar-3.0.1), each containing the per-app CSVs produced by
the cedar-benchmarks harness (gdrive.csv, github.csv, tinytodo.csv). <out-dir>
receives one JSON per app (gdrive/github/tinytodo) that the guide fetches.

Engine mapping: the newest Cedar version becomes the `cedar` series and also
supplies the version-independent `sapl`/`rego`/`openfga` series; the next-newest
becomes `cedar3` (the older Cedar the page labels "Cedar 3.0"). All durations
are medians/p99 in microseconds, matching the existing 4.0.0 datasets.

To refresh a version, drop its results under <version>/raw/cedar-<ver>/ and run
this with that raw dir.
"""
import sys, os, csv, glob, json

APPS = {"gdrive": "gdrive", "github": "github", "tiny-todo": "tinytodo"}
# CSV column basename per app file: the harness writes tinytodo.csv (no dash).
APP_FILES = ["gdrive", "github", "tinytodo"]

# JSON series -> CSV engine-column prefix.
ENGINES = {"sapl": "sapl", "cedar": "cedar", "rego": "rego", "openfga": "openfga"}


def version_key(dirname):
    """Sort key for a cedar-<version> dir: parse the dotted version into ints."""
    name = os.path.basename(dirname)
    ver = name[len("cedar-"):] if name.startswith("cedar-") else name
    parts = []
    for p in ver.split('.'):
        parts.append(int(p) if p.isdigit() else 0)
    return tuple(parts)


def read_app(path):
    """Read one app CSV -> {n: row} keyed by num_entities (int)."""
    with open(path) as fh:
        return {int(row["num_entities"]): row for row in csv.DictReader(fh)}


def num(row, prefix, stat):
    """Round a '<prefix> <stat>_dur_micros' cell to 2 decimals, or None."""
    val = row.get(f"{prefix} {stat}_dur_micros")
    return round(float(val), 2) if val not in (None, "") else None


def build_app(app, cedar_dir, cedar3_dir):
    cedar_rows = read_app(os.path.join(cedar_dir, f"{app}.csv"))
    cedar3_rows = read_app(os.path.join(cedar3_dir, f"{app}.csv")) if cedar3_dir else {}
    out = []
    for n in sorted(cedar_rows):
        row = cedar_rows[n]
        entry: dict[str, float | int | None] = {"n": n}
        for series, prefix in ENGINES.items():
            entry[f"{series}_med"] = num(row, prefix, "median")
            entry[f"{series}_p99"] = num(row, prefix, "p99")
        if n in cedar3_rows:
            entry["cedar3_med"] = num(cedar3_rows[n], "cedar", "median")
            entry["cedar3_p99"] = num(cedar3_rows[n], "cedar", "p99")
        out.append(entry)
    return out


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    raw, out = sys.argv[1], sys.argv[2]
    os.makedirs(out, exist_ok=True)
    cedar_dirs = sorted(glob.glob(os.path.join(raw, "cedar-*")), key=version_key, reverse=True)
    if not cedar_dirs:
        sys.exit(f"No cedar-<version> subfolders found in {raw}")
    cedar_dir = cedar_dirs[0]
    cedar3_dir = cedar_dirs[1] if len(cedar_dirs) > 1 else None
    print(f"  cedar  = {os.path.basename(cedar_dir)} (+ sapl/rego/openfga)")
    print(f"  cedar3 = {os.path.basename(cedar3_dir) if cedar3_dir else '(none)'}")
    for app in APP_FILES:
        entries = build_app(app, cedar_dir, cedar3_dir)
        with open(os.path.join(out, app + ".json"), "w") as fh:
            json.dump(entries, fh, indent=1)
        print(f"  {app}.json: {len(entries)} rows")


if __name__ == "__main__":
    main()
