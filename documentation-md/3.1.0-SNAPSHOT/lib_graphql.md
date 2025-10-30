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
var gql = graphql.parse(resource.query, resource."schema");

// Access properties directly
gql.valid                   // boolean - query validity
gql.fields                  // array - all field names
gql.depth                   // integer - maximum nesting depth
gql.operation               // string - operation type (query/mutation/subscription)
gql.complexity              // integer - complexity score
gql.aliasCount              // integer - aliased field count
gql.maxPaginationLimit      // integer - highest pagination limit
```

## Authorization Subscription

Typical subscription structure for GraphQL authorization:

```json
{
  "subject": {
    "username": "alice",
    "role": "user"
  },
  "action": "execute",
  "resource": {
    "query": "query { user(id: \"123\") { name email ssn } }",
    "schema": "type Query { user(id: ID!): User } type User { name: String! email: String! ssn: String! }"
  }
}
```

Policy examples below assume this structure with `resource.query` and `resource."schema"`.

## Properties

### Query Validation

- `valid` (boolean) - Query is syntactically correct and valid against schema.
- `errors` (array) - Validation error messages if invalid.
- `operation` (string) - Operation type: "query", "mutation", "subscription", or "unknown".
- `operationName` (string) - Operation name or empty string if anonymous.

### Field Analysis

- `fields` (array) - All field names in the query including nested fields.
- `fieldCount` (integer) - Total number of fields requested.
- `depth` (integer) - Maximum nesting depth (capped at 100).
- `isIntrospection` (boolean) - Query uses introspection fields (prefix `__`).

### Type and Fragment Information

- `types` (array) - GraphQL type names accessed via inline fragments and fragment spreads.
- `fragments` (object) - Fragment definitions with `typeName` and `fields` properties.
- `fragmentCount` (integer) - Number of fragment definitions.
- `hasCircularFragments` (boolean) - Fragments contain circular references.

### Directives

- `directives` (array) - Directive usages with `name` and `arguments` properties.
- `directiveCount` (integer) - Total directive usage count.
- `directivesPerField` (number) - Average directives per field.

### Complexity and Security Metrics

- `complexity` (integer) - Basic score: `fieldCount + (depth × 2)`.
- `aliasCount` (integer) - Number of aliased fields.
- `rootFieldCount` (integer) - Fields at root level.
- `batchingScore` (integer) - Calculated as `(aliasCount × 5) + rootFieldCount`.
- `maxPaginationLimit` (integer) - Highest pagination argument value across first, last, limit, offset, skip, take.

### Arguments and Variables

- `arguments` (object) - Field arguments mapped by field name.
- `variables` (object) - Variable definitions with default values.

## Functions

### parse

```
graphql.parse(TEXT query, TEXT schema) -> OBJECT
```

Parses and validates a GraphQL query against a schema. Returns object with all security metrics.

**Parameters:**
- `query` - GraphQL query string
- `schema` - GraphQL schema definition (SDL)

**Returns:** Object with all properties listed above.

**Example:**
```sapl
policy "validate-graphql-query"
permit action == "execute"
where
  var gql = graphql.parse(resource.query, resource."schema");
  gql.valid && gql.depth <= 5 && !("ssn" in gql.fields);
```

### parseQuery

```
graphql.parseQuery(TEXT query) -> OBJECT
```

Parses a GraphQL query without schema validation. Returns same metrics as `parse()` but `valid` only checks syntax.

**Parameters:**
- `query` - GraphQL query string

**Example:**
```sapl
policy "check-query-structure"
permit action == "execute"
where
  var gql = graphql.parseQuery(resource.query);
  gql.depth <= 5 && gql.aliasCount <= 10;
```

### complexity

```
graphql.complexity(OBJECT parsed, OBJECT fieldWeights) -> NUMBER
```

Calculates weighted complexity using custom field weights. Unweighted fields default to 1.

**Parameters:**
- `parsed` - Parsed query object from `parse()` or `parseQuery()`
- `fieldWeights` - Object mapping field names to numeric weights

**Example:**
```sapl
policy "enforce-complexity-limit"
permit action == "execute"
where
  var gql = graphql.parse(resource.query, resource."schema");
  var weights = {"posts": 5, "comments": 3, "user": 1};
  graphql.complexity(gql, weights) <= 200;
```

### parseSchema

```
graphql.parseSchema(TEXT schema) -> OBJECT
```

Parses and validates a GraphQL schema definition.

**Parameters:**
- `schema` - GraphQL schema definition (SDL)

**Returns:** Object with `valid` (boolean), `ast` (object), and `errors` (array) properties.

**Example:**
```sapl
policy "require-valid-schema"
permit action == "configure"
where
  var schemaResult = graphql.parseSchema(resource."schema");
  schemaResult.valid;
```

## Use Cases

### Field-Level Access Control

Deny access to sensitive PII fields:

```sapl
policy "restrict-pii-fields"
deny action == "execute"
where
  var gql = graphql.parse(resource.query, resource."schema");
  var piiFields = ["ssn", "creditCard", "taxId", "passport"];
  array.containsAny(gql.fields, piiFields);
```

### Depth Limiting

Prevent deeply nested queries:

```sapl
policy "limit-query-depth"
permit action == "execute"
where
  var gql = graphql.parse(resource.query, resource."schema");
  gql.valid && gql.depth <= 5;
```

### Operation Type Control

Restrict mutations to admins:

```sapl
policy "mutations-require-admin"
permit action == "execute"
where
  var gql = graphql.parse(resource.query, resource."schema");
  gql.operation != "mutation" || subject.role == "admin";
```

### Introspection Blocking

Block schema introspection in production:

```sapl
policy "block-introspection-in-production"
deny action == "execute"
where
  var gql = graphql.parse(resource.query, resource."schema");
  environment.stage == "production" && gql.isIntrospection;
```

### Complexity Limiting

Enforce complexity limits:

```sapl
policy "complexity-limits"
permit action == "execute"
where
  var gql = graphql.parse(resource.query, resource."schema");
  gql.valid && gql.complexity <= 100;
```

### Batching Attack Prevention

Detect and block alias-based batching:

```sapl
policy "prevent-batching-attacks"
deny action == "execute"
where
  var gql = graphql.parse(resource.query, resource."schema");
  gql.aliasCount > 10 || gql.batchingScore > 50;
```

### Pagination Limit Enforcement

Prevent excessive pagination:

```sapl
policy "limit-pagination"
deny action == "execute"
where
  var gql = graphql.parse(resource.query, resource."schema");
  gql.maxPaginationLimit > 100;
```

### Fragment Security

All fragment fields are included in `gql.fields`, so check that array:

```sapl
policy "check-sensitive-fields"
deny action == "execute"
where
  var gql = graphql.parse(resource.query, resource."schema");
  var sensitiveFields = ["ssn", "password"];
  array.containsAny(gql.fields, sensitiveFields);
```

To check specific fragments (note: `fragments` is an object, not array):

```sapl
policy "check-fragment-by-name"
deny action == "execute"
where
  var gql = graphql.parse(resource.query, resource."schema");
  var sensitiveFields = ["ssn", "password"];
  array.containsAny(gql.fragments.SensitiveFragment.fields, sensitiveFields);
```

### Type-Based Access Control

Restrict access to admin-only types:

```sapl
policy "admin-only-types"
deny action == "execute"
where
  var gql = graphql.parse(resource.query, resource."schema");
  var adminTypes = ["AdminUser", "SystemConfig"];
  subject.role != "admin" && array.containsAny(gql.types, adminTypes);
```

### Directive Whitelisting

Only allow specific directives:

```sapl
policy "whitelist-directives"
deny action == "execute"
where
  var gql = graphql.parse(resource.query, resource."schema");
  var allowed = ["include", "skip", "deprecated"];
  gql.directives |- var directive : !(directive.name in allowed);
```

### Comprehensive Security

Combine multiple security checks:

```sapl
policy "comprehensive-security"
permit action == "execute"
where
  var gql = graphql.parse(resource.query, resource."schema");
  gql.valid &&
  gql.depth <= 5 &&
  gql.fieldCount <= 50 &&
  gql.aliasCount <= 10 &&
  gql.maxPaginationLimit <= 100 &&
  !gql.hasCircularFragments &&
  !gql.isIntrospection &&
  !("ssn" in gql.fields);
```

### Tier-Based Complexity Budgets

Apply complexity limits by user tier:

```sapl
policy "tiered-limits"
permit action == "execute"
where
  var gql = graphql.parse(resource.query, resource."schema");
  var weights = {"posts": 5, "comments": 3, "users": 2};
  var cost = graphql.complexity(gql, weights);

  (subject.tier == "enterprise" && cost <= 1000) ||
  (subject.tier == "professional" && cost <= 200) ||
  (subject.tier == "free" && cost <= 50);
```

## Notes

**Performance:** Single-pass analysis. Parse once and reuse result object. Schema caching enabled (max 100 schemas).

**Error Handling:** Invalid queries set `valid` to false with errors in `errors` array. Check `valid` before using other metrics.

**Schema Validation:** `parse()` requires schema definition. Use `parseQuery()` for syntax-only validation.


---

## graphql.parse(Text query, Text schema)

```
graphql.parse(TEXT query, TEXT schema) -> OBJECT
```

Parses and validates a GraphQL query against a schema.

Returns comprehensive security analysis including validation, field extraction,
complexity metrics, and potential security concerns.

**Access all metrics via properties:**

Basic Information:
- `gql.valid`, `gql.operation`, `gql.operationName`, `gql.errors`

Field Analysis:
- `gql.fields`, `gql.fieldCount`, `gql.depth`, `gql.isIntrospection`,
  `gql.complexity`, `gql.isIntrospection`

Type and Directive Information:
- `gql.types`, `gql.directives`, `gql.fragments`

Advanced Security:
- `gql.aliasCount`, `gql.rootFieldCount`, `gql.batchingScore`,
  `gql.maxPaginationLimit`, `gql.arguments`, `gql.fragmentCount`,
  `gql.hasCircularFragments`, `gql.directiveCount`, `gql.directivesPerField`

**Example:**
```sapl
var gql = graphql.parse(resource.query, resource."schema");
gql.valid && gql.depth <= 5 && !("ssn" in gql.fields)
```


---

## graphql.parseSchema(Text schema)

```
graphql.parseSchema(TEXT schema) -> OBJECT
```

Parses and validates a GraphQL schema definition.

Returns an object with:
- `valid`: boolean indicating schema validity
- `ast`: the schema type definition registry as JSON
- `errors`: array of error messages if invalid

**Example:**
```sapl
var schemaResult = graphql.parseSchema(resource."schema");
schemaResult.valid
```


---

## graphql.parseQuery(Text query)

```
graphql.parseQuery(TEXT query) -> OBJECT
```

Parses a GraphQL query without schema validation.

Returns the same comprehensive metrics as `parse()` except for validation.
Use when you need query analysis but don't have the schema available.

**Access all metrics via properties:**

Basic Information:
- `gql.valid`, `gql.operation`, `gql.operationName`

Field Analysis:
- `gql.fields`, `gql.fieldCount`, `gql.depth`,
  `gql.complexity`, `gql.isIntrospection`

Type and Directive Information:
- `gql.types`, `gql.directives`, `gql.fragments`

Advanced Security:
- `gql.aliasCount`, `gql.rootFieldCount`, `gql.batchingScore`,
  `gql.maxPaginationLimit`, `gql.arguments`, `gql.fragmentCount`,
  `gql.hasCircularFragments`, `gql.directiveCount`, `gql.directivesPerField`

**Example:**
```sapl
var gql = graphql.parseQuery(resource.query);
gql.depth <= 5 && gql.aliasCount <= 10
```


---

## graphql.complexity(JsonObject parsed, JsonObject fieldWeights)

```
graphql.complexity(OBJECT parsed, OBJECT fieldWeights) -> NUMBER
```

Calculates weighted complexity with custom field weights.

**Example:**
```sapl
var gql = graphql.parse(resource.query, resource."schema");
var weights = {"posts": 5, "comments": 3, "user": 1};
graphql.complexity(gql, weights) <= 200
```


---

