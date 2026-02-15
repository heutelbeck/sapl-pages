---
layout: default
title: signature
parent: Functions
grand_parent: SAPL Reference
nav_order: 125
---
# signature

Digital signature verification functions for RSA, ECDSA, and EdDSA signatures using public key cryptography.

# Digital Signature Verification

Verify digital signatures using public key cryptography. All functions take
a message, signature, and PEM-encoded public key, returning true if valid.

## Algorithm Selection

| Algorithm        | Function            | Key Size | Use Case                |
|------------------|---------------------|----------|-------------------------|
| RSA + SHA-256    | `isValidRsaSha256`  | 2048+    | General purpose, legacy |
| RSA + SHA-512    | `isValidRsaSha512`  | 2048+    | High security RSA       |
| ECDSA P-256      | `isValidEcdsaP256`  | 256-bit  | Modern, compact         |
| ECDSA P-384      | `isValidEcdsaP384`  | 384-bit  | Government compliance   |
| Ed25519          | `isValidEd25519`    | 256-bit  | Fast, modern default    |

## API Request Authentication

Verify signed API requests before processing:

```sapl
policy "verify api signature"
permit
    action == "api:call"
where
    var payload = action.requestBody;
    var sig = action.headers.signature;
    var pubKey = subject.registeredPublicKey;
    signature.isValidEd25519(payload, sig, pubKey);
```

Example: `action.requestBody = "{"amount":100}"`, `action.headers.signature`
is the Base64-encoded Ed25519 signature. `subject.registeredPublicKey` is
a PEM string like `-----BEGIN PUBLIC KEY-----\nMCo...\n-----END PUBLIC KEY-----`.
Returns true if the signature was created with the matching private key.

## Document Integrity Check

Ensure documents haven't been tampered with:

```sapl
policy "verify document"
permit
    action == "view"
where
    signature.isValidRsaSha256(
        resource.content,
        resource.signature,
        environment.trustedSignerKey
    );
```

Example: `resource.content` is the document text, `resource.signature` is
hex-encoded (e.g., "3045022100..."). Signature format is auto-detected
(hex or Base64). Returns true if document is authentic.


---

## isValidRsaSha256

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
  var message = "request payload";
  var signature = "signature_from_header";
  var publicKey = "-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----";
  signature.isValidRsaSha256(message, signature, publicKey);
```


---

## isValidRsaSha384

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
  signature.isValidRsaSha384(document, documentSignature, trustedPublicKey);
```


---

## isValidRsaSha512

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
  signature.isValidRsaSha512(criticalData, dataSignature, certifiedPublicKey);
```


---

## isValidEcdsaP256

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
  signature.isValidEcdsaP256(transaction, transactionSig, userPublicKey);
```


---

## isValidEcdsaP384

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
  signature.isValidEcdsaP384(sensitiveData, dataSig, trustedEcKey);
```


---

## isValidEcdsaP521

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
  signature.isValidEcdsaP521(highSecurityData, dataSig, ecPublicKey);
```


---

## isValidEd25519

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
  signature.isValidEd25519(blockData, blockSignature, validatorKey);
```


---

