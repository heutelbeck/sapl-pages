---
layout: default
title: keys
parent: Functions
grand_parent: SAPL Reference
nav_order: 114
---
# keys

Functions for parsing and converting cryptographic key material including PEM parsing and JWK conversion.

# Keys Function Library

Parse and convert cryptographic keys between PEM and JWK formats. Handles RSA keys at 2048 bits and above,
EC keys on P-256, P-384, and P-521 curves, and EdDSA keys using Ed25519. All key types support full
bidirectional PEM and JWK conversion following RFC 7517 and RFC 7518.

Parse PEM-encoded keys and extract their properties with publicKeyFromPem, algorithmFromKey, sizeFromKey,
and curveFromKey. Extract public keys from X.509 certificates using publicKeyFromCertificate. Convert
between formats with jwkFromPublicKey (PEM to JWK) and publicKeyFromJwk (JWK to PEM).

## OAuth/OIDC Token Validation

Fetch and use public keys from OAuth providers:

```sapl
policy "validate access token"
permit action == "api.call";
  // Assume JWKS already retrieved via HTTP PIP
  var signingKey = keys.publicKeyFromJwk(resource.jwks.keys[0]);
  jwt.verify(request.token, signingKey);
```

## Certificate-Based Access Control

Extract and validate keys from client certificates:

```sapl
policy "require strong client cert"
permit action == "admin.access";
  var publicKey = keys.publicKeyFromCertificate(request.clientCert);
  var algorithm = keys.algorithmFromKey(publicKey);
  var keySize = keys.sizeFromKey(publicKey);

  algorithm == "RSA";
  keySize >= 2048;
```

## Key Type Enforcement

Require specific cryptographic algorithms:

```sapl
policy "require modern crypto"
permit
  var algorithm = keys.algorithmFromKey(subject.publicKey);
  var keyInfo = keys.publicKeyFromPem(subject.publicKey);

  // Allow only EC P-256 or Ed25519
  (algorithm == "EC" && keyInfo.curve == "secp256r1") ||
  (algorithm == "EdDSA");
```

## Microservice Authentication

Publish service public keys as JWKs:

```sapl
policy "register service"
permit action == "service.register";
  var serviceKey = keys.publicKeyFromPem(subject.publicKey);
  var jwk = keys.jwkFromPublicKey(subject.publicKey);

  // Store JWK for other services to use
  jwk.kty == "RSA";
  serviceKey.size >= 2048;
```

## Dynamic Key Validation

Validate keys meet security requirements:

```sapl
policy "enforce key policy"
permit
  var key = keys.publicKeyFromPem(resource.encryptionKey);
  var size = keys.sizeFromKey(resource.encryptionKey);

  key.algorithm in ["RSA", "EC"];
  size >= 2048;
```

## Certificate Chain Validation

Extract and verify keys from certificate chains:

```sapl
policy "validate cert chain"
permit
  var leafKey = keys.publicKeyFromCertificate(request.cert);
  var caKey = keys.publicKeyFromCertificate(trust.caCert);

  keys.algorithmFromKey(leafKey) == keys.algorithmFromKey(caKey);
  keys.sizeFromKey(leafKey) >= keys.sizeFromKey(caKey);
```

## Error Handling

All functions return error values for invalid input:

```sapl
policy "safe key handling"
permit
  var keyResult = keys.publicKeyFromPem(untrustedInput);
  keyResult.isDefined();  // Check before using
  keyResult.algorithm == "RSA";
```

## RFC Compliance

JWK conversions follow RFC 7517 (JSON Web Key format), RFC 7518 (JSON Web Algorithms for RSA and EC),
and RFC 8037 (CFRG Elliptic Curve for EdDSA/Ed25519). This ensures interoperability with OAuth providers,
JWT libraries, and OIDC systems.

## Integration

Works seamlessly with other SAPL libraries:

```sapl
policy "complete auth flow"
permit
  // Assume JWKS already retrieved via HTTP PIP
  var key = keys.publicKeyFromJwk(resource.jwks.keys[0]);

  // Verify JWT
  jwt.verify(request.token, key);

  // Additional validation
  keys.sizeFromKey(key) >= 2048;
```

## Notes

- PEM format must include `-----BEGIN PUBLIC KEY-----` headers
- JWK fields use base64url encoding (no padding)
- All conversions preserve key functionality (verified via signature operations)
- Certificate extraction supports RSA and EC certificates


---

## publicKeyFromPem

```publicKeyFromPem(TEXT keyPem)```: Parses a PEM-encoded public key.

Accepts RSA, EC (Elliptic Curve), and EdDSA public keys in PEM format.
Returns a structured object with key type, algorithm, and format information.

**Examples:**
```sapl
policy "parse key"
permit
  var key = keys.publicKeyFromPem(publicKeyPem);
  key.algorithm == "RSA";
  key.format == "X.509";
```


---

## publicKeyFromCertificate

```publicKeyFromCertificate(TEXT certPem)```: Extracts the public key from an X.509 certificate.

Parses the certificate and returns the embedded public key in PEM format.
The returned key can be used with signature verification functions.

**Examples:**
```sapl
policy "extract key from cert"
permit
  var publicKey = keys.publicKeyFromCertificate(clientCert);
  signature.verifyRsaSha256(message, sig, publicKey);
```


---

## algorithmFromKey

```algorithmFromKey(TEXT keyPem)```: Extracts the algorithm name from a public key.

Returns the key algorithm as a string: "RSA", "EC", or "EdDSA".

**Examples:**
```sapl
policy "check key type"
permit
  keys.algorithmFromKey(publicKey) == "RSA";
```


---

## sizeFromKey

```sizeFromKey(TEXT keyPem)```: Extracts the key size in bits.

Returns the key size for RSA keys (e.g., 2048, 4096) or the curve size
for EC keys (e.g., 256, 384). For EdDSA keys, returns the fixed key size.

**Examples:**
```sapl
policy "require strong keys"
permit
  keys.sizeFromKey(publicKey) >= 2048;
```


---

## curveFromKey

```curveFromKey(TEXT keyPem)```: Extracts the elliptic curve name from an EC public key.

Returns the curve name for elliptic curve keys (e.g., "secp256r1", "secp384r1", "secp521r1").
Returns an error if the key is not an EC key.

**Examples:**
```sapl
policy "require p256 curve"
permit
  keys.curveFromKey(publicKey) == "secp256r1";
```


---

## jwkFromPublicKey

```jwkFromPublicKey(TEXT publicKeyPem)```: Converts a PEM public key to JWK format.

Converts RSA, EC, or EdDSA public keys to JSON Web Key (JWK) format as defined
in RFC 7517. The JWK includes the key type (kty), algorithm parameters, and
key material.

Supported key types: RSA (all sizes), EC (P-256, P-384, P-521), EdDSA (Ed25519).

**Examples:**
```sapl
policy "convert to jwk"
permit
  var jwk = keys.jwkFromPublicKey(publicKeyPem);
  jwk.kty == "RSA";
  jwk.n != null;
```


---

## publicKeyFromJwk

```publicKeyFromJwk(OBJECT jwk)```: Converts a JWK to PEM public key format.

Converts a JSON Web Key (JWK) object back to PEM format. Supports RSA, EC,
and EdDSA keys. Returns the public key in standard PEM encoding.

Supported JWK types: RSA (kty: "RSA"), EC (kty: "EC"), OKP (kty: "OKP" with Ed25519).

**Examples:**
```sapl
policy "convert from jwk"
permit
  var publicKeyPem = keys.publicKeyFromJwk(jwkObject);
  signature.verifyRsaSha256(message, sig, publicKeyPem);
```

```sapl
policy "validate oauth token"
permit action == "api.access";
  // Assume JWKS already retrieved via HTTP PIP
  var publicKey = keys.publicKeyFromJwk(resource.jwks.keys[0]);
  var publicKey = keys.publicKeyFromJwk(jwk);
  jwt.verify(request.token, publicKey);
```


---

