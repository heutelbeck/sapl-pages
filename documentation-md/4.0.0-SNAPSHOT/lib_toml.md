---
layout: default
title: toml
parent: Functions
grand_parent: SAPL Reference
nav_order: 129
---
# toml

Function library for TOML marshalling and unmarshalling operations.

# TOML Function Library

Enables TOML configuration file processing in SAPL policies for systems using TOML-based
configuration management. Parse TOML configuration files into SAPL values for policy
evaluation, or serialize authorization configurations into TOML format for application
configuration files and infrastructure management.


---

## tomlToVal

```tomlToVal(TEXT toml)```: Converts a well-formed TOML document into a SAPL value
representing the content of the TOML document.

**Example:**
```sapl
policy "permit_based_on_config"
permit
   var configToml = "[resource]\nowner = \"alice\"\nclassification = \"CONFIDENTIAL\"\naccessLevel = 3";
   var config = toml.tomlToVal(configToml);
   config.resource.owner == subject.name;
```


---

## valToToml

```valToToml(value)```: Converts a SAPL value into a TOML string representation.

**Example:**
```sapl
policy "export_policy_config"
permit
   var policyConfig = {"permissions":{"user":"bob","actions":["READ","WRITE"],"resources":["/api/data"]}};
   var configToml = toml.valToToml(policyConfig);
   // configToml contains TOML-formatted configuration
```


---

