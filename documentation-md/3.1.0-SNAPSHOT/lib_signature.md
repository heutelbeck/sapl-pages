---
layout: default
title: signature
parent: Functions
grand_parent: SAPL Reference
nav_order: 127
---
# signature

Digital signature verification functions for RSA, ECDSA, and EdDSA signatures using public key cryptography.



---

## signature.isValidRsaSha384(Text message, Text signature, Text publicKeyPem)

```isValidRsaSha384(TEXT message, TEXT signature, TEXT publicKeyPem)```: Validates an RSA signature using SHA-384.

Checks RSA signatures using SHA-384 hash algorithm. Use when security policy
requires stronger hashing than SHA-256.

**Parameters:**
- message: The original message that was signed
- signature: The signature in hexadecimal or Base64 format
- publicKeyPem: The RSA public key in PEM format

**Examples:**
```sapl
policy "document signature"
permit
where
  signature.isValidRsaSha384(document, documentSignature, trustedPublicKey);
```


---

## signature.isValidEcdsaP521(Text message, Text signature, Text publicKeyPem)

```isValidEcdsaP521(TEXT message, TEXT signature, TEXT publicKeyPem)```: Validates an ECDSA signature using P-521 curve.

Checks ECDSA signatures using the P-521 (secp521r1) curve with SHA-512.
Strongest NIST elliptic curve, use for highest security requirements.

**Parameters:**
- message: The original message that was signed
- signature: The signature in hexadecimal or Base64 format
- publicKeyPem: The EC public key in PEM format

**Examples:**
```sapl
policy "ecdsa p521 check"
permit
where
  signature.isValidEcdsaP521(highSecurityData, dataSig, ecPublicKey);
```


---

## signature.isValidEcdsaP384(Text message, Text signature, Text publicKeyPem)

```isValidEcdsaP384(TEXT message, TEXT signature, TEXT publicKeyPem)```: Validates an ECDSA signature using P-384 curve.

Checks ECDSA signatures using the P-384 (secp384r1) curve with SHA-384.
Use when security policy requires stronger curves than P-256.

**Parameters:**
- message: The original message that was signed
- signature: The signature in hexadecimal or Base64 format
- publicKeyPem: The EC public key in PEM format

**Examples:**
```sapl
policy "ecdsa p384 check"
permit
where
  signature.isValidEcdsaP384(sensitiveData, dataSig, trustedEcKey);
```


---

## signature.isValidEcdsaP256(Text message, Text signature, Text publicKeyPem)

```isValidEcdsaP256(TEXT message, TEXT signature, TEXT publicKeyPem)```: Validates an ECDSA signature using P-256 curve.

Checks ECDSA (Elliptic Curve Digital Signature Algorithm) signatures using the
P-256 (secp256r1) curve with SHA-256. ECDSA gives equivalent security to RSA
with smaller keys.

**Parameters:**
- message: The original message that was signed
- signature: The signature in hexadecimal or Base64 format
- publicKeyPem: The EC public key in PEM format

**Examples:**
```sapl
policy "transaction signature"
permit
where
  signature.isValidEcdsaP256(transaction, transactionSig, userPublicKey);
```


---

## signature.isValidEd25519(Text message, Text signature, Text publicKeyPem)

```isValidEd25519(TEXT message, TEXT signature, TEXT publicKeyPem)```: Validates an Ed25519 signature.

Checks EdDSA (Edwards-curve Digital Signature Algorithm) signatures using the
Ed25519 curve. Ed25519 is fast, secure, and has small keys and signatures.

Standard in SSH keys, TLS 1.3, Signal Protocol, and many blockchain implementations.

**Parameters:**
- message: The original message that was signed
- signature: The signature in hexadecimal or Base64 format
- publicKeyPem: The Ed25519 public key in PEM format

**Examples:**
```sapl
policy "ed25519 signature check"
permit
where
  signature.isValidEd25519(blockData, blockSignature, validatorKey);
```


---

## signature.isValidRsaSha512(Text message, Text signature, Text publicKeyPem)

```isValidRsaSha512(TEXT message, TEXT signature, TEXT publicKeyPem)```: Validates an RSA signature using SHA-512.

Checks RSA signatures using SHA-512 hash algorithm. Strongest hash in the RSA-SHA2
family, use for high-security requirements.

**Parameters:**
- message: The original message that was signed
- signature: The signature in hexadecimal or Base64 format
- publicKeyPem: The RSA public key in PEM format

**Examples:**
```sapl
policy "secure signature check"
permit
where
  signature.isValidRsaSha512(criticalData, dataSignature, certifiedPublicKey);
```


---

## signature.isValidRsaSha256(Text message, Text signature, Text publicKeyPem)

```isValidRsaSha256(TEXT message, TEXT signature, TEXT publicKeyPem)```: Validates an RSA signature using SHA-256.

Checks whether the signature was created using the private key corresponding to the
public key. Signature must be in hexadecimal or Base64 format.

Use for API authentication, document signing, and general RSA signature validation
where SHA-256 hash strength is sufficient.

**Parameters:**
- message: The original message that was signed
- signature: The signature in hexadecimal or Base64 format
- publicKeyPem: The RSA public key in PEM format

**Examples:**
```sapl
policy "api signature check"
permit
where
  var message = "request payload";
  var signature = "signature_from_header";
  var publicKey = "-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----";
  signature.isValidRsaSha256(message, signature, publicKey);
```


---

