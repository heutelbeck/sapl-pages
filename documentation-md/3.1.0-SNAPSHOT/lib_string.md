---
layout: default
title: string
parent: Functions
nav_order: 129
---
# string

Functions for string manipulation in authorization policies.



---

## string.lastIndexOf(Text str, Text substring)

```lastIndexOf(TEXT str, TEXT substring)```: Returns the index of the last occurrence of substring.

Returns the zero-based index of the last occurrence, or -1 if the substring is not found.
Case-sensitive search.

**Examples:**
```sapl
policy "find_extension"
permit
where
  var dotPosition = string.lastIndexOf(resource.filename, ".");
  var extension = string.substring(resource.filename, dotPosition + 1);
  extension in ["pdf", "docx", "txt"];
```

```sapl
policy "last_segment"
permit
where
  var lastSlash = string.lastIndexOf(resource.path, "/");
  var filename = string.substring(resource.path, lastSlash + 1);
  filename == "allowed.txt";
```


---

## string.toLowerCase(Text str)

```toLowerCase(TEXT str)```: Converts all characters to lowercase using the default locale.

Useful for normalizing identifiers, roles, or resource names to enable case-insensitive
comparisons in authorization policies.

**Examples:**
```sapl
policy "normalize_role"
permit
where
  string.toLowerCase(subject.role) == "administrator";
```

```sapl
policy "case_insensitive_path"
permit
where
  var normalizedPath = string.toLowerCase(resource.path);
  normalizedPath in ["/api/public", "/api/health"];
```


---

## string.replaceFirst(Text str, Text target, Text replacement)

```replaceFirst(TEXT str, TEXT target, TEXT replacement)```: Replaces first occurrence of target.

Performs literal replacement of only the first occurrence. If target is not found,
returns the original string unchanged. Returns error if target is empty.

**Examples:**
```sapl
policy "remove_first_slash"
permit
where
  var path = string.replaceFirst(resource.path, "/", "");
  string.startsWith(path, "api");
```

```sapl
policy "replace_prefix"
permit
where
  var updated = string.replaceFirst(resource.type, "legacy_", "");
  updated in resource.allowedTypes;
```


---

## string.isEmpty(Text str)

```isEmpty(TEXT str)```: Returns true if the string has zero length.

Unlike isBlank, this only checks for zero length and does not consider whitespace.

**Examples:**
```sapl
policy "optional_field"
permit
where
  string.isEmpty(resource.optionalTag) || resource.optionalTag in resource.allowedTags;
```

```sapl
policy "require_id"
deny
where
  string.isEmpty(resource.id);
```


---

## string.indexOf(Text str, Text substring)

```indexOf(TEXT str, TEXT substring)```: Returns the index of the first occurrence of substring.

Returns the zero-based index of the first occurrence, or -1 if the substring is not found.
Case-sensitive search.

**Examples:**
```sapl
policy "find_separator"
permit
where
  var separatorPosition = string.indexOf(resource.id, ":");
  separatorPosition > 0;
```

```sapl
policy "check_presence"
permit
where
  string.indexOf(subject.permissions, "admin") != -1;
```


---

## string.length(Text str)

```length(TEXT str)```: Returns the number of characters in the string.

Useful for validating input length constraints in authorization policies.

**Examples:**
```sapl
policy "password_length"
permit
where
  string.length(request.password) >= 12;
```

```sapl
policy "comment_limit"
permit
where
  action.name == "comment";
  string.length(request.text) <= 500;
```


---

## string.leftPad(Text str, Number length, Text padChar)

```leftPad(TEXT str, NUMBER length, TEXT padChar)```: Pads string on the left to specified length.

Adds padding characters to the left of the string until it reaches the specified length.
If the string is already longer than or equal to the target length, returns the original
string unchanged. Returns error if padChar is not exactly one character.

**Examples:**
```sapl
policy "format_id"
permit
where
  var paddedId = string.leftPad(resource.numericId, 8, "0");
  paddedId == "00001234";
```

```sapl
policy "align_code"
permit
where
  var aligned = string.leftPad(resource.code, 10, " ");
  string.length(aligned) == 10;
```


---

## string.startsWith(Text str, Text prefix)

```startsWith(TEXT str, TEXT prefix)```: Returns true if the string starts with the prefix.

Performs literal prefix check without pattern matching. Case-sensitive. Commonly used
for path-based authorization and hierarchical resource checks.

**Examples:**
```sapl
policy "api_path"
permit
where
  string.startsWith(resource.path, "/api/public");
```

```sapl
policy "role_prefix"
permit
where
  string.startsWith(subject.role, "ADMIN_");
```


---

## string.trimEnd(Text str)

```trimEnd(TEXT str)```: Removes trailing whitespace only.

Useful when leading whitespace is significant but trailing whitespace should be ignored.

**Examples:**
```sapl
policy "trim_trailing"
permit
where
  var cleanInput = string.trimEnd(resource.input);
  string.endsWith(cleanInput, "valid-suffix");
```


---

## string.repeat(Text str, Number count)

```repeat(TEXT str, NUMBER count)```: Repeats the string the specified number of times.

Creates a new string by concatenating the original string count times. Returns empty
string if count is zero. Returns error if count is negative or exceeds 10,000.

**Examples:**
```sapl
policy "generate_separator"
permit
where
  var separator = string.repeat("-", 40);
  string.length(separator) == 40;
```

```sapl
policy "build_pattern"
permit
where
  var pattern = string.repeat("x", 5);
  pattern == "xxxxx";
```


---

## string.contains(Text str, Text substring)

```contains(TEXT str, TEXT substring)```: Returns true if the string contains the substring.

Performs literal substring search without pattern matching. Case-sensitive. For simple
containment checks, this is more efficient and intuitive than regular expressions.

**Examples:**
```sapl
policy "permission_check"
permit
where
  string.contains(subject.permissions, "read:documents");
```

```sapl
policy "path_validation"
permit
where
  string.contains(resource.path, "/public/") || string.contains(resource.path, "/shared/");
```


---

## string.equalsIgnoreCase(Text str1, Text str2)

```equalsIgnoreCase(TEXT str1, TEXT str2)```: Compares two strings for equality, ignoring case.

Provides case-insensitive string comparison for authorization decisions where case
variations should be treated as equivalent.

**Examples:**
```sapl
policy "role_check"
permit
where
  string.equalsIgnoreCase(subject.role, "Administrator");
```

```sapl
policy "resource_type"
permit
where
  string.equalsIgnoreCase(resource.type, "DOCUMENT") && action.name == "read";
```


---

## string.concat(Text strings...)

```concat(TEXT...strings)```: Concatenates multiple strings into one.

Combines all provided strings in order without any delimiter. Accepts variable number
of string arguments.

**Examples:**
```sapl
policy "build_path"
permit
where
  var fullPath = string.concat("/api/", subject.tenant, "/", resource.type);
  fullPath in resource.allowedPaths;
```

```sapl
policy "construct_id"
permit
where
  var resourceId = string.concat(subject.tenant, ":", resource.type, ":", resource.id);
  resourceId in subject.accessibleResources;
```


---

## string.trim(Text str)

```trim(TEXT str)```: Removes leading and trailing whitespace.

Essential for cleaning user input before comparison or validation in authorization
policies. Removes all leading and trailing spaces, tabs, and other whitespace characters.

**Examples:**
```sapl
policy "clean_username"
permit
where
  var cleanUsername = string.trim(subject.name);
  cleanUsername in resource.allowedUsers;
```

```sapl
policy "sanitize_path"
permit
where
  var cleanPath = string.trim(resource.path);
  string.startsWith(cleanPath, "/api/");
```


---

## string.endsWith(Text str, Text suffix)

```endsWith(TEXT str, TEXT suffix)```: Returns true if the string ends with the suffix.

Performs literal suffix check without pattern matching. Case-sensitive. Useful for
file type validation and domain checks.

**Examples:**
```sapl
policy "document_type"
permit
where
  string.endsWith(resource.filename, ".pdf") || string.endsWith(resource.filename, ".docx");
```

```sapl
policy "domain_check"
permit
where
  string.endsWith(subject.email, "@company.com");
```


---

## string.rightPad(Text str, Number length, Text padChar)

```rightPad(TEXT str, NUMBER length, TEXT padChar)```: Pads string on the right to specified length.

Adds padding characters to the right of the string until it reaches the specified length.
If the string is already longer than or equal to the target length, returns the original
string unchanged. Returns error if padChar is not exactly one character.

**Examples:**
```sapl
policy "format_label"
permit
where
  var padded = string.rightPad(subject.name, 20, " ");
  string.length(padded) == 20;
```

```sapl
policy "align_right"
permit
where
  var aligned = string.rightPad(resource.tag, 15, "-");
  string.endsWith(aligned, "-");
```


---

## string.substring(Text str, Number start)

```substring(TEXT str, NUMBER start)```: Extracts substring from start index to end of string.

Returns the portion of the string beginning at the specified index. Start index is
zero-based and inclusive. Returns error if start is negative or exceeds string length.

**Examples:**
```sapl
policy "extract_suffix"
permit
where
  var suffix = string.substring(resource.id, 8);
  suffix == subject.tenantId;
```

```sapl
policy "skip_prefix"
permit
where
  var withoutPrefix = string.substring(resource.path, 5);
  withoutPrefix in resource.allowedPaths;
```


---

## string.trimStart(Text str)

```trimStart(TEXT str)```: Removes leading whitespace only.

Useful when trailing whitespace is significant but leading whitespace should be ignored.

**Examples:**
```sapl
policy "trim_leading"
permit
where
  var cleanInput = string.trimStart(resource.input);
  string.startsWith(cleanInput, "valid-prefix");
```


---

## string.toUpperCase(Text str)

```toUpperCase(TEXT str)```: Converts all characters to uppercase using the default locale.

Useful for normalizing identifiers or ensuring consistent comparison format in
authorization policies.

**Examples:**
```sapl
policy "normalize_department"
permit
where
  string.toUpperCase(subject.department) == "ENGINEERING";
```

```sapl
policy "uppercase_code"
permit
where
  var code = string.toUpperCase(resource.code);
  code in ["ADMIN", "SUPER", "ROOT"];
```


---

## string.isBlank(Text str)

```isBlank(TEXT str)```: Returns true if the string is empty or contains only whitespace.

Useful for validating that required fields contain actual content in authorization
policies.

**Examples:**
```sapl
policy "require_reason"
deny
where
  action.name == "delete";
  string.isBlank(request.reason);
```

```sapl
policy "validate_input"
permit
where
  !string.isBlank(subject.username);
  !string.isBlank(resource.documentId);
```


---

## string.join(Array elements, Text delimiter)

```join(ARRAY elements, TEXT delimiter)```: Concatenates array elements with delimiter.

Combines all text elements of an array into a single string, inserting the delimiter
between consecutive elements. Returns error if array contains non-text elements. Empty
array returns empty string.

**Examples:**
```sapl
policy "build_permission"
permit
where
  var permission = string.join([resource.type, action.name], ":");
  permission in subject.permissions;
```

```sapl
policy "format_roles"
permit
where
  var roleList = string.join(subject.roles, ",");
  string.contains(roleList, "admin");
```


---

## string.replace(Text str, Text target, Text replacement)

```replace(TEXT str, TEXT target, TEXT replacement)```: Replaces all occurrences of target with replacement.

Performs literal string replacement without pattern matching. If target is not found,
returns the original string unchanged. Returns error if target is empty.

**Examples:**
```sapl
policy "normalize_separators"
permit
where
  var normalized = string.replace(resource.path, "\\", "/");
  string.startsWith(normalized, "/api/");
```

```sapl
policy "remove_prefix"
permit
where
  var cleaned = string.replace(subject.role, "ROLE_", "");
  cleaned in ["admin", "user", "guest"];
```


---

## string.substringRange(Text str, Number start, Number end)

```substringRange(TEXT str, NUMBER start, NUMBER end)```: Extracts substring between indices.

Returns the portion of the string from start index (inclusive) to end index (exclusive).
Both indices are zero-based. Returns error if indices are invalid or out of bounds.

**Examples:**
```sapl
policy "extract_tenant"
permit
where
  var tenantId = string.substringRange(resource.id, 0, 8);
  tenantId == subject.tenantId;
```

```sapl
policy "middle_segment"
permit
where
  var segment = string.substringRange(resource.path, 5, 15);
  segment == "authorized";
```


---

## string.reverse(Text str)

```reverse(TEXT str)```: Reverses the order of characters in the string.

Creates a new string with all characters in reverse order.

**Examples:**
```sapl
policy "check_palindrome"
permit
where
  string.reverse(resource.code) == resource.code;
```

```sapl
policy "reverse_match"
permit
where
  var reversed = string.reverse(subject.token);
  reversed == resource.expectedToken;
```


---

