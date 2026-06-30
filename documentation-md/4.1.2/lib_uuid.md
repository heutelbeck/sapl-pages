---
layout: default
title: uuid
parent: Functions
nav_order: 131
---
# uuid

Utility functions for UUID handling.

The UUID library provides functions for parsing Universally Unique Identifiers.
Use it to inspect UUID-based resource identifiers from requests and extract their
constituent parts for use in policy conditions.


---

## parse

```uuid.parse(TEXT uuid)```: Parses a text representation of a UUID and returns an object containing
the UUID's constituent parts including the least and most significant bits, version, and variant.
For version 1 UUIDs, the object also includes timestamp, clock sequence, and node values.
Returns an error if the text is not a valid UUID string.

**Attention:** The timestamp, clockSequence, and node fields are only present for version 1 UUIDs.
Other UUID versions will only contain the leastSignificantBits, mostSignificantBits, version, and
variant fields.

**Example:**
```sapl
policy "example"
permit
  var parsedUuid = uuid.parse("550e8400-e29b-41d4-a716-446655440000");
  // Returns object with leastSignificantBits, mostSignificantBits, version, variant

  var version1Uuid = uuid.parse("c232ab00-9414-11ec-b3c8-9f6bdeced846");
  // Returns object with additional timestamp, clockSequence, and node fields

  var invalidUuid = uuid.parse("not-a-uuid");
  // Returns an error
 ```


---

