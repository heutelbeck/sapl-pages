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

## Compile-time optimization

When the graph is a PDP variable, transitive closure functions fold at compile time.


---

## reachable

```graph.reachable(OBJECT graph, STRING|ARRAY initial)```: Single-source BFS reachability.
Returns array of reachable node IDs in BFS discovery order. O(V + E).


---

## transitiveClosure

```graph.transitiveClosure(OBJECT graph)```: All-pairs transitive closure via Tarjan's SCC
+ memoized DAG closure. O(V + E + S).

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

