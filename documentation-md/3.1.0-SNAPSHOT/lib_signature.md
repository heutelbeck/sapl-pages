---
title: signature
parent: Functions
nav_order: 127
---
# signature

Digital signature verification functions for RSA, ECDSA, and EdDSA signatures using public key cryptography.



---

## signature.verifyEcdsaP256(Text message, Text signature, Text publicKeyPem)

```verifyEcdsaP256(TEXT message, TEXT signature, TEXT publicKeyPem)```: Verifies an ECDSA signature using P-256 curve.

Verifies ECDSA (Elliptic Curve Digital Signature Algorithm) signatures using the
P-256 (secp256r1) curve with SHA-256. ECDSA provides equivalent security to RSA
with smaller key sizes.

**Parameters:**
- message: The original message that was signed
- signature: The signature in hexadecimal or Base64 format
- publicKeyPem: The EC public key in PEM format

**Examples:**
```sapl
policy "verify ecdsa signature"
permit
where
  signature.verifyEcdsaP256(transaction, transactionSig, userPublicKey);
```


---

## signature.verifyEd25519(Text message, Text signature, Text publicKeyPem)

```verifyEd25519(TEXT message, TEXT signature, TEXT publicKeyPem)```: Verifies an Ed25519 signature.

Verifies EdDSA (Edwards-curve Digital Signature Algorithm) signatures using the
Ed25519 curve. Ed25519 is a modern signature scheme that is fast, secure, and
has small keys and signatures.

Commonly used in modern cryptographic protocols and blockchain applications.

**Parameters:**
- message: The original message that was signed
- signature: The signature in hexadecimal or Base64 format
- publicKeyPem: The Ed25519 public key in PEM format

**Examples:**
```sapl
policy "verify ed25519 signature"
permit
where
  signature.verifyEd25519(blockData, blockSignature, validatorKey);
```


---

## signature.verifyEcdsaP384(Text message, Text signature, Text publicKeyPem)

```verifyEcdsaP384(TEXT message, TEXT signature, TEXT publicKeyPem)```: Verifies an ECDSA signature using P-384 curve.

Verifies ECDSA signatures using the P-384 (secp384r1) curve with SHA-384.
Provides stronger security than P-256.

**Parameters:**
- message: The original message that was signed
- signature: The signature in hexadecimal or Base64 format
- publicKeyPem: The EC public key in PEM format

**Examples:**
```sapl
policy "verify ecdsa p384"
permit
where
  signature.verifyEcdsaP384(sensitiveData, dataSig, trustedEcKey);
```


---

## signature.verifyRsaSha384(Text message, Text signature, Text publicKeyPem)

```verifyRsaSha384(TEXT message, TEXT signature, TEXT publicKeyPem)```: Verifies an RSA signature using SHA-384.

Verifies RSA signatures using SHA-384 hash algorithm. Provides stronger security
than SHA-256 for high-security applications.

**Parameters:**
- message: The original message that was signed
- signature: The signature in hexadecimal or Base64 format
- publicKeyPem: The RSA public key in PEM format

**Examples:**
```sapl
policy "verify document signature"
permit
where
  signature.verifyRsaSha384(document, documentSignature, trustedPublicKey);
```


---

## signature.verifyEcdsaP521(Text message, Text signature, Text publicKeyPem)

```verifyEcdsaP521(TEXT message, TEXT signature, TEXT publicKeyPem)```: Verifies an ECDSA signature using P-521 curve.

Verifies ECDSA signatures using the P-521 (secp521r1) curve with SHA-512.
Provides the strongest security in the NIST EC curves.

**Parameters:**
- message: The original message that was signed
- signature: The signature in hexadecimal or Base64 format
- publicKeyPem: The EC public key in PEM format

**Examples:**
```sapl
policy "verify ecdsa p521"
permit
where
  signature.verifyEcdsaP521(highSecurityData, dataSig, ecPublicKey);
```


---

## signature.verifyRsaSha256(Text message, Text signature, Text publicKeyPem)

```verifyRsaSha256(TEXT message, TEXT signature, TEXT publicKeyPem)```: Verifies an RSA signature using SHA-256.

Verifies that the signature was created by signing the message with the private key
corresponding to the provided public key. The signature should be provided as a
hexadecimal or Base64 string.

Commonly used for API authentication and document signing.

**Parameters:**
- message: The original message that was signed
- signature: The signature in hexadecimal or Base64 format
- publicKeyPem: The RSA public key in PEM format

**Examples:**
```sapl
policy "verify api signature"
permit
where
  var message = "request payload";
  var signature = "signature_from_header";
  var publicKey = "-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----";
  signature.verifyRsaSha256(message, signature, publicKey);
```


---

## signature.verifyRsaSha512(Text message, Text signature, Text publicKeyPem)

```verifyRsaSha512(TEXT message, TEXT signature, TEXT publicKeyPem)```: Verifies an RSA signature using SHA-512.

Verifies RSA signatures using SHA-512 hash algorithm. Provides the strongest
security in the RSA-SHA2 family.

**Parameters:**
- message: The original message that was signed
- signature: The signature in hexadecimal or Base64 format
- publicKeyPem: The RSA public key in PEM format

**Examples:**
```sapl
policy "verify high-security signature"
permit
where
  signature.verifyRsaSha512(criticalData, dataSignature, certifiedPublicKey);
```


---

