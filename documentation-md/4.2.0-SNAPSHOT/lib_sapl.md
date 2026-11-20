---
layout: default
title: sapl
parent: Functions
nav_order: 123
---
# sapl

SAPL system information functions.

Runtime environment introspection for authorization policies. Query the SAPL version, the engine
that evaluates the policies and its runtime, and operating system information to make
platform-aware access control decisions.

The library provides a single function that returns system metadata collected once when the engine starts.
Use this to enforce runtime requirements, restrict operations to specific platforms, or capture
environment context in audit trails.


---

## info

```info()```: Returns system information including the SAPL version, git details, the engine and its runtime, and operating system information.

The returned object contains the following properties:
- ```saplVersion```: Version of the SAPL Engine
- ```engine```: Implementation of the engine, "java" or "rust"
- ```engineVersion```: Version of the runtime of the engine, the Java runtime or the Rust compiler
- ```gitCommitId```: Abbreviated git commit hash
- ```gitBranch```: Git branch name
- ```gitBuildTime```: Build timestamp
- ```osName```: Operating system name
- ```osVersion```: Operating system version
- ```osArch```: Operating system architecture

A value that cannot be determined, such as the git details of a build without git information, is "unknown".

Use this function to validate system requirements, log runtime environment details for audit trails, or conditionally enable features based on platform capabilities.

**Example: Restrict Operations to an Engine**
```sapl
policy "java_engine_only"
permit action == "system:deploy";
  var info = sapl.info();
  info.engine == "java";
```

**Example: Platform-Specific Access Control**
```sapl
policy "linux_only_operations"
permit action == "admin:configure-network";
  var info = sapl.info();
  info.osName =~ "Linux";
```

**Example: Audit Logging with Environment Context**
```sapl
policy "audit_with_environment"
permit action == "data:access";
obligation
  {
    "type": "log-access",
    "environment": sapl.info()
  }
```


---

