---
title: sanitize
parent: Functions
nav_order: 124
---
# sanitize

A library for input sanitization, especially for the detection
of potential SQL injections in strings.



---

## sanitize.assertNoSqlInjection(Text inputToSanitize)

```sanitize.assertNoSqlInjection(TEXT inputToSanitize)```
Checks the provided text for patterns commonly associated with SQL injection attacks.
If any suspicious patterns are detected, the function returns an error.

**Parameters:**
- `inputToSanitize` (TEXT): The input text to be analyzed.

**Returns:**
- The original input if no suspicious patterns are detected.
- An error if the input contains patterns associated with SQL injection attacks.

**Examples:**
- Safe Input: ```sanitize.assertNoSqlInjection("Hello World")``` returns "Hello World".
- Injection Attempt: ```sanitize.assertNoSqlInjection("' OR '1'='1")``` returns an error.


---

