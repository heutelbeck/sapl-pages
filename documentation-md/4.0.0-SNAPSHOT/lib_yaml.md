---
layout: default
title: yaml
parent: Functions
grand_parent: SAPL Reference
nav_order: 135
---
# yaml

Function library for YAML marshalling and unmarshalling operations.

# YAML Function Library

Enables YAML processing in SAPL policies for configuration-based authorization systems
and cloud-native environments. Parse YAML configurations into SAPL values for policy
evaluation, or serialize authorization decisions into YAML format for integration with
infrastructure-as-code and configuration management systems.


---

## yamlToVal

```yamlToVal(TEXT yaml)```: Converts a well-formed YAML document into a SAPL value
representing the content of the YAML document.

**Example:**
```sapl
policy "permit_resource_owner"
permit
   var resourceConfig = "owner: alice\nclassification: CONFIDENTIAL\naccessLevel: 3";
   var resource = yaml.yamlToVal(resourceConfig);
   resource.owner == subject.name;
```


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

