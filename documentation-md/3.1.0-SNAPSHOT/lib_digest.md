---
title: digest
parent: Functions
nav_order: 105
---
# digest

Cryptographic hash functions for computing message digests used in integrity verification and content addressing.



---

## digest.sha3_256(Text data)

```sha3_256(TEXT data)```: Computes the SHA3-256 hash of the input data.

SHA3-256 is part of the SHA-3 family (Keccak) and produces a 256-bit hash.
It uses a different construction than SHA-2 and provides similar security
with different mathematical properties. Returns the hash as a lowercase
hexadecimal string.

**Examples:**
```sapl
policy "example"
permit
where
  digest.sha3_256("hello") == "3338be694f50c5f338814986cdf0686453a888b84f424d792af4b9202398f392";
```


---

## digest.sha3_384(Text data)

```sha3_384(TEXT data)```: Computes the SHA3-384 hash of the input data.

SHA3-384 is part of the SHA-3 family and produces a 384-bit hash. It provides
stronger security than SHA3-256 with a different security/performance tradeoff
than SHA-2. Returns the hash as a lowercase hexadecimal string.

**Examples:**
```sapl
policy "example"
permit
where
  var hash = digest.sha3_384("hello");
  hash == "720aea11019ef06440fbf05d87aa24680a2153df3907b23631e7177ce620fa1330ff07c0fddee54699a4c3ee0ee9d887";
```


---

## digest.sha1(Text data)

```sha1(TEXT data)```: Computes the SHA-1 hash of the input data.

**⚠ WARNING: SHA-1 is cryptographically weak and should not be used for security
purposes.** It is vulnerable to collision attacks. Only use SHA-1 for compatibility
with legacy systems or when required by existing protocols.

Produces a 160-bit (20-byte) hash as a lowercase hexadecimal string.

**Examples:**
```sapl
policy "example"
permit
where
  digest.sha1("hello") == "aaf4c61ddcc5e8a2dabede0f3b482cd9aea9434d";
```


---

## digest.md5(Text data)

```md5(TEXT data)```: Computes the MD5 hash of the input data.

**⚠ WARNING: MD5 is cryptographically broken and should not be used for security
purposes.** It is vulnerable to collision attacks. Only use MD5 for compatibility
with legacy systems or non-security applications like checksums.

Produces a 128-bit (16-byte) hash as a lowercase hexadecimal string.

**Examples:**
```sapl
policy "example"
permit
where
  digest.md5("hello") == "5d41402abc4b2a76b9719d911017c592";
```


---

## digest.sha256(Text data)

```sha256(TEXT data)```: Computes the SHA-256 hash of the input data.

SHA-256 is part of the SHA-2 family and produces a 256-bit (32-byte) hash.
It is widely used and considered secure for most applications. Returns the
hash as a lowercase hexadecimal string.

**Examples:**
```sapl
policy "example"
permit
where
  digest.sha256("hello") == "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824";
  digest.sha256("") == "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
```


---

## digest.sha512(Text data)

```sha512(TEXT data)```: Computes the SHA-512 hash of the input data.

SHA-512 is part of the SHA-2 family and produces a 512-bit (64-byte) hash.
It provides the strongest security in the SHA-2 family and is recommended
for high-security applications. Returns the hash as a lowercase hexadecimal string.

**Examples:**
```sapl
policy "example"
permit
where
  var hash = digest.sha512("hello");
  hash == "9b71d224bd62f3785d96d46ad3ea3d73319bfbc2890caadae2dff72519673ca72323c3d99ba5c11d7c7acc6e14b8c5da0c4663475c2e5c3adef46f73bcdec043";
```


---

## digest.sha384(Text data)

```sha384(TEXT data)```: Computes the SHA-384 hash of the input data.

SHA-384 is part of the SHA-2 family and produces a 384-bit (48-byte) hash.
It provides stronger security than SHA-256 while being faster than SHA-512
on 64-bit systems. Returns the hash as a lowercase hexadecimal string.

**Examples:**
```sapl
policy "example"
permit
where
  var hash = digest.sha384("hello");
  hash == "59e1748777448c69de6b800d7a33bbfb9ff1b463e44354c3553bcdb9c666fa90125a3c79f90397bdf5f6a13de828684f";
```


---

## digest.sha3_512(Text data)

```sha3_512(TEXT data)```: Computes the SHA3-512 hash of the input data.

SHA3-512 is part of the SHA-3 family and produces a 512-bit hash. It provides
the strongest security in the SHA-3 family with different mathematical properties
than SHA-512. Returns the hash as a lowercase hexadecimal string.

**Examples:**
```sapl
policy "example"
permit
where
  var hash = digest.sha3_512("hello");
  hash == "75d527c368f2efe848ecf6b073a36767800805e9eef2b1857d5f984f036eb6df891d75f72d9b154518c1cd58835286d1da9a38deba3de98b5a53e5ed78a84976";
```


---

