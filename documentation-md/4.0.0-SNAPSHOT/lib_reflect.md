---
layout: default
title: reflect
parent: Functions
grand_parent: SAPL Reference
nav_order: 121
---
# reflect

Functions for runtime type inspection and reflection.

# Type Reflection

Functions for runtime type inspection, enabling policies to handle dynamic
or heterogeneous data safely. Use these to validate input structure before
accessing fields or performing type-specific operations.

## Defensive Type Checking

Validate expected types before accessing nested properties:

```sapl
policy "safe metadata access"
permit
    action == "read"
where
    reflect.isObject(resource.metadata);
    reflect.isArray(resource.metadata.tags);
```

## Handling Optional Values

Distinguish between missing, null, and error states:

```sapl
policy "require defined department"
permit
where
    reflect.isDefined(subject.department);
    subject.department == "engineering";
```

## Dynamic Dispatch

Route logic based on runtime types:

```sapl
policy "type-aware validation"
permit
where
    var id = resource.id;
    reflect.isText(id) | reflect.isNumber(id);
```


---

## isEmpty

```reflect.isEmpty(ANY value)```: Returns ```true``` if the value is an empty array or empty object,
```false``` otherwise. For non-container types, returns ```false```.

**Example:**
```sapl
policy "require_permissions"
permit
  var permissions = subject.permissions;
  !reflect.isEmpty(permissions);     // deny if no permissions
  reflect.isEmpty([]);               // true
  reflect.isEmpty({});               // true
  reflect.isEmpty(["read", "write"]); // false
```


---

## isArray

```reflect.isArray(ANY value)```: Returns ```true``` if the value is a JSON array, ```false``` otherwise.

**Example:**
```sapl
policy "validate_permissions_array"
permit
  var permissions = subject.permissions;
  reflect.isArray(permissions);      // true if permissions is an array
  reflect.isArray([]);               // true (empty array)
  reflect.isArray(["read", "write"]);// true
  reflect.isArray({"role": "admin"});// false (object)
  reflect.isArray(undefined);        // false
```


---

## isDefined

```reflect.isDefined(ANY value)```: Returns ```true``` if the value is defined (not ```undefined``` and not an error),
```false``` otherwise. ```null``` is considered defined.

**Example:**
```sapl
policy "require_attribute"
permit
  var role = subject.role;
  reflect.isDefined(role);           // true if role exists (even if null)
  reflect.isDefined(null);           // true
  reflect.isDefined(undefined);      // false
```


---

## isNull

```reflect.isNull(ANY value)```: Returns ```true``` if the value is JSON ```null```, ```false``` otherwise.
This is distinct from ```undefined```.

**Example:**
```sapl
policy "check_optional_field"
permit
  var department = subject.department;
  reflect.isNull(department);        // true if explicitly set to null
  reflect.isNull(null);              // true
  reflect.isNull(undefined);         // false
  reflect.isNull("");                // false
```


---

## isError

```reflect.isError(ANY value)```: Returns ```true``` if the value represents an error, ```false``` otherwise.

**Example:**
```sapl
policy "handle_computation_errors"
permit
  var result = resource.computedValue;
  !reflect.isError(result);          // deny if computation failed
  reflect.isError(10 / 0);           // true (division by zero)
  reflect.isError(100);              // false
  reflect.isError(undefined);        // false
```


---

## isObject

```reflect.isObject(ANY value)```: Returns ```true``` if the value is a JSON object, ```false``` otherwise.

**Example:**
```sapl
policy "validate_user_object"
permit
  var user = resource.owner;
  reflect.isObject(user);              // true if user is an object
  reflect.isObject({});                // true
  reflect.isObject(["admin", "user"]); // false
  reflect.isObject(null);              // false
```


---

## isInteger

```reflect.isInteger(ANY value)```: Returns ```true``` if the value is a number with no fractional part,
```false``` otherwise. Numbers like ```1```, ```1.0```, and ```2.00``` are considered integers, while
```1.5``` and ```2.7``` are not.

**Example:**
```sapl
policy "validate_permission_mask"
permit
  var mask = subject.permissionMask;
  reflect.isInteger(mask);           // true for integer permission values
  reflect.isInteger(7);              // true
  reflect.isInteger(5.0);            // true (no fractional part)
  reflect.isInteger(2.7);            // false (has fractional part)
  reflect.isInteger("7");            // false (not a number)
```


---

## isText

```reflect.isText(ANY value)```: Returns ```true``` if the value is a text string, ```false``` otherwise.

**Example:**
```sapl
policy "validate_username"
permit
  var username = subject.username;
  reflect.isText(username);          // true if username is a string
  reflect.isText("");                // true
  reflect.isText(123);               // false
  reflect.isText(undefined);         // false
```


---

## isNumber

```reflect.isNumber(ANY value)```: Returns ```true``` if the value is a number, ```false``` otherwise.
All numbers are stored as arbitrary-precision decimals internally.

**Example:**
```sapl
policy "validate_age_threshold"
permit
  var ageLimit = resource.minimumAge;
  reflect.isNumber(ageLimit);        // true if numeric
  reflect.isNumber(18);              // true
  reflect.isNumber(99.5);            // true
  reflect.isNumber("18");            // false (text, not number)
  reflect.isNumber(null);            // false
```


---

## isBoolean

```reflect.isBoolean(ANY value)```: Returns ```true``` if the value is a boolean (```true``` or ```false```),
```false``` otherwise.

**Example:**
```sapl
policy "validate_flag"
permit
  var isActive = subject.isActive;
  reflect.isBoolean(isActive);       // true if isActive is boolean
  reflect.isBoolean(true);           // true
  reflect.isBoolean(false);          // true
  reflect.isBoolean(1);              // false
  reflect.isBoolean("true");         // false
```


---

## isUndefined

```reflect.isUndefined(ANY value)```: Returns ```true``` if the value is ```undefined```, ```false``` otherwise.
This is distinct from ```null``` or an error.

**Example:**
```sapl
policy "check_missing_attribute"
permit
  var attribute = subject.optionalAttr;
  reflect.isUndefined(attribute);    // true if attribute not present
  reflect.isUndefined(undefined);    // true
  reflect.isUndefined(null);         // false
```


---

## typeOf

```reflect.typeOf(ANY value)```: Returns a text string describing the type of the value.
Possible return values are: ```"ARRAY"```, ```"OBJECT"```, ```"STRING"```, ```"NUMBER"```,
```"BOOLEAN"```, ```"NULL"```, ```"undefined"```, or ```"ERROR"```.

**Example:**
```sapl
policy "dynamic_type_validation"
permit
  var data = resource.metadata;
  reflect.typeOf(data.tags) == "ARRAY";
  reflect.typeOf(data) == "OBJECT";
  reflect.typeOf(data.name) == "STRING";
  reflect.typeOf(data.version) == "NUMBER";
  reflect.typeOf(data.enabled) == "BOOLEAN";
```


---

