---
layout: default
title: time
parent: Functions
grand_parent: SAPL Reference
nav_order: 129
---
# time

Functions for temporal operations in authorization policies.

Temporal functions for working with dates, times, and durations in authorization policies.
Based on ISO 8601 and DIN 1355 standards.

## Date and Time Formats

ISO 8601 uses YYYY-MM-DD for dates (e.g., "2017-10-28") and HH:mm:ss for times (e.g., "16:14:11").
Combined format: "2017-10-28T16:14:11".

DIN 1355 uses DD.MM.YYYY for dates (e.g., "28.10.2017").

RFC3339 is a strict profile of ISO 8601 requiring timezone information:
YYYY-MM-DDTHH:MM:SS[.fraction](Z|±HH:MM)

All functions accept ISO 8601 and RFC3339 timestamps. RFC3339 leap seconds (e.g., "23:59:60Z")
are normalized to "23:59:59Z" by Java's temporal system.

## Timezone Handling

UTC (Coordinated Universal Time) is timezone zero. Central European Time has a +01:00 offset.
Functions work with UTC timestamps and support timezone conversions.

**Examples:**
```sapl
policy "working_hours"
permit
  var currentTime = time.timeOf(environment.currentDateTime);
  time.after(currentTime, "09:00:00");
  time.before(currentTime, "17:00:00");
```

```sapl
policy "age_restriction"
permit
  var age = time.ageInYears(subject.birthDate, environment.currentDate);
  age >= 18;
```


---

## before

```before(TEXT timeA, TEXT timeB)```: Compares two instants and returns true if timeA is before timeB.

Both parameters must be ISO 8601 strings at UTC.

**Example:**

The expression ```time.before("2021-11-08T13:00:00Z", "2021-11-08T13:00:01Z")``` returns ```true```.

---

## after

```after(TEXT timeA, TEXT timeB)```: Compares two instants and returns true if timeA is after timeB.

Both parameters must be ISO 8601 strings at UTC.

**Example:**

The expression ```time.after("2021-11-08T13:00:01Z", "2021-11-08T13:00:00Z")``` returns ```true```.

---

## between

```between(TEXT time, TEXT intervalStart, TEXT intervalEnd)```: Returns true if time falls within
the closed interval from intervalStart to intervalEnd.

All parameters must be ISO 8601 strings at UTC. intervalStart must be before intervalEnd.

**Example:**

The expression ```time.between("2021-11-08T13:00:00Z", "2021-11-07T13:00:00Z", "2021-11-09T13:00:00Z")```
returns ```true```.

---

## ofEpochSecond

```ofEpochSecond(INTEGER epochSeconds)```: Converts seconds since the epoch to an ISO 8601 UTC timestamp.

**Example:**

The expression ```time.ofEpochSecond(1636376400)``` returns ```"2021-11-08T13:00:00Z"```.

---

## plusNanos

```plusNanos(TEXT startTime, INTEGER nanos)```: Adds the specified number of nanoseconds to startTime.

startTime must be an ISO 8601 string at UTC. nanos must be an integer.

**Example:**

The expression ```time.plusNanos("2021-11-08T13:00:00Z", 10000000000)```
returns ```"2021-11-08T13:00:10Z"```.

---

## plusSeconds

```plusSeconds(TEXT startTime, INTEGER seconds)```: Adds the specified number of seconds to startTime.

startTime must be an ISO 8601 string at UTC. seconds must be an integer.

**Example:**

The expression ```time.plusSeconds("2021-11-08T13:00:00Z", 10)```
returns ```"2021-11-08T13:00:10Z"```.

---

## plusMillis

```plusMillis(TEXT startTime, INTEGER millis)```: Adds the specified number of milliseconds to startTime.

startTime must be an ISO 8601 string at UTC. millis must be an integer.

**Example:**

The expression ```time.plusMillis("2021-11-08T13:00:00Z", 10000)```
returns ```"2021-11-08T13:00:10Z"```.

---

## plusDays

```plusDays(TEXT startTime, INTEGER days)```: Adds the specified number of days to startTime.

startTime must be an ISO 8601 string at UTC. days must be an integer.

**Example:**

The expression ```time.plusDays("2021-11-08T13:00:00Z", 5)```
returns ```"2021-11-13T13:00:00Z"```.

---

## minusDays

```minusDays(TEXT startTime, INTEGER days)```: Subtracts the specified number of days from startTime.

startTime must be an ISO 8601 string at UTC. days must be an integer.

**Example:**

The expression ```time.minusDays("2021-11-08T13:00:00Z", 5)```
returns ```"2021-11-03T13:00:00Z"```.

---

## minusSeconds

```minusSeconds(TEXT startTime, INTEGER seconds)```: Subtracts the specified number of seconds from startTime.

startTime must be an ISO 8601 string at UTC. seconds must be an integer.

**Example:**

The expression ```time.minusSeconds("2021-11-08T13:00:00Z", 10)```
returns ```"2021-11-08T12:59:50Z"```.

---

## minusMillis

```minusMillis(TEXT startTime, INTEGER millis)```: Subtracts the specified number of milliseconds from startTime.

startTime must be an ISO 8601 string at UTC. millis must be an integer.

**Example:**

The expression ```time.minusMillis("2021-11-08T13:00:00Z", 10000)```
returns ```"2021-11-08T12:59:50Z"```.

---

## minusNanos

```minusNanos(TEXT startTime, INTEGER nanos)```: Subtracts the specified number of nanoseconds from startTime.

startTime must be an ISO 8601 string at UTC. nanos must be an integer.

**Example:**

The expression ```time.minusNanos("2021-11-08T13:00:00Z", 10000000000)```
returns ```"2021-11-08T12:59:50Z"```.

---

## epochSecond

```epochSecond(TEXT utcDateTime)```: Converts an ISO 8601 UTC timestamp to seconds since
the epoch (1970-01-01T00:00:00Z).

**Example:**

The expression ```time.epochSecond("2021-11-08T13:00:00Z")``` returns ```1636376400```.

---

## ofEpochMilli

```ofEpochMilli(INTEGER epochMillis)```: Converts milliseconds since the epoch to an ISO 8601 UTC timestamp.

**Example:**

The expression ```time.ofEpochMilli(1636376400000)``` returns ```"2021-11-08T13:00:00Z"```.

---

## epochMilli

```epochMilli(TEXT utcDateTime)```: Converts an ISO 8601 UTC timestamp to milliseconds since
the epoch (1970-01-01T00:00:00Z).

**Example:**

The expression ```time.epochMilli("2021-11-08T13:00:00Z")``` returns ```1636376400000```.

---

## plusMonths

```plusMonths(TEXT startTime, INTEGER months)```: Adds the specified number of months to startTime.

startTime must be an ISO 8601 string at UTC. months must be an integer.
Uses standard calendar rules (e.g., adding 1 month to Jan 31 results in Feb 28/29).

**Example:**

The expression ```time.plusMonths("2021-11-08T13:00:00Z", 2)```
returns ```"2022-01-08T13:00:00Z"```.

---

## plusYears

```plusYears(TEXT startTime, INTEGER years)```: Adds the specified number of years to startTime.

startTime must be an ISO 8601 string at UTC. years must be an integer.
Uses standard calendar rules (e.g., adding 1 year to Feb 29 in a leap year results in Feb 28).

**Example:**

The expression ```time.plusYears("2021-11-08T13:00:00Z", 3)```
returns ```"2024-11-08T13:00:00Z"```.

---

## minusMonths

```minusMonths(TEXT startTime, INTEGER months)```: Subtracts the specified number of months from startTime.

startTime must be an ISO 8601 string at UTC. months must be an integer.
Uses standard calendar rules.

**Example:**

The expression ```time.minusMonths("2021-11-08T13:00:00Z", 2)```
returns ```"2021-09-08T13:00:00Z"```.

---

## dayOfYear

```dayOfYear(TEXT utcDateTime)```: Returns the day of the year (1-365) for the given date.

utcDateTime must be an ISO 8601 string at UTC.

**Example:**

The expression ```time.dayOfYear("2021-11-08T13:00:00Z")``` returns ```312```.

---

## minusYears

```minusYears(TEXT startTime, INTEGER years)```: Subtracts the specified number of years from startTime.

startTime must be an ISO 8601 string at UTC. years must be an integer.
Uses standard calendar rules.

**Example:**

The expression ```time.minusYears("2021-11-08T13:00:00Z", 3)```
returns ```"2018-11-08T13:00:00Z"```.

---

## dayOfWeek

```dayOfWeek(TEXT utcDateTime)```: Returns the name of the weekday for the given date.

Returns one of: SUNDAY, MONDAY, TUESDAY, WEDNESDAY, THURSDAY, FRIDAY, SATURDAY.
utcDateTime must be an ISO 8601 string at UTC.

**Example:**

The expression ```time.dayOfWeek("2021-11-08T13:00:00Z")``` returns ```"MONDAY"```.

---

## weekOfYear

```weekOfYear(TEXT utcDateTime)```: Returns the calendar week number (1-52) for the given date.

utcDateTime must be an ISO 8601 string at UTC.

**Example:**

The expression ```time.weekOfYear("2021-11-08T13:00:00Z")``` returns ```45```.

---

## startOfDay

```startOfDay(TEXT dateTime)```: Returns the start of the day (00:00:00.000) for the given date-time at UTC.

**Example:**

The expression ```time.startOfDay("2021-11-08T13:45:30Z")``` returns ```"2021-11-08T00:00:00Z"```.

---

## startOfWeek

```startOfWeek(TEXT dateTime)```: Returns the start of the week (Monday 00:00:00.000) for the given date-time at UTC.

Weeks start on Monday per ISO 8601.

**Example:**

The expression ```time.startOfWeek("2021-11-08T13:45:30Z")``` returns ```"2021-11-08T00:00:00Z"```
(November 8, 2021 was a Monday).

---

## startOfMonth

```startOfMonth(TEXT dateTime)```: Returns the start of the month (first day at 00:00:00.000) for the given date-time at UTC.

**Example:**

The expression ```time.startOfMonth("2021-11-08T13:45:30Z")``` returns ```"2021-11-01T00:00:00Z"```.

---

## startOfYear

```startOfYear(TEXT dateTime)```: Returns the start of the year (January 1 at 00:00:00.000) for the given date-time at UTC.

**Example:**

The expression ```time.startOfYear("2021-11-08T13:45:30Z")``` returns ```"2021-01-01T00:00:00Z"```.

---

## durationOfSeconds

```durationOfSeconds(NUMBER seconds)```: Converts seconds to milliseconds for duration values.

Durations in the temporal library are expressed in milliseconds. Multiplies seconds by 1000.

**Example:**

The expression ```time.durationOfSeconds(20.5)``` returns ```20500```.


---

## durationOfMinutes

```durationOfMinutes(NUMBER minutes)```: Converts minutes to milliseconds for duration values.

Multiplies minutes by 60000.

**Example:**

The expression ```time.durationOfMinutes(2.5)``` returns ```150000```.

---

## durationOfHours

```durationOfHours(NUMBER hours)```: Converts hours to milliseconds for duration values.

Multiplies hours by 3600000.

**Example:**

The expression ```time.durationOfHours(4.5)``` returns ```16200000```.

---

## durationOfDays

```durationOfDays(NUMBER days)```: Converts days to milliseconds for duration values.

Multiplies days by 86400000.

**Example:**

The expression ```time.durationOfDays(365)``` returns ```31536000000```.

---

## timeBetween

```timeBetween(TEXT timeA, TEXT timeB, TEXT chronoUnit)```: Calculates the time span between
timeA and timeB in the specified chronoUnit.

Both time parameters must be ISO 8601 strings at UTC. Valid chronoUnits: NANOS, MICROS, MILLIS,
SECONDS, MINUTES, HOURS, HALF_DAYS, DAYS, WEEKS, MONTHS, YEARS, DECADES, CENTURIES, MILLENNIA.

Month duration is estimated as one twelfth of 365.2425 days. Year duration is 365.2425 days.

**Example:**

The expression ```time.timeBetween("2001-01-01", "2002-01-01", "YEARS")``` returns ```1```.

---

## validUTC

```validUTC(TEXT utcDateTime)```: Returns true if the value is a valid ISO 8601 UTC timestamp.

**Example:**

The expression ```time.validUTC("2021-11-08T13:00:00Z")``` returns ```true```.
The expression ```time.validUTC("20111-000:00Z")``` returns ```false```.

---

## validRFC3339

```validRFC3339(TEXT timestamp)```: Returns true if the value is a valid RFC3339 timestamp.

RFC3339 requires a timezone designator (Z or offset like +05:00).

**Example:**

The expression ```time.validRFC3339("2021-11-08T13:00:00Z")``` returns ```true```.
The expression ```time.validRFC3339("2021-11-08T13:00:00")``` returns ```false``` (missing timezone).
The expression ```time.validRFC3339("2021-11-08")``` returns ```false``` (date only, no time).

---

## endOfDay

```endOfDay(TEXT dateTime)```: Returns the end of the day (23:59:59.999999999) for the given date-time at UTC.

**Example:**

The expression ```time.endOfDay("2021-11-08T13:45:30Z")``` returns ```"2021-11-08T23:59:59.999999999Z"```.

---

## endOfWeek

```endOfWeek(TEXT dateTime)```: Returns the end of the week (Sunday 23:59:59.999999999) for the given date-time at UTC.

Weeks end on Sunday per ISO 8601.

**Example:**

The expression ```time.endOfWeek("2021-11-08T13:45:30Z")``` returns ```"2021-11-14T23:59:59.999999999Z"```.

---

## endOfMonth

```endOfMonth(TEXT dateTime)```: Returns the end of the month (last day at 23:59:59.999999999) for the given date-time at UTC.

**Example:**

The expression ```time.endOfMonth("2021-11-08T13:45:30Z")``` returns ```"2021-11-30T23:59:59.999999999Z"```.

---

## endOfYear

```endOfYear(TEXT dateTime)```: Returns the end of the year (December 31 at 23:59:59.999999999) for the given date-time at UTC.

**Example:**

The expression ```time.endOfYear("2021-11-08T13:45:30Z")``` returns ```"2021-12-31T23:59:59.999999999Z"```.

---

## truncateToHour

```truncateToHour(TEXT dateTime)```: Truncates the date-time to the hour, setting minutes, seconds, and nanoseconds to zero.

**Example:**

The expression ```time.truncateToHour("2021-11-08T13:45:30.123Z")``` returns ```"2021-11-08T13:00:00Z"```.

---

## truncateToDay

```truncateToDay(TEXT dateTime)```: Truncates the date-time to the day, setting time to 00:00:00.000.

**Example:**

The expression ```time.truncateToDay("2021-11-08T13:45:30Z")``` returns ```"2021-11-08T00:00:00Z"```.

---

## truncateToWeek

```truncateToWeek(TEXT dateTime)```: Truncates the date-time to the start of the week (Monday 00:00:00.000).

**Example:**

The expression ```time.truncateToWeek("2021-11-08T13:45:30Z")``` returns ```"2021-11-08T00:00:00Z"```.

---

## truncateToMonth

```truncateToMonth(TEXT dateTime)```: Truncates the date-time to the start of the month (first day at 00:00:00.000).

**Example:**

The expression ```time.truncateToMonth("2021-11-08T13:45:30Z")``` returns ```"2021-11-01T00:00:00Z"```.

---

## truncateToYear

```truncateToYear(TEXT dateTime)```: Truncates the date-time to the start of the year (January 1 at 00:00:00.000).

**Example:**

The expression ```time.truncateToYear("2021-11-08T13:45:30Z")``` returns ```"2021-01-01T00:00:00Z"```.

---

## localIso

```localIso(TEXT localDateTime)```: Parses an ISO 8601 date-time string without timezone offset using
the PDP's system default timezone.

**Example:**

With system default timezone Europe/Berlin, the expression
```time.localIso("2021-11-08T13:00:00")``` returns ```"2021-11-08T12:00:00Z"```.

---

## localDin

```localDin(TEXT dinDateTime)```: Parses a DIN date-time string without timezone offset using
the PDP's system default timezone. Returns an ISO 8601 string.

**Example:**

With system default timezone Europe/Berlin, the expression
```time.localDin("08.11.2021 13:00:00")``` returns ```"2021-11-08T12:00:00Z"```.

---

## dateTimeAtOffset

```dateTimeAtOffset(TEXT localDateTime, TEXT offsetId)```: Parses a local date-time string and
combines it with an offset, then converts to an ISO 8601 instant at UTC.

**Example:**

The expression ```time.dateTimeAtOffset("2021-11-08T13:12:35", "+05:00")```
returns ```"2021-11-08T08:12:35Z"```.

---

## dateTimeAtZone

```dateTimeAtZone(TEXT localDateTime, TEXT zoneId)```: Parses an ISO 8601 date-time string and
returns the matching ISO 8601 instant at UTC for the provided timezone.

If zoneId is empty or blank, uses system default timezone.
See [timezone database](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones) for valid zoneId values.

**Example:**

The expression ```time.dateTimeAtZone("2021-11-08T13:12:35", "Europe/Berlin")```
returns ```"2021-11-08T12:12:35Z"```.

---

## offsetDateTime

```offsetDateTime(TEXT isoDateTime)```: Parses an ISO 8601 date-time with offset and
returns the matching ISO 8601 instant at UTC.

**Example:**

The expression ```time.offsetDateTime("2021-11-08T13:12:35+05:00")```
returns ```"2021-11-08T08:12:35Z"```.

---

## offsetTime

```offsetTime(TEXT isoTime)```: Parses an ISO 8601 time with offset and
returns the matching time at UTC.

**Example:**

The expression ```time.offsetTime("13:12:35-05:00")``` returns ```"18:12:35"```.

---

## timeAtOffset

```timeAtOffset(TEXT localTime, TEXT offsetId)```: Parses a time with a separate offset parameter and
returns the matching time at UTC.

**Example:**

The expression ```time.timeAtOffset("13:12:35", "-05:00")``` returns ```"18:12:35"```.

---

## timeInZone

```timeInZone(TEXT localTime, TEXT localDate, TEXT zoneId)```: Parses a time and date with a separate
timezone parameter and returns the matching time at UTC.

**Example:**

The expression ```time.timeInZone("13:12:35", "2022-01-14", "US/Pacific")``` returns ```"21:12:35"```.

---

## timeAMPM

```timeAMPM(TEXT timeInAMPM)```: Parses a time string in AM/PM format and converts it to 24-hour format.

**Example:**

The expression ```time.timeAMPM("08:12:35 PM")``` returns ```"20:12:35"```.

---

## dateOf

```dateOf(TEXT isoDateTime)```: Returns the date part of an ISO 8601 string.

**Example:**

The expression ```time.dateOf("2021-11-08T13:00:00Z")``` returns ```"2021-11-08"```.

---

## timeOf

```timeOf(TEXT isoDateTime)```: Returns the local time of an ISO 8601 string, truncated to seconds.

**Example:**

The expression ```time.timeOf("2021-11-08T13:00:00Z")``` returns ```"13:00:00"```.

---

## hourOf

```hourOf(TEXT isoDateTime)```: Returns the hour of an ISO 8601 string.

**Example:**

The expression ```time.hourOf("2021-11-08T13:17:23Z")``` returns ```13```.

---

## minuteOf

```minuteOf(TEXT isoDateTime)```: Returns the minute of an ISO 8601 string.

**Example:**

The expression ```time.minuteOf("2021-11-08T13:17:23Z")``` returns ```17```.

---

## secondOf

```secondOf(TEXT isoDateTime)```: Returns the second of an ISO 8601 string.

**Example:**

The expression ```time.secondOf("2021-11-08T13:00:23Z")``` returns ```23```.

---

## durationFromISO

```durationFromISO(TEXT isoDuration)```: Parses an ISO 8601 duration string and returns the duration
in milliseconds.

Format: P[n]Y[n]M[n]DT[n]H[n]M[n]S. Years (Y) and Months (M) are approximated:
1 year = 365.2425 days, 1 month = 30.436875 days.

**Examples:**

The expression ```time.durationFromISO("P1D")``` returns ```86400000``` (1 day in milliseconds).
The expression ```time.durationFromISO("PT2H30M")``` returns ```9000000``` (2.5 hours in milliseconds).
The expression ```time.durationFromISO("P1Y2M3DT4H5M6S")``` returns duration in milliseconds.

---

## durationToISOCompact

```durationToISOCompact(NUMBER milliseconds)```: Converts a duration in milliseconds to a compact
ISO 8601 duration string.

Uses only time-based units (days, hours, minutes, seconds) for precision.

**Examples:**

The expression ```time.durationToISOCompact(86400000)``` returns ```"P1D"```.
The expression ```time.durationToISOCompact(9000000)``` returns ```"PT2H30M"```.
The expression ```time.durationToISOCompact(90061000)``` returns ```"P1DT1H1M1S"```.

---

## durationToISOVerbose

```durationToISOVerbose(NUMBER milliseconds)```: Converts a duration in milliseconds to a verbose
ISO 8601 duration string with approximate years and months.

Uses approximation: 1 year = 365.2425 days, 1 month = 30.436875 days.

**Examples:**

The expression ```time.durationToISOVerbose(31536000000)``` returns approximately ```"P1Y"```.
The expression ```time.durationToISOVerbose(86400000)``` returns ```"P1D"```.

---

## toZone

```toZone(TEXT utcTime, TEXT zoneId)```: Converts a UTC timestamp to a specific timezone, returning
an ISO 8601 timestamp with offset.

**Example:**

The expression ```time.toZone("2021-11-08T13:00:00Z", "Europe/Berlin")```
returns ```"2021-11-08T14:00:00+01:00"```.

---

## toOffset

```toOffset(TEXT utcTime, TEXT offsetId)```: Converts a UTC timestamp to a specific offset, returning
an ISO 8601 timestamp with that offset.

**Example:**

The expression ```time.toOffset("2021-11-08T13:00:00Z", "+05:30")```
returns ```"2021-11-08T18:30:00+05:30"```.

---

## ageInYears

```ageInYears(TEXT birthDate, TEXT currentDate)```: Calculates the age in complete years between
birthDate and currentDate.

Both dates must be ISO 8601 strings.

**Example:**

The expression ```time.ageInYears("1990-05-15", "2021-11-08")``` returns ```31```.

---

## ageInMonths

```ageInMonths(TEXT birthDate, TEXT currentDate)```: Calculates the age in complete months between
birthDate and currentDate.

Both dates must be ISO 8601 strings.

**Example:**

The expression ```time.ageInMonths("1990-05-15", "1990-08-20")``` returns ```3```.

---

