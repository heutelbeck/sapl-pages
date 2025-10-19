---
layout: default
title: keys
parent: Functions
grand_parent: SAPL Reference
nav_order: 114
---
# keys

Functions for parsing and converting cryptographic key material including PEM parsing and JWK conversion.



---

## keys.extractPublicKeyFromCertificate(Text certPem)

```extractPublicKeyFromCertificate(TEXT certPem)```: Extracts the public key from an X.509 certificate.

Parses the certificate and returns the embedded public key in PEM format.
The returned key can be used with signature verification functions.

**Examples:**
```sapl
policy "extract key from cert"
permit
where
  var publicKey = keys.extractPublicKeyFromCertificate(clientCert);
  signature.verifyRsaSha256(message, sig, publicKey);
```


---

## keys.parsePublicKey(Text keyPem)

```parsePublicKey(TEXT keyPem)```: Parses a PEM-encoded public key.

Accepts RSA, EC (Elliptic Curve), and EdDSA public keys in PEM format.
Returns a structured object with key type, algorithm, and format information.

**Examples:**
```sapl
policy "parse key"
permit
where
  var key = keys.parsePublicKey(publicKeyPem);
  key.algorithm == "RSA";
  key.format == "X.509";
```


---

## keys.publicKeyToJwk(Text publicKeyPem)

```publicKeyToJwk(TEXT publicKeyPem)```: Converts a PEM public key to JWK format.

Converts RSA, EC, or EdDSA public keys to JSON Web Key (JWK) format as defined
in RFC 7517. The JWK includes the key type (kty), algorithm parameters, and
key material.

**Examples:**
```sapl
policy "convert to jwk"
permit
where
  var jwk = keys.publicKeyToJwk(publicKeyPem);
  jwk.kty == "RSA";
  jwk.n != null;
```


---

## keys.jwkToPublicKey(JsonObject jwk)

```jwkToPublicKey(OBJECT jwk)```: Converts a JWK to PEM public key format.

Converts a JSON Web Key (JWK) object back to PEM format. Supports RSA, EC,
and EdDSA keys. Returns the public key in standard PEM encoding.

**Examples:**
```sapl
policy "convert from jwk"
permit
where
  var publicKeyPem = keys.jwkToPublicKey(jwkObject);
  signature.verifyRsaSha256(message, sig, publicKeyPem);
```


---

## keys.extractEcCurve(Text keyPem)

```extractEcCurve(TEXT keyPem)```: Extracts the elliptic curve name from an EC public key.

Returns the curve name for elliptic curve keys (e.g., "secp256r1", "secp384r1", "secp521r1").
Returns an error if the key is not an EC key.

**Examples:**
```sapl
policy "require p256 curve"
permit
where
  keys.extractEcCurve(publicKey) == "secp256r1";
```


---

## keys.extractKeySize(Text keyPem)

```extractKeySize(TEXT keyPem)```: Extracts the key size in bits.

Returns the key size for RSA keys (e.g., 2048, 4096) or the curve size
for EC keys (e.g., 256, 384). For EdDSA keys, returns the fixed key size.

**Examples:**
```sapl
policy "require strong keys"
permit
where
  keys.extractKeySize(publicKey) >= 2048;
```


---

## keys.extractKeyAlgorithm(Text keyPem)

```extractKeyAlgorithm(TEXT keyPem)```: Extracts the algorithm name from a public key.

Returns the key algorithm as a string: "RSA", "EC", or "EdDSA".

**Examples:**
```sapl
policy "check key type"
permit
where
  keys.extractKeyAlgorithm(publicKey) == "RSA";
```


---

