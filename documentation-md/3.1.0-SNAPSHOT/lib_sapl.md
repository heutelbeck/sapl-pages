---
title: sapl
parent: Functions
nav_order: 125
---
# sapl

SAPL system information functions.



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

**Example:**
```sapl
policy "example"
permit
where
  var systemInfo = sapl.info();
  systemInfo.version == "3.0.0";
```


---

