---
layout: default
title: jwt
parent: Functions
grand_parent: SAPL Reference
nav_order: 113
---
# jwt

Functions for parsing JSON Web Tokens. Contents are returned without validation.

# JWT Function Library

Provides fast, unvalidated parsing of JSON Web Tokens for use in policy target expressions.

## Security Model

**Functions in this library DO NOT validate JWT signatures or claims.** They return token
contents as-is without verification. This design enables fast policy selection through target
expressions, which cannot call external services required for proper JWT validation.

For secure authorization decisions, combine this library with the JWT Policy Information Point:

* **Function Library** (jwt.parseJwt): Fast parsing for target expressions and policy selection
* **JWT PIP** (jwt.valid, jwt.validity): Secure validation with signature verification

## Recommended Pattern

Use functions for quick filtering, then validate with PIP attributes:

```sapl
policy "secure-resource-access"
permit action.method == "GET";
  "documents:read" in jwt.parseJwt(subject.token).payload.scope;
  subject.token.<jwt.valid>;
```

This pattern provides:
1. Fast policy selection via unvalidated token parsing in target
2. Secure authorization via validated token in policy body

## JWT PIP Integration

The JWT Policy Information Point provides validated attributes:

* `<jwt.valid>`: Boolean indicating current token validity
* `<jwt.validity>`: Validity state (VALID, EXPIRED, IMMATURE, UNTRUSTED, etc.)

PIP attributes are reactive streams that automatically trigger policy re-evaluation when
tokens transition between states (immature -> valid -> expired).

See JWT PIP documentation for configuration of public key servers and trusted key whitelists.

## Example

Target expression for policy selection:
```sapl
policy "api-scope-filter"
permit action.api == "documents";
  "docs:write" in jwt.parseJwt(subject.credentials).payload.scope;
  var token = subject.credentials;
  token.<jwt.validity> == "VALID";
```

The target expression quickly filters relevant policies by checking scopes without validation.
The policy body then validates the token signature and time claims before granting access.


---

## parseJwt

```parseJwt(TEXT rawToken)```: Parses the raw encoded JWT token and converts it into a SAPL
value with the decoded header and payload. The token is NOT validated by this function.
Use JWT PIP attributes for validation.

Returns an object with structure:
```json
{
  "header": { "kid": "...", "alg": "..." },
  "payload": { "sub": "...", "exp": "...", ... }
}
```

Time claims (nbf, exp, iat) are converted from epoch seconds to ISO-8601 timestamps.

**Example:**
```sapl
policy "check-token-scope"
permit
  "admin" in jwt.parseJwt(subject.token).payload.roles;
  subject.token.<jwt.valid>;
```


---

