---
layout: default
title: standard
parent: Functions
grand_parent: SAPL Reference
nav_order: 128
---
# standard

This the standard function library for SAPL.



---

## standard.toString(value)

```toString(value)```: Converts any ```value``` to a string representation.


**Example:**
```sapl
policy "example"
permit
where
  standard.toString([1,2,3]) == "[1,2,3]";
```


---

## standard.onErrorMap(guardedExpression, fallback)

```onErrorMap(guardedExpression, fallbackExpression)```: If evaluation of ```guardedExpression``` results in an error,
the ```fallback``` is returned instead. Otherwise the result of ```guardedExpression``` is returned.

**Example:**
```sapl
policy "example"
permit
where
  standard.onErrorMap(1/0,999) == 999;
```


---

## standard.length(Array|Text|JsonObject value)

```length(ARRAY|TEXT|JSON value)```: For TEXT it returns the length of the text string.
For ARRAY, it returns the number of elements in the array.
For OBJECT, it returns the number of keys in the OBJECT.
For NUMBER, BOOLEAN, or NULL, the function will return an error.

**Example:**
```sapl
policy "example"
permit
where
  standard.length([1, 2, 3, 4]) == 4;
  standard.length("example") == 7;
  standard.length({ "key1" : 1, "key2" : 2}) == 2;
```


---

