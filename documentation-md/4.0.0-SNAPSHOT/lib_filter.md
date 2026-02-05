---
layout: default
title: filter
parent: Functions
grand_parent: SAPL Reference
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

