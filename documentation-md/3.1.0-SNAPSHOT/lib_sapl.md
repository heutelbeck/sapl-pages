---
layout: default
title: sapl
parent: Functions
grand_parent: SAPL Reference
nav_order: 125
---
# sapl

SAPL system information functions.

Runtime environment introspection for authorization policies. Query application version,
JDK details, and operating system information to make platform-aware access control decisions.

The library provides a single function that returns system metadata cached at class initialization.
Use this to enforce runtime requirements, restrict operations to specific platforms, or capture
environment context in audit trails.


---

## sapl.info()

```info()```: Returns system information including application version, git details, JDK/JRE, and operating system information.

The returned object contains the following properties:
- ```saplVersion```: Version of the SAPL Engine
- ```gitCommitId```: Abbreviated git commit hash
- ```gitBranch```: Git branch name
- ```gitBuildTime```: Build timestamp
- ```jdkVersion```: JDK version used for compilation
- ```javaVersion```: Current JRE version
- ```javaVendor```: Java vendor name
- ```osName```: Operating system name
- ```osVersion```: Operating system version
- ```osArch```: Operating system architecture

If properties cannot be loaded from the classpath, fields will contain "unknown" as a fallback value.

Use this function to validate system requirements, log runtime environment details for audit trails, or conditionally enable features based on platform capabilities.

**Example - Enforce Minimum JDK Version:**
```sapl
policy "require_jdk21"
permit action == "system:deploy"
where
  var info = sapl.info();
  info.jdkVersion >= "21";
```

**Example - Platform-Specific Access Control:**
```sapl
policy "linux_only_operations"
permit action == "admin:configure-network"
where
  var info = sapl.info();
  info.osName =~ "Linux";
```

**Example - Audit Logging with Environment Context:**
```sapl
policy "audit_with_environment"
permit action == "data:access"
obligation
  {
    "type": "log-access",
    "environment": sapl.info()
  }
```


---

