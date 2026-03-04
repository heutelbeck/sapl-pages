---
layout: default
title: json
parent: Functions
grand_parent: SAPL Reference
nav_order: 111
---
# json

Function library for JSON marshalling and unmarshalling operations.

# JSON Function Library

Provides bidirectional conversion between JSON text and SAPL values.

Use json.jsonToVal to parse JSON strings from external sources such as API responses,
configuration files, or database fields stored as JSON text.

Use json.valToJson to serialize SAPL values into JSON strings for obligations,
advice, or when passing data to external systems.

## Examples

Parse stored configuration:
```sapl
policy "check-feature-flags"
permit
  var config = json.jsonToVal(resource.configJson);
  config.featureEnabled == true;
  config.minVersion <= subject.appVersion;
```

Parse embedded permissions:
```sapl
policy "validate-permissions"
permit resource.type == "document";
  var userPerms = json.jsonToVal(subject.permissionsJson);
  userPerms.canRead == true;
```

Generate structured obligation data:
```sapl
policy "require-audit"
permit
obligation
  {
    "auditEntry": json.valToJson({
      "userId": subject.id,
      "resourceId": resource.id,
      "action": action.method,
      "timestamp": time.now()
    })
  }
```


---

## jsonToVal

```jsonToVal(TEXT json)```: Converts a well-formed JSON document into a SAPL value
representing the content of the JSON document. Returns an error if the JSON is malformed.

**Example:**
```sapl
policy "check-embedded-role"
permit action.method == "read";
  var userMetadata = json.jsonToVal(subject.metadataJson);
  userMetadata.role == "admin";
```


---

## valToJson

```valToJson(value)```: Converts a SAPL value into a JSON string representation.
Returns an error if serialization fails.

**Example:**
```sapl
policy "log-decision-context"
permit
obligation
  {
    "type": "audit",
    "context": json.valToJson(subject)
  }
```


---

