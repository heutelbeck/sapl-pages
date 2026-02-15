---
layout: default
title: jwt
parent: Attribute Finders
grand_parent: SAPL Reference
nav_order: 202
---
# jwt

Policy Information Point for validating and monitoring JSON Web Tokens (JWT). Tokens are read securely from subscription secrets. Attributes update automatically based on token lifecycle events such as maturity and expiration.

This Policy Information Point validates JSON Web Tokens and monitors their validity state over time.

JWT tokens are read securely from subscription secrets, never from the policy evaluation context.
Public key configuration is read from policy variables.

**Token Access**

Use the `<jwt.token>` environment attribute to access token data:

```sapl
policy "require valid jwt"
permit
  <jwt.token>.valid;

policy "role check"
permit action == "admin:action";
  "admin" in <jwt.token>.payload.roles;
  <jwt.token>.validity == "VALID";
```

The attribute returns an object with:
* `header`: Decoded JWT header (algorithm, key ID, etc.)
* `payload`: Decoded JWT payload with time claims converted to ISO-8601
* `valid`: Boolean indicating current validity
* `validity`: Detailed validity state string

**Signature Verification**

Tokens are verified against all standard JWS algorithms:
* RSA: RS256, RS384, RS512, PS256, PS384, PS512
* ECDSA: ES256, ES384, ES512
* HMAC: HS256, HS384, HS512

Public keys for signature verification are sourced from:
* A whitelist of trusted keys configured in policy variables
* A remote key server that provides public keys on demand

**Time-based Validation**

Tokens are validated against time claims:
* `nbf` (not before): Token becomes valid at this timestamp
* `exp` (expiration): Token becomes invalid at this timestamp

Validity states transition automatically, triggering policy re-evaluation.

**Configuration**

Configure through policy variables in `pdp.json`:

```json
{
  "variables": {
    "jwt": {
      "secretsKey": "jwt",
      "clockSkewSeconds": 60,
      "publicKeyServer": {
        "uri": "http://authz-server:9000/public-key/{id}",
        "method": "GET",
        "keyCachingTtlMillis": 300000
      },
      "whitelist": {
        "key-id-1": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA..."
      }
    }
  }
}
```

The `secretsKey` field specifies which key in subscription secrets holds the JWT token.
Defaults to `"jwt"` if omitted.

The `clockSkewSeconds` field specifies clock skew tolerance in seconds for time claim
validation (RFC 7519 recommends allowing some leeway). Defaults to 0 (exact comparison)
if omitted. Set to 60 for typical server deployments.

The `maxTokenLifetimeSeconds` field specifies the maximum allowed token lifetime in seconds.
If set and the token's lifetime (`exp` minus `iat`, or `exp` minus now if `iat` is absent)
exceeds this value, the token is treated as `NEVER_VALID`. Defaults to 0 (disabled) if omitted.

**Validity States**

* `VALID`: Token signature is trusted and time claims are satisfied
* `EXPIRED`: Token has passed its expiration time
* `IMMATURE`: Token has not yet reached its not-before time
* `NEVER_VALID`: Token's not-before time is after its expiration time
* `UNTRUSTED`: Signature verification failed or public key unavailable
* `INCOMPATIBLE`: Token has critical header parameters
* `INCOMPLETE`: Required claims (key ID) are missing
* `MALFORMED`: Token is not a valid JWT structure
* `MISSING_TOKEN`: No token found under the configured secrets key

**Limitations**

* Only JWS (JSON Web Signature, RFC 7515) tokens are supported. JWE (JSON Web
  Encryption, RFC 7516) tokens are not supported. JWE encrypts the token payload
  for confidentiality and uses a fundamentally different structure (5 parts instead
  of 3) requiring private decryption keys. Attempting to use a JWE token will
  result in `MALFORMED` validity state. JWE adoption is low as most deployments
  rely on TLS for transport confidentiality.
* Token revocation is not checked. JWTs are validated statelessly based on
  cryptographic signature and time claims only. A revoked token remains valid
  from this PIP's perspective until it expires. Applications requiring revocation
  checks should use OAuth2 Token Introspection (RFC 7662) at the application
  layer or a dedicated introspection PIP.
* Audience (`aud`) and issuer (`iss`) claims are not validated by the PIP.
  These are exposed in `<jwt.token>.payload` for policy authors to check
  directly in policy conditions.


---

## token

```<jwt.token>``` reads a JWT from subscription secrets using the configured default secrets key
and returns an object containing the decoded token data and its current validity state.

The returned object has the structure:
```json
{
  "header": { "kid": "key-1", "alg": "RS256" },
  "payload": { "sub": "user123", "roles": ["admin"], "exp": "2026-02-15T..." },
  "valid": true,
  "validity": "VALID"
}
```

Time claims (nbf, exp, iat) are converted from epoch seconds to ISO-8601 timestamps.

The stream re-emits automatically when the token transitions between validity states
(IMMATURE -> VALID -> EXPIRED).

Example:
```sapl
policy "require valid jwt"
permit
  <jwt.token>.valid;
```

Example with claims:
```sapl
policy "admin access"
permit action == "admin:action";
  "admin" in <jwt.token>.payload.roles;
```


---

## token

```<jwt.token(TEXT secretsKeyName)>``` reads a JWT from subscription secrets using the specified
key name and returns an object containing the decoded token data and its current validity state.

This overload allows reading tokens stored under a custom key in subscription secrets.

Example:
```sapl
policy "access token check"
permit
  <jwt.token("accessToken")>.valid;
```


---

