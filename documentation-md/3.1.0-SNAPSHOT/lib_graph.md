---
layout: default
title: graph
parent: Functions
grand_parent: SAPL Reference
nav_order: 109
---
# graph

Graph functions: reachability and shortest paths.

# Graph Function Library (name: graph)

This library provides functions for working with graphs represented as JSON objects.
Use these functions when authorization decisions depend on reachability or path analysis
in hierarchical structures.

## Design rationale

Graphs are plain JSON objects, so policies can pass them without adapters. Missing nodes
are treated like leaves. Unknown roots still produce a result. Traversal uses breadth-first
search with a visited set, so cycles do not cause loops.

## Graph object format

A graph is a JSON object where each key is a node identifier and each value is an array
of neighbor identifiers. The neighbors represent the outgoing edges of the node.

Example using forbidden knowledge progression (each tome references other texts):

```json
{
  "necronomicon" : [ "pnakotic-manuscripts", "book-of-eibon", "de-vermis-mysteriis" ],
  "pnakotic-manuscripts" : [ "rlyeh-text", "yithian-records" ],
  "book-of-eibon" : [ "testaments-of-carnamagos" ],
  "de-vermis-mysteriis" : [ "cultes-des-goules", "prinn-notes" ],
  "rlyeh-text" : [ "deep-one-inscriptions" ],
  "yithian-records" : [],
  "testaments-of-carnamagos" : [],
  "cultes-des-goules" : [],
  "prinn-notes" : [ "von-junzt-fragments" ],
  "deep-one-inscriptions" : [],
  "von-junzt-fragments" : []
}
```

## Notes on encoding

Edges are directed: neighbors are outgoing edges.
A node is a leaf if it is missing or mapped to an empty array.
Use strings for node ids to avoid confusion.
Only arrays are treated as adjacency lists; any other value is ignored for expansion.
Initial roots can be a single id or an array of ids.

## Example (reachable)

Check what forbidden knowledge becomes accessible if a researcher gains access to the Necronomicon:

```sapl
policy "library-accessible-from-necronomicon"
permit
where
  var accessibleTomes = graph.reachable(forbiddenLibrary, ["necronomicon"]);
  "deep-one-inscriptions" in accessibleTomes;
```

## Example (reachable_paths)

Verify the research path from Necronomicon to specific dangerous knowledge:

```sapl
policy "verify-research-chain"
permit
where
  var paths = graph.reachable_paths(forbiddenLibrary, ["necronomicon"]);
  ["necronomicon","pnakotic-manuscripts","rlyeh-text","deep-one-inscriptions"] in paths;
```


---

## graph.reachable_paths(JsonObject graph, Array initial)

```graph.reachable_paths(OBJECT graph, STRING|ARRAY initial)```: Builds one shortest path per
discovered node by performing breadth-first traversal from the given roots.

Each root contributes a single-element path containing just the root. Each reachable node
yields exactly one path (the first encountered by BFS).

## Parameters

- graph: JSON object mapping node identifiers to arrays of neighbor identifiers
- initial: a single node identifier or an array of identifiers

## Returns

- Array of paths where each path is an array of node identifiers from a root to a reachable node

## Behavior

- Missing nodes are treated as leaves (no expansion)
- Cycles are handled via visited set; the first discovered path is kept
- Unknown roots produce a single-node path

## Example

Using the forbiddenLibrary graph from library documentation, verify the research chain that led
to dangerous knowledge:

```sapl
policy "audit-knowledge-chain"
permit
where
  var paths = graph.reachable_paths(forbiddenLibrary, subject.initialAccess);
  ["necronomicon","de-vermis-mysteriis","prinn-notes","von-junzt-fragments"] in paths;
```


---

## graph.reachable(JsonObject graph, Array initial)

```graph.reachable(OBJECT graph, STRING|ARRAY initial)```: Computes the reachable nodes in a
directed graph when starting at the given list of nodes or a single node identifier.

Performs breadth-first search to discover all nodes that can be reached by following
directed edges in the graph.

## Parameters

- graph: JSON object where each key is a node identifier and each value is an array of
  neighbor identifiers (see library documentation for structure)
- initial: a single node identifier or an array of identifiers

## Returns

- Array of unique node identifiers in the order they were discovered by breadth-first traversal

## Behavior

- Missing nodes are treated as leaves and do not expand further
- Unknown roots are returned as reachable; they yield single-node results if no adjacency exists
- Non-array adjacency values are ignored
- Cycles are handled via visited set
- Time complexity is O(V + E) with V nodes and E edges

## Example

Using the forbiddenLibrary graph from library documentation, check if a researcher's initial access
leads to dangerous knowledge:

```sapl
policy "restrict-deep-knowledge-access"
deny
where
  var accessibleTomes = graph.reachable(forbiddenLibrary, subject.grantedTomes);
  "deep-one-inscriptions" in accessibleTomes;
```


---

