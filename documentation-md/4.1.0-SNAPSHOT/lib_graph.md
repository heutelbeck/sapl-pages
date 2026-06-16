---
layout: default
title: graph
parent: Functions
nav_order: 109
---
# graph

Graph functions: reachability, transitive closure, and shortest paths.

# Graph Function Library (name: graph)

Functions for working with graphs represented as JSON objects.

## Graph formats

**Adjacency list:** ``{ "admin": ["manager", "auditor"], "manager": ["viewer"] }``

**Entity graph:** ``{ "admin": { "children": ["manager"], "attributes": { "permissions": ["approve"] } } }``

## Performance

When the graph is a PDP configuration variable, a transitive-closure call is a constant
expression, so the compiler evaluates it once at compile time and reuses the result for
every decision instead of recomputing it per request. For a large graph, or a graph
supplied at runtime, use `reachable` (single-source) or `isReachable` (single-pair),
which do not materialize a closure.

## Limits

The transitive closure functions are capped at 1000000 output entries and return an error
value above that. This limit applies because the input may originate from the authorization
subscription or from policy information points, which are not vetted to the same degree as
the policies and variables shipped with the PDP configuration.


---

## reachable

```graph.reachable(OBJECT graph, STRING|ARRAY initial)```: Single-source BFS reachability.
Returns array of reachable node IDs in BFS discovery order. O(V + E).


---

## isReachable

```graph.isReachable(OBJECT graph, STRING|ARRAY from, STRING to)```: Single-pair reachability.
Returns true if `to` is reachable from `from`, where a node reaches itself. The search stops
as soon as the target is found. O(V + E) worst case with constant output, and constant memory
beyond the visited set. Prefer this for a ReBAC check on a large graph instead of materializing
a full transitive closure.

```sapl
graph.isReachable(rolesHierarchy, subject.role, "viewer");
```


---

## transitiveClosure

```graph.transitiveClosure(OBJECT graph)```: All-pairs transitive closure via Tarjan's SCC
+ memoized DAG closure. O(V + E + S). Traversal is iterative, so deep graphs do not
cause a stack overflow. The output size S grows with reachability and can reach
O(V^2) for densely connected graphs.

```sapl
var closed = graph.transitiveClosure(rolesHierarchy);
"viewer" in closed[(subject.role)];
```


---

## transitiveClosure

```graph.transitiveClosure(OBJECT entityGraph, STRING edgeKey)```: All-pairs transitive
closure of entity graph. Tarjan's SCC + memoized DAG closure. O(V + E + S).

```sapl
var closed = graph.transitiveClosure(roleEntities, "children");
"viewer" in closed[(subject.role)];
```


---

## transitiveClosureSet

```graph.transitiveClosureSet(OBJECT entityGraph, STRING edgeKey)```: Transitive closure of
entity graph with O(1) key lookup. Tarjan's SCC + memoized DAG closure. O(V + E + S).

```sapl
var closed = graph.transitiveClosureSet(roleEntities, "children");
closed[(subject.role)]["viewer"] != undefined;
```


---

## transitiveClosureSet

```graph.transitiveClosureSet(OBJECT graph)```: Transitive closure with O(1) key lookup.
Tarjan's SCC + memoized DAG closure. O(V + E + S).

```sapl
var closed = graph.transitiveClosureSet(rolesHierarchy);
closed[(subject.role)]["viewer"] != undefined;
```


---

## transitiveClosureProjection

```graph.transitiveClosureProjection(OBJECT entityGraph, STRING edgeKey, STRING attrKey)```:
Walks edges via Tarjan's SCC + memoized DAG closure, collects a named attribute from all
reachable nodes. Array attributes are flattened. O(V + E + S).

```sapl
var perms = graph.transitiveClosureProjection(roleEntities, "children", "permissions");
{ "action": action, "type": resource.type } in perms[(subject.role)];
```


---

## reachable_paths

```graph.reachable_paths(OBJECT graph, STRING|ARRAY initial)```: Single-source shortest
paths via BFS. O(V + E). Returns array of paths (each an array of node IDs).


---

