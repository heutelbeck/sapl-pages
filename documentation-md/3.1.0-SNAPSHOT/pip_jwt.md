---
layout: default
title: jwt
parent: Attribute Finders
grand_parent: SAPL Reference
nav_order: 202
---
# jwt

Policy Information Point for validating and monitoring JSON Web Tokens (JWT). Attributes update automatically based on token lifecycle events such as maturity and expiration.

This Policy Information Point validates JSON Web Tokens and monitors their validity state over time.

JWT tokens are validated against multiple criteria:

**Signature Verification**

Tokens must be signed with RS256 algorithm. Public keys for signature verification are sourced from:
* A whitelist of trusted public keys configured in policy variables
* A remote key server that provides public keys on demand

**Time-based Validation**

Tokens are validated against time claims:
* `nbf` (not before): Token becomes valid at this timestamp
* `exp` (expiration): Token becomes invalid at this timestamp

Validity states transition automatically as time progresses, triggering policy re-evaluation when
tokens become mature or expire.

**Configuration**

Configure the JWT PIP through policy variables in `pdp.json`:

```json
{
  "algorithm": "DENY_UNLESS_PERMIT",
  "variables": {
    "jwt": {
      "publicKeyServer": {
        "uri": "http://authz-server:9000/public-key/{id}",
        "method": "POST",
        "keyCachingTtlMillis": 300000
      },
      "whitelist": {
        "key-id-1": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA...",
        "key-id-2": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEB..."
      }
    }
  }
}
```

**Public Key Server Configuration**

* `uri`: URL template for fetching public keys. Use `{id}` placeholder for key ID
* `method`: HTTP method for requests (GET or POST). Defaults to GET if omitted
* `keyCachingTtlMillis`: Cache duration for retrieved keys in milliseconds. Defaults to 300000 (5 minutes)

**Whitelist Configuration**

The whitelist maps key IDs to Base64-encoded public keys. Whitelisted keys take precedence over
the key server. Keys must be Base64 URL-safe encoded X.509 SubjectPublicKeyInfo structures.

**Validity States**

* `VALID`: Token signature is trusted and time claims are satisfied
* `EXPIRED`: Token has passed its expiration time
* `IMMATURE`: Token has not yet reached its not-before time
* `NEVER_VALID`: Token's not-before time is after its expiration time
* `UNTRUSTED`: Signature verification failed or public key unavailable
* `INCOMPATIBLE`: Token uses unsupported algorithm or has critical parameters
* `INCOMPLETE`: Required claims (key ID) are missing
* `MALFORMED`: Token is not a valid JWT structure

**Access Control Examples**

Basic token validation:
```sapl
policy "require_valid_jwt"
permit
where
  var token = subject.jwt;
  token.<jwt.valid>;
```

Check specific validity state:
```sapl
policy "allow_immature_tokens_for_testing"
permit action == "test:access"
where
  var token = subject.jwt;
  var state = token.<jwt.validity>;
  state == "VALID" || state == "IMMATURE";
```

Grant access only when token is valid, deny when expired:
```sapl
policy "time_sensitive_access"
permit action == "document:read"
where
  var token = subject.credentials.bearer;
  var state = token.<jwt.validity>;
  state == "VALID";

obligation
  {
    "type": "logAccess",
    "tokenState": state
  }
```

Reject untrusted or tampered tokens:
```sapl
policy "reject_untrusted_tokens"
deny
where
  var token = subject.jwt;
  var state = token.<jwt.validity>;
  state == "UNTRUSTED" || state == "MALFORMED";
```

**Reactive Behavior**

The validity attributes are reactive streams that emit new values when the token's state changes.
This triggers automatic policy re-evaluation without requiring the client to re-submit requests.

Example timeline for a token with nbf=now+10s and exp=now+30s:
* t=0s: Emits IMMATURE
* t=10s: Emits VALID (policy re-evaluated)
* t=30s: Emits EXPIRED (policy re-evaluated)


---

## valid


# Input Entity of Attribute Finder

Name: rawToken [TEXT]
```(TEXT jwt).<valid>``` validates a JWT token and returns true if the token is currently valid.

This attribute takes the JWT token as the left-hand input and returns a boolean stream that
updates automatically as the token transitions between validity states.

A token is considered valid when:
* Signature verification succeeds with a trusted public key
* Current time is within the token's validity period (after nbf, before exp)
* Token structure and claims meet requirements (RS256 algorithm, key ID present)

The attribute returns `true` only when the validity state is VALID. All other states
(EXPIRED, IMMATURE, UNTRUSTED, etc.) result in `false`.

Example:
```sapl
policy "api_access"
permit action == "api:call"
where
  var token = subject.credentials.bearer;
  token.<jwt.valid>;
```

Example with token extracted from authorization header:
```sapl
policy "rest_api_access"
permit action.http.method == "GET"
where
  var authHeader = resource.http.headers.Authorization;
  var token = authHeader.substring(7);
  token.<jwt.valid>;
```


---

## validity


# Input Entity of Attribute Finder

Name: rawToken [TEXT]
```(TEXT jwt).<validity>``` returns the current validity state of a JWT token as a text value.

This attribute provides detailed information about why a token is or is not valid. The stream
emits new states as the token lifecycle progresses, enabling policies to react to state changes.

Possible return values:
* `VALID`: Token is currently valid and trusted
* `EXPIRED`: Token validity period has ended
* `IMMATURE`: Token validity period has not yet begun
* `NEVER_VALID`: Token configuration is invalid (nbf after exp)
* `UNTRUSTED`: Signature verification failed or key unavailable
* `INCOMPATIBLE`: Unsupported algorithm or critical parameters
* `INCOMPLETE`: Required claims missing (e.g., key ID)
* `MALFORMED`: Invalid JWT structure

Example checking for multiple acceptable states:
```sapl
policy "grace_period_access"
permit action == "service:use"
where
  var token = subject.jwt;
  var state = token.<jwt.validity>;
  state == "VALID" || state == "IMMATURE";
```

Example with state-specific obligations:
```sapl
policy "monitored_access"
permit action == "resource:access"
where
  var token = subject.credentials.jwt;
  var state = token.<jwt.validity>;
  state == "VALID" || state == "IMMATURE";

obligation
  {
    "type": "auditLog",
    "tokenState": state,
    "userId": token.<jwt.parseJwt>.payload.sub
  }
```

Example denying specific invalid states:
```sapl
policy "deny_tampered_tokens"
deny
where
  var token = subject.jwt;
  var state = token.<jwt.validity>;
  state == "UNTRUSTED" || state == "MALFORMED" || state == "INCOMPATIBLE";

obligation
  {
    "type": "securityAlert",
    "reason": "Invalid token detected",
    "state": state
  }
```

Example handling expiration gracefully:
```sapl
policy "token_refresh_hint"
permit action == "api:call"
where
  var token = subject.jwt;
  var state = token.<jwt.validity>;
  state == "VALID";

advice
  {
    "type": "tokenStatus",
    "message": state == "VALID" ? "Token valid" : "Token refresh required"
  }
```


---

