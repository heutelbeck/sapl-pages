---
title: reflect
parent: Functions
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
policy "example"
permit
where
  reflect.isNull(null);              // true
  reflect.isNull(undefined);         // false
  reflect.isNull(0);                 // false
  reflect.isNull("");                // false
```


---

## reflect.isEmpty(value)

```reflect.isEmpty(ANY value)```: Returns ```true``` if the value is an empty array or empty object,
```false``` otherwise. For non-container types, returns ```false```.

**Example:**
```sapl
policy "example"
permit
where
  reflect.isEmpty([]);               // true
  reflect.isEmpty({});               // true
  reflect.isEmpty([1, 2]);           // false
  reflect.isEmpty({"a": 1});         // false
  reflect.isEmpty(null);             // true
  reflect.isEmpty("");               // true
```


---

## reflect.isFloat(value)

```reflect.isFloat(ANY value)```: Returns ```true``` if the value is a floating-point number with a fractional part,
```false``` otherwise. Integral numbers like ```5``` or ```5.0``` return ```false```.

**Example:**
```sapl
policy "example"
permit
where
  reflect.isFloat(3.14);             // true
  reflect.isFloat(0.5);              // true
  reflect.isFloat(5.0);              // true
  reflect.isFloat(42);               // false
```


---

## reflect.isError(value)

```reflect.isError(ANY value)```: Returns ```true``` if the value represents an error, ```false``` otherwise.

**Example:**
```sapl
policy "example"
permit
where
  var result = 10 / 0;  // Produces an error
  reflect.isError(result);           // true
  reflect.isError(42);               // false
  reflect.isError(undefined);        // false
```


---

## reflect.isBoolean(value)

```reflect.isBoolean(ANY value)```: Returns ```true``` if the value is a boolean (```true``` or ```false```),
```false``` otherwise.

**Example:**
```sapl
policy "example"
permit
where
  reflect.isBoolean(true);           // true
  reflect.isBoolean(false);          // true
  reflect.isBoolean(1);              // false
  reflect.isBoolean("true");         // false
```


---

## reflect.isUndefined(value)

```reflect.isUndefined(ANY value)```: Returns ```true``` if the value is ```undefined```, ```false``` otherwise.
This is distinct from ```null``` or an error.

**Example:**
```sapl
policy "example"
permit
where
  reflect.isUndefined(undefined);    // true
  reflect.isUndefined(null);         // false
  reflect.isUndefined(0);            // false
```


---

## reflect.isSecret(value)

```reflect.isSecret(ANY value)```: Returns ```true``` if the value is marked as secret, ```false``` otherwise.
Secret values are redacted in traces and logs for security purposes.

**Example:**
```sapl
policy "example"
permit
where
  reflect.isSecret(secretData);      // true if marked as secret in the variables. Only in EE Server.
  reflect.isSecret("public data");   // false
```


---

## reflect.typeOf(value)

```reflect.typeOf(ANY value)```: Returns a text string describing the type of the value.
Possible return values are: ```"ARRAY"```, ```"OBJECT"```, ```"STRING"```, ```"NUMBER"```,
```"BOOLEAN"```, ```"NULL"```, ```"undefined"```, or ```"ERROR"```.

**Example:**
```sapl
policy "example"
permit
where
  reflect.typeOf([1, 2, 3]) == "ARRAY";
  reflect.typeOf({"key": "val"}) == "OBJECT";
  reflect.typeOf("hello") == "STRING";
  reflect.typeOf(42) == "NUMBER";
  reflect.typeOf(true) == "BOOLEAN";
  reflect.typeOf(null) == "NULL";
  reflect.typeOf(undefined) == "undefined";
```


---

## reflect.isInteger(value)

```reflect.isInteger(ANY value)```: Returns ```true``` if the value is an integer number (no fractional part),
```false``` otherwise. Numbers like ```5.0``` are considered integers as they are mathematically equivalent to ```5```.

**Example:**
```sapl
policy "example"
permit
where
  reflect.isInteger(42);             // true
  reflect.isInteger(5.0);            // false
  reflect.isInteger(3.14);           // false
  reflect.isInteger("5");            // false
```


---

## reflect.isDefined(value)

```reflect.isDefined(ANY value)```: Returns ```true``` if the value is defined (not ```undefined``` and not an error),
```false``` otherwise. ```null``` is considered defined.

**Example:**
```sapl
policy "example"
permit
where
  reflect.isDefined(42);             // true
  reflect.isDefined(null);           // true
  reflect.isDefined(undefined);      // false
```


---

## reflect.isObject(value)

```reflect.isObject(ANY value)```: Returns ```true``` if the value is a JSON object, ```false``` otherwise.

**Example:**
```sapl
policy "example"
permit
where
  reflect.isObject({"key": "val"});  // true
  reflect.isObject({});              // true
  reflect.isObject([1, 2, 3]);       // false
  reflect.isObject(null);            // false
```


---

## reflect.isText(value)

```reflect.isText(ANY value)```: Returns ```true``` if the value is a text string, ```false``` otherwise.

**Example:**
```sapl
policy "example"
permit
where
  reflect.isText("hello");           // true
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
policy "example"
permit
where
  reflect.isNumber(42);              // true
  reflect.isNumber(3.14);            // true
  reflect.isNumber(5.0);             // true
  reflect.isNumber("123");           // false
```


---

## reflect.isArray(value)

```reflect.isArray(ANY value)```: Returns ```true``` if the value is a JSON array, ```false``` otherwise.

**Example:**
```sapl
policy "example"
permit
where
  reflect.isArray([1, 2, 3]);        // true
  reflect.isArray([]);               // true
  reflect.isArray({"key": "val"});   // false
  reflect.isArray(undefined);        // false
```


---

