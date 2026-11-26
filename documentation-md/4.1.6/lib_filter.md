---
layout: default
title: filter
parent: Functions
nav_order: 107
---
# filter

Functions for redacting, replacing, and removing sensitive data.

# Content Filtering

Functions for redacting, replacing, and removing sensitive data in authorization
decisions. Use these in resource transformations to enforce data minimization.

## Redacting Sensitive Data

Use `blacken` to mask portions of text while optionally revealing ends:

```sapl
policy "mask credit card"
permit
    action == "view_payment"
transform
    resource |- {
        @.cardNumber : filter.blacken(4, 4)
    }
// "4111111111111111" becomes "4111XXXXXXXX1111"
```

## Removing Fields

Use `remove` to strip fields entirely from the response:

```sapl
policy "hide internal fields"
permit
transform
    resource |- {
        @.internalId : filter.remove
    }
```

## Replacing Values

Use `replace` to substitute a value while preserving error propagation:

```sapl
policy "anonymize user"
permit
transform
    resource |- {
        @.email : filter.replace("[redacted]")
    }
```

## Limits

To bound memory and computation on untrusted input, the following limits apply:

- `blacken` rejects a blacken length above 10,000, whether derived from the input or supplied as the optional length override, returning an error.
- `blacken` rejects an output that would exceed 10,000,000 characters once the replacement string is repeated, returning an error.

These limits apply because this input may originate from the authorization subscription or from policy information points, which are not vetted to the same degree as the policies and variables shipped with the PDP configuration.


---

## remove

Remove a value by replacing it with undefined

---

## replace

Replace a value with another value (error bubbles up)

---

## blacken

Blacken text by replacing characters with a replacement string

---

