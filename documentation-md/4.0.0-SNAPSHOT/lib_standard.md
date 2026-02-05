---
layout: default
title: standard
parent: Functions
grand_parent: SAPL Reference
nav_order: 127
---
# standard

Essential utility functions for measuring size, converting values, and handling errors.

# Standard Functions

Essential utility functions available in every SAPL policy for common operations
like measuring collection sizes, converting values to strings, and handling errors
gracefully.

## Error Handling

Use `onErrorMap` to provide fallback values when expressions might fail:

```sapl
policy "safe division"
permit
where
    var ratio = standard.onErrorMap(resource.count / resource.total, 0);
    ratio > 0.5;
```

## Measuring Size

The `length` function works uniformly across text, arrays, and objects:

```sapl
policy "limit items"
deny
    action == "add_item" & standard.length(resource.cart) >= 100;
```


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

