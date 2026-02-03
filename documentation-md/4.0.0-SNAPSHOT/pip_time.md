---
layout: default
title: time
parent: Attribute Finders
grand_parent: SAPL Reference
nav_order: 204
---
# time

Policy Information Point and attributes for retrieving current date and time information and
basic temporal logic.



---

## now

```<now>``` is an environment attribute stream and takes no left-hand arguments.
```<now>```emits the current date and time as an ISO 8601 String at UTC.
The first time is emitted instantly.
After that the time is emitted once every second.

Example:
```sapl
policy "time example"
permit
   time.dayOfWeek(<now>) == "MONDAY";
```


---

## now

```<now(INTEGER>0 updateIntervalInMillis>``` is an environment attribute stream and takes no left-hand arguments.
```<now(updateIntervalInMillis>``` emits the current date and time as an ISO 8601 String at UTC.
The first time is emitted instantly.
After that the time is emitted once every ```updateIntervalInMillis`` milliseconds.

Example:
```sapl
policy "time example"
permit
   time.dayOfWeek(<now(time.durationOfMinutes(5)>) == "MONDAY";
```


---

## toggle

```<toggle(INTEGER>0 trueDurationMs, INTEGER>0 falseDurationMs)>``` is an environment attribute
stream and takes no left-hand arguments.
```<toggle(trueDurationMs, falseDurationMs)>``` emits a periodically toggling Boolean signal.
Will be ```true``` immediately for the first duration ```trueDurationMs``` (in milliseconds)
and then ```false``` for the second duration ```falseDurationMs``` (in milliseconds).
This will repeat periodically.
Note, that the cycle will completely reset if the durations are updated.
The attribute will forget its state in this case.

Example:
```sapl
policy "time example"
permit action == "read";
  <time.toggle(1000, 2000)>;
```

This policy will toggle between ```PERMIT``` and ```NOT_APPLICABLE```, where
```PERMIT``` will be the result for one second and ```NOT_APPLICABLE```
will be the result for two seconds.


---

## nowIsAfter

```<nowIsAfter(TEXT checkpoint)>``` is an environment attribute stream and takes no left-hand arguments.
```<nowIsAfter(checkpoint)>``` ```true```, if the current date time is after the ```checkpoint```
time (ISO 8601 String at UTC) and ```false```otherwise.
The attribute immediately emits the comparison result between the current time and the ```checkpoint```.
If the time at the beginning of the attribute stream was before the ```checkpoint``` and it returned ```false```,
then immediately after the ```checkpoint``` time is reached it will emit ```true```.
This *attribute is not polling the clock* and should be used instead of  ```time.after(<time.now>, checkpoint)```,
which would poll the clock regularly.

Example:
```sapl
policy "time example"
permit action == "work";
  <time.nowIsAfter(subject.employmentStart)>;
```

Alternatively, assume that the current time is ```"2021-11-08T13:00:00Z"``` then the expression
```<time.nowIsAfter("2021-11-08T14:30:00Z")>``` will immediately return ```false``` and after
90 minutes it will emit ```true```.

---

## localTimeIsAfter

```<localTimeIsAfter(TEXT checkpoint)>``` is an environment attribute stream and takes no left-hand arguments.
```<localTimeIsAfter(checkpoint)>``` ```true```, if the current time of the day without date is after the
```checkpoint``` time (e.g., "17:00") at UTC and ```false```otherwise. This is examined relative to the current
day. I.e., the answer toggles at "00:00".
The attribute immediately emits the comparison result between the current time and the ```checkpoint```.
If the time at the beginning of the attribute stream was before the ```checkpoint``` and it returned ```false```,
then immediately after the ```checkpoint``` time is reached it will emit ```true```.
This *attribute is not polling the clock* and should be used instead of doing manual comparisons against
```<time.now>```, which would poll the clock regularly.

Example:
```sapl
policy "time example"
permit action == "work";
  <time.nowIsAfter(subject.startTimeOfShift)>;
```

Alternatively, assume that the current time is ```"2021-11-08T13:00:00Z"``` then the expression
```<time.localTimeIsAfter("14:00")>``` will immediately return ```false``` and after
one hour it will emit ```true```.

---

## nowIsBetween

```<nowIsBetween(TEXT startTime, TEXT endTime)>``` is an environment attribute stream and takes no left-hand
arguments.
```<nowIsBetween(startTime, endTime)>``` ```true```, if the current date time is after the ```startTime``` and
before the ```endTime``` (both ISO 8601 String at UTC) and ```false```otherwise.
The attribute immediately emits the comparison result between the current time and the provided time interval.
A new result will be emitted, if the current time crosses any of the interval boundaries.
This *attribute is not polling the clock* and should be used instead of  manually comparing the interval
to ```<time.now>```.

Example:
```sapl
policy "time example"
permit action == "work";
  <time.nowIsBetween(subject.employmentStarts, subject.employmentEnds)>;
```


---

## nowIsBefore

```<nowIsBefore(TEXT checkpoint)>``` is an environment attribute stream and takes no left-hand arguments.
```<nowIsBefore(checkpoint)>``` ```true```, if the current date time is before the ```checkpoint```
time (ISO 8601 String at UTC) and ```false```otherwise.
The attribute immediately emits the comparison result between the current time and the ```checkpoint```.
If the time at the beginning of the attribute stream was before the ```checkpoint``` and it returned ```true```,
then immediately after the ```checkpoint``` time is reached it will emit ```false```.
This *attribute is not polling the clock* and should be used instead of  ```time.before(<time.now>, checkpoint)```,
which would poll the clock regularly.

Example:
```sapl
policy "time example"
permit action == "work";
  <time.nowIsBefore(subject.employmentEnds)>;
```

Alternatively, assume that the current time is ```"2021-11-08T13:00:00Z"``` then the expression
```<time.nowIsBefore("2021-11-08T14:30:00Z")>``` will immediately return ```true``` and after
90 minutes it will emit ```false```.

---

## systemTimeZone

```<systemTimeZone>``` is an environment attribute stream and takes no left-hand arguments.
```<systemTimeZone>``` emits the PDP's system time zone code.
The zone is initially emitted instantly. After that the attribute verifies if the time zone changed every five
minutes and emits an update, if the time zone changed.

Example: The expression ```<systemTimeZone>``` will emit ```"US/Pacific"``` if the PDP's host default
time zone is set this way and will not emit anything if no changes are made.


---

## localTimeIsBetween

```<localTimeIsBetween(TEXT startTime, TEXT endTime)>``` is an environment attribute stream and takes no left-hand
arguments.
```<localTimeIsBetween(startTime, endTime)>``` ```true```, if the current time at UTC between the ```startTime```
and the ```endTime``` (both ISO 8601 String at UTC) and ```false```otherwise.
The attribute immediately emits the comparison result between the current time and the provided time interval.
A new result will be emitted, if the current time crosses any of the interval boundaries.
This *attribute is not polling the clock* and should be used instead of  manually comparing the interval
to ```<time.now>```.
If the time of the first parameter is after the time of the second parameter, the interval ist considered to be the
one between the to times, crossing the midnight border of the days.

Example:
```sapl
policy "time example"
permit action == "work";
  <time.localTimeIsBetween(subject.shiftStarts, subject.shiftEnds)>;
```


---

## localTimeIsBefore

```<localTimeIsBefore(TEXT checkpoint)>``` is an environment attribute stream and takes no left-hand arguments.
```<localTimeIsBefore(checkpoint)>``` ```false```, if the current time of the day without date is after the
```checkpoint``` time (e.g., "17:00") at UTC and ```true```otherwise. This is examined relative to the current
day. I.e., the answer toggles at "00:00".
The attribute immediately emits the comparison result between the current time and the ```checkpoint```.
If the time at the beginning of the attribute stream was before the ```checkpoint``` and it returned ```true```,
then immediately after the ```checkpoint``` time is reached it will emit ```false```.
This *attribute is not polling the clock* and should be used instead of doing manual comparisons against
```<time.now>```, which would poll the clock regularly.

Example:
```sapl
policy "time example"
permit action == "work";
  <time.localTimeIsBefore(subject.endTimeOfShift)>;
```

Alternatively, assume that the current time is ```"2021-11-08T13:00:00Z"``` then the expression
```<time.localTimeIsBefore("14:00")>``` will immediately return ```true``` and after
one hour it will emit ```false```.

---

