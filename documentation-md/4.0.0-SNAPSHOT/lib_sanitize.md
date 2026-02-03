---
layout: default
title: sanitize
parent: Functions
grand_parent: SAPL Reference
nav_order: 123
---
# sanitize

A library for input sanitization, especially for the detection
of potential SQL injections in strings.

Validates text in PIP parameter expressions to catch SQL injection attempts.

See OWASP SQL Injection Prevention Guidelines:
https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html

OWASP recommends parameterized queries as the primary defense (always use those in your PIPs),
with input validation as a secondary layer. This library provides the validation layer.

Consider this expression: ```subject.<some.pip(environment.country)>```. If ```environment.country```
comes from user input and the PIP builds SQL queries with it, an attacker could inject "US'; DROP TABLE users--"
to break out of the query. This library detects these patterns and returns an error instead.

Two functions with different trade-offs:

assertNoSqlInjection (Balanced)
Catches injection patterns while allowing normal text. Passes through "O'Brien", "Portland OR Seattle",
and "What's your name?" but blocks "' OR '1'='1", "admin'--", and "1; DROP TABLE users". Use this for
names, descriptions, and any other open-ended text.

assertNoSqlInjectionStrict (Strict)
Rejects anything with SQL metacharacters or keywords. Passes "JohnDoe" and "Department123" but blocks
"O'Brien" and "user@example.com". Only use this for codes or identifiers where SQL syntax legitimately
shouldn't appear.

Example with HTTP PIP:
```
policy "fetch_user_profile"
permit action == "read";
    var userId = sanitize.assertNoSqlInjection(environment.userId);
    var request = {
        "baseUrl": "https://api.example.com",
        "path": "/users/" + userId
    };
    var user = <http.get(request)>;
    user.department == subject.department;
```

If ```environment.userId``` contains "' OR '1'='1", the sanitization returns an error, the userId
assignment fails, the where clause evaluates to error, and the policy doesn't apply.

Example with strict mode for structured identifiers:
```
policy "device_access"
permit action == "control";
    var deviceId = sanitize.assertNoSqlInjectionStrict(environment.deviceId);
    var request = {
        "baseUrl": "https://api.example.com",
        "urlParameters": { "device": deviceId }
    };
    <http.get(request)>.ownerId == subject.id;
```

When to use regex allow-list validation instead:

If valid inputs match a specific pattern, use the =~ operator directly. This is safer than
pattern-based detection when possible:

```
// Country codes
var country = environment.countryCode;
country =~ "^[A-Z]{2}$";

// Numeric IDs
var userId = environment.userId;
userId =~ "^\d{1,10}$";

// Department codes
var deptCode = environment.deptCode;
deptCode =~ "^DEPT-[A-Z]{2}-\d{3}$";
```

Use this library when input is open-ended or when writing an allow-list would be impractical.

Critical: This is a SECONDARY DEFENSE. Parameterized queries in PIPs are still required as the primary
defense. Never concatenate user input into SQL strings.

Complete guide: [OWASP SQL Injection Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html)


---

## assertNoSqlInjection

```sanitize.assertNoSqlInjection(TEXT inputToSanitize)```

Checks text for SQL injection patterns using balanced detection. Catches injection attempts while
allowing normal text that happens to contain SQL-like words or punctuation.

Detects complete SQL statements (SELECT...FROM, INSERT INTO, etc.), injection patterns like quoted
expressions and stacked queries, and encoding tricks (URL-encoded, hex-encoded, Unicode obfuscation).
At the same time, it allows apostrophes in names (O'Brien, D'Angelo), SQL keywords used normally
(Portland OR Seattle), and contractions (What's your name?).

Takes a TEXT value and returns it unchanged if clean, or an error if injection patterns are detected.

These inputs pass through:
```
sanitize.assertNoSqlInjection("O'Brien")                    // Apostrophe in name
sanitize.assertNoSqlInjection("Portland OR Seattle")        // OR as word
sanitize.assertNoSqlInjection("What's your name?")          // Contractions
sanitize.assertNoSqlInjection("Department: HR-001")         // Structured data
```

These get blocked:
```
sanitize.assertNoSqlInjection("' OR '1'='1")                // Classic injection
sanitize.assertNoSqlInjection("admin'--")                   // Comment injection
sanitize.assertNoSqlInjection("1; DROP TABLE users")        // Stacked query
sanitize.assertNoSqlInjection("1' UNION SELECT * FROM")     // Union injection
sanitize.assertNoSqlInjection("SELECT * FROM users")        // Complete SQL query
```

Example usage:
```
policy "fetch_user_profile"
permit action == "read";
    var userId = sanitize.assertNoSqlInjection(environment.userId);
    var request = {
        "baseUrl": "https://api.example.com",
        "path": "/users/" + userId
    };
    var user = <http.get(request)>;
    user.department == subject.department;
```

Use assertNoSqlInjectionStrict if the input should be a structured identifier where SQL syntax never belongs.


---

## assertNoSqlInjectionStrict

```sanitize.assertNoSqlInjectionStrict(TEXT inputToSanitize)```

Checks text using strict detection. Rejects anything with SQL metacharacters or keywords, even when harmless.
Gives maximum security but produces false positives on legitimate text.

Blocks single quotes, semicolons, SQL metacharacters, SQL keywords (SELECT, INSERT, DROP), logical
operators (OR, AND, NOT), and URL-encoded characters. Only safe for structured identifiers that shouldn't
contain SQL syntax.

Takes a TEXT value and returns it unchanged if clean, or an error if any SQL syntax is found.

These inputs pass through:
```
sanitize.assertNoSqlInjectionStrict("USER123")              // Alphanumeric ID
sanitize.assertNoSqlInjectionStrict("dept-hr")              // Hyphenated code
sanitize.assertNoSqlInjectionStrict("US")                   // Country code
```

These get rejected (even though some are harmless):
```
sanitize.assertNoSqlInjectionStrict("O'Brien")              // Apostrophe (blocked)
sanitize.assertNoSqlInjectionStrict("Portland OR Seattle")  // Contains OR (blocked)
sanitize.assertNoSqlInjectionStrict("user@email.com")       // Special chars (blocked)
```

Example usage:
```
policy "device_access"
permit action == "control";
    var deviceId = sanitize.assertNoSqlInjectionStrict(environment.deviceId);
    var request = {
        "baseUrl": "https://api.example.com",
        "urlParameters": { "device": deviceId }
    };
    <http.get(request)>.ownerId == subject.id;
```

Zero tolerance for SQL syntax means higher security but more false positives. It rejects legitimate text
with apostrophes or SQL-like words. Only use this when input should be a code or identifier where SQL
syntax legitimately shouldn't appear.

For natural language or user names, use assertNoSqlInjection instead.


---

