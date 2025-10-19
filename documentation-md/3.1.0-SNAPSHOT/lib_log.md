---
title: log
parent: Function Libraries
nav_order: 115
---
# log

Utility functions for dumping data from policy evaluation on the PDP console for debugging of policies.



---

## log.info(Text message, value)

```info(TEXT message, value)```: Logs the ```value``` prepended with the ```message``` to the
console at the DEBUG log level.
It is useful to add an additional statement line in a ```where``` block of a policy.
As the function always returns ```true```, the rest of the policy evaluation is not affected.
*Note:* If a statement above the logging statement evaluates to ```false```, the logger will
not be triggered, as the evaluation of statements is lazy.

**Example:**
```
policy "logging"
permit
where
  log.info(action.amount);
  subject.name == "testUser";
```


---

## log.warnSpy(Text message, value)

```warnSpy(TEXT message, value)```: Logs the ```value``` prepended with the ```message``` to the
console at the WARN log level.
The function behaves like the identity funtion, returning ```value``` unchanged.
This allows it to be used to wrap any value in a SAPL expression without changing the overall structure of the policy.

**Example:**
```
policy "logging"
permit
where
  log.warnSpy(subject.name) == "testUser";
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
```
policy "logging"
permit
where
  log.trace(action.amount);
  subject.name == "testUser";
```


---

## log.error(Text message, value)

```error(TEXT message, value)```: Logs the ```value``` prepended with the ```message``` to the
console at the ERROR log level.
This function is useful to add an additional statement line in a where block of a policy.
As the function always returns ```true```, the rest of the policy evaluation is not affected.
*Note:* If a statement above the logging statement evaluates to ```false```, the logger will
not be triggered, as the evaluation of statements is lazy.

**Example:**
```
policy "logging"
permit
where
  log.error(action.amount);
  subject.name == "testUser";
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
```
policy "logging"
permit
where
  log.debug(action.amount);
  subject.name == "testUser";
```


---

## log.errorSpy(Text message, value)

```errorSpy(TEXT message, value)```: Logs the ```value``` prepended with the ```message``` to the
console at the ERROR log level.
The function behaves like the identity funtion, returning ```value``` unchanged.
This allows it to be used to wrap any value in a SAPL expression without changing the overall structure of the policy.

**Example:**
```
policy "logging"
permit
where
  log.errorSpy(subject.name) == "testUser";
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
```
policy "logging"
permit
where
  log.warn(action.amount);
  subject.name == "testUser";
```


---

## log.traceSpy(Text message, value)

```traceSpy(TEXT message, value)```: Logs the ```value``` prepended with the ```message``` to the
console at the TRACE log level.
The function behaves like the identity funtion, returning ```value``` unchanged.
This allows it to be used to wrap any value in a SAPL expression without changing the overall structure of the policy.

**Example:**
```
policy "logging"
permit
where
  log.traceSpy(subject.name) == "testUser";
```


---

## log.debugSpy(Text message, value)

```debugSpy(TEXT message, value)```: Logs the ```value``` prepended with the ```message``` to the
console at the DEBUG log level.
The function behaves like the identity funtion, returning ```value``` unchanged.
This allows it to be used to wrap any value in a SAPL expression without changing the overall structure of the policy.

**Example:**
```
policy "logging"
permit
where
  log.debugSpy(subject.name) == "testUser";
```


---

## log.infoSpy(Text message, value)

```infoSpy(TEXT message, value)```: Logs the provided ```value```, prepended with the ```message```, to the
console at the INFO log level.
The function behaves like the identity funtion, returning ```value``` unchanged.
This allows it to be used to wrap any value in a SAPL expression without changing the overall structure of the policy.

**Example:**
```
policy "logging"
permit
where
  log.infoSpy(subject.name) == "testUser";
```


---

