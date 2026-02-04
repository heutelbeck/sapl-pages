---
layout: default
title: encoding
parent: Functions
grand_parent: SAPL Reference
nav_order: 106
---
# encoding

Encoding and decoding functions for Base64 and hexadecimal representations used in cryptographic operations.



---

## base64Encode

```base64Encode(TEXT data)```: Encodes text data to Base64 standard format.

Uses the standard Base64 alphabet with '+' and '/' characters. Includes padding
with '=' characters to ensure the output length is a multiple of 4.

**Examples:**
```sapl
policy "example"
permit
  encoding.base64Encode("hello") == "aGVsbG8=";
  encoding.base64Encode("hello world") == "aGVsbG8gd29ybGQ=";
```


---

## base64DecodeStrict

```base64DecodeStrict(TEXT data)```: Decodes Base64 standard format to text (strict).

Decodes data encoded with the standard Base64 alphabet with strict validation.
Requires proper padding with '=' characters and input length to be a multiple of 4.
Rejects improperly formatted input that would be accepted by the lenient decoder.

The decoded output is validated as proper UTF-8. Invalid UTF-8 sequences will
result in an error.

**Examples:**
```sapl
policy "example"
permit
  encoding.base64DecodeStrict("aGVsbG8=") == "hello";
  // encoding.base64DecodeStrict("aGVsbG8") results in error (missing padding)
```


---

## isValidBase64

```isValidBase64(TEXT data)```: Checks whether text is valid Base64 standard format (lenient).

Validates that the text can be successfully decoded as Base64. This function is
lenient and accepts input with or without proper padding. For strict RFC-compliant
validation that requires proper padding, use isValidBase64Strict.

**Examples:**
```sapl
policy "example"
permit
  encoding.isValidBase64("aGVsbG8=") == true;
  encoding.isValidBase64("aGVsbG8") == true;  // lenient: missing padding accepted
  encoding.isValidBase64("invalid!@#") == false;
```


---

## isValidBase64Strict

```isValidBase64Strict(TEXT data)```: Checks whether text is valid Base64 standard format (strict).

Validates that the text is properly formatted Base64 with required padding.
Requires input length to be a multiple of 4 and padding characters to appear
only at the end if present. Rejects improperly formatted input that would be
accepted by the lenient validator.

**Examples:**
```sapl
policy "example"
permit
  encoding.isValidBase64Strict("aGVsbG8=") == true;
  encoding.isValidBase64Strict("aGVsbG8") == false;  // strict: missing padding rejected
  encoding.isValidBase64Strict("invalid!@#") == false;
```


---

## base64UrlEncode

```base64UrlEncode(TEXT data)```: Encodes text data to Base64 URL-safe format.

Uses the URL-safe Base64 alphabet with '-' and '_' instead of '+' and '/'.
This encoding is safe to use in URLs and filenames. Includes padding by default.

**Examples:**
```sapl
policy "example"
permit
  encoding.base64UrlEncode("hello") == "aGVsbG8=";
  encoding.base64UrlEncode("test?data") == "dGVzdD9kYXRh";
```


---

## base64UrlDecodeStrict

```base64UrlDecodeStrict(TEXT data)```: Decodes Base64 URL-safe format to text (strict).

Decodes data encoded with the URL-safe Base64 alphabet with strict validation.
Requires proper padding with '=' characters and input length to be a multiple of 4.
Rejects improperly formatted input that would be accepted by the lenient decoder.

The decoded output is validated as proper UTF-8. Invalid UTF-8 sequences will
result in an error.

**Examples:**
```sapl
policy "example"
permit
  encoding.base64UrlDecodeStrict("aGVsbG8=") == "hello";
  // encoding.base64UrlDecodeStrict("aGVsbG8") results in error (missing padding)
```


---

## isValidBase64Url

```isValidBase64Url(TEXT data)```: Checks whether text is valid Base64 URL-safe format (lenient).

Validates that the text can be successfully decoded as URL-safe Base64. This
function is lenient and accepts both padded and unpadded input. For strict
validation that requires proper padding, use isValidBase64UrlStrict.

**Examples:**
```sapl
policy "example"
permit
  encoding.isValidBase64Url("aGVsbG8=") == true;
  encoding.isValidBase64Url("aGVsbG8") == true;  // lenient: unpadded accepted
  encoding.isValidBase64Url("invalid+/") == false;  // wrong alphabet
```


---

## isValidBase64UrlStrict

```isValidBase64UrlStrict(TEXT data)```: Checks whether text is valid Base64 URL-safe format (strict).

Validates that the text is properly formatted URL-safe Base64 with required padding.
Requires input length to be a multiple of 4 and padding characters to appear only
at the end if present. Rejects improperly formatted input that would be accepted
by the lenient validator.

**Examples:**
```sapl
policy "example"
permit
  encoding.isValidBase64UrlStrict("aGVsbG8=") == true;
  encoding.isValidBase64UrlStrict("aGVsbG8") == false;  // strict: missing padding rejected
  encoding.isValidBase64UrlStrict("invalid+/") == false;
```


---

## hexDecode

```hexDecode(TEXT data)```: Decodes hexadecimal representation to text.

Converts pairs of hexadecimal digits back to bytes and interprets as UTF-8 text.
Accepts both uppercase and lowercase letters. Underscores are allowed as separators.
The input must have an even number of hex characters (excluding underscores).

The decoded output is validated as proper UTF-8. Invalid UTF-8 sequences will
result in an error.

**Examples:**
```sapl
policy "example"
permit
  encoding.hexDecode("68656c6c6f") == "hello";
  encoding.hexDecode("68656C6C6F") == "hello";  // uppercase works
  encoding.hexDecode("68_65_6c_6c_6f") == "hello";  // underscores allowed
```


---

## isValidHex

```isValidHex(TEXT data)```: Checks whether text is valid hexadecimal representation.

Validates that the text contains only hexadecimal characters (0-9, a-f, A-F) and
has an even number of characters. Underscores are allowed as separators and do
not count toward the character count requirement.

**Examples:**
```sapl
policy "example"
permit
  encoding.isValidHex("68656c6c6f") == true;
  encoding.isValidHex("68656C6C6F") == true;
  encoding.isValidHex("68_65_6c_6c_6f") == true;
  encoding.isValidHex("xyz") == false;
  encoding.isValidHex("123") == false;  // odd number of characters
```


---

## base64Decode

```base64Decode(TEXT data)```: Decodes Base64 standard format to text (lenient).

Decodes data encoded with the standard Base64 alphabet. This function is lenient
and accepts input with or without proper padding. For strict RFC-compliant
validation that requires proper padding, use base64DecodeStrict.

The decoded output is validated as proper UTF-8. Invalid UTF-8 sequences will
result in an error.

**Examples:**
```sapl
policy "example"
permit
  encoding.base64Decode("aGVsbG8=") == "hello";
  encoding.base64Decode("aGVsbG8") == "hello";  // lenient: missing padding accepted
```


---

## base64UrlDecode

```base64UrlDecode(TEXT data)```: Decodes Base64 URL-safe format to text (lenient).

Decodes data encoded with the URL-safe Base64 alphabet. This function is lenient
and accepts input with or without proper padding. For strict RFC-compliant
validation that requires proper padding, use base64UrlDecodeStrict.

The decoded output is validated as proper UTF-8. Invalid UTF-8 sequences will
result in an error.

**Examples:**
```sapl
policy "example"
permit
  encoding.base64UrlDecode("aGVsbG8=") == "hello";
  encoding.base64UrlDecode("aGVsbG8") == "hello";  // lenient: missing padding accepted
```


---

## hexEncode

```hexEncode(TEXT data)```: Encodes text data to hexadecimal representation.

Converts each byte of the UTF-8 encoded text to two hexadecimal digits.
Output uses lowercase letters (a-f).

**Examples:**
```sapl
policy "example"
permit
  encoding.hexEncode("hello") == "68656c6c6f";
  encoding.hexEncode("A") == "41";
```


---

