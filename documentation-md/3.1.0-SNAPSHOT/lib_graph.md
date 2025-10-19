---
title: graph
parent: Functions
nav_order: 109
---
# graph

Graph functions: reachability, shortest paths, and graph walking.

# Graph Function Library (name: graph)

This library contains small functions for working with graphs and
with nested JSON values. The goal is to keep policy code simple and
readable when a decision depends on reachability or on the shape of
a JSON document.

## Design rationale

Graphs are plain JSON objects, so policies can pass them without
adapters. Missing nodes are treated like leaves. Unknown roots
still produce a result. Traversal uses breadth first search with
a visited set, so cycles do not cause loops.

## Graph object format

A graph is a JSON object. Each key is a node id. Each value is an
array of neighbor ids. The neighbors are the outgoing edges of the
node.

```json
    {
      "cso": ["security-architect", "risk-manager", "compliance-officer"],
      "security-architect": ["secops-lead", "platform-admin"],
      "secops-lead": ["security-analyst"],
      "platform-admin": ["site-reliability-engineer"],
      "risk-manager": ["risk-analyst"],
      "compliance-officer": ["auditor-internal"],

      "head-of-payments": ["payments-lead"],
      "payments-lead": ["payments-engineer"]
    }
```

## Notes on encoding

Edges are directed: neighbors are outgoing edges.
A node is a leaf if it is missing or mapped to [].
Use strings for node ids if possible to avoid confusion.
Only arrays are treated as adjacency lists; any other value is
ignored for expansion.
Initial roots can be a single id or an array of ids.

## Examples (policy snippets)

SAPL example using reachable:

```sapl
    policy "org-reachable-from-cso"
    permit
    where
      var nodes = graph.reachable(rolesHierarchy, subject.roles);
      "security-analyst" in nodes
      & !("payments-engineer" in nodes);
```

SAPL example using reachable_paths:

```sapl
    policy "org-paths-from-security-architect"
    permit
    where
      var paths = graph.reachable_paths(org_roles_graph, ["security-architect"]);
      ["security-architect","platform-admin","site-reliability-engineer"] in paths;
```
SAPL example using walk:

```sapl
    policy "walk-checks"
    permit
    where
      var pairs = graph.walk({ "a": { "b": 1 }, "c": [2,3] });
      any e in pairs : e[0] == ["a","b"] & e[1] == 1;
```


---

## graph.walk(input)

```graph.walk(OBJECT x)```

Recursively enumerates all leaf values contained in `x`, returning pairs
`[path, value]` where `path` is an array of keys and indices leading to the leaf.

## Parameters

- graph: any JSON value (object, array, or primitive).

## Returns

- Array of pairs. Each pair is represented as a two-element array: `[path, value]`.

## Example (policy)

```sapl
policy "walk-checks"
permit
where
  var pairs = graph.walk({ "a": { "b": 1 }, "c": [2, 3] });
  any e in pairs : e[0] == ["a","b"] & e[1] == 1;
  any e in pairs : e[0] == ["c",0]  & e[1] == 2;
  any e in pairs : e[0] == ["c",1]  & e[1] == 3;
```


---

## graph.reachable_paths(JsonObject graph, initial)

```graph.reachable_paths(graph, initial)```: Builds one shortest path per discovered node by performing
a breadth-first traversal from the given roots. A root contributes the path `[root]`.
Each reachable node yields exactly one path (the first encountered by BFS).

## Parameters

- graph: JSON object mapping node identifiers to arrays of neighbor identifiers.
- initial: a single node identifier or an array of identifiers.

## Returns

- Array of paths. Each path is an array of node identifiers from a root to a reachable node.

## Behavior and Robustness

- Missing nodes are treated as leaves (no expansion).
- Cycles are handled via a visited set; the first discovered path is kept.
- Unknown roots produce a single-node path.

## Example (policy)

```sapl
policy "org-paths-from-security-architect"
permit
where
  var paths = graph.reachable_paths(org_roles_graph, ["security-architect"]);
  ["security-architect","secops-lead","security-analyst"] in paths
  &
  ["security-architect","platform-admin","site-reliability-engineer"] in paths;
```


---

## graph.reachable(JsonObject graph, Array initial)

```graph.reachable(OBJECT graph,STRING|ARRAY initial)```: Computes the reachable nodes in a directed
graph when starting at the given list of nodes or a single node identifier.

Computes the set of nodes that can be discovered by traversing directed edges
in `graph` starting from `initial`. The graph is represented as a JSON object
that maps node identifiers to arrays of neighbor identifiers.

## Parameters

- graph: JSON object where each key is a node identifier and each value is an array
  of neighbor identifiers. Example structure:

  ```json
  {
    "org_roles_graph": {
      "cso": ["security-architect", "risk-manager", "compliance-officer"],
      "security-architect": ["secops-lead", "platform-admin"],
      "secops-lead": ["security-analyst"],
      "platform-admin": ["site-reliability-engineer"],
      "risk-manager": ["risk-analyst"],
      "compliance-officer": ["auditor-internal"],

      "head-of-payments": ["payments-lead"],
      "payments-lead": ["payments-engineer"],

      "security-analyst": [],
      "site-reliability-engineer": [],
      "risk-analyst": [],
      "auditor-internal": [],
      "payments-engineer": []
    }
  }
  ```

- initial: a single node identifier (string or number) or an array of identifiers.

## Returns

- Array of unique node identifiers in the order they were discovered by a breadth-first traversal.

## Behavior and Robustness

- Missing nodes (no key present in `graph`) are treated as leaves and do not expand further.
- Unknown roots are returned as reachable; they simply yield single-node results if no adjacency exists.
- Non-array adjacency values are ignored safely.
- Time complexity is `O(V + E)` with `V` nodes and `E` edges.

## Example (policy)

Given variables containing `org_roles_graph`:

```sapl
policy "org-reachable-from-cso"
permit
where
  var r = graph.reachable(org_roles_graph, ["cso"]);
  ("security-analyst" in r) && ("site-reliability-engineer" in r) && !("payments-engineer" in r);
```


---

