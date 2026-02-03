---
layout: default
title: permissions
parent: Functions
grand_parent: SAPL Reference
nav_order: 121
---
# permissions

Permission and access control functions for checking and manipulating permission bitmasks, with specialized support for POSIX/Unix permissions.



---

## all

```all()```: Returns -1, representing all permissions set.

Semantic constant for maximum permissions. All 64 bits are set.
In two's complement representation, -1 has all bits set to 1.

**Examples:**
```sapl
policy "example"
permit
  subject.permissions == permissions.all();
```


---

## bit

```bit(LONG position)```: Returns a value with only the specified bit position set.

Creates a permission mask with a single bit set at the given position (0-63).
Useful for defining custom permission schemes where each bit represents
a specific permission.

**Requirements:**
- position must be between 0 and 63

**Examples:**
```sapl
policy "example"
permit
  var CREATE = permissions.bit(0);
  var READ = permissions.bit(1);
  var UPDATE = permissions.bit(2);
  var DELETE = permissions.bit(3);
```


---

## combine

```combine(ARRAY masks)```: Combines multiple permission masks using bitwise OR.

Returns a single mask with all bits from the input masks set. This is the union
of all permission bits.

**Examples:**
```sapl
policy "example"
permit
  var CREATE = permissions.bit(0);
  var READ = permissions.bit(1);
  var UPDATE = permissions.bit(2);
  var fullAccess = permissions.combine([CREATE, READ, UPDATE]);
```


---

## none

```none()```: Returns zero (0), representing no permissions set.

Semantic constant for the absence of any permissions. All 64 bits are unset.

**Examples:**
```sapl
policy "example"
permit
  subject.permissions != permissions.none();
```


---

## hasAll

```hasAll(LONG value, ARRAY masks)```: Checks if all specified permission bits are set.

Combines multiple permission masks using OR, then verifies that all resulting bits
are present in the value. Useful for requiring multiple permissions simultaneously.

**Examples:**
```sapl
policy "example"
permit
  var CREATE = permissions.bit(0);
  var UPDATE = permissions.bit(1);
  var DELETE = permissions.bit(2);
  permissions.hasAll(subject.permissions, [CREATE, UPDATE, DELETE]);
```


---

## hasAny

```hasAny(LONG value, ARRAY masks)```: Checks if at least one of the specified permission bits is set.

Combines multiple permission masks using OR, then verifies that at least one resulting
bit is present in the value. Useful for allowing access if any permission matches.

**Examples:**
```sapl
policy "example"
permit
  var ADMIN = permissions.bit(0);
  var MODERATOR = permissions.bit(1);
  permissions.hasAny(subject.roles, [ADMIN, MODERATOR]);
```


---

## hasNone

```hasNone(LONG value, ARRAY masks)```: Checks if none of the specified permission bits are set.

Combines multiple permission masks using OR, then verifies that no resulting bits
are present in the value. Useful for ensuring forbidden permissions are not granted.

**Examples:**
```sapl
policy "example"
permit
  var SUSPENDED = permissions.bit(0);
  var BANNED = permissions.bit(1);
  permissions.hasNone(subject.flags, [SUSPENDED, BANNED]);
```


---

## hasExact

```hasExact(LONG value, LONG mask)```: Checks if the value has exactly the specified permission bits and no others.

Verifies that the value equals the mask exactly. All specified bits must be set,
and no additional bits may be set.

**Examples:**
```sapl
policy "example"
permit
  var READ_ONLY = permissions.bit(0);
  permissions.hasExact(subject.permissions, READ_ONLY);
```


---

## hasOnly

```hasOnly(LONG value, ARRAY masks)```: Checks if the value has only the specified permission bits and no others.

Combines multiple permission masks using OR, then verifies that the value contains
only these bits and no additional bits. Unlike hasExact, not all specified bits
need to be set, but no other bits may be set.

**Examples:**
```sapl
policy "example"
permit
  var READ = permissions.bit(0);
  var WRITE = permissions.bit(1);
  permissions.hasOnly(subject.permissions, [READ, WRITE]);
```


---

## combineAll

```combineAll(ARRAY masks)```: Combines multiple permission masks using bitwise AND.

Returns a single mask with only the bits that are set in all input masks.
This is the intersection of all permission bits.

**Examples:**
```sapl
policy "example"
permit
  var mask1 = numeral.fromHex("0x07");
  var mask2 = numeral.fromHex("0x03");
  var common = permissions.combineAll([mask1, mask2]);  // Result: 0x03
```


---

## isSubsetOf

```isSubsetOf(LONG permissions, LONG superset)```: Checks if permissions is a subset of superset.

Returns true if all bits set in permissions are also set in superset. The superset
may have additional bits set.

**Examples:**
```sapl
policy "example"
permit action.name == "delegate";
  permissions.isSubsetOf(action.permissionsToDelegate, subject.permissions);
```


---

## overlaps

```overlaps(LONG permissions1, LONG permissions2)```: Checks if two permission sets have any common bits.

Returns true if at least one bit is set in both permission sets.

**Examples:**
```sapl
policy "example"
permit
  permissions.overlaps(subject.permissions, resource.requiredPermissions);
```


---

## areDisjoint

```areDisjoint(LONG permissions1, LONG permissions2)```: Checks if two permission sets have no common bits.

Returns true if no bits are set in both permission sets simultaneously.

**Examples:**
```sapl
policy "example"
permit
  permissions.areDisjoint(subject.permissions, resource.forbiddenPermissions);
```


---

## unixOwner

```unixOwner(LONG mode)```: Extracts the owner permission bits from a Unix file mode.

Returns the owner permissions as a value from 0-7, where bits represent
read (4), write (2), and execute (1) permissions.

**Examples:**
```sapl
policy "example"
permit
  var mode = numeral.fromOctal("755");
  var ownerPerms = permissions.unixOwner(mode);  // Returns 7 (rwx)
```


---

## unixGroup

```unixGroup(LONG mode)```: Extracts the group permission bits from a Unix file mode.

Returns the group permissions as a value from 0-7, where bits represent
read (4), write (2), and execute (1) permissions.

**Examples:**
```sapl
policy "example"
permit
  var mode = numeral.fromOctal("755");
  var groupPerms = permissions.unixGroup(mode);  // Returns 5 (r-x)
```


---

## unixOther

```unixOther(LONG mode)```: Extracts the other (world) permission bits from a Unix file mode.

Returns the other permissions as a value from 0-7, where bits represent
read (4), write (2), and execute (1) permissions.

**Examples:**
```sapl
policy "example"
permit
  var mode = numeral.fromOctal("755");
  var otherPerms = permissions.unixOther(mode);  // Returns 5 (r-x)
```


---

## unixMode

```unixMode(LONG owner, LONG group, LONG other)```: Constructs a Unix file mode from separate permission values.

Combines owner, group, and other permissions (each 0-7) into a complete Unix mode value.

**Requirements:**
- owner, group, and other must be between 0 and 7

**Examples:**
```sapl
policy "example"
permit
  var mode = permissions.unixMode(7, 5, 5);
  mode == numeral.fromOctal("755");  // true
```


---

## unixCanRead

```unixCanRead(LONG permissions)```: Checks if the read permission bit is set in Unix permissions.

Tests if the read bit (4) is set in a Unix permission value (0-7).

**Examples:**
```sapl
policy "example"
permit
  var perms = permissions.unixOwner(resource.mode);
  permissions.unixCanRead(perms);
```


---

## unixCanWrite

```unixCanWrite(LONG permissions)```: Checks if the write permission bit is set in Unix permissions.

Tests if the write bit (2) is set in a Unix permission value (0-7).

**Examples:**
```sapl
policy "example"
permit
  var perms = permissions.unixOwner(resource.mode);
  permissions.unixCanWrite(perms);
```


---

## unixCanExecute

```unixCanExecute(LONG permissions)```: Checks if the execute permission bit is set in Unix permissions.

Tests if the execute bit (1) is set in a Unix permission value (0-7).

**Examples:**
```sapl
policy "example"
permit
  var perms = permissions.unixOwner(resource.mode);
  permissions.unixCanExecute(perms);
```


---

## posixRead

```posixRead()```: Returns the POSIX read permission bit value (4).

Standard read permission bit used in Unix/POSIX file permissions.

**Examples:**
```sapl
policy "example"
permit
  permissions.hasAny(ownerPerms, [permissions.posixRead()]);
```


---

## posixWrite

```posixWrite()```: Returns the POSIX write permission bit value (2).

Standard write permission bit used in Unix/POSIX file permissions.

**Examples:**
```sapl
policy "example"
permit
  permissions.hasAny(ownerPerms, [permissions.posixWrite()]);
```


---

## posixExecute

```posixExecute()```: Returns the POSIX execute permission bit value (1).

Standard execute permission bit used in Unix/POSIX file permissions.

**Examples:**
```sapl
policy "example"
permit
  permissions.hasAny(ownerPerms, [permissions.posixExecute()]);
```


---

## posixAll

```posixAll()```: Returns the POSIX value for all permissions (7).

Represents read + write + execute permissions (4 + 2 + 1 = 7).

**Examples:**
```sapl
policy "example"
permit
  permissions.hasAll(ownerPerms, [permissions.posixAll()]);
```


---

## posixNone

```posixNone()```: Returns the POSIX value for no permissions (0).

Represents the absence of read, write, and execute permissions.

**Examples:**
```sapl
policy "example"
permit
  otherPerms == permissions.posixNone();
```


---

## posixRW

```posixRW()```: Returns the POSIX value for read and write permissions (6).

Represents read + write permissions (4 + 2 = 6).

**Examples:**
```sapl
policy "example"
permit
  ownerPerms == permissions.posixRW();
```


---

## posixRX

```posixRX()```: Returns the POSIX value for read and execute permissions (5).

Represents read + execute permissions (4 + 1 = 5).

**Examples:**
```sapl
policy "example"
permit
  groupPerms == permissions.posixRX();
```


---

## posixWX

```posixWX()```: Returns the POSIX value for write and execute permissions (3).

Represents write + execute permissions (2 + 1 = 3).

**Examples:**
```sapl
policy "example"
permit
  permissions.hasAll(perms, [permissions.posixWX()]);
```


---

## posixMode755

```posixMode755()```: Returns the common Unix mode 0755 (rwxr-xr-x) as decimal 493.

Owner: read, write, execute (7). Group: read, execute (5). Other: read, execute (5).
Commonly used for executable files and directories.

**Examples:**
```sapl
policy "example"
permit
  resource.mode == permissions.posixMode755();
  // Equivalent to: resource.mode == numeral.fromOctal("755");
```


---

## posixMode644

```posixMode644()```: Returns the common Unix mode 0644 (rw-r--r--) as decimal 420.

Owner: read, write (6). Group: read (4). Other: read (4).
Commonly used for regular data files.

**Examples:**
```sapl
policy "example"
permit
  resource.mode == permissions.posixMode644();
  // Equivalent to: resource.mode == numeral.fromOctal("644");
```


---

## posixMode777

```posixMode777()```: Returns the common Unix mode 0777 (rwxrwxrwx) as decimal 511.

Owner: read, write, execute (7). Group: read, write, execute (7). Other: read, write, execute (7).
Maximum permissions for all users. Use with caution.

**Examples:**
```sapl
policy "example"
permit
  resource.mode == permissions.posixMode777();
  // Equivalent to: resource.mode == numeral.fromOctal("777");
```


---

## posixMode600

```posixMode600()```: Returns the common Unix mode 0600 (rw-------) as decimal 384.

Owner: read, write (6). Group: none (0). Other: none (0).
Commonly used for private files like SSH keys.

**Examples:**
```sapl
policy "example"
permit
  resource.mode == permissions.posixMode600();
  // Equivalent to: resource.mode == numeral.fromOctal("600");
```


---

## posixMode666

```posixMode666()```: Returns the common Unix mode 0666 (rw-rw-rw-) as decimal 438.

Owner: read, write (6). Group: read, write (6). Other: read, write (6).
Commonly used for shared data files.

**Examples:**
```sapl
policy "example"
permit
  resource.mode == permissions.posixMode666();
  // Equivalent to: resource.mode == numeral.fromOctal("666");
```


---

## grant

```grant(LONG current, ARRAY toGrant)```: Adds specified permissions to the current permission set.

Combines the permissions to grant using OR, then adds them to the current permissions.
Semantic wrapper for bitwise OR operations.

**Examples:**
```sapl
policy "example"
permit
  var READ = permissions.bit(0);
  var WRITE = permissions.bit(1);
  var newPerms = permissions.grant(subject.currentPermissions, [READ, WRITE]);
```


---

## revoke

```revoke(LONG current, ARRAY toRevoke)```: Removes specified permissions from the current permission set.

Combines the permissions to revoke using OR, then removes them from the current permissions.
Semantic wrapper for bitwise AND NOT operations.

**Examples:**
```sapl
policy "example"
permit
  var DELETE = permissions.bit(2);
  var ADMIN = permissions.bit(3);
  var newPerms = permissions.revoke(subject.currentPermissions, [DELETE, ADMIN]);
```


---

## toggle

```toggle(LONG current, ARRAY toToggle)```: Flips specified permission bits in the current permission set.

Combines the permissions to toggle using OR, then flips them in the current permissions.
Set bits become unset, and unset bits become set.

**Examples:**
```sapl
policy "example"
permit
  var FLAG_A = permissions.bit(0);
  var FLAG_B = permissions.bit(1);
  var newFlags = permissions.toggle(subject.flags, [FLAG_A, FLAG_B]);
```


---

