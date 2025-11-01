---
layout: default
title: reflect
parent: Functions
grand_parent: SAPL Reference
nav_order: 123
---
# reflect

Functions for runtime type inspection and reflection.



---

## reflect.isNull(value)

```reflect.isNull(ANY value)```: Returns ```true``` if the value is JSON ```null```, ```false``` otherwise.
This is distinct from ```undefined```.

**Example:**
```sapl
policy "check_optional_field"
permit
where
  var department = subject.department;
  reflect.isNull(department);        // true if explicitly set to null
  reflect.isNull(null);              // true
  reflect.isNull(undefined);         // false
  reflect.isNull("");                // false
```


---

## reflect.isEmpty(value)

```reflect.isEmpty(ANY value)```: Returns ```true``` if the value is an empty array or empty object,
```false``` otherwise. For non-container types, returns ```false```.

**Example:**
```sapl
policy "require_permissions"
permit
where
  var permissions = subject.permissions;
  !reflect.isEmpty(permissions);     // deny if no permissions
  reflect.isEmpty([]);               // true
  reflect.isEmpty({});               // true
  reflect.isEmpty(["read", "write"]); // false
```


---

## reflect.isFloat(value)

```reflect.isFloat(ANY value)```: Returns ```true``` if the value is stored as a floating-point type,
```false``` otherwise. Note that ```5.0``` is stored as floating-point and returns ```true```.

**Example:**
```sapl
policy "validate_threshold"
permit
where
  var threshold = resource.threshold;
  reflect.isFloat(threshold);        // true if threshold is a float
  reflect.isFloat(3.14);             // true
  reflect.isFloat(5.0);              // true (stored as float)
  reflect.isFloat(42);               // false
```


---

## reflect.isError(value)

```reflect.isError(ANY value)```: Returns ```true``` if the value represents an error, ```false``` otherwise.

**Example:**
```sapl
policy "handle_computation_errors"
permit
where
  var result = resource.computedValue;
  !reflect.isError(result);          // deny if computation failed
  reflect.isError(10 / 0);           // true (division by zero)
  reflect.isError(42);               // false
```


---

## reflect.isBoolean(value)

```reflect.isBoolean(ANY value)```: Returns ```true``` if the value is a boolean (```true``` or ```false```),
```false``` otherwise.

**Example:**
```sapl
policy "check_flag"
permit
where
  var isActive = subject.isActive;
  reflect.isBoolean(isActive);       // true if isActive is boolean
  reflect.isBoolean(true);           // true
  reflect.isBoolean(1);              // false
  reflect.isBoolean("true");         // false
```


---

## reflect.isUndefined(value)

```reflect.isUndefined(ANY value)```: Returns ```true``` if the value is ```undefined```, ```false``` otherwise.
This is distinct from ```null``` or an error.

**Example:**
```sapl
policy "check_missing_attribute"
permit
where
  var attribute = subject.optionalAttr;
  reflect.isUndefined(attribute);    // true if attribute not present
  reflect.isUndefined(undefined);    // true
  reflect.isUndefined(null);         // false
```


---

## reflect.isSecret(value)

```reflect.isSecret(ANY value)```: Returns ```true``` if the value is marked as secret, ```false``` otherwise.
Secret values are redacted in traces and logs for security purposes.

**Example:**
```sapl
policy "protect_sensitive_data"
permit
where
  var password = subject.credentials.password;
  reflect.isSecret(password);        // true if marked secret
  !reflect.isSecret(subject.username); // username not secret
```


---

## reflect.typeOf(value)

```reflect.typeOf(ANY value)```: Returns a text string describing the type of the value.
Possible return values are: ```"ARRAY"```, ```"OBJECT"```, ```"STRING"```, ```"NUMBER"```,
```"BOOLEAN"```, ```"NULL"```, ```"undefined"```, or ```"ERROR"```.

**Example:**
```sapl
policy "dynamic_type_handling"
permit
where
  var permissions = subject.permissions;
  reflect.typeOf(permissions) == "ARRAY";
  reflect.typeOf(subject) == "OBJECT";
  reflect.typeOf(subject.username) == "STRING";
  reflect.typeOf(subject.age) == "NUMBER";
```


---

## reflect.isInteger(value)

```reflect.isInteger(ANY value)```: Returns ```true``` if the value is stored as an integer type,
```false``` otherwise. Note that ```5.0``` is stored as a floating-point type and returns ```false```.

**Example:**
```sapl
policy "validate_user_id"
permit
where
  var userId = subject.id;
  reflect.isInteger(userId);         // true if userId is an integer
  reflect.isInteger(42);             // true
  reflect.isInteger(5.0);            // false (stored as float)
  reflect.isInteger(3.14);           // false
```


---

## reflect.isDefined(value)

```reflect.isDefined(ANY value)```: Returns ```true``` if the value is defined (not ```undefined``` and not an error),
```false``` otherwise. ```null``` is considered defined.

**Example:**
```sapl
policy "require_attribute"
permit
where
  var role = subject.role;
  reflect.isDefined(role);           // true if role exists (even if null)
  reflect.isDefined(null);           // true
  reflect.isDefined(undefined);      // false
```


---

## reflect.isObject(value)

```reflect.isObject(ANY value)```: Returns ```true``` if the value is a JSON object, ```false``` otherwise.

**Example:**
```sapl
policy "validate_user_object"
permit
where
  var user = resource.owner;
  reflect.isObject(user);              // true if user is an object
  reflect.isObject({});                // true
  reflect.isObject(["admin", "user"]); // false
  reflect.isObject(null);              // false
```


---

## reflect.isText(value)

```reflect.isText(ANY value)```: Returns ```true``` if the value is a text string, ```false``` otherwise.

**Example:**
```sapl
policy "validate_username"
permit
where
  var username = subject.username;
  reflect.isText(username);          // true if username is a string
  reflect.isText("");                // true
  reflect.isText(123);               // false
  reflect.isText(undefined);         // false
```


---

## reflect.isNumber(value)

```reflect.isNumber(ANY value)```: Returns ```true``` if the value is a number (integer or floating-point),
```false``` otherwise.

**Example:**
```sapl
policy "check_access_level"
permit
where
  var level = subject.accessLevel;
  reflect.isNumber(level);           // true if level is numeric
  reflect.isNumber(42);              // true
  reflect.isNumber(3.14);            // true
  reflect.isNumber("123");           // false
```


---

## reflect.isArray(value)

```reflect.isArray(ANY value)```: Returns ```true``` if the value is a JSON array, ```false``` otherwise.

**Example:**
```sapl
policy "check_permissions_array"
permit
where
  var permissions = subject.permissions;
  reflect.isArray(permissions);      // true if permissions is an array
  reflect.isArray([]);               // true
  reflect.isArray({"role": "admin"});// false
  reflect.isArray(undefined);        // false
```


---

