---
layout: default
title: time
parent: Attribute Finders
nav_order: 204
---
# time

Policy Information Point and attributes for retrieving current date and time information and
basic temporal logic.



---

## now

```<time.now(INTEGER>0 updateIntervalInMillis>``` is an environment attribute stream and takes no left-hand arguments.
```<time.now(updateIntervalInMillis>``` emits the current date and time as an ISO 8601 String at UTC.
The first time is emitted instantly.
After that the time is emitted once every ```updateIntervalInMillis`` milliseconds.

Example:
```sapl
policy "time example"
permit
   time.dayOfWeek(<time.now(time.durationOfMinutes(5)>) == "MONDAY";
```


---

## now

```<time.now>``` is an environment attribute stream and takes no left-hand arguments.
```<time.now>```emits the current date and time as an ISO 8601 String at UTC.
The first time is emitted instantly.
After that the time is emitted once every second.

Example:
```sapl
policy "time example"
permit
   time.dayOfWeek(<time.now>) == "MONDAY";
```


---

## toggle

```<time.toggle(INTEGER>0 trueDurationMs, INTEGER>0 falseDurationMs)>``` is an environment attribute
stream and takes no left-hand arguments.
```<time.toggle(trueDurationMs, falseDurationMs)>``` emits a periodically toggling Boolean signal.
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

```<time.nowIsAfter(TEXT checkpoint)>``` is an environment attribute stream and takes no left-hand arguments.
```<time.nowIsAfter(checkpoint)>``` ```true```, if the current date time is after the ```checkpoint```
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

```<time.localTimeIsAfter(TEXT checkpoint, TEXT timezone)>``` is an environment attribute stream and takes no
left-hand arguments.
```<time.localTimeIsAfter(checkpoint, timezone)>``` ```true```, if the current time of the day without date is
after the ```checkpoint``` time (e.g., "17:00") in the given ```timezone``` (e.g., "Europe/Berlin") and
```false``` otherwise. This is examined relative to the current day. I.e., the answer toggles at "00:00".

Example:
```sapl
policy "time example"
permit action == "work";
  <time.localTimeIsAfter(subject.startTimeOfShift, "Europe/Berlin")>;
```


---

## localTimeIsAfter

```<time.localTimeIsAfter(TEXT checkpoint)>``` is an environment attribute stream and takes no left-hand arguments.
```<time.localTimeIsAfter(checkpoint)>``` ```true```, if the current time of the day without date is after the
```checkpoint``` time (e.g., "17:00") in the clock's configured timezone and ```false``` otherwise.
This is examined relative to the current day. I.e., the answer toggles at "00:00".
This *attribute is not polling the clock* and should be used instead of doing manual comparisons against
```<time.now>```, which would poll the clock regularly.

Example:
```sapl
policy "time example"
permit action == "work";
  <time.localTimeIsAfter(subject.startTimeOfShift)>;
```


---

## localTimeIsBetween

```<time.localTimeIsBetween(TEXT startTime, TEXT endTime, TEXT timezone)>``` is an environment attribute stream
and takes no left-hand arguments.
```<time.localTimeIsBetween(startTime, endTime, timezone)>``` ```true```, if the current time in the given
```timezone``` (e.g., "Europe/Berlin") is between the ```startTime``` and the ```endTime``` and ```false```
otherwise. If the time of the first parameter is after the time of the second parameter, the interval is
considered to be the one between the two times, crossing the midnight border of the days.

Example:
```sapl
policy "time example"
permit action == "work";
  <time.localTimeIsBetween(subject.shiftStarts, subject.shiftEnds, "Europe/Berlin")>;
```


---

## localTimeIsBetween

```<time.localTimeIsBetween(TEXT startTime, TEXT endTime)>``` is an environment attribute stream and takes no left-hand
arguments.
```<time.localTimeIsBetween(startTime, endTime)>``` ```true```, if the current time in the clock's configured
timezone is between the ```startTime``` and the ```endTime``` and ```false``` otherwise.
If the time of the first parameter is after the time of the second parameter, the interval is considered to be the
one between the two times, crossing the midnight border of the days.

Example:
```sapl
policy "time example"
permit action == "work";
  <time.localTimeIsBetween(subject.shiftStarts, subject.shiftEnds)>;
```


---

## nowIsBefore

```<time.nowIsBefore(TEXT checkpoint)>``` is an environment attribute stream and takes no left-hand arguments.
```<time.nowIsBefore(checkpoint)>``` ```true```, if the current date time is before the ```checkpoint```
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

## nowIsBetween

```<time.nowIsBetween(TEXT startTime, TEXT endTime)>``` is an environment attribute stream and takes no left-hand
arguments.
```<time.nowIsBetween(startTime, endTime)>``` ```true```, if the current date time is after the ```startTime``` and
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

## systemTimeZone

```<time.systemTimeZone>``` is an environment attribute stream and takes no left-hand arguments.
```<time.systemTimeZone>``` emits the PDP's system time zone code.
The zone is initially emitted instantly. After that the attribute verifies if the time zone changed every five
minutes and emits an update, if the time zone changed.

Example: The expression ```<time.systemTimeZone>``` will emit ```"US/Pacific"``` if the PDP's host default
time zone is set this way and will not emit anything if no changes are made.


---

## localTimeIsBefore

```<time.localTimeIsBefore(TEXT checkpoint, TEXT timezone)>``` is an environment attribute stream and takes no
left-hand arguments.
```<time.localTimeIsBefore(checkpoint, timezone)>``` ```false```, if the current time of the day without date is
after the ```checkpoint``` time (e.g., "17:00") in the given ```timezone``` (e.g., "Europe/Berlin") and
```true``` otherwise.

Example:
```sapl
policy "time example"
permit action == "work";
  <time.localTimeIsBefore(subject.endTimeOfShift, "America/New_York")>;
```


---

## localTimeIsBefore

```<time.localTimeIsBefore(TEXT checkpoint)>``` is an environment attribute stream and takes no left-hand arguments.
```<time.localTimeIsBefore(checkpoint)>``` ```false```, if the current time of the day without date is after the
```checkpoint``` time (e.g., "17:00") in the clock's configured timezone and ```true``` otherwise.
This is examined relative to the current day. I.e., the answer toggles at "00:00".
This *attribute is not polling the clock* and should be used instead of doing manual comparisons against
```<time.now>```, which would poll the clock regularly.

Example:
```sapl
policy "time example"
permit action == "work";
  <time.localTimeIsBefore(subject.endTimeOfShift)>;
```


---

## weekdayIn

```<time.weekdayIn(ARRAY days, TEXT timezone)>``` is an environment attribute stream and takes no left-hand arguments.
```<time.weekdayIn(days, timezone)>``` emits ```true``` if the current day of the week in the given
```timezone``` (e.g., "Europe/Berlin") is contained in the ```days``` array and ```false``` otherwise.

Example:
```sapl
policy "weekday access"
permit action == "work";
  <time.weekdayIn(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"], "Europe/Berlin")>;
```


---

## weekdayIn

```<time.weekdayIn(ARRAY days)>``` is an environment attribute stream and takes no left-hand arguments.
```<time.weekdayIn(days)>``` emits ```true``` if the current day of the week (in the clock's configured timezone)
is contained in the ```days``` array and ```false``` otherwise. The array contains day names as strings
(e.g., ```["MONDAY", "WEDNESDAY", "FRIDAY"]```). The attribute automatically re-evaluates at midnight boundaries.

Example:
```sapl
policy "weekday access"
permit action == "work";
  <time.weekdayIn(["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"])>;
```


---

## dayOfWeekBetween

```<time.dayOfWeekBetween(TEXT startDay, TEXT endDay, TEXT timezone)>``` is an environment attribute stream and
takes no left-hand arguments.
```<time.dayOfWeekBetween(startDay, endDay, timezone)>``` emits ```true``` if the current day of the week in the
given ```timezone``` is within the range from ```startDay``` to ```endDay``` (inclusive), and ```false```
otherwise. The range wraps around: ```("FRIDAY", "MONDAY")``` means Friday through Monday.

Example:
```sapl
policy "weekend access"
permit action == "relax";
  <time.dayOfWeekBetween("SATURDAY", "SUNDAY", "America/New_York")>;
```


---

## dayOfWeekBetween

```<time.dayOfWeekBetween(TEXT startDay, TEXT endDay)>``` is an environment attribute stream and takes no left-hand
arguments.
```<time.dayOfWeekBetween(startDay, endDay)>``` emits ```true``` if the current day of the week (in the clock's
configured timezone) is within the range from ```startDay``` to ```endDay``` (inclusive), and ```false```
otherwise. The range wraps around: ```("FRIDAY", "MONDAY")``` means Friday through Monday.

Example:
```sapl
policy "weekend access"
permit action == "relax";
  <time.dayOfWeekBetween("SATURDAY", "SUNDAY")>;
```


---

## monthIn

```<time.monthIn(ARRAY months)>``` is an environment attribute stream and takes no left-hand arguments.
```<time.monthIn(months)>``` emits ```true``` if the current month (in the clock's configured timezone) is
contained in the ```months``` array and ```false``` otherwise. The array accepts month names
(e.g., ```"JANUARY"```) or numbers (e.g., ```1``` for January). The attribute automatically re-evaluates
at month boundaries.

Example:
```sapl
policy "summer access"
permit action == "vacation";
  <time.monthIn(["JUNE", "JULY", "AUGUST"])>;
```


---

## monthIn

```<time.monthIn(ARRAY months, TEXT timezone)>``` is an environment attribute stream and takes no left-hand arguments.
```<time.monthIn(months, timezone)>``` emits ```true``` if the current month in the given ```timezone```
(e.g., "Europe/Berlin") is contained in the ```months``` array and ```false``` otherwise.

Example:
```sapl
policy "summer access"
permit action == "vacation";
  <time.monthIn(["JUNE", "JULY", "AUGUST"], "Europe/Berlin")>;
```


---

## monthBetween

```<time.monthBetween(INTEGER startMonth, INTEGER endMonth)>``` is an environment attribute stream and takes no
left-hand arguments.
```<time.monthBetween(startMonth, endMonth)>``` emits ```true``` if the current month (in the clock's configured
timezone) is within the range from ```startMonth``` to ```endMonth``` (inclusive, 1=January, 12=December), and
```false``` otherwise. The range wraps around: ```(11, 3)``` means November through March.

Example:
```sapl
policy "winter access"
permit action == "heating";
  <time.monthBetween(11, 3)>;
```


---

## monthBetween

```<time.monthBetween(INTEGER startMonth, INTEGER endMonth, TEXT timezone)>``` is an environment attribute stream
and takes no left-hand arguments.
```<time.monthBetween(startMonth, endMonth, timezone)>``` emits ```true``` if the current month in the given
```timezone``` is within the range from ```startMonth``` to ```endMonth``` (inclusive, 1=January, 12=December),
and ```false``` otherwise. The range wraps around: ```(11, 3)``` means November through March.

Example:
```sapl
policy "winter access"
permit action == "heating";
  <time.monthBetween(11, 3, "Europe/Berlin")>;
```


---

