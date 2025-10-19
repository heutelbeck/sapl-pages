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

This library provides GraphQL query parsing and analysis capabilities for use in
authorization policies. It enables inspection of GraphQL queries to make informed
authorization decisions based on query structure, complexity, and content.

## Overview

The library parses GraphQL queries and extracts security-relevant metrics for use in
policy decisions. All analysis is performed in a single pass during parsing, and
results are returned as an object with properties for direct access.

### Basic Usage

```
var gql = graphql.parse(resource.query, resource."schema");

// Access properties directly
gql.valid                   // boolean - query validity
gql.fields                  // array - all field names
gql.depth                   // integer - maximum nesting depth
gql.operation               // string - operation type
gql.types                   // array - GraphQL types accessed
gql.directives              // array - directive details
gql.fragments               // object - fragment definitions
gql.ast                     // object - complete raw AST
```

### Authorization Subscription Structure

A typical authorization subscription for GraphQL authorization may look like this:

```
{
  "subject": {
    "username": "alice",
    "role": "user"
  },
  "action": "execute",
  "resource": {
    "query": "query { user(id: \"123\") { ssn } }",
    "schema": "type Query { user(id: ID!): User ... }"
  }
}
```

The GraphQL query is the resource being accessed, and the action is typically "execute".
The following documentation assumes a subscription in this format. But of course, this is
only an example and can be combined with other approaches based on the application domain.

### Design Approach

The library follows an "attributes first" design where all metrics are available as
properties rather than requiring separate function calls. All analysis happens in a
single parsing pass for efficiency, and the result object provides natural property
access that works well with IDE autocomplete. The structure remains consistent
regardless of query validity, making it straightforward to combine multiple checks
in a single policy expression.

## Available Properties

The parsed query object exposes all metrics as properties for convenient access in
policy expressions. Each property is pre-calculated during parsing and provides
specific information about the query structure, validation status, or potential
security concerns.

### Basic Query Information

- `valid` (boolean) - Indicates whether the query is syntactically correct and valid
  against the provided schema. Calculated by running the GraphQL validator. Use this
  to ensure queries are well-formed before making authorization decisions based on
  other metrics.

- `operation` (string) - The GraphQL operation type. Returns "query", "mutation",
  "subscription", or "unknown". Extracted from the operation definition. Essential for
  applying different authorization rules to read versus write operations.

- `operationName` (string) - The name specified in the operation definition, or an
  empty string if the operation is anonymous. Extracted directly from the parsed AST.
  Useful for logging and audit trails.

- `errors` (array of strings) - Validation error messages describing why a query is
  invalid. Only present when `valid` is false. Contains human-readable descriptions of
  schema violations to help diagnose rejected queries.

### Field Analysis

- `fields` (array of strings) - A flat list of all field names requested anywhere in
  the query, including nested fields. Extracted by recursively traversing the selection
  set. Used for field-level access control to deny access to sensitive fields like
  personally identifiable information.

- `fieldCount` (integer) - The total number of fields requested in the query. Counted
  during field extraction. A high field count may indicate an overly broad query that
  could impact performance.

- `depth` (integer) - The maximum nesting depth of field selections in the query.
  Calculated by recursively measuring selection set depth, capped at 100. Deep queries
  can lead to performance issues and are often used in denial-of-service attacks.

- `isIntrospection` (boolean) - Indicates whether the query requests schema metadata
  through introspection fields (those starting with `__`). Detected by checking for
  the introspection prefix in field names. Introspection queries can reveal API
  structure to attackers.

### Type Information

- `types` (array of strings) - GraphQL type names that are explicitly accessed in the
  query through inline fragments and fragment spreads. Extracted from type conditions.
  Use this for type-based access control to restrict access to sensitive types.

### Directive Information

- `directives` (array of objects) - All directives used in the query with their
  arguments. Each object contains `name` (string) and `arguments` (object). Extracted
  by traversing all fields and selections. Use this to restrict specific custom
  directives or validate directive arguments.

### Fragment Information

- `fragments` (object) - Fragment definitions mapping fragment names to their content.
  Each key is a fragment name, and the value is an object containing `typeName` (the
  type condition) and `fields` (array of field names in the fragment). Use this to
  analyze fragment content for security concerns.

### Complexity Metrics

- `complexity` (integer) - A basic complexity score calculated as `fieldCount + (depth × 2)`.
  Provides a simple heuristic for query cost. Higher scores indicate queries that may
  consume more resources. This metric treats all fields equally.

- `graphql.complexity(parsed, weights)` (function returning integer) - Calculates
  weighted complexity by assigning custom costs to specific fields. Pass a weights
  object mapping field names to integer costs. Fields not in the weights object default
  to cost 1. Use this when different fields have significantly different resource costs
  (e.g., database joins, external API calls).

### Security Analysis

- `aliasCount` (integer) - The number of fields using aliases at the root level.
  Counted by checking for alias definitions in root selections. High alias counts can
  indicate query batching attacks where multiple requests are bundled into one to
  bypass rate limits.

- `rootFieldCount` (integer) - The number of fields at the root level of the query.
  Counted directly from the operation's selection set. Combined with alias count to
  detect batching patterns.

- `batchingScore` (integer) - A heuristic score for detecting batching attacks,
  calculated as `(aliasCount × 5) + rootFieldCount`. Higher scores suggest potential
  abuse. The multiplier weights aliases more heavily as they are the primary batching
  mechanism.

- `maxPaginationLimit` (integer) - The largest value found in pagination arguments
  (`first`, `last`, `limit`, `offset`, `skip`, `take`). Extracted by scanning all
  field arguments. Large pagination limits can cause servers to return excessive
  amounts of data.

- `fragmentCount` (integer) - The number of fragment definitions in the query. Counted
  by examining document definitions. While fragments are useful for query organization,
  excessive fragments may indicate unnecessarily complex queries.

- `hasCircularFragments` (boolean) - Indicates whether any fragments reference each
  other in a cycle. Detected using depth-first search with cycle detection. Circular
  fragments can create infinite loops during query execution.

- `directiveCount` (integer) - The total number of directives used across all fields.
  Counted by traversing the query and summing directive usage. Excessive directives can
  increase processing overhead.

- `directivesPerField` (number) - The average number of directives per field,
  calculated as `directiveCount / fieldCount`. Returns 0 if there are no fields.
  A high ratio suggests potential directive abuse.

### Detailed Information

- `arguments` (object) - Field arguments organized by field name. Each key is a field
  name mapping to an object of argument name-value pairs. Extracted during field
  traversal. Use this to validate specific argument values or ranges.

- `variables` (object) - Query variable definitions with their default values. Only
  includes variables that have default values specified. Extracted from variable
  definitions in the operation. Useful for validating query parameterization.

- `selectionSet` (array) - The complete AST structure of the query represented as
  nested JSON objects. Each object contains `Name`, `Alias`, `Args`, and `SelectionSet`
  properties. Provides low-level access to the query structure for advanced analysis.

- `ast` (object) - The complete raw Abstract Syntax Tree representation of the parsed
  GraphQL document. This provides full access to all AST nodes and their properties
  for advanced custom analysis not covered by the pre-calculated metrics.

## Common Authorization Patterns

### Pattern 1: Field-Level Access Control

Restricting access to specific fields based on user attributes.

```
policy "protect-sensitive-fields"
deny action == "execute"
where
  var gql = graphql.parse(resource.query, resource."schema");
  "ssn" in gql.fields && subject.role != "admin";
```

### Pattern 2: Query Complexity Limits

Preventing resource-intensive queries from overloading the system.

```
policy "limit-query-complexity"
deny action == "execute"
where
  var gql = graphql.parse(resource.query, resource."schema");
  gql.depth > 5 || gql.fieldCount > 100;
```

### Pattern 3: Weighted Complexity

Assigning different costs to fields based on their resource requirements.

```
policy "weighted-complexity"
deny action == "execute"
where
  var gql = graphql.parse(resource.query, resource."schema");
  var weights = {"posts": 5, "comments": 3, "users": 2};
  graphql.complexity(gql, weights) > 200;
```

### Pattern 4: Operation Type Restrictions

Applying different rules based on whether the operation reads or writes data.

```
policy "restrict-mutations"
deny action == "execute"
where
  var gql = graphql.parse(resource.query, resource."schema");
  gql.operation == "mutation" && !(subject.role in ["editor", "admin"]);
```

### Pattern 5: Type-Based Access Control

Restricting access to specific GraphQL types.

```
policy "restrict-internal-types"
deny action == "execute"
where
  var gql = graphql.parse(resource.query, resource."schema");
  "InternalUser" in gql.types && subject.clearanceLevel < 3;
```

### Pattern 6: Custom Directive Restrictions

Blocking queries that use specific custom directives.

```
policy "restrict-admin-directive"
deny action == "execute"
where
  var gql = graphql.parse(resource.query, resource."schema");
  gql.directives.[*].name contains "@admin" && subject.role != "admin";
```

### Pattern 7: Fragment Content Validation

Checking fields within specific fragments.

```
policy "validate-fragment-content"
deny action == "execute"
where
  var gql = graphql.parse(resource.query, resource."schema");
  "ssn" in gql.fragments.UserDetails.fields && subject.role != "admin";
```

## Security Use Cases

The following examples demonstrate how the library can be used to address common
GraphQL security concerns. Each example shows a potential attack pattern and how
to construct policies to mitigate it.

### Use Case 1: Sensitive Field Protection

**Scenario**: Preventing unauthorized access to fields containing personally identifiable
information or other sensitive data.

**Example Query**:
```graphql
query {
  user(id: "123") {
    name
    email
    ssn
    creditCard
  }
}
```

**Policy**:
```
policy "sensitive-fields"
deny action == "execute"
where
  var gql = graphql.parse(resource.query, resource."schema");
  ("ssn" in gql.fields || "creditCard" in gql.fields) && subject.clearanceLevel < 3;
```

### Use Case 2: Resource Exhaustion Prevention

**Scenario**: Queries with excessive depth or field counts can cause database overload
and slow response times.

**Example Query**:
```graphql
query {
  users {
    posts {
      comments {
        author {
          posts {
            comments {
              author { ... }
            }
          }
        }
      }
    }
  }
}
```

**Policy**:
```
policy "prevent-deep-queries"
deny action == "execute"
where
  var gql = graphql.parse(resource.query, resource."schema");
  gql.depth > 5 || gql.fieldCount > 100;
```

### Use Case 3: Schema Introspection Control

**Scenario**: Introspection queries reveal API structure which can aid attackers in
discovering vulnerabilities.

**Example Query**:
```graphql
query {
  __schema {
    types {
      name
      fields {
        name
      }
    }
  }
}
```

**Policy**:
```
policy "restrict-introspection"
deny action == "execute"
where
  var gql = graphql.parse(resource.query, resource."schema");
  gql.isIntrospection && environment.stage == "production";
```

### Use Case 4: Batching Attack Detection

**Scenario**: Using aliases to send many queries in a single request can bypass rate
limits and enable data enumeration.

**Example Query**:
```graphql
query {
  user1: user(id: "1") { ssn }
  user2: user(id: "2") { ssn }
  user3: user(id: "3") { ssn }
}
```

**Policy**:
```
policy "detect-batching"
deny action == "execute"
where
  var gql = graphql.parse(resource.query, resource."schema");
  gql.aliasCount > 10 || gql.batchingScore > 50;
```

### Use Case 5: Pagination Limit Enforcement

**Scenario**: Large pagination arguments can cause the server to return excessive data.

**Example Query**:
```graphql
query {
  users(first: 999999) {
    posts(first: 999999) {
      id
    }
  }
}
```

**Policy**:
```
policy "limit-pagination"
deny action == "execute"
where
  var gql = graphql.parse(resource.query, resource."schema");
  gql.maxPaginationLimit > 100;
```

### Use Case 6: Circular Fragment Detection

**Scenario**: Fragments that reference each other can create infinite loops.

**Example Query**:
```graphql
fragment UserInfo on User {
  posts { ...PostInfo }
}

fragment PostInfo on Post {
  author { ...UserInfo }
}

query { user(id: "1") { ...UserInfo } }
```

**Policy**:
```
policy "reject-circular-fragments"
deny action == "execute"
where
  var gql = graphql.parse(resource.query, resource."schema");
  gql.hasCircularFragments;
```

### Use Case 7: Directive Abuse Prevention

**Scenario**: Excessive directive usage can increase processing overhead.

**Example Query**:
```graphql
query {
  user(id: "1")
    @include(if: true)
    @include(if: true)
  {
    name
  }
}
```

**Policy**:
```
policy "limit-directives"
deny action == "execute"
where
  var gql = graphql.parse(resource.query, resource."schema");
  gql.directiveCount > 50 || gql.directivesPerField > 5;
```

### Use Case 8: Argument Validation

**Scenario**: Field arguments may contain invalid or malicious values.

**Example Query**:
```graphql
query {
  users(limit: -1, filter: "admin=true OR 1=1") {
    id
  }
}
```

**Policy**:
```
policy "validate-arguments"
deny action == "execute"
where
  var gql = graphql.parse(resource.query, resource."schema");
  gql.arguments.users.limit != null && gql.arguments.users.limit < 0;
```

### Use Case 9: Operation Type-Based Authorization

**Scenario**: Mutations modify data and typically require higher privileges than queries.

**Example Query**:
```graphql
mutation {
  deleteUser(id: "123") {
    id
  }
}
```

**Policy**:
```
policy "restrict-mutations"
deny action == "execute"
where
  var gql = graphql.parse(resource.query, resource."schema");
  gql.operation == "mutation" && !(subject.role in ["editor", "admin"]);
```

### Use Case 10: Subscription Control

**Scenario**: Real-time subscriptions consume server resources and may have different
authorization requirements.

**Example Query**:
```graphql
subscription {
  messageAdded {
    id
    content
  }
}
```

**Policy**:
```
policy "limit-subscriptions"
deny action == "execute"
where
  var gql = graphql.parse(resource.query, resource."schema");
  gql.operation == "subscription" && subject.tier != "premium";
```

### Use Case 11: Multi-Constraint Policies

**Scenario**: Combining multiple security checks in a comprehensive policy.

**Example Query**:
```graphql
query {
  user1: user(id: "1") {
    posts(first: 9999) {
      comments {
        author {
          posts {
            ssn
          }
        }
      }
    }
  }
  user2: user(id: "2") { ... }
}
```

**Policy**:
```
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
  gql.directiveCount <= 50 &&
  !gql.isIntrospection &&
  !("ssn" in gql.fields);
```

### Use Case 12: Tier-Based Complexity Budgets

**Scenario**: Different user tiers may have different resource allocation limits.

**Policy**:
```
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

## Additional Notes

### Performance Considerations

The library performs all analysis during the initial parse operation. For optimal
performance, parse the query once and reuse the result object throughout the policy
evaluation rather than calling `parse()` multiple times.

### Error Handling

When a query cannot be parsed or validated, the library returns an error Val or sets
`valid` to false with error details in the `errors` array. Policies should check the
`valid` property before relying on other metrics.

### Schema Requirements

The parse function requires a GraphQL schema definition. This should be the same schema
that the GraphQL server uses to execute queries. Schema validation ensures that field
names, types, and structure are checked against the API contract.


---

## graphql.parse(Text query, Text schema)

```
graphql.parse(TEXT query, TEXT schema) -> OBJECT
```

Parses a GraphQL query and validates it against a schema, returning
comprehensive security analysis.

All security metrics are pre-calculated and available as properties:

Basic Properties:
- `gql.valid`, `gql.operation`, `gql.fields`, `gql.depth`, `gql.fieldCount`,
  `gql.complexity`, `gql.isIntrospection`

Type and Directive Information:
- `gql.types`, `gql.directives`, `gql.fragments`

Advanced Security:
- `gql.aliasCount`, `gql.rootFieldCount`, `gql.batchingScore`,
  `gql.maxPaginationLimit`, `gql.arguments`, `gql.fragmentCount`,
  `gql.hasCircularFragments`, `gql.directiveCount`, `gql.directivesPerField`

Raw AST Access:
- `gql.ast`

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

Parses a GraphQL query without schema validation, returning comprehensive
security analysis based on syntax only.

The valid property indicates syntactic correctness only, not schema compliance.
All other security metrics are pre-calculated and available as properties.

Basic Properties:
- `gql.valid`, `gql.operation`, `gql.fields`, `gql.depth`, `gql.fieldCount`,
  `gql.complexity`, `gql.isIntrospection`

Type and Directive Information:
- `gql.types`, `gql.directives`, `gql.fragments`

Advanced Security:
- `gql.aliasCount`, `gql.rootFieldCount`, `gql.batchingScore`,
  `gql.maxPaginationLimit`, `gql.arguments`, `gql.fragmentCount`,
  `gql.hasCircularFragments`, `gql.directiveCount`, `gql.directivesPerField`

Raw AST Access:
- `gql.ast`

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

