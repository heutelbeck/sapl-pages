#!/usr/bin/env python3
"""Generate llms-full.txt from llms.txt, documentation, and guides.

Concatenates the project overview, all documentation markdown files (latest
version), and all guide pages. Strips <style> and <script> blocks. Embeds
raw JSON data files from guide data/ directories.

Run from the sapl-pages repo root:
    python3 generate-llms-full.py
"""

import glob
import json
import os
import re
import sys

REPO_ROOT = os.path.dirname(os.path.abspath(__file__))
OUTPUT = os.path.join(REPO_ROOT, "llms-full.txt")

STRIP_PATTERN = re.compile(
    r"<style[\s>].*?</style>|<script[\s>].*?</script>",
    re.DOTALL | re.IGNORECASE,
)

FRONTMATTER_PATTERN = re.compile(r"\A---\s*\n.*?\n---\s*\n", re.DOTALL)


def semver_key(name):
    """Sort key for semver directories. Release > SNAPSHOT of same version."""
    base = name.replace("-SNAPSHOT", "")
    parts = [int(p) for p in base.split(".") if p.isdigit()]
    is_release = "-SNAPSHOT" not in name
    return (parts, is_release)


def find_latest_docs():
    docs_dir = os.path.join(REPO_ROOT, "documentation-md")
    versions = [d for d in os.listdir(docs_dir) if os.path.isdir(os.path.join(docs_dir, d))]
    if not versions:
        print("No documentation versions found", file=sys.stderr)
        sys.exit(1)
    latest = max(versions, key=semver_key)
    print(f"Using documentation version: {latest}")
    return os.path.join(docs_dir, latest)


def strip_html_blocks(text):
    return STRIP_PATTERN.sub("", text)


def strip_frontmatter(text):
    return FRONTMATTER_PATTERN.sub("", text)


def read_and_clean(path):
    with open(path) as f:
        text = f.read()
    text = strip_frontmatter(text)
    text = strip_html_blocks(text)
    return text.strip()


def embed_data_files(guide_dir):
    data_dir = os.path.join(guide_dir, "data")
    if not os.path.isdir(data_dir):
        return ""
    parts = []
    for json_file in sorted(glob.glob(os.path.join(data_dir, "*.json"))):
        name = os.path.splitext(os.path.basename(json_file))[0]
        with open(json_file) as f:
            data = json.load(f)
        parts.append(f"#### Raw data: {name}\n\n```json\n{json.dumps(data, indent=2)}\n```")
    return "\n\n".join(parts)


def main():
    sections = []

    # Part 1: llms.txt overview
    llms_path = os.path.join(REPO_ROOT, "llms.txt")
    with open(llms_path) as f:
        sections.append(f.read().strip())

    # Part 2: Documentation (latest version)
    docs_dir = find_latest_docs()
    doc_files = sorted(glob.glob(os.path.join(docs_dir, "*.md")))
    if doc_files:
        sections.append("\n\n---\n\n# SAPL Documentation Reference\n")
        for doc_file in doc_files:
            content = read_and_clean(doc_file)
            if content:
                sections.append(content)

    # Part 3: Guides
    guides_dir = os.path.join(REPO_ROOT, "guides")
    guide_dirs = sorted(glob.glob(os.path.join(guides_dir, "*/index.md")))
    if guide_dirs:
        sections.append("\n\n---\n\n# SAPL Guides\n")
        for guide_index in guide_dirs:
            guide_dir = os.path.dirname(guide_index)
            content = read_and_clean(guide_index)
            if content:
                sections.append(content)
                data_content = embed_data_files(guide_dir)
                if data_content:
                    sections.append(data_content)

    output = "\n\n".join(sections) + "\n"

    with open(OUTPUT, "w") as f:
        f.write(output)

    word_count = len(output.split())
    size_kb = len(output.encode()) / 1024
    print(f"Generated {OUTPUT} ({size_kb:.0f} KB, {word_count} words)")


if __name__ == "__main__":
    main()
