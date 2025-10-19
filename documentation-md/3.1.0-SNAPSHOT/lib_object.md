---
layout: default
title: object
parent: Functions
grand_parent: SAPL Reference
nav_order: 120
---
# object

Functions for JSON object manipulation and inspection.



---

## object.isEmpty(JsonObject object)

```object.isEmpty(OBJECT object)```: Returns ```true``` if the object is empty (has no key-value pairs),
```false``` otherwise.

**Example:**
```sapl
policy "example"
permit
where
  object.isEmpty({});                           // true
  object.isEmpty({"a": 1});                     // false
  object.isEmpty({"name": "Alice", "age": 30}); // false
```


---

## object.keys(JsonObject object)

```object.keys(OBJECT object)```: Returns an array containing all the keys of the given object as text values.
The order of keys in the returned array matches the iteration order of the object's properties.

**Example:**
```sapl
policy "example"
permit
where
  var person = {"name": "Alice", "age": 30, "city": "Berlin"};
  var keyList = object.keys(person);
  // Returns ["name", "age", "city"]

  object.keys({}) == [];  // Empty object returns empty array
```


---

## object.values(JsonObject object)

```object.values(OBJECT object)```: Returns an array containing all the values of the given object.
The order of values in the returned array matches the iteration order of the object's properties.

**Example:**
```sapl
policy "example"
permit
where
  var person = {"name": "Alice", "age": 30, "city": "Berlin"};
  var valueList = object.values(person);
  // Returns ["Alice", 30, "Berlin"]

  object.values({}) == [];  // Empty object returns empty array
```


---

## object.hasKey(JsonObject object, Text key)

```object.hasKey(OBJECT object, TEXT key)```: Returns ```true``` if the object contains the specified key,
```false``` otherwise. This function only checks for key existence, regardless of the associated value
(including ```null``` or ```undefined```).

**Alternative Approach:**
You can also check key existence using: ```object["key"] != undefined```
However, ```hasKey``` provides:
- Better readability and explicit intent
- Direct key existence check without value access
- Clearer distinction between "key missing" and "key exists with null/undefined value"

**Example:**
```sapl
policy "example"
permit
where
  var person = {"name": "Alice", "age": 30, "active": null};

  object.hasKey(person, "name");     // true
  object.hasKey(person, "age");      // true
  object.hasKey(person, "active");   // true, even though value is null
  object.hasKey(person, "email");    // false, key doesn't exist

  // Alternative approach using field access:
  person["name"] != undefined;       // true
  person["email"] != undefined;      // false
```


---

## object.size(JsonObject object)

```object.size(OBJECT object)```: Returns the number of key-value pairs (properties) in the given object.

**Example:**
```sapl
policy "example"
permit
where
  var person = {"name": "Alice", "age": 30, "city": "Berlin"};
  object.size(person) == 3;

  object.size({}) == 0;  // Empty object has size 0
```


---

