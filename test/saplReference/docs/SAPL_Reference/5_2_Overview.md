---
layout: default
title: Overview
permalink: /reference/Overview/
parent: The SAPL Policy Language
grand_parent: SAPL Reference
nav_order: 2
---

### Overview

SAPL knows two types of documents: Policy sets and policies. The decisions of the PDP are based on all documents published in the policy store of the PDP. A policy set contains an ordered set of connected policies.

#### Policy Structure

A SAPL policy consists of optional **imports**, a **name**, an **entitlement** specification, an optional **target expression**, an optional **body** with one or more statements, and optional sections for **obligation**, **advice**, and **transformation**. An example of a simple policy is:

Sample SAPL Policy

```java
import filter as filter (1)

policy "test_policy" (2)
permit (3)
    subject.id == "anId" | action == "anAction" (4)
where
    var variable = "anAttribute";
    subject.attribute == variable; (5)
obligation
    "logging:log_access" (6)
advice
    "logging:inform_admin" (7)
transform
    resource.content |- filter.blacken (8)
```

**1** Imports (optional)

**2** Name

**3** Entitlement

**4** Target Expression (optional)

**5** Body (optional)

**6** Obligation (optional)

**7** Advice (optional)

**8** Transformation (optional)

#### Policy Set Structure

A SAPL policy set contains optional **imports**, a **name**, a **combining algorithm**, an optional **target expression**, optional **variable definitions**, and a list of **policies**. The following example shows a simple policy set with two policies:

Sample SAPL Policy Set

```java
import filter.* (1)

set "test_policy_set" (2)
deny-unless-permit (3)
for resource.type == "aType" (4)
var dbUser = "admin";(5)

    policy "test_permit_admin" (6)
    permit subject.function == "admin"

    policy "test_permit_read" (7)
    permit action == "read"
    transform resource |- blacken
```

**1** Imports (optional)

**2** Name

**3** Combining Algorithm

**4** Target Expression (optional)

**5** Variable Assignments (optional)

**6** Policy 1

**7** Policy 2
