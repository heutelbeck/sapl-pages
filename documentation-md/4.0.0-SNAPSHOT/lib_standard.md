---
layout: default
title: standard
parent: Functions
grand_parent: SAPL Reference
nav_order: 127
---
# standard

This the standard function library for SAPL.



---

## length

```length(ARRAY|TEXT|JSON value)```: For TEXT it returns the length of the text string.
For ARRAY, it returns the number of elements in the array.
For OBJECT, it returns the number of keys in the OBJECT.
For NUMBER, BOOLEAN, or NULL, the function will return an error.

**Example:**
```sapl
policy "example"
permit
  standard.length([1, 2, 3, 4]) == 4;
  standard.length("example") == 7;
  standard.length({ "key1" : 1, "key2" : 2}) == 2;
```


---

## toString

```toString(value)```: Converts any ```value``` to a string representation.


**Example:**
```sapl
policy "example"
permit
  standard.asString([1,2,3]) == "[1,2,3]";
```


---

## onErrorMap

```onErrorMap(guardedExpression, fallbackExpression)```: If evaluation of ```guardedExpression``` results in an error,
the ```fallback``` is returned instead. Otherwise the result of ```guardedExpression``` is returned.

**Example:**
```sapl
policy "example"
permit
  standard.onErrorMap(1/0,999) == 999;
```


---

