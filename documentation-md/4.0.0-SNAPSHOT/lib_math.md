---
layout: default
title: math
parent: Functions
grand_parent: SAPL Reference
nav_order: 115
---
# math

A collection of mathematical functions for scalar operations.

# Math Function Library

This library provides standard mathematical functions for numeric operations in policies.
Functions include basic arithmetic operations (min, max, abs), rounding (ceil, floor, round),
exponentiation and roots (pow, sqrt), logarithms (log, log10, logb), clamping, sign determination,
random number generation, and mathematical constants (pi, e).

All functions operate on JSON numbers and return numeric results or error values for invalid inputs.


---

## abs

```abs(NUMBER value)```: Returns the absolute value of a number.

**Example:**
```sapl
policy "example"
permit
  math.abs(-5) == 5;
  math.abs(3.7) == 3.7;
  math.abs(0) == 0;
```


---

## sqrt

```sqrt(NUMBER value)```: Returns the square root of a number. Returns an error if the value is negative.

**Example:**
```sapl
policy "example"
permit
  math.sqrt(16) == 4.0;
  math.sqrt(2) == 1.4142135623730951;
  math.sqrt(0) == 0.0;
```


---

## log

```log(NUMBER value)```: Returns the natural logarithm (base e) of a number. Returns an error if the value
is not positive.

**Example:**
```sapl
policy "example"
permit
  math.log(math.e()) == 1.0;
  math.log(1) == 0.0;
  math.log(10) == 2.302585092994046;
```


---

## log10

```log10(NUMBER value)```: Returns the base-10 logarithm of a number. Returns an error if the value is not positive.

**Example:**
```sapl
policy "example"
permit
  math.log10(100) == 2.0;
  math.log10(1000) == 3.0;
  math.log10(1) == 0.0;
```


---

## pow

```pow(NUMBER base, NUMBER exponent)```: Returns the value of the base raised to the power of the exponent.

**Example:**
```sapl
policy "example"
permit
  math.pow(2, 3) == 8.0;
  math.pow(5, 2) == 25.0;
  math.pow(2, -1) == 0.5;
  math.pow(4, 0.5) == 2.0;  // square root
```


---

## min

```min(NUMBER a, NUMBER b)```: Returns the smaller of two numbers.

**Example:**
```sapl
policy "example"
permit
  math.min(5, 3) == 3;
  math.min(-10, -5) == -10;
  math.min(2.5, 2.7) == 2.5;
```


---

## max

```max(NUMBER a, NUMBER b)```: Returns the larger of two numbers.

**Example:**
```sapl
policy "example"
permit
  math.max(5, 3) == 5;
  math.max(-10, -5) == -5;
  math.max(2.5, 2.7) == 2.7;
```


---

## floor

```floor(NUMBER value)```: Returns the largest integer less than or equal to the value (rounds down).

**Example:**
```sapl
policy "example"
permit
  math.floor(3.2) == 3.0;
  math.floor(3.8) == 3.0;
  math.floor(-3.2) == -4.0;
  math.floor(5.0) == 5.0;
```


---

## ceil

```ceil(NUMBER value)```: Returns the smallest integer greater than or equal to the value (rounds up).

**Example:**
```sapl
policy "example"
permit
  math.ceil(3.2) == 4.0;
  math.ceil(3.8) == 4.0;
  math.ceil(-3.2) == -3.0;
  math.ceil(5.0) == 5.0;
```


---

## round

```round(NUMBER value)```: Returns the value rounded to the nearest integer. Values exactly halfway between
two integers are rounded up (towards positive infinity).

**Example:**
```sapl
policy "example"
permit
  math.round(3.2) == 3.0;
  math.round(3.8) == 4.0;
  math.round(3.5) == 4.0;
  math.round(-3.5) == -3.0;
```


---

## e

```e()```: Returns the mathematical constant e (Euler's number), the base of natural logarithms.
Value is approximately 2.718281828459045.

**Example:**
```sapl
policy "example"
permit
  var exponentialGrowth = math.pow(math.e(), rate * time);
```


---

## clamp

```clamp(NUMBER value, NUMBER minimum, NUMBER maximum)```: Constrains a value to lie within a specified range.
If the value is less than the minimum, returns the minimum. If the value is greater than the maximum, returns
the maximum. Otherwise, returns the value unchanged.

**Example:**
```sapl
policy "example"
permit
  math.clamp(5, 0, 10) == 5;      // within range
  math.clamp(-5, 0, 10) == 0;     // below minimum
  math.clamp(15, 0, 10) == 10;    // above maximum
  math.clamp(10, 0, 10) == 10;    // at boundary
```


---

## sign

```sign(NUMBER value)```: Returns the sign of a number: ```-1``` for negative numbers, ```0``` for zero,
and ```1``` for positive numbers.

**Example:**
```sapl
policy "example"
permit
  math.sign(-5) == -1.0;
  math.sign(0) == 0.0;
  math.sign(3.7) == 1.0;
```


---

## pi

```pi()```: Returns the mathematical constant π (pi), the ratio of a circle's circumference to its diameter.
Value is approximately 3.141592653589793.

**Example:**
```sapl
policy "example"
permit
  var circumference = 2 * math.pi() * radius;
  var area = math.pi() * math.pow(radius, 2);
```


---

## randomInteger

```randomInteger(NUMBER bound)```: Returns a cryptographically secure random integer in the range ```[0, bound)```
(inclusive of 0, exclusive of bound). Uses ```SecureRandom``` for cryptographic strength randomness.

**Requirements:**
- ```bound``` must be a positive integer

**Example:**
```sapl
policy "example"
permit
  var diceRoll = math.randomInteger(6) + 1;       // 1-6 inclusive
  var randomPercent = math.randomInteger(101);    // 0-100 inclusive
```


---

## randomIntegerSeeded

```randomIntegerSeeded(NUMBER bound, NUMBER seed)```: Returns a seeded random integer in the range ```[0, bound)```
(inclusive of 0, exclusive of bound). The seed determines the sequence of random numbers, allowing for
reproducible results.

**Requirements:**
- ```bound``` must be a positive integer
- ```seed``` must be an integer

**Example:**
```sapl
policy "example"
permit
  math.randomIntegerSeeded(10, 42) == math.randomIntegerSeeded(10, 42);  // same seed produces same result
```


---

## randomFloat

```randomFloat()```: Returns a cryptographically secure random floating-point number in the range ```[0.0, 1.0)```
(inclusive of 0.0, exclusive of 1.0). Uses ```SecureRandom``` for cryptographic strength randomness.

**Technical Note:** Despite the name ```randomFloat```, this function returns a double-precision floating-point
number (64-bit).

**Example:**
```sapl
policy "example"
permit
  var probability = math.randomFloat();           // 0.0 <= probability < 1.0
  var percentage = math.randomFloat() * 100;      // 0.0 <= percentage < 100.0
  var range = math.randomFloat() * 50 + 10;       // 10.0 <= range < 60.0
```


---

## randomFloatSeeded

```randomFloatSeeded(NUMBER seed)```: Returns a seeded random floating-point number in the range ```[0.0, 1.0)```
(inclusive of 0.0, exclusive of 1.0). The seed determines the sequence of random numbers, allowing for
reproducible results.

**Technical Note:** Despite the name ```randomFloatSeeded```, this function returns a double-precision floating-point
number (64-bit).

**Requirements:**
- ```seed``` must be an integer

**Example:**
```sapl
policy "example"
permit
  math.randomFloatSeeded(42) == math.randomFloatSeeded(42);  // same seed produces same result
```


---

## logb

```logb(NUMBER value, NUMBER base)```: Returns the logarithm of a value with an arbitrary base.
Returns an error if the value is not positive or if the base is not positive and not equal to 1.

**Example:**
```sapl
policy "example"
permit
  math.logb(8, 2) == 3.0;     // log base 2 of 8
  math.logb(27, 3) == 3.0;    // log base 3 of 27
  math.logb(100, 10) == 2.0;  // equivalent to log10(100)
```


---

