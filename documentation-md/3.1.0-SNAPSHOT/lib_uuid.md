---
title: uuid
parent: Function Libraries
nav_order: 134
---
# uuid

Utility functions for UUID handling.



---

## uuid.parse(Text uuidVal)

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
where
  var parsedUuid = uuid.parse("550e8400-e29b-41d4-a716-446655440000");
  // Returns object with leastSignificantBits, mostSignificantBits, version, variant

  var version1Uuid = uuid.parse("c232ab00-9414-11ec-b3c8-9f6bdeced846");
  // Returns object with additional timestamp, clockSequence, and node fields

  var invalidUuid = uuid.parse("not-a-uuid");
  // Returns an error
 ```


---

## uuid.seededRandom(Int seed)

```uuid.seededRandom(INT seed)```: Generates a deterministic version 4 (pseudo-random) UUID using
a seeded random number generator. Returns the UUID as a text string. This function produces
reproducible UUIDs based on the provided seed, making it suitable for testing or scenarios
requiring deterministic UUID generation.

**Attention:** This function uses a seeded random number generator and produces predictable results.
It is NOT cryptographically secure and should not be used for security-sensitive contexts.
For production use requiring true randomness, use uuid.random() instead.

**Example:**
```sapl
policy "example"
permit
where
  var testUuid = uuid.seededRandom(12345);
  // Always generates the same UUID for seed 12345

  var anotherUuid = uuid.seededRandom(67890);
  // Generates a different but deterministic UUID for seed 67890

  testUuid == uuid.seededRandom(12345);  // true, same seed produces same UUID
```


---

## uuid.random()

```uuid.random()```: Generates a cryptographically strong random version 4 UUID using a secure
random number generator. Returns the UUID as a text string. This function produces unpredictable
UUIDs suitable for production use and security-sensitive contexts.

**Example:**
```sapl
policy "example"
permit
where
  var randomUuid = uuid.random();
  // Generates a new random UUID like "a3bb189e-8bf9-3888-9912-ace4e6543002"

  var anotherUuid = uuid.random();
  // Generates a different random UUID

  randomUuid != anotherUuid;  // true, each call produces a unique UUID
```


---

