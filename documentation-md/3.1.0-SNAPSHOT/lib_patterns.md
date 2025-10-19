---
title: patterns
parent: Function Libraries
nav_order: 121
---
# patterns

Pattern matching with glob patterns and regular expressions for authorization policies.

# Pattern Matching in Authorization Policies

This library provides two complementary approaches for pattern matching in access control decisions.

## Glob Patterns

Glob patterns provide hierarchical wildcard matching that respects segment boundaries. Use them when:
- Matching file paths, domain names, or other hierarchical identifiers
- Segment boundaries matter for your matching logic
- Non-technical users need to write or understand patterns

Glob patterns support:
- `*` - Matches zero or more characters within a segment
- `**` - Matches across segment boundaries
- `?` - Matches exactly one character
- `[abc]` or `[a-z]` - Character sets and ranges
- `[!abc]` - Negated character sets
- `{cat,dog,bird}` - Alternatives
- `\` - Escape character for literal matching

Delimiters define segment boundaries. When not specified, `.` is used by default.

## Regular Expressions

Regular expressions provide full pattern matching power using standard regex syntax. Construction
rules follow the Java Pattern class specification. Use them when:
- Glob patterns cannot express the required matching logic
- Advanced features like lookahead, backreferences, or precise quantifiers are needed
- Complex validation rules require regex capabilities

## When to Use Simple String Operations

For literal prefix, suffix, or substring checks, use the string library instead. Functions like
`string.startsWith` or `string.contains` are faster and clearer for these common cases.

## Security

All regex functions include protection against Regular Expression Denial of Service attacks.
Patterns containing dangerous constructs like nested quantifiers `(a+)+`, excessive alternations,
or nested wildcards are rejected before evaluation.


---

## patterns.matchGlobWithoutDelimiters(Text pattern, Text value)

```matchGlobWithoutDelimiters(TEXT pattern, TEXT value)```: Matches text against a glob pattern
without segment boundaries.

Performs flat wildcard matching where all wildcards match any characters without restriction.
Both `*` and `**` behave identically. Use this for simple filename matching or flat strings without
hierarchical structure.

**Examples**:
```sapl
policy "filename_only"
permit
where
  patterns.matchGlobWithoutDelimiters("report_*.pdf", resource.filename);
```

```sapl
policy "simple_wildcard"
permit
where
  patterns.matchGlobWithoutDelimiters("user_*_token", subject.sessionToken);
```

```sapl
policy "alternatives"
permit
where
  patterns.matchGlobWithoutDelimiters("status_{active,pending}", resource.status);
```


---

## patterns.findMatchesLimited(Text pattern, Text value, Int limit)

```findMatchesLimited(TEXT pattern, TEXT value, INT limit)```: Finds up to limit matches of a
regex pattern.

Stops searching after finding the specified number of matches. Limit is capped at 10,000.

**Examples**:
```sapl
policy "first_ten_matches"
permit
where
  var matches = patterns.findMatchesLimited("\\b\\w+\\b", resource.text, 10);
  array.size(matches) == 10;
```

```sapl
policy "limited_extraction"
permit
where
  var urls = patterns.findMatchesLimited("https://[^\\s]+", resource.document, 5);
  array.size(urls) <= 5;
```


---

## patterns.split(Text pattern, Text value)

```split(TEXT pattern, TEXT value)```: Splits text by a regex pattern into array segments.

Each match of the pattern becomes a boundary where the string is divided.

**Examples**:
```sapl
policy "parse_csv"
permit
where
  var fields = patterns.split(",", resource.csvLine);
  array.size(fields) == 5;
```

```sapl
policy "split_whitespace"
permit
where
  var tokens = patterns.split("\\s+", resource.input);
  array.containsAll(tokens, subject.requiredTokens);
```

```sapl
policy "split_delimiters"
permit
where
  var parts = patterns.split("[;,|]", resource.delimitedData);
  array.size(parts) > 0;
```


---

## patterns.isValidRegex(Text pattern)

```isValidRegex(TEXT pattern)```: Checks if text is a valid regular expression.

Returns true if the pattern is syntactically valid and within length limits, false otherwise.

**Examples**:
```sapl
policy "validate_pattern"
permit
where
  patterns.isValidRegex(resource.customPattern);
```

```sapl
policy "check_before_use"
permit
where
  var pattern = request.filterPattern;
  patterns.isValidRegex(pattern) && patterns.findMatches(pattern, resource.text) != [];
```


---

## patterns.findMatches(Text pattern, Text value)

```findMatches(TEXT pattern, TEXT value)```: Finds all matches of a regex pattern.

Returns all non-overlapping matches. Maximum 10,000 matches returned. Patterns with dangerous
constructs are rejected.

**Examples**:
```sapl
policy "extract_emails"
permit
where
  var emails = patterns.findMatches("[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}", resource.text);
  array.size(emails) > 0;
```

```sapl
policy "find_tags"
permit
where
  var tags = patterns.findMatches("#[a-zA-Z0-9]+", resource.content);
  array.containsAll(tags, subject.allowedTags);
```

```sapl
policy "extract_numbers"
permit
where
  var numbers = patterns.findMatches("\\d+", resource.input);
  array.size(numbers) <= 10;
```


---

## patterns.replaceAll(Text value, Text pattern, Text replacement)

```replaceAll(TEXT value, TEXT pattern, TEXT replacement)```: Replaces all regex matches with
replacement text.

Replacement can include backreferences like `$1` to refer to captured groups from parentheses
in the pattern.

**Examples**:
```sapl
policy "redact_emails"
permit
where
  var redacted = patterns.replaceAll(resource.text, "[a-z0-9._%+-]+@[a-z0-9.-]+\\.[a-z]{2,}", "[REDACTED]");
  resource.publicText == redacted;
```

```sapl
policy "normalize_paths"
permit
where
  var normalized = patterns.replaceAll(resource.path, "/+", "/");
  string.startsWith(normalized, "/api");
```

```sapl
policy "swap_format"
permit
where
  var swapped = patterns.replaceAll(resource.date, "(\\d{2})/(\\d{2})/(\\d{4})", "$3-$1-$2");
  swapped == resource.expectedFormat;
```


---

## patterns.findAllSubmatch(Text pattern, Text value)

```findAllSubmatch(TEXT pattern, TEXT value)```: Finds all regex matches with their capturing groups.

Each match returns an array where index 0 is the full match and subsequent indices are captured
groups from parentheses in the pattern.

**Examples**:
```sapl
policy "parse_permissions"
permit
where
  var matches = patterns.findAllSubmatch("(\\w+):(\\w+):(\\w+)", subject.permissions);
  array.size(matches) > 0;
```

```sapl
policy "extract_structured"
permit
where
  var data = patterns.findAllSubmatch("user=([^,]+),role=([^,]+)", resource.metadata);
  var firstMatch = data[0];
  firstMatch[2] == "admin";
```


---

## patterns.matchTemplate(Text template, Text value, Text delimiterStart, Text delimiterEnd)

```matchTemplate(TEXT template, TEXT value, TEXT delimiterStart, TEXT delimiterEnd)```: Matches text
against a template with embedded regex patterns.

Combines literal text matching with embedded regular expressions. Text outside delimiters is
matched literally with backslash escapes. Text inside delimiters is treated as regex patterns.

**When to Use**:
- Mix literal text with dynamic patterns
- Build patterns from configuration without escaping entire strings
- Separate static structure from variable matching logic

**Template Syntax**:
- Literal portions: Text outside delimiters, use `\` to escape special characters
- Pattern portions: Text between `delimiterStart` and `delimiterEnd`
- Escape sequences: `\*` becomes literal `*`, `\\` becomes literal `\`

**Examples**:
```sapl
policy "api_version"
permit
where
  patterns.matchTemplate("/api/{{v[12]}}/users", resource.path, "{{", "}}");
```

```sapl
policy "structured_id"
permit
where
  patterns.matchTemplate("tenant:{{\\d+}}:resource", resource.id, "{{", "}}");
```

```sapl
policy "mixed_format"
permit
where
  var template = "user-{{[a-z]+}}-{{\\d{4}}}";
  patterns.matchTemplate(template, resource.userId, "{{", "}}");
```

```sapl
policy "escaped_literals"
permit
where
  patterns.matchTemplate("file\\*{{\\d+}}\\.txt", resource.filename, "{{", "}}");
```


---

## patterns.escapeGlob(Text text)

```escapeGlob(TEXT text)```: Escapes all glob metacharacters to treat input as literal text.

Prepends backslash to glob special characters. Essential for safely incorporating untrusted
input into glob patterns to prevent pattern injection where malicious input could match
unintended values.

**Examples**:
```sapl
policy "safe_user_input"
permit
where
  var safeUsername = patterns.escapeGlob(request.username);
  var pattern = string.concat("/users/", safeUsername, "/*");
  patterns.matchGlob(pattern, resource.path, ["/"]);
```

```sapl
policy "literal_match"
permit
where
  var escaped = patterns.escapeGlob(resource.tag);
  escaped == "literal*text";
```


---

## patterns.matchGlob(Text pattern, Text value, Array delimiters)

```matchGlob(TEXT pattern, TEXT value, ARRAY delimiters)```: Matches text against a glob pattern.

Performs hierarchical wildcard matching where wildcards respect segment boundaries defined by
delimiters. Use this for file paths, domain names, or structured identifiers where hierarchical
structure matters.

**When to Use**:
- File paths: `/api/*/documents` matches `/api/v1/documents` but not `/api/v1/admin/documents`
- Domain names: `*.example.com` matches `api.example.com` but not `foo.api.example.com`
- Hierarchical permissions: `user:*:read` matches `user:profile:read` within segments

**Default Delimiter**: When delimiters array is empty or not provided, `.` is used as the
delimiter.

**Examples**:
```sapl
policy "api_paths"
permit
where
  patterns.matchGlob("/api/*/users/*", resource.path, ["/"]);
```

```sapl
policy "domain_matching"
permit
where
  patterns.matchGlob("*.company.com", request.host, ["."]);
```

```sapl
policy "permission_hierarchy"
permit
where
  patterns.matchGlob("document:*:read", subject.permission, [":"]);
```

```sapl
policy "file_extensions"
permit
where
  patterns.matchGlob("report.{pdf,docx,xlsx}", resource.filename, ["."]);
```

```sapl
policy "cross_segment"
permit
where
  patterns.matchGlob("/api/**/admin", resource.path, ["/"]);
```


---

## patterns.findAllSubmatchLimited(Text pattern, Text value, Int limit)

```findAllSubmatchLimited(TEXT pattern, TEXT value, INT limit)```: Finds up to limit matches with
capturing groups.

Each match array contains the full match at index 0 and captured groups at subsequent indices.

**Examples**:
```sapl
policy "limited_parsing"
permit
where
  var matches = patterns.findAllSubmatchLimited("(\\d{4})-(\\d{2})-(\\d{2})", resource.dates, 3);
  array.size(matches) <= 3;
```


---

