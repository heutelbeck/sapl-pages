---
title: math
parent: Function Libraries
nav_order: 117
---
# math

A collection of mathematical functions for scalar operations.



---

## math.sqrt(Number value)

```sqrt(NUMBER value)```: Returns the square root of a number. Returns an error if the value is negative.

**Examples:**
```sapl
policy "example"
permit
where
  math.sqrt(16) == 4.0;
  math.sqrt(2) == 1.4142135623730951;
  math.sqrt(0) == 0.0;
```


---

## math.randomFloatSeeded(Number seed)

```randomFloatSeeded(NUMBER seed)```: Returns a seeded random floating-point number in the range ```[0.0, 1.0)```
(inclusive of 0.0, exclusive of 1.0). The seed determines the sequence of random numbers, allowing for
reproducible results.

**Technical Note:** Despite the name ```randomFloatSeeded```, this function returns a double-precision floating-point
number (64-bit) to maintain consistency with JSON number representation and Java's numeric operations.

**Requirements:**
- ```seed``` must be an integer

**Examples:**
```sapl
policy "example"
permit
where
  math.randomFloatSeeded(42) == math.randomFloatSeeded(42);  // same seed produces same result
```


---

## math.logb(Number value, Number base)

```logb(NUMBER value, NUMBER base)```: Returns the logarithm of a value with an arbitrary base.
Returns an error if the value is not positive or if the base is not positive and not equal to 1.

**Examples:**
```sapl
policy "example"
permit
where
  math.logb(8, 2) == 3.0;     // log base 2 of 8
  math.logb(27, 3) == 3.0;    // log base 3 of 27
  math.logb(100, 10) == 2.0;  // equivalent to log10(100)
```


---

## math.pow(Number base, Number exponent)

```pow(NUMBER base, NUMBER exponent)```: Returns the value of the base raised to the power of the exponent.

**Examples:**
```sapl
policy "example"
permit
where
  math.pow(2, 3) == 8.0;
  math.pow(5, 2) == 25.0;
  math.pow(2, -1) == 0.5;
  math.pow(4, 0.5) == 2.0;  // square root
```


---

## math.log10(Number value)

```log10(NUMBER value)```: Returns the base-10 logarithm of a number. Returns an error if the value is not positive.

**Examples:**
```sapl
policy "example"
permit
where
  math.log10(100) == 2.0;
  math.log10(1000) == 3.0;
  math.log10(1) == 0.0;
```


---

## math.log(Number value)

```log(NUMBER value)```: Returns the natural logarithm (base e) of a number. Returns an error if the value
is not positive.

**Examples:**
```sapl
policy "example"
permit
where
  math.log(math.e()) == 1.0;
  math.log(1) == 0.0;
  math.log(10) == 2.302585092994046;
```


---

## math.floor(Number value)

```floor(NUMBER value)```: Returns the largest integer less than or equal to the value (rounds down).

**Examples:**
```sapl
policy "example"
permit
where
  math.floor(3.2) == 3.0;
  math.floor(3.8) == 3.0;
  math.floor(-3.2) == -4.0;
  math.floor(5.0) == 5.0;
```


---

## math.randomIntegerSeeded(Number bound, Number seed)

```randomIntegerSeeded(NUMBER bound, NUMBER seed)```: Returns a seeded random integer in the range ```[0, bound)```
(inclusive of 0, exclusive of bound). The seed determines the sequence of random numbers, allowing for
reproducible results.

**Requirements:**
- ```bound``` must be a positive integer
- ```seed``` must be an integer

**Examples:**
```sapl
policy "example"
permit
where
  math.randomIntegerSeeded(10, 42) == math.randomIntegerSeeded(10, 42);  // same seed produces same result
```


---

## math.clamp(Number value, Number minimum, Number maximum)

```clamp(NUMBER value, NUMBER minimum, NUMBER maximum)```: Constrains a value to lie within a specified range.
If the value is less than the minimum, returns the minimum. If the value is greater than the maximum, returns
the maximum. Otherwise, returns the value unchanged.

**Examples:**
```sapl
policy "example"
permit
where
  math.clamp(5, 0, 10) == 5;      // within range
  math.clamp(-5, 0, 10) == 0;     // below minimum
  math.clamp(15, 0, 10) == 10;    // above maximum
```


---

## math.randomInteger(Number bound)

```randomInteger(NUMBER bound)```: Returns a cryptographically secure random integer in the range ```[0, bound)```
(inclusive of 0, exclusive of bound). Uses ```SecureRandom``` for cryptographic strength randomness.

**Requirements:**
- ```bound``` must be a positive integer

**Examples:**
```sapl
policy "example"
permit
where
  var randomValue = math.randomInteger(10);  // returns 0-9
  var diceRoll = math.randomInteger(6) + 1;  // returns 1-6
```


---

## math.ceil(Number value)

```ceil(NUMBER value)```: Returns the smallest integer greater than or equal to the value (rounds up).

**Examples:**
```sapl
policy "example"
permit
where
  math.ceil(3.2) == 4.0;
  math.ceil(3.8) == 4.0;
  math.ceil(-3.2) == -3.0;
  math.ceil(5.0) == 5.0;
```


---

## math.round(Number value)

```round(NUMBER value)```: Returns the value rounded to the nearest integer. Values exactly halfway between
two integers are rounded up (towards positive infinity).

**Examples:**
```sapl
policy "example"
permit
where
  math.round(3.2) == 3.0;
  math.round(3.8) == 4.0;
  math.round(3.5) == 4.0;
  math.round(-3.5) == -3.0;
```


---

## math.abs(Number value)

```abs(NUMBER value)```: Returns the absolute value of a number.

**Examples:**
```sapl
policy "example"
permit
where
  math.abs(-5) == 5;
  math.abs(3.7) == 3.7;
  math.abs(0) == 0;
```


---

## math.randomFloat()

```randomFloat()```: Returns a cryptographically secure random floating-point number in the range ```[0.0, 1.0)```
(inclusive of 0.0, exclusive of 1.0). Uses ```SecureRandom``` for cryptographic strength randomness.

**Technical Note:** Despite the name ```randomFloat```, this function returns a double-precision floating-point
number (64-bit) to maintain consistency with JSON number representation and Java's numeric operations.

**Examples:**
```sapl
policy "example"
permit
where
  var probability = math.randomFloat();           // 0.0 <= probability < 1.0
  var percentage = math.randomFloat() * 100;      // 0.0 <= percentage < 100.0
  var range = math.randomFloat() * 50 + 10;       // 10.0 <= range < 60.0
```


---

## math.min(Number a, Number b)

```min(NUMBER a, NUMBER b)```: Returns the smaller of two numbers.

**Examples:**
```sapl
policy "example"
permit
where
  math.min(5, 3) == 3;
  math.min(-10, -5) == -10;
  math.min(2.5, 2.7) == 2.5;
```


---

## math.max(Number a, Number b)

```max(NUMBER a, NUMBER b)```: Returns the larger of two numbers.

**Examples:**
```sapl
policy "example"
permit
where
  math.max(5, 3) == 5;
  math.max(-10, -5) == -5;
  math.max(2.5, 2.7) == 2.7;
```


---

## math.sign(Number value)

```sign(NUMBER value)```: Returns the sign of a number: ```-1``` for negative numbers, ```0``` for zero,
and ```1``` for positive numbers.

**Examples:**
```sapl
policy "example"
permit
where
  math.sign(-5) == -1.0;
  math.sign(0) == 0.0;
  math.sign(3.7) == 1.0;
```


---

## math.pi()

```pi()```: Returns the mathematical constant π (pi), the ratio of a circle's circumference to its diameter.
Value is approximately 3.141592653589793.

**Examples:**
```sapl
policy "example"
permit
where
  var circumference = 2 * math.pi() * radius;
  var area = math.pi() * math.pow(radius, 2);
```


---

## math.e()

```e()```: Returns the mathematical constant e (Euler's number), the base of natural logarithms.
Value is approximately 2.718281828459045.

**Examples:**
```sapl
policy "example"
permit
where
  var exponentialGrowth = math.pow(math.e(), rate * time);
```


---

