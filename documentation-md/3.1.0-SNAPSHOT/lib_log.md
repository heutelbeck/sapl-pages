---
layout: default
title: log
parent: Functions
grand_parent: SAPL Reference
nav_order: 115
---
# log

Utility functions for dumping data from policy evaluation on the PDP console for debugging of policies.



---

## log.info(Text message, value)

```info(TEXT message, value)```: Logs the ```value``` prepended with the ```message``` to the
console at the INFO log level.
This function is useful to add an additional statement line in a ```where``` block of a policy.
As the function always returns ```true```, the rest of the policy evaluation is not affected.
*Note:* If a statement above the logging statement evaluates to ```false```, the logger will
not be triggered, as the evaluation of statements is lazy.

**Example:**
```sapl
policy "audit_policy_execution"
permit
where
  log.info("Transaction amount", action.amount);
  subject.approvalLimit >= action.amount;
```


---

## log.warnSpy(Text message, value)

```warnSpy(TEXT message, value)```: Logs the ```value``` prepended with the ```message``` to the
console at the WARN log level.
The function behaves like the identity function, returning ```value``` unchanged.
This allows wrapping any value in a SAPL expression without changing the overall structure of the policy.

**Example:**
```sapl
policy "monitor_suspicious_access"
permit
where
  log.warnSpy("Access attempt from", subject.ipAddress) in resource.allowedIPs;
```


---

## log.trace(Text message, value)

```trace(TEXT message, value)```: Logs the ```value``` prepended with the ```message``` to the
console at the TRACE log level.
This function is useful to add an additional statement line in a ```where``` block of a policy.
As the function always returns ```true```, the rest of the policy evaluation is not affected.
*Note:* If a statement above the logging statement evaluates to ```false```, the logger will
not be triggered, as the evaluation of statements is lazy.

**Example:**
```sapl
policy "detailed_access_log"
permit
where
  log.trace("Request details", action);
  subject.role == "auditor";
```


---

## log.error(Text message, value)

```error(TEXT message, value)```: Logs the ```value``` prepended with the ```message``` to the
console at the ERROR log level.
This function is useful to add an additional statement line in a ```where``` block of a policy.
As the function always returns ```true```, the rest of the policy evaluation is not affected.
*Note:* If a statement above the logging statement evaluates to ```false```, the logger will
not be triggered, as the evaluation of statements is lazy.

**Example:**
```sapl
policy "log_critical_errors"
permit
where
  log.error("Critical system access", subject.userId);
  subject.clearanceLevel == "top-secret";
```


---

## log.debug(Text message, value)

```debug(TEXT message, value)```: Logs the ```value``` prepended with the ```message``` to the
console at the DEBUG log level.
This function is useful to add an additional statement line in a ```where``` block of a policy.
As the function always returns ```true```, the rest of the policy evaluation is not affected.
*Note:* If a statement above the logging statement evaluates to ```false```, the logger will
not be triggered, as the evaluation of statements is lazy.

**Example:**
```sapl
policy "debug_authorization"
permit
where
  log.debug("Evaluating permissions", subject.permissions);
  subject.department == "engineering";
```


---

## log.errorSpy(Text message, value)

```errorSpy(TEXT message, value)```: Logs the ```value``` prepended with the ```message``` to the
console at the ERROR log level.
The function behaves like the identity function, returning ```value``` unchanged.
This allows wrapping any value in a SAPL expression without changing the overall structure of the policy.

**Example:**
```sapl
policy "track_authorization_failures"
permit
where
  log.errorSpy("Failed auth for user", subject.username) != "guest";
```


---

## log.warn(Text message, value)

```warn(TEXT message, value)```: Logs the ```value``` prepended with the ```message``` to the
console at the WARN log level.
This function is useful to add an additional statement line in a ```where``` block of a policy.
As the function always returns ```true```, the rest of the policy evaluation is not affected.
*Note:* If a statement above the logging statement evaluates to ```false```, the logger will
not be triggered, as the evaluation of statements is lazy.

**Example:**
```sapl
policy "flag_unusual_access"
permit
where
  log.warn("Access outside business hours", time.now());
  subject.role in ["admin", "oncall"];
```


---

## log.traceSpy(Text message, value)

```traceSpy(TEXT message, value)```: Logs the ```value``` prepended with the ```message``` to the
console at the TRACE log level.
The function behaves like the identity function, returning ```value``` unchanged.
This allows wrapping any value in a SAPL expression without changing the overall structure of the policy.

**Example:**
```sapl
policy "audit_user_access"
permit
where
  log.traceSpy("Checking user", subject.name) == "admin";
```


---

## log.debugSpy(Text message, value)

```debugSpy(TEXT message, value)```: Logs the ```value``` prepended with the ```message``` to the
console at the DEBUG log level.
The function behaves like the identity function, returning ```value``` unchanged.
This allows wrapping any value in a SAPL expression without changing the overall structure of the policy.

**Example:**
```sapl
policy "validate_permissions"
permit
where
  log.debugSpy("Permissions list", subject.permissions) |> filter.contains("read");
```


---

## log.infoSpy(Text message, value)

```infoSpy(TEXT message, value)```: Logs the provided ```value```, prepended with the ```message```, to the
console at the INFO log level.
The function behaves like the identity function, returning ```value``` unchanged.
This allows wrapping any value in a SAPL expression without changing the overall structure of the policy.

**Example:**
```sapl
policy "check_resource_owner"
permit
where
  log.infoSpy("Resource owner", resource.ownerId) == subject.id;
```


---

