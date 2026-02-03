---
layout: default
title: x509
parent: Functions
grand_parent: SAPL Reference
nav_order: 133
---
# x509

Functions for certificate-based access control in mTLS and PKI scenarios.



---

## parseCertificate

```parseCertificate(TEXT certPem)```: Parses an X.509 certificate and returns its structure.

Accepts certificates in PEM or DER format and returns a JSON object containing all
certificate fields including subject, issuer, validity dates, serial number, and
public key information. Use this when multiple certificate properties are needed
in a single policy.

Example - Validate multiple certificate properties for mTLS:
```sapl
policy "require valid partner certificate"
permit action == "api.call";
  var cert = x509.parseCertificate(request.clientCertificate);
  cert.subject =~ "O=Trusted Partners Inc";
  cert.issuer =~ "CN=Internal CA";
  cert.serialNumber in resource.allowedSerials;
```


---

## extractSubjectDn

```extractSubjectDn(TEXT certPem)```: Extracts the Subject Distinguished Name.

Returns the full DN string in RFC 2253 format. Use this for matching against
specific organizations or organizational units in certificate-based access control.

Example - Restrict access to specific department:
```sapl
policy "allow hr department only"
permit action == "read" && resource.type == "personnel-records"
  var subjectDn = x509.extractSubjectDn(request.clientCertificate);
  subjectDn =~ "OU=Human Resources,O=Acme Corp";
```


---

## extractIssuerDn

```extractIssuerDn(TEXT certPem)```: Extracts the Issuer Distinguished Name.

Returns the full issuer DN string in RFC 2253 format. Use this to verify
certificates were issued by trusted CAs.

Example - Require certificates from internal CA:
```sapl
policy "internal ca only"
permit
  var issuerDn = x509.extractIssuerDn(request.clientCertificate);
  issuerDn =~ "CN=Acme Internal CA,O=Acme Corp";
```


---

## extractCommonName

```extractCommonName(TEXT certPem)```: Extracts the Common Name from the subject.

Returns just the CN field from the certificate subject, which typically contains
the hostname or entity name. This is simpler than parsing the full DN when only
the CN is needed.

Example - Verify service identity in mTLS:
```sapl
policy "service-to-service auth"
permit action == "invoke";
  var serviceName = x509.extractCommonName(request.clientCertificate);
  serviceName in resource.allowedServices;
```


---

## extractSerialNumber

```extractSerialNumber(TEXT certPem)```: Extracts the certificate serial number.

Returns the serial number as a decimal string. Use this for certificate revocation
checking or tracking specific certificates in audit logs.

Example - Block revoked certificates:
```sapl
policy "check revocation list"
deny
  var serial = x509.extractSerialNumber(request.clientCertificate);
  serial in data.revokedSerials;
```


---

## extractNotBefore

```extractNotBefore(TEXT certPem)```: Extracts the certificate validity start date.

Returns the date in ISO 8601 format. Use this to implement time-based access
restrictions or maintenance windows.

Example - Enforce staged certificate rollout:
```sapl
policy "new certificates only after cutover"
permit
  var notBefore = x509.extractNotBefore(request.clientCertificate);
  notBefore >= "2025-01-01T00:00:00Z";
```


---

## extractNotAfter

```extractNotAfter(TEXT certPem)```: Extracts the certificate validity end date.

Returns the date in ISO 8601 format. Use this to implement proactive certificate
renewal warnings or temporary access grants.

Example - Warn about expiring certificates:
```sapl
policy "certificate expiring soon"
permit
  var notAfter = x509.extractNotAfter(request.clientCertificate);
  notAfter < time.plusDays(time.now(), 30);
advice
  "certificate-renewal-warning"
```


---

## extractFingerprint

```extractFingerprint(TEXT certPem, TEXT algorithm)```: Computes the certificate fingerprint.

Computes the hash of the entire certificate using the specified algorithm (SHA-1,
SHA-256, or SHA-512). Returns the fingerprint as a hexadecimal string. Use this for
certificate pinning to ensure the exact certificate is being used.

Example - Certificate pinning for critical services:
```sapl
policy "pin database certificate"
permit action == "query" && resource.type == "production-db"
  var fingerprint = x509.extractFingerprint(request.clientCertificate, "SHA-256");
  x509.matchesFingerprint(request.clientCertificate, resource.expectedFingerprint, "SHA-256");
```


---

## matchesFingerprint

```matchesFingerprint(TEXT certPem, TEXT expectedFingerprint, TEXT algorithm)```: Checks if certificate matches expected fingerprint.

Computes the certificate fingerprint using the specified algorithm and compares it
to the expected value. This implements certificate pinning to ensure the exact
certificate is being used, preventing man-in-the-middle attacks.

Example - Pin production service certificates:
```sapl
policy "verify pinned certificate"
permit action == "connect" && resource.type == "payment-gateway"
  x509.matchesFingerprint(
    request.clientCertificate,
    "a1b2c3d4e5f6...",
    "SHA-256"
  );
```


---

## extractSubjectAltNames

```extractSubjectAltNames(TEXT certPem)```: Extracts Subject Alternative Names.

Returns an array of SANs, which can include DNS names, IP addresses, email addresses,
and URIs. Each entry is an object with type and value fields. Use this when the
certificate subject doesn't match the accessed resource name.

Example - Check SAN for virtual hosts:
```sapl
policy "allow san-based routing"
permit action == "route";
  var sans = x509.extractSubjectAltNames(request.clientCertificate);
  resource.hostname in sans[*].value;
```


---

## hasDnsName

```hasDnsName(TEXT certPem, TEXT dnsName)```: Checks if certificate contains a specific DNS name.

Checks both the subject CN and all Subject Alternative Names for the specified DNS
name. This is simpler than extracting SANs and checking manually, and handles
wildcard certificates correctly.

Example - Verify certificate is valid for accessed domain:
```sapl
policy "validate domain match"
permit action == "connect";
  x509.hasDnsName(request.serverCertificate, resource.domain);
```


---

## hasIpAddress

```hasIpAddress(TEXT certPem, TEXT ipAddress)```: Checks if certificate contains a specific IP address.

Checks Subject Alternative Names for the specified IP address. Use this when
authorizing connections from IP-identified clients rather than DNS-named hosts.

Example - Authorize by client IP:
```sapl
policy "allow specific ips"
permit action == "connect";
  x509.hasIpAddress(request.clientCertificate, request.sourceIp);
```


---

## isExpired

```isExpired(TEXT certPem)```: Checks if a certificate has expired.

Returns true if the current time is after the certificate's notAfter date. Use this
as a basic validity check before allowing access.

Example - Reject expired certificates:
```sapl
policy "reject expired certificates"
deny
  x509.isExpired(request.clientCertificate);
```


---

## isValidAt

```isValidAt(TEXT certPem, TEXT isoTimestamp)```: Checks if certificate is valid at a specific time.

Returns true if the given timestamp falls within the certificate's validity period
(between notBefore and notAfter). Use this for time-based access or historical
audit validation.

Example - Check validity during maintenance window:
```sapl
policy "maintenance window access"
permit action == "admin" && resource.type == "production"
  var maintenanceStart = "2025-06-15T02:00:00Z";
  x509.isValidAt(request.adminCertificate, maintenanceStart);
```


---

## remainingValidityDays

```remainingValidityDays(TEXT certPem)```: Returns the number of days until certificate expires.

Calculates how many days remain until the certificate's notAfter date. Returns a
negative number if already expired. Use this to trigger certificate renewal warnings
or implement graceful certificate rotation.

Example - Trigger renewal warning:
```sapl
policy "certificate renewal warning"
permit
  var daysRemaining = x509.remainingValidityDays(request.clientCertificate);
  daysRemaining > 0;
advice
  var daysRemaining = x509.remainingValidityDays(request.clientCertificate);
  daysRemaining < 30;
obligation
  {
    "type": "certificate-expiring-soon",
    "daysRemaining": daysRemaining
  }
```


---

