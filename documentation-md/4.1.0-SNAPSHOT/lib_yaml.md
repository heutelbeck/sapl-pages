---
layout: default
title: yaml
parent: Functions
nav_order: 134
---
# yaml

Function library for YAML marshalling and unmarshalling operations.

# YAML Function Library

Enables YAML processing in SAPL policies for configuration-based authorization systems
and cloud-native environments. Parse YAML configurations into SAPL values for policy
evaluation, or serialize authorization decisions into YAML format for integration with
infrastructure-as-code and configuration management systems.

## Limits

To bound memory and computation on untrusted input, the following limits apply:

- The input is limited to 1 MB.
- Parsing is bounded to a maximum nesting depth of 500 and a maximum number length of 1000 characters.

These limits apply because this input may originate from the authorization subscription or from policy information points, which are not vetted to the same degree as the policies and variables shipped with the PDP configuration.


---

## valToYaml

```valToYaml(value)```: Converts a SAPL value into a YAML string representation.

**Example:**
```sapl
policy "export_audit_log"
permit
   var auditEntry = {"user":"bob","action":"READ","resource":"/api/data","timestamp":"2025-01-15T10:30:00Z"};
   var auditYaml = yaml.valToYaml(auditEntry);
   // auditYaml contains YAML-formatted audit log entry
```


---

## yamlToVal

```yamlToVal(TEXT yaml)```: Converts a well-formed YAML document into a SAPL value
representing the content of the YAML document.

Input longer than 1 MB (1048576 characters) is rejected with an error, and nesting
depth is bounded, so a hostile attribute value cannot exhaust the evaluation thread.

**Example:**
```sapl
policy "permit_resource_owner"
permit
   var resourceConfig = "owner: alice\nclassification: CONFIDENTIAL\naccessLevel: 3";
   var resource = yaml.yamlToVal(resourceConfig);
   resource.owner == subject.name;
```


---

