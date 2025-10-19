---
layout: default
title: x509
parent: Functions
grand_parent: SAPL Reference
nav_order: 135
---
# x509

Functions for parsing and extracting information from X.509 certificates used in PKI and TLS/SSL.



---

## x509.extractSubjectDn(Text certificatePem)

```extractSubjectDn(TEXT certPem)```: Extracts the Subject Distinguished Name from a certificate.

Returns the full DN string in RFC 2253 format (e.g., "CN=example.com,O=Example Corp,C=US").

**Examples:**
```sapl
policy "check subject"
permit
where
  var subjectDn = x509.extractSubjectDn(certPem);
  subjectDn =~ "CN=.*\.example\.com";
```


---

## x509.extractSerialNumber(Text certificatePem)

```extractSerialNumber(TEXT certPem)```: Extracts the certificate serial number.

Returns the serial number as a decimal string.

**Examples:**
```sapl
policy "check serial"
permit
where
  x509.extractSerialNumber(certPem) == "123456789";
```


---

## x509.isExpired(Text certificatePem)

```isExpired(TEXT certPem)```: Checks if a certificate has expired.

Returns true if the current time is after the certificate's notAfter date.

**Examples:**
```sapl
policy "reject expired"
deny
where
  x509.isExpired(clientCertificate);
```


---

## x509.parseCertificate(Text certificatePem)

```parseCertificate(TEXT certPem)```: Parses an X.509 certificate and returns its structure.

Accepts certificates in PEM or DER format and returns a JSON object containing
all certificate fields including subject, issuer, validity dates, serial number,
and public key information.

**Examples:**
```sapl
policy "parse certificate"
permit
where
  var cert = x509.parseCertificate(certPem);
  cert.subject.commonName == "example.com";
  cert.serialNumber == "1234567890";
```


---

## x509.isValidAt(Text certificatePem, Text isoTimestamp)

```isValidAt(TEXT certPem, TEXT isoTimestamp)```: Checks if a certificate is valid at a specific time.

Returns true if the given timestamp falls within the certificate's validity period
(between notBefore and notAfter).

**Examples:**
```sapl
policy "check historical validity"
permit
where
  x509.isValidAt(certPem, "2024-06-15T12:00:00Z");
```


---

## x509.extractIssuerDn(Text certificatePem)

```extractIssuerDn(TEXT certPem)```: Extracts the Issuer Distinguished Name from a certificate.

Returns the full issuer DN string in RFC 2253 format.

**Examples:**
```sapl
policy "check issuer"
permit
where
  var issuerDn = x509.extractIssuerDn(certPem);
  issuerDn =~ "O=Trusted CA";
```


---

## x509.extractNotAfter(Text certificatePem)

```extractNotAfter(TEXT certPem)```: Extracts the certificate validity end date.

Returns the date in ISO 8601 format (e.g., "2025-12-31T23:59:59Z").

**Examples:**
```sapl
policy "check expiration"
permit
where
  var notAfter = x509.extractNotAfter(certPem);
  notAfter > "2025-01-01T00:00:00Z";
```


---

## x509.extractFingerprint(Text certificatePem, Text algorithm)

```extractFingerprint(TEXT certPem, TEXT algorithm)```: Computes the certificate fingerprint.

Calculates the fingerprint (hash of the certificate) using the specified algorithm.
Returns the fingerprint as a lowercase hexadecimal string.

Supported algorithms: "SHA-1", "SHA-256", "SHA-384", "SHA-512"

**Examples:**
```sapl
policy "pin certificate"
permit
where
  var fingerprint = x509.extractFingerprint(certPem, "SHA-256");
  fingerprint == "expected_fingerprint_value";
```


---

## x509.extractSubjectAltNames(Text certificatePem)

```extractSubjectAltNames(TEXT certPem)```: Extracts Subject Alternative Names from a certificate.

Returns an array of SANs, which can include DNS names, IP addresses, email addresses,
and URIs. Each entry is an object with 'type' and 'value' fields.

**Examples:**
```sapl
policy "check san"
permit
where
  var sans = x509.extractSubjectAltNames(certPem);
  "example.com" in sans[*].value;
```


---

## x509.extractNotBefore(Text certificatePem)

```extractNotBefore(TEXT certPem)```: Extracts the certificate validity start date.

Returns the date in ISO 8601 format (e.g., "2024-01-01T00:00:00Z").

**Examples:**
```sapl
policy "check validity start"
permit
where
  var notBefore = x509.extractNotBefore(certPem);
  notBefore < "2025-01-01T00:00:00Z";
```


---

