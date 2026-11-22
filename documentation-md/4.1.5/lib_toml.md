---
layout: default
title: toml
parent: Functions
nav_order: 129
---
# toml

Function library for TOML marshalling and unmarshalling operations.

# TOML Function Library

Enables TOML configuration file processing in SAPL policies for systems using TOML-based
configuration management. Parse TOML configuration files into SAPL values for policy
evaluation, or serialize authorization configurations into TOML format for application
configuration files and infrastructure management.

## Limits

To bound memory and computation on untrusted input, the following limits apply:

- The input is limited to 1 MB.
- Parsing is bounded to a maximum nesting depth of 500 and a maximum number length of 1000 characters.
- Serialization output is limited to 10000000 characters.

These limits apply because this input may originate from the authorization subscription or from policy information points, which are not vetted to the same degree as the policies and variables shipped with the PDP configuration.


---

## tomlToVal

```tomlToVal(TEXT toml)```: Converts a well-formed TOML document into a SAPL value
representing the content of the TOML document.

Input longer than 1 MB (1048576 characters) is rejected with an error, and nesting
depth is bounded, so a hostile attribute value cannot exhaust the evaluation thread.

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

