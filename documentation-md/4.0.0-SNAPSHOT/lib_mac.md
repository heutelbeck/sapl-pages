---
layout: default
title: mac
parent: Functions
grand_parent: SAPL Reference
nav_order: 115
---
# mac

Message Authentication Code functions for verifying message integrity and authenticity using HMAC algorithms.

# Message Authentication Code Library

Verify message integrity and authenticity using HMAC algorithms with secret keys.
Use MACs when authorization decisions depend on cryptographic verification of
external data like webhook signatures, API tokens, or signed messages.

## When to Use

Verify webhook signatures from external services:
```sapl
policy "verify-github-webhook"
permit action == "process_webhook";
  var payload = resource.body;
  var receivedSignature = resource.headers["X-Hub-Signature-256"];
  var secret = environment.webhookSecret;
  mac.isValidHmac(payload, receivedSignature, secret, "HmacSHA256");
```

Generate and verify signatures for API authentication:
```sapl
policy "verify-api-request"
permit action == "api_call";
  var requestData = resource.method + resource.path + resource.body;
  var expectedMac = mac.hmacSha256(requestData, subject.apiSecret);
  var receivedMac = resource.headers["X-Signature"];
  mac.timingSafeEquals(receivedMac, expectedMac);
```

Validate signed resource identifiers to ensure integrity:
```sapl
policy "verify-signed-resource-id"
permit action == "access_resource";
  var resourceData = resource.id + "|" + resource.permissions;
  var expectedMac = mac.hmacSha256(resourceData, environment.signingKey);
  mac.timingSafeEquals(resource.signature, expectedMac);
```

## Security Considerations

Always use timing-safe comparison when verifying MACs. The timingSafeEquals
and isValidHmac functions use constant-time comparison to prevent timing attacks
where an attacker could determine the correct MAC by measuring comparison time.

Never use string equality or standard comparison operators to verify MACs in
authorization decisions.


---

## timingSafeEquals

```timingSafeEquals(TEXT mac1, TEXT mac2)```: Compares two MACs using constant-time comparison.

Performs a timing-safe comparison of two hexadecimal MAC strings. This prevents
timing attacks where an attacker could determine the correct MAC by measuring
comparison time. Always use this function when verifying MACs.

The comparison is case-insensitive for hexadecimal strings.

**Examples:**
```sapl
policy "verify webhook"
permit
  var receivedMac = "abc123";
  var computedMac = "abc123";
  mac.timingSafeEquals(receivedMac, computedMac);
```


---

## hmacSha256

```hmacSha256(TEXT message, TEXT key)```: Computes HMAC-SHA256 authentication code.

Generates a keyed-hash message authentication code using SHA-256. The key should
be provided as a hexadecimal or Base64 string. Returns the MAC as a lowercase
hexadecimal string.

Commonly used for webhook signatures (GitHub, Stripe) and API authentication.

**Examples:**
```sapl
policy "example"
permit
  var message = "hello world";
  var key = "secret";
  var mac = mac.hmacSha256(message, key);
  mac == "734cc62f32841568f45715aeb9f4d7891324e6d948e4c6c60c0621cdac48623a";
```


---

## hmacSha384

```hmacSha384(TEXT message, TEXT key)```: Computes HMAC-SHA384 authentication code.

Generates a keyed-hash message authentication code using SHA-384. Provides
stronger security than HMAC-SHA256. Returns the MAC as a lowercase hexadecimal
string.

**Examples:**
```sapl
policy "example"
permit
  var message = "hello world";
  var key = "secret";
  var mac = mac.hmacSha384(message, key);
  mac == "0a0521b49a65e43c6991c456e5b37bcf44a3225a5e85e16b5e5a18821b41447de49d44ddcb38b3206c9c6952d5aab074";
```


---

## hmacSha512

```hmacSha512(TEXT message, TEXT key)```: Computes HMAC-SHA512 authentication code.

Generates a keyed-hash message authentication code using SHA-512. Provides
the strongest security in the HMAC-SHA2 family. Returns the MAC as a lowercase
hexadecimal string.

**Examples:**
```sapl
policy "example"
permit
  var message = "hello world";
  var key = "secret";
  var mac = mac.hmacSha512(message, key);
  mac == "fef74d78b1e0d9180258835c7e855f0c9aa53d07d2a84088d62cef0218df0a3de20e69936a13b9ba0d36fb208aef0c6df6e00bf3a28f936f48faad8e6e8e2e39";
```


---

## isValidHmac

```isValidHmac(TEXT message, TEXT expectedMac, TEXT key, TEXT algorithm)```: Verifies an HMAC signature.

Computes the HMAC of the message using the provided key and algorithm, then
performs a timing-safe comparison with the expected MAC. Returns true if they match.

Supported algorithms: "HmacSHA256", "HmacSHA384", "HmacSHA512"

**Examples:**
```sapl
policy "verify webhook signature"
permit
  var payload = "webhook payload";
  var signature = "expected_signature_from_header";
  var secret = "webhook_secret";
  mac.isValidHmac(payload, signature, secret, "HmacSHA256");
```


---

