---
layout: default
title: numeral
parent: Functions
nav_order: 119
---
# numeral

Numeric base conversion for authorization policies.

# Numeric Base Conversion

Convert between numeric values and their string representations in different bases.
Parse hexadecimal, binary, and octal strings into numbers for permission masks,
hardware identifiers, and encoded resource IDs. Format numbers for logging and
display in various notations.

## Core Principles

All conversions use 64-bit signed long integers with two's complement representation
for negative numbers. Parsing accepts optional prefixes (0x for hex, 0b for binary,
0o for octal), optional sign prefixes, and underscores as visual separators. Formatting
functions produce unprefixed output by default, with separate functions for prefixed
and padded output.

Negative numbers in two's complement representation appear as large unsigned values
when formatted. For example, -1 becomes "FFFFFFFFFFFFFFFF" in hexadecimal (all 64
bits set). Sign-prefixed strings like "-1" are accepted as input for convenience.

## Access Control Patterns

Parse permission masks from configuration files or external systems that store
permissions as hexadecimal strings.

```sapl
policy "parse_permission_mask"
permit
where
    var maskString = resource.config.permissionMask;
    numeral.isValidHex(maskString);
    var mask = numeral.fromHex(maskString);
    bitwise.bitwiseAnd(subject.permissions, mask) == mask;
```

Validate input formats before processing to prevent injection attacks or malformed
data from reaching authorization logic.

```sapl
policy "validate_hardware_id"
permit action == "register_device"
where
    numeral.isValidHex(resource.deviceId);
    var deviceId = numeral.fromHex(resource.deviceId);
    deviceId > 0;
```

Convert hardware addresses or device identifiers from hexadecimal notation for
comparison and matching.

```sapl
policy "device_id_filter"
permit action == "network_access"
where
    var deviceId = numeral.fromHex(subject.deviceId);
    var allowedRange = numeral.fromHex("001A2B000000");
    deviceId >= allowedRange;
```

Format permission values as hexadecimal for logging or display without exposing
internal numeric representations.

```sapl
policy "log_permissions"
permit
obligation
    {
        "type": "log",
        "permissions": numeral.toHexPrefixed(subject.permissions)
    }
```

Parse binary strings from feature flag systems or bit-encoded configurations.

```sapl
policy "feature_flags"
permit
where
    var flagsString = resource.config.features;
    numeral.isValidBinary(flagsString);
    var flags = numeral.fromBinary(flagsString);
    bitwise.testBit(flags, 5);
```

Convert octal file permission strings from Unix-style systems for permission
checking.

```sapl
policy "file_permissions"
permit action == "read_file"
where
    var permString = resource.file.permissions;
    var permissions = numeral.fromOctal(permString);
    bitwise.bitwiseAnd(permissions, 4) == 4;
```


---

## numeral.toHexPrefixed(Long value)

```numeral.toHexPrefixed(LONG value)```

Converts a number to hexadecimal with the "0x" prefix. Returns uppercase letters
(A-F) with a "0x" prefix. Negative numbers are represented using 64-bit two's
complement notation.

Parameters:
- value: Number to convert

Returns: Prefixed hexadecimal string

Example - format for logging:
```sapl
policy "example"
permit
obligation
    {
        "type": "log",
        "deviceId": numeral.toHexPrefixed(resource.deviceId)
    }
```


---

## numeral.toHex(Long value)

```numeral.toHex(LONG value)```

Converts a number to its hexadecimal string representation. Returns uppercase
letters (A-F) without any prefix. Negative numbers are represented using 64-bit
two's complement notation.

Parameters:
- value: Number to convert

Returns: Hexadecimal string

Example:
```sapl
policy "example"
permit
where
    numeral.toHex(255) == "FF";
    numeral.toHex(4095) == "FFF";
```


---

## numeral.toBinary(Long value)

```numeral.toBinary(LONG value)```

Converts a number to its binary string representation. Returns a string of 1s
and 0s without any prefix. Negative numbers are represented using 64-bit two's
complement notation.

Parameters:
- value: Number to convert

Returns: Binary string

Example:
```sapl
policy "example"
permit
where
    numeral.toBinary(10) == "1010";
    numeral.toBinary(255) == "11111111";
```


---

## numeral.fromHex(Text value)

```numeral.fromHex(TEXT value)```

Parses a hexadecimal string and returns the corresponding number. Accepts strings
with or without the "0x" or "0X" prefix. Letters may be uppercase or lowercase.
Underscores are allowed as visual separators. Negative numbers can be represented
with a sign prefix or as full 64-bit two's complement values.

Parameters:
- value: Hexadecimal string to parse

Returns: Parsed number

Example - parse permission mask from config:
```sapl
policy "example"
permit
where
    var mask = numeral.fromHex("0xFF");
    bitwise.bitwiseAnd(subject.permissions, mask) == mask;
```


---

## numeral.toOctalPrefixed(Long value)

```numeral.toOctalPrefixed(LONG value)```

Converts a number to octal with the "0o" prefix. Returns a string of digits 0-7
with a "0o" prefix. Negative numbers are represented using 64-bit two's complement
notation.

Parameters:
- value: Number to convert

Returns: Prefixed octal string

Example:
```sapl
policy "example"
permit
where
    numeral.toOctalPrefixed(63) == "0o77";
```


---

## numeral.isValidOctal(Text value)

```numeral.isValidOctal(TEXT value)```

Checks whether a string is a valid octal representation. Accepts strings with
or without the "0o" or "0O" prefix. Only digits 0-7 are valid. Underscores are
allowed as visual separators. Sign prefixes are accepted. Empty strings and
strings with only whitespace are considered invalid.

Parameters:
- value: String to validate

Returns: Boolean indicating validity

Example:
```sapl
policy "example"
permit
where
    numeral.isValidOctal(resource.file.permissions);
```


---

## numeral.toOctalPadded(Long value, Long width)

```numeral.toOctalPadded(LONG value, LONG width)```

Converts a number to octal with zero-padding to a minimum width. Returns a string
of digits 0-7 padded with leading zeros to reach the specified width. If the natural
representation is already wider than the specified width, no truncation occurs and
the full representation is returned.

Parameters:
- value: Number to convert
- width: Minimum width (must be positive)

Returns: Padded octal string

Example:
```sapl
policy "example"
permit
where
    numeral.toOctalPadded(63, 4) == "0077";
```


---

## numeral.isValidHex(Text value)

```numeral.isValidHex(TEXT value)```

Checks whether a string is a valid hexadecimal representation. Accepts strings
with or without the "0x" or "0X" prefix. Letters may be uppercase or lowercase.
Underscores are allowed as visual separators. Sign prefixes are accepted. Empty
strings and strings with only whitespace are considered invalid.

Parameters:
- value: String to validate

Returns: Boolean indicating validity

Example - validate before parsing:
```sapl
policy "example"
permit action == "register_device"
where
    numeral.isValidHex(resource.deviceId);
```


---

## numeral.isValidBinary(Text value)

```numeral.isValidBinary(TEXT value)```

Checks whether a string is a valid binary representation. Accepts strings with
or without the "0b" or "0B" prefix. Only digits 0 and 1 are valid. Underscores
are allowed as visual separators. Sign prefixes are accepted. Empty strings and
strings with only whitespace are considered invalid.

Parameters:
- value: String to validate

Returns: Boolean indicating validity

Example:
```sapl
policy "example"
permit
where
    numeral.isValidBinary(resource.flagString);
```


---

## numeral.toBinaryPrefixed(Long value)

```numeral.toBinaryPrefixed(LONG value)```

Converts a number to binary with the "0b" prefix. Returns a string of 1s and 0s
with a "0b" prefix. Negative numbers are represented using 64-bit two's complement
notation.

Parameters:
- value: Number to convert

Returns: Prefixed binary string

Example:
```sapl
policy "example"
permit
where
    numeral.toBinaryPrefixed(10) == "0b1010";
```


---

## numeral.fromBinary(Text value)

```numeral.fromBinary(TEXT value)```

Parses a binary string and returns the corresponding number. Accepts strings with
or without the "0b" or "0B" prefix. Only digits 0 and 1 are valid. Underscores
are allowed as visual separators. Negative numbers can be represented with a sign
prefix or as full 64-bit two's complement values.

Parameters:
- value: Binary string to parse

Returns: Parsed number

Example - parse feature flags:
```sapl
policy "example"
permit
where
    var flags = numeral.fromBinary("11110000");
    bitwise.testBit(flags, 7);
```


---

## numeral.toOctal(Long value)

```numeral.toOctal(LONG value)```

Converts a number to its octal string representation. Returns a string of digits
0-7 without any prefix. Negative numbers are represented using 64-bit two's
complement notation.

Parameters:
- value: Number to convert

Returns: Octal string

Example:
```sapl
policy "example"
permit
where
    numeral.toOctal(63) == "77";
    numeral.toOctal(493) == "755";
```


---

## numeral.toHexPadded(Long value, Long width)

```numeral.toHexPadded(LONG value, LONG width)```

Converts a number to hexadecimal with zero-padding to a minimum width. Returns
uppercase letters (A-F) padded with leading zeros to reach the specified width.
If the natural representation is already wider than the specified width, no
truncation occurs and the full representation is returned.

Parameters:
- value: Number to convert
- width: Minimum width (must be positive)

Returns: Padded hexadecimal string

Example - format device ID with fixed width:
```sapl
policy "example"
permit
where
    numeral.toHexPadded(255, 4) == "00FF";
```


---

## numeral.toBinaryPadded(Long value, Long width)

```numeral.toBinaryPadded(LONG value, LONG width)```

Converts a number to binary with zero-padding to a minimum width. Returns a string
of 1s and 0s padded with leading zeros to reach the specified width. If the natural
representation is already wider than the specified width, no truncation occurs and
the full representation is returned.

Parameters:
- value: Number to convert
- width: Minimum width (must be positive)

Returns: Padded binary string

Example - format with fixed width:
```sapl
policy "example"
permit
where
    numeral.toBinaryPadded(10, 8) == "00001010";
```


---

## numeral.fromOctal(Text value)

```numeral.fromOctal(TEXT value)```

Parses an octal string and returns the corresponding number. Accepts strings with
or without the "0o" or "0O" prefix. Only digits 0-7 are valid. Underscores are
allowed as visual separators. Negative numbers can be represented with a sign
prefix or as full 64-bit two's complement values.

Parameters:
- value: Octal string to parse

Returns: Parsed number

Example - parse Unix file permissions:
```sapl
policy "example"
permit action == "read_file"
where
    var permissions = numeral.fromOctal(resource.file.mode);
    bitwise.bitwiseAnd(permissions, 4) == 4;
```


---

