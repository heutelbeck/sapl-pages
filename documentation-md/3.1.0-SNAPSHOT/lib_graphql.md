---
layout: default
title: graphql
parent: Functions
grand_parent: SAPL Reference
nav_order: 110
---
# graphql

GraphQL query parsing and analysis for authorization policies.

# GraphQL Function Library for SAPL

Parses GraphQL queries and extracts security metrics for authorization policy decisions.

## Basic Usage

```sapl
var gql = graphql.validateQuery(resource.query, resource."schema");

// Access properties directly
gql.valid                   // boolean - query validity
gql.fields                  // array - all field names
gql.depth                   // integer - maximum nesting depth
gql.operation               // string - operation type (query/mutation/subscription)
gql.complexity              // integer - complexity score

// Security metrics
gql.security.aliasCount              // integer - aliased field count
gql.security.batchingScore           // integer - batching attack indicator
gql.security.maxPaginationLimit      // integer - highest pagination limit
gql.security.hasCircularFragments    // boolean - circular fragment detection
gql.security.isIntrospection         // boolean - introspection query
gql.security.directiveCount          // integer - directive count
gql.security.directivesPerField      // number - average directives per field

// AST details
gql.ast.operationName       // string - operation name
gql.ast.types               // array - types used
gql.ast.variables           // object - variable definitions
gql.ast.arguments           // object - field arguments
gql.ast.fragments           // object - fragment definitions
gql.ast.directives          // array - directive details
```

## Functions

### validateQuery

```
graphql.validateQuery(TEXT query, TEXT schema) -> OBJECT
```

Parses and validates a GraphQL query against a schema. Returns object with all security metrics.

**Example:**
```sapl
policy "validate-graphql-query"
permit action == "execute"
where
  var gql = graphql.validateQuery(resource.query, resource."schema");
  gql.valid && gql.depth <= 5 && !("ssn" in gql.fields);
```

### analyzeQuery

```
graphql.analyzeQuery(TEXT query) -> OBJECT
```

Parses a GraphQL query without schema validation. Returns same metrics as `validateQuery()` but `valid` only checks syntax.

**Example:**
```sapl
policy "analyze-query-structure"
permit action == "execute"
where
  var gql = graphql.analyzeQuery(resource.query);
  gql.depth <= 5 && gql.security.aliasCount <= 10;
```

### complexity

```
graphql.complexity(OBJECT parsed, OBJECT fieldWeights) -> NUMBER
```

Calculates weighted complexity using custom field weights. Unweighted fields default to 1.

**Example:**
```sapl
var gql = graphql.validateQuery(resource.query, resource."schema");
var weights = {"posts": 5, "comments": 3, "user": 1};
graphql.complexity(gql, weights) <= 200;
```

### parseSchema

```
graphql.parseSchema(TEXT schema) -> OBJECT
```

Parses and validates a GraphQL schema definition.

## Common Use Cases

### Field-Level Access Control

```sapl
policy "restrict-pii-fields"
deny action == "execute"
where
  var gql = graphql.validateQuery(resource.query, resource."schema");
  var piiFields = ["ssn", "creditCard", "taxId"];
  array.containsAny(gql.fields, piiFields);
```

### Depth and Complexity Limiting

```sapl
policy "enforce-limits"
permit action == "execute"
where
  var gql = graphql.validateQuery(resource.query, resource."schema");
  gql.valid && gql.depth <= 5 && gql.complexity <= 100;
```

### Operation Type Control

```sapl
policy "mutations-require-admin"
permit action == "execute"
where
  var gql = graphql.validateQuery(resource.query, resource."schema");
  gql.operation != "mutation" || subject.role == "admin";
```

### Batching Attack Prevention

```sapl
policy "prevent-batching"
deny action == "execute"
where
  var gql = graphql.validateQuery(resource.query, resource."schema");
  gql.security.aliasCount > 10 || gql.security.batchingScore > 50;
```

### Comprehensive Security

```sapl
policy "comprehensive-security"
permit action == "execute"
where
  var gql = graphql.validateQuery(resource.query, resource."schema");
  gql.valid &&
  gql.depth <= 5 &&
  gql.fieldCount <= 50 &&
  gql.security.aliasCount <= 10 &&
  gql.security.maxPaginationLimit <= 100 &&
  !gql.security.hasCircularFragments &&
  !gql.security.isIntrospection &&
  !("ssn" in gql.fields);
```

## Error Handling

Invalid queries set `valid` to false with errors in `errors` array. Check `valid` before using other metrics.


---

## graphql.parseSchema(Text schema)

```
graphql.parseSchema(TEXT schema) -> OBJECT
```

Parses and validates a GraphQL schema definition.

**Example:**
```sapl
var schemaResult = graphql.parseSchema(resource."schema");
schemaResult.valid;
```


---

## graphql.complexity(JsonObject parsed, JsonObject fieldWeights)

```
graphql.complexity(OBJECT parsed, OBJECT fieldWeights) -> NUMBER
```

Calculates weighted complexity with custom field weights.

**Example:**
```sapl
var gql = graphql.validateQuery(resource.query, resource."schema");
var weights = {"posts": 5, "comments": 3};
graphql.complexity(gql, weights) <= 200;
```


---

## graphql.analyzeQuery(Text query)

```
graphql.analyzeQuery(TEXT query) -> OBJECT
```

Parses a GraphQL query without schema validation. Only validates syntax.

**Example:**
```sapl
var gql = graphql.analyzeQuery(resource.query);
gql.depth <= 5 && gql.security.aliasCount <= 10;
```


---

## graphql.validateQuery(Text query, Text schema)

```
graphql.validateQuery(TEXT query, TEXT schema) -> OBJECT
```

Parses and validates a GraphQL query against a schema.

Returns comprehensive security analysis including validation, field extraction,
complexity metrics, and potential security concerns.

**Example:**
```sapl
var gql = graphql.validateQuery(resource.query, resource."schema");
gql.valid && gql.depth <= 5 && !("ssn" in gql.fields);
```


---

