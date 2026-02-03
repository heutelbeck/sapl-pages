---
layout: default
title: object
parent: Functions
grand_parent: SAPL Reference
nav_order: 119
---
# object

Functions for JSON object manipulation and inspection.

# Object Function Library (name: object)

This library provides basic functions for inspecting JSON objects in authorization policies.
Use these functions to extract keys and values, check object size, verify key existence,
and test for empty objects.


---

## size

```object.size(OBJECT object)```: Returns the number of key-value pairs in the given object.

## Parameters

- object: JSON object to measure

## Returns

- Integer representing the number of properties in the object

## Example

```sapl
policy "example"
permit
  var user = {"name": "Alice", "role": "admin", "active": true};
  object.size(user) == 3;

  object.size({}) == 0;
```


---

## values

```object.values(OBJECT object)```: Returns an array containing all the values of the given object.

## Parameters

- object: JSON object to extract values from

## Returns

- Array containing all values from the object
- Empty array for empty objects

## Example

```sapl
policy "example"
permit
  var user = {"name": "Alice", "role": "admin", "active": true};
  var data = object.values(user);
  // Returns ["Alice", "admin", true]

  object.values({}) == [];
```


---

## isEmpty

```object.isEmpty(OBJECT object)```: Returns true if the object is empty (has no key-value pairs),
false otherwise.

## Parameters

- object: JSON object to check

## Returns

- true if the object has zero properties
- false if the object has one or more properties

## Example

```sapl
policy "example"
permit
  object.isEmpty({});                          // true
  object.isEmpty({"name": "Alice"});           // false
  object.isEmpty({"a": 1, "b": 2});            // false
```


---

## keys

```object.keys(OBJECT object)```: Returns an array containing all the keys of the given object.

## Parameters

- object: JSON object to extract keys from

## Returns

- Array of strings representing all keys in the object
- Empty array for empty objects

## Example

```sapl
policy "example"
permit
  var user = {"name": "Alice", "role": "admin", "active": true};
  var fields = object.keys(user);
  // Returns ["name", "role", "active"]

  object.keys({}) == [];
```

Check for admin permissions:

```sapl
policy "check-admin-access"
permit
  var permissions = object.keys(subject.permissions);
  "admin:write" in permissions;
```


---

## hasKey

```object.hasKey(OBJECT object, TEXT key)```: Returns true if the object contains the specified key,
false otherwise. Checks for key existence regardless of the associated value.

## Parameters

- object: JSON object to search
- key: String key name to check for

## Returns

- true if the key exists in the object
- false if the key does not exist

## Alternative approach

Key existence can also be checked using: ```object["key"] != undefined```

However, hasKey provides better readability and makes intent explicit.

## Example

```sapl
policy "example"
permit
  var user = {"name": "Alice", "role": "admin", "active": null};

  object.hasKey(user, "name");    // true
  object.hasKey(user, "role");    // true
  object.hasKey(user, "active");  // true, even though value is null
  object.hasKey(user, "email");   // false
```

Check optional attributes before using them:

```sapl
policy "check-optional-field"
permit
  object.hasKey(subject, "department");
  subject.department == "sales";
```


---

