---
layout: default
title: filter
parent: Functions
nav_order: 107
---
# filter

Essential functions for content filtering.



---

## filter.replace(original, replacement)

```replace(originalValue, replacementValue)```:
The function will map the ```originalValue``` to the replacement value.
If the original value is an error, it will not be replaced and it bubbles up the evaluation chain.
If the original value is ```undefined``` it will be replaced with the ```replacementValue```.

**Example:**

Given a subscription:
```
{
  "resource" : {
                 "array" : [ null, true ],
                 "key1"  : "abcde"
               }
}
```

And the policy:
```
policy "test"
permit
transform resource |- {
                        @.array[1] : filter.replace("***"),
                        @.key1     : filter.replace(null)
                      }
```

The decision will contain a ```resource``` as follows:
```
{
  "array" : [ null, "***" ],
  "key1"  : null
}
```


---

## filter.blacken(parameters...)

```blacken(TEXT original[, INTEGER>0 discloseLeft][, INTEGER>0 discloseRight][, TEXT replacement][, INTEGER>0 length])```:
This function can be used to partially blacken text in data.
The function requires that ```discloseLeft```, ```discloseRight```, and ```length``` are in integers > 0.
Also, ```original``` and ```replacement``` must be text strings.
The function replaces each character in ```original``` by ```replacement```, while leaving ```discloseLeft```
characters from the beginning and ```discloseRight``` characters from the end unchanged.
If ```length``` is provided, the number of characters replaced is set to ```length```, e.g., for
ensuring, that string length does not leak any information.
If ```length``` is not provided it will just replace all characters that are not disclosed.
Except for ```original```, all parameters are optional.

**Defaults**:

```discloseLeft``` defaults to ```0```, ```discloseRight``` defaults to ```0```
and ```replacement``` defaults to ```"X"```.
The function returns the modified ```original```.

**Example:**

Given a subscription:
```
{
  "resource" : {
                 "array" : [ null, true ],
                 "key1"  : "abcde"
               }
}
```

And the policy:
```
policy "test"
permit
transform resource |- {
                        @.key1 : filter.blacken(1)
                      }
```

The decision will contain a ```resource``` as follows:
```
{
  "array" : [ null, true ],
  "key1"  : "aXXXX"
}
```


---

## filter.remove(original)

```remove(value)```: This function maps any ```value``` to ```undefined```.
In filters, ```undefined``` elements of arrays and objects will be silently removed.

**Example:**

The expression ```[ 0, 1, 2, 3, 4, 5 ] |- { @[-2:] : filter.remove }``` results in ```[0, 1, 2, 3]```.

Given a subscription:
```
{
  "resource" : {
                 "array" : [ null, true ],
                 "key1"  : "abcde"
               }
}
```

And the policy:
```
policy "test"
permit
transform resource |- {
                        @.key1 : filter.remove
                      }
```

The decision will contain a ```resource``` as follows:
```
{
  "array" : [ null, true ]
}
```


---

