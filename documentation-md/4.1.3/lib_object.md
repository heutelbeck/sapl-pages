---
layout: default
title: object
parent: Functions
nav_order: 118
---
# object

Functions for JSON object manipulation and inspection.

# Object Function Library (name: object)

This library provides basic functions for inspecting JSON objects in authorization policies.
Use these functions to extract keys and values, check object size.


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

