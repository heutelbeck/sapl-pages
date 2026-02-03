---
layout: default
title: bitwise
parent: Functions
grand_parent: SAPL Reference
nav_order: 102
---
# bitwise

Bitwise operations for authorization policies using 64-bit signed long integers.

# Bitwise Operations

Bitwise manipulation of 64-bit signed long integers for permission management in
authorization policies. Test individual permission bits, combine permission sets,
and manipulate feature flags using compact bit representations.

## Core Principles

All operations use 64-bit signed long integers with two's complement representation
for negative numbers. Bit positions are numbered from right to left, starting at 0
for the least significant bit and ending at 63 for the most significant bit (sign bit).
Shift and rotate operations accept position values from 0 to 63 inclusive.

A single 64-bit integer represents up to 64 distinct permissions or feature flags.
Each bit position corresponds to one permission. Operations execute in constant time
regardless of how many permissions are checked.

## Access Control Patterns

Store permissions as bit flags where each bit position represents a specific permission.
Check if a user has required permissions by testing individual bits.

```sapl
policy "check_read_permission"
permit action == "read_document";
    var READ_PERMISSION = 0;
    bitwise.testBit(subject.permissions, READ_PERMISSION);
```

Combine permission sets using bitwise OR when merging permissions from multiple sources
like direct grants and group memberships.

```sapl
policy "merge_permissions"
permit
    var direct = subject.directPermissions;
    var inherited = subject.groupPermissions;
    var combined = bitwise.bitwiseOr(direct, inherited);
    var REQUIRED_PERMISSIONS = 15;
    bitwise.bitwiseAnd(combined, REQUIRED_PERMISSIONS) == REQUIRED_PERMISSIONS;
```

Use bitwise AND to check if all required permissions are present. When the result of
ANDing user permissions with required permissions equals the required permissions,
all necessary bits are set.

```sapl
policy "require_all_permissions"
permit action == "admin_panel";
    var ADMIN_PERMS = 240;
    bitwise.bitwiseAnd(subject.permissions, ADMIN_PERMS) == ADMIN_PERMS;
```

Implement feature flags by testing individual bits. Each bit represents whether a
specific feature is enabled for the user.

```sapl
policy "feature_access"
permit action == "use_beta_feature";
    var BETA_FEATURES_BIT = 5;
    bitwise.testBit(subject.featureFlags, BETA_FEATURES_BIT);
```

Remove specific permissions by clearing bits. This revokes individual permissions
without affecting others.

```sapl
policy "revoke_permission"
permit
transform
    var WRITE_BIT = 1;
    subject.permissions = bitwise.clearBit(subject.permissions, WRITE_BIT);
```

Count active permissions or enabled features using bit counting. This enforces
constraints on total permission counts.

```sapl
policy "limit_permission_count"
deny action == "grant_permission";
    bitwise.bitCount(subject.permissions) >= 10;
```

Use XOR to toggle permissions or feature flags. This switches between states without
conditional logic.

```sapl
policy "toggle_debug_mode"
permit action == "toggle_debug";
transform
    var DEBUG_BIT = 7;
    subject.flags = bitwise.toggleBit(subject.flags, DEBUG_BIT);
```


---

## bitCount

```bitwise.bitCount(LONG value)```

Returns the number of one-bits in the two's complement binary representation.
Useful for counting how many permissions are granted or features are enabled.

Parameters:
- value: Value to analyze

Returns: Number of one-bits

Example - enforce permission limit:
```sapl
policy "example"
deny action == "grant_permission";
    bitwise.bitCount(subject.permissions) >= 10;
```


---

## setBit

```bitwise.setBit(LONG value, LONG position)```

Returns the value with the bit at the specified position set to 1. Other bits remain
unchanged. Bit positions range from 0 (rightmost) to 63 (leftmost).

Parameters:
- value: Value to modify
- position: Bit position (0 to 63)

Returns: Value with bit set

Example - grant specific permission:
```sapl
policy "example"
permit action == "grant_read";
transform
    var READ_BIT = 0;
    subject.permissions = bitwise.setBit(subject.permissions, READ_BIT);
```


---

## rotateLeft

```bitwise.rotateLeft(LONG value, LONG positions)```

Returns the value with bits rotated left by the specified number of positions.
Rotates bits circularly to the left. Bits shifted out of the left side are rotated
back in from the right. Unlike left shift, no bits are lost in rotation.

Parameters:
- value: Value to rotate
- positions: Number of positions to rotate (0 to 63)

Returns: Rotated value

Example:
```sapl
policy "example"
permit
    bitwise.rotateLeft(1, 3) == 8;
```


---

## rotateRight

```bitwise.rotateRight(LONG value, LONG positions)```

Returns the value with bits rotated right by the specified number of positions.
Rotates bits circularly to the right. Bits shifted out of the right side are
rotated back in from the left. Unlike right shift, no bits are lost in rotation.

Parameters:
- value: Value to rotate
- positions: Number of positions to rotate (0 to 63)

Returns: Rotated value

Example:
```sapl
policy "example"
permit
    bitwise.rotateRight(8, 3) == 1;
```


---

## testBit

```bitwise.testBit(LONG value, LONG position)```

Tests whether the bit at the specified position is set to 1. Returns true if the bit
is set, false otherwise. Bit positions range from 0 (rightmost) to 63 (leftmost).

Parameters:
- value: Value to test
- position: Bit position (0 to 63)

Returns: Boolean indicating whether bit is set

Example - check specific permission:
```sapl
policy "example"
permit action == "delete";
    var DELETE_BIT = 3;
    bitwise.testBit(subject.permissions, DELETE_BIT);
```


---

## leftShift

```bitwise.leftShift(LONG value, LONG positions)```

Returns the value with bits shifted left by the specified number of positions.
Equivalent to multiplying by 2 to the power of positions. Bits shifted off the
left end are discarded, zeros are shifted in from the right.

Parameters:
- value: Value to shift
- positions: Number of positions to shift (0 to 63)

Returns: Shifted value

Example:
```sapl
policy "example"
permit
    bitwise.leftShift(1, 3) == 8;
```


---

## clearBit

```bitwise.clearBit(LONG value, LONG position)```

Returns the value with the bit at the specified position set to 0. Other bits remain
unchanged. Bit positions range from 0 (rightmost) to 63 (leftmost).

Parameters:
- value: Value to modify
- position: Bit position (0 to 63)

Returns: Value with bit cleared

Example - revoke specific permission:
```sapl
policy "example"
permit action == "revoke_write";
transform
    var WRITE_BIT = 1;
    subject.permissions = bitwise.clearBit(subject.permissions, WRITE_BIT);
```


---

## trailingZeros

```bitwise.trailingZeros(LONG value)```

Returns the number of zero bits following the lowest-order (rightmost) one-bit in
the two's complement binary representation. Returns 64 if the value is zero (all
bits are trailing zeros). Useful for determining how many times a value is divisible
by 2.

Parameters:
- value: Value to analyze

Returns: Number of trailing zero bits

Example:
```sapl
policy "example"
permit
    bitwise.trailingZeros(0) == 64;
    bitwise.trailingZeros(1) == 0;
    bitwise.trailingZeros(8) == 3;
```


---

## bitwiseAnd

```bitwise.bitwiseAnd(LONG left, LONG right)```

Performs bitwise AND operation where the result bit is 1 only if both corresponding
bits are 1. Use this to check if all required permission bits are set or to mask
out specific bits.

Parameters:
- left: First operand
- right: Second operand

Returns: Bitwise AND result

Example - check if user has all required permissions:
```sapl
policy "example"
permit
    var REQUIRED = 15;
    bitwise.bitwiseAnd(subject.permissions, REQUIRED) == REQUIRED;
```


---

## bitwiseOr

```bitwise.bitwiseOr(LONG left, LONG right)```

Performs bitwise OR operation where the result bit is 1 if at least one corresponding
bit is 1. Use this to combine permission sets or feature flags from multiple sources.

Parameters:
- left: First operand
- right: Second operand

Returns: Bitwise OR result

Example - combine direct and inherited permissions:
```sapl
policy "example"
permit
    var all = bitwise.bitwiseOr(subject.directPermissions, subject.inheritedPermissions);
    bitwise.testBit(all, 5);
```


---

## bitwiseXor

```bitwise.bitwiseXor(LONG left, LONG right)```

Performs bitwise XOR operation where the result bit is 1 if exactly one corresponding
bit is 1. Use this to find differences between permission sets or to toggle bits.

Parameters:
- left: First operand
- right: Second operand

Returns: Bitwise XOR result

Example - find permission differences:
```sapl
policy "example"
permit
    var differences = bitwise.bitwiseXor(subject.permissions, resource.requiredPermissions);
    differences == 0;
```


---

## bitwiseNot

```bitwise.bitwiseNot(LONG value)```

Performs bitwise NOT operation, flipping every bit. Each 0 becomes 1 and each 1
becomes 0. Use this to invert permission sets or create permission masks.

Parameters:
- value: Operand

Returns: Bitwise NOT result

Example - invert permissions:
```sapl
policy "example"
permit
    var allowed = 15;
    var denied = bitwise.bitwiseNot(allowed);
    bitwise.bitwiseAnd(subject.permissions, denied) == 0;
```


---

## toggleBit

```bitwise.toggleBit(LONG value, LONG position)```

Returns the value with the bit at the specified position flipped. If the bit is 0 it
becomes 1, if it is 1 it becomes 0. Other bits remain unchanged. Bit positions range
from 0 (rightmost) to 63 (leftmost).

Parameters:
- value: Value to modify
- position: Bit position (0 to 63)

Returns: Value with bit toggled

Example - toggle debug mode:
```sapl
policy "example"
permit action == "toggle_feature";
transform
    var FEATURE_BIT = 5;
    subject.flags = bitwise.toggleBit(subject.flags, FEATURE_BIT);
```


---

## rightShift

```bitwise.rightShift(LONG value, LONG positions)```

Returns the value with bits shifted right by the specified number of positions.
This is an arithmetic shift that preserves the sign. For positive numbers, zeros
are shifted in from the left. For negative numbers, ones are shifted in from the
left.

Parameters:
- value: Value to shift
- positions: Number of positions to shift (0 to 63)

Returns: Shifted value

Example:
```sapl
policy "example"
permit
    bitwise.rightShift(16, 2) == 4;
```


---

## unsignedRightShift

```bitwise.unsignedRightShift(LONG value, LONG positions)```

Returns the value with bits shifted right by the specified number of positions.
This is a logical shift that does not preserve the sign. Zeros are always shifted
in from the left, regardless of the sign bit.

Parameters:
- value: Value to shift
- positions: Number of positions to shift (0 to 63)

Returns: Shifted value

Example:
```sapl
policy "example"
permit
    bitwise.unsignedRightShift(16, 2) == 4;
```


---

## leadingZeros

```bitwise.leadingZeros(LONG value)```

Returns the number of zero bits preceding the highest-order (leftmost) one-bit in
the two's complement binary representation. Returns 64 if the value is zero (all
bits are leading zeros). Useful for determining the position of the most significant
set bit.

Parameters:
- value: Value to analyze

Returns: Number of leading zero bits

Example:
```sapl
policy "example"
permit
    bitwise.leadingZeros(0) == 64;
    bitwise.leadingZeros(1) == 63;
    bitwise.leadingZeros(8) == 60;
```


---

## reverseBits

```bitwise.reverseBits(LONG value)```

Returns the value with the bit order reversed. The bit at position 0 moves to
position 63, the bit at position 1 moves to position 62, and so on. Effectively
mirrors the bit pattern around the center.

Parameters:
- value: Value to reverse

Returns: Value with reversed bit order

Example:
```sapl
policy "example"
permit
    bitwise.reverseBits(0) == 0;
```


---

## isPowerOfTwo

```bitwise.isPowerOfTwo(LONG value)```

Tests whether the value is a power of two, meaning exactly one bit is set. Returns
true if the value has exactly one bit set to 1, which means it is a power of 2.
Returns false for zero and negative numbers.

Parameters:
- value: Value to test

Returns: Boolean indicating whether value is a power of two

Example:
```sapl
policy "example"
permit
    bitwise.isPowerOfTwo(1);
    bitwise.isPowerOfTwo(8);
    bitwise.isPowerOfTwo(1024);
    !bitwise.isPowerOfTwo(0);
    !bitwise.isPowerOfTwo(7);
```


---

