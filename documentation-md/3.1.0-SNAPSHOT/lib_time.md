---
title: time
parent: Functions
nav_order: 130
---
# time

This library contains temporal functions. It relies on [ISO 8601](https://www.iso.org/iso-8601-date-and-time-format.html)
and DIN 1355 standards for time representation. The latter has been officially withdrawn but continues to be used in practice.

The most used variant format described in ISO 8601 is YYYY-MM-DD, e.g. "2017-10-28" for the 28th of October in the year 2017.
DIN 1355 describes DD.MM.YYYY, e.g. "28.10.2017". Time format is consistently hh:mm:ss with 24 hours per day, e.g. "16:14:11".
In ISO 8601 time and date can be joined into one string, e.g. "2017-10-28T16:14:11".

The library accepts timestamps in ISO 8601 format, including RFC3339 compliant strings. RFC3339 is a strict profile
of ISO 8601 commonly used in internet protocols and APIs. RFC3339 requires timezone information (Z for UTC or ±HH:MM offset)
and uses the format YYYY-MM-DDTHH:MM:SS[.fraction](Z|±HH:MM), while ISO 8601 allows additional variations such as
omitting timezone information or using alternative date representations.

Coordinated Universal Time [UTC](https://www.ipses.com/eng/in-depth-analysis/standard-of-time-definition/) is not based on the
time of rotation of the earth. It is time zone zero while central European time has an offset of one hour.

**Note on Leap Seconds:** RFC3339 allows leap seconds (e.g., "23:59:60Z"), but Java's temporal system silently
normalizes them to "23:59:59Z". This normalization is transparent and should not affect most use cases.




---

## time.startOfYear(Text dateTime)

```startOfYear(TEXT dateTime)```:
This function returns the start of the year (January 1 at 00:00:00.000) for the given date-time at UTC.

**Example:**

The expression ```time.startOfYear("2021-11-08T13:45:30Z")``` returns ```"2021-01-01T00:00:00Z"```.

---

## time.localDin(Text dinDateTime)

```localDin(TEXT dinDateTime)```: This function parses a DIN date-time string without an offset,
such as ```"08.11.2021 13:00:00"``` while using the PDP's system default time zone. It returns an ISO 8601 string.

**Example:**

In case the systems default time zone is ```Europe/Berlin``` the expression
```time.localDin("08.11.2021 13:00:00")``` returns ```"2021-11-08T12:00:00Z"```.

---

## time.startOfMonth(Text dateTime)

```startOfMonth(TEXT dateTime)```:
This function returns the start of the month (first day at 00:00:00.000) for the given date-time at UTC.

**Example:**

The expression ```time.startOfMonth("2021-11-08T13:45:30Z")``` returns ```"2021-11-01T00:00:00Z"```.

---

## time.endOfYear(Text dateTime)

```endOfYear(TEXT dateTime)```:
This function returns the end of the year (December 31 at 23:59:59.999999999) for the given date-time at UTC.

**Example:**

The expression ```time.endOfYear("2021-11-08T13:45:30Z")``` returns ```"2021-12-31T23:59:59.999999999Z"```.

---

## time.truncateToDay(Text dateTime)

```truncateToDay(TEXT dateTime)```:
This function truncates the given date-time to the day, setting time to 00:00:00.000.

**Example:**

The expression ```time.truncateToDay("2021-11-08T13:45:30Z")``` returns ```"2021-11-08T00:00:00Z"```.

---

## time.minusYears(Text startTime, Int years)

```minusYears(TEXT startTime, INTEGER years)```:
This function subtracts ```years``` years from ```startTime```.
The parameter ```startTime``` must be expressed as ISO 8601 strings at UTC. And ```years``` must be an integer.
Year calculation uses the standard calendar rules.

**Example:**

The expression ```time.minusYears("2021-11-08T13:00:00Z", 3)```
returns ```"2018-11-08T13:00:00Z"```.

---

## time.durationOfMinutes(Number minutes)

```durationOfMinutes(NUMBER minutes)```:
For the temporal library, a duration is always defined in milliseconds.
This function converts ```minutes``` to milliseconds, multiplying them by ```60000```.

**Example:**

The expression ```time.durationOfMinutes(2.5)``` will return ```150000```.

---

## time.plusYears(Text startTime, Int years)

```plusYears(TEXT startTime, INTEGER years)```:
This function adds ```years``` years to ```startTime```.
The parameter ```startTime``` must be expressed as ISO 8601 strings at UTC. And ```years``` must be an integer.
Year calculation uses the standard calendar rules (e.g., adding 1 year to Feb 29 in a leap year results in Feb 28).

**Example:**

The expression ```time.plusYears("2021-11-08T13:00:00Z", 3)```
returns ```"2024-11-08T13:00:00Z"```.

---

## time.dateTimeAtOffset(Text localDateTime, Text offsetId)

```dateTimeAtOffset(TEXT localDateTime, TEXT offsetId)```: This function parses a local date-time string and
combines it with an offset, then converts to an ISO 8601 instant at UTC.

**Example:**

The expression ```time.dateTimeAtOffset("2021-11-08T13:12:35", "+05:00")```
returns ```"2021-11-08T08:12:35Z"```.

---

## time.minusSeconds(Text startTime, Int seconds)

```minusSeconds(TEXT startTime, INTEGER seconds)```:
This function subtracts ```seconds``` seconds from ```startTime```.
The parameter ```startTime``` must be expressed as ISO 8601 strings at UTC. And ```seconds``` must be an integer.

**Example:**

The expression ```time.minusSeconds("2021-11-08T13:00:00Z", 10)```
returns ```"2021-11-08T12:59:50Z"```.

---

## time.startOfWeek(Text dateTime)

```startOfWeek(TEXT dateTime)```:
This function returns the start of the week (Monday 00:00:00.000) for the given date-time at UTC.
Weeks start on Monday according to ISO 8601.

**Example:**

The expression ```time.startOfWeek("2021-11-08T13:45:30Z")``` returns ```"2021-11-08T00:00:00Z"```
(November 8, 2021 was a Monday).

---

## time.endOfWeek(Text dateTime)

```endOfWeek(TEXT dateTime)```:
This function returns the end of the week (Sunday 23:59:59.999999999) for the given date-time at UTC.
Weeks end on Sunday according to ISO 8601.

**Example:**

The expression ```time.endOfWeek("2021-11-08T13:45:30Z")``` returns ```"2021-11-14T23:59:59.999999999Z"```.

---

## time.timeBetween(Text timeA, Text timeB, Text chronoUnit)

```timeBetween(TEXT timeA, TEXT timeB, TEXT chronoUnit)```:
This function calculates the timespan between ```timeA``` and ```timeB``` in the given ```chronoUnit```.
All ```timeA``` and ```timeB``` must be expressed as ISO 8601 strings at UTC.
The ```chronoUnit``` can be one of:
* NANOS: for nanoseconds.
* MICROS: for microsecond.
* MILLIS: for milliseconds.
* SECONDS: for seconds.
* MINUTES: for minutes
* HOURS: for hours
* HALF_DAYS: for ```12``` hours.
* DAYS: for days.
* WEEKS: for ```7``` days.
* MONTHS: The duration of a month is estimated as one twelfth of ```365.2425``` days.
* YEARS: The duration of a year is estimated as ```365.2425``` days.
* DECADES: for ```10``` years.
* CENTURIES: for ```100``` years.
* MILLENNIA: for ```1000``` years.

Example: The expression ```time.timeBetween("2001-01-01", "2002-01-01", "YEARS")``` returns ```1```.

---

## time.endOfDay(Text dateTime)

```endOfDay(TEXT dateTime)```:
This function returns the end of the day (23:59:59.999999999) for the given date-time at UTC.

**Example:**

The expression ```time.endOfDay("2021-11-08T13:45:30Z")``` returns ```"2021-11-08T23:59:59.999999999Z"```.

---

## time.offsetTime(Text isoTime)

```offsetTime(TEXT isoTime)```: This function parses an ISO 8601 time with an offset
returns the matching time at UTC.

**Example:**

The expression ```time.offsetTime("13:12:35-05:00")``` returns ```"18:12:35"```.

---

## time.timeInZone(Text localTime, Text localDate, Text zoneId)

```timeInZone(TEXT localTime, TEXT localDate, TEXT zoneId)```: This function parses a time ```localTime``` and
date ```localDate``` with a separate ```zoneId``` parameter and returns the matching time at UTC.

**Example:**

The expression ```time.timeInZone("13:12:35", "2022-01-14", "US/Pacific")``` returns ```"21:12:35"```.

---

## time.plusNanos(Text startTime, Int nanos)

```plusNanos(TEXT startTime, INTEGER nanos)```:
This function adds ```nanos``` nanoseconds to ```startTime```.
The parameter ```startTime``` must be expressed as ISO 8601 strings at UTC. And ```nanos``` must be an integer.

**Example:**

The expression ```time.plusNanos("2021-11-08T13:00:00Z", 10000000000)```
returns ```"2021-11-08T13:00:10Z"```.

---

## time.hourOf(Text isoDateTime)

```hourOf(TEXT isoDateTime)```:
This function returns the hour of the ISO 8601 string ```isoDateTime```.

**Example:**

The expression ```time.hourOf("2021-11-08T13:17:23Z")``` returns ```13```.

---

## time.plusMonths(Text startTime, Int months)

```plusMonths(TEXT startTime, INTEGER months)```:
This function adds ```months``` months to ```startTime```.
The parameter ```startTime``` must be expressed as ISO 8601 strings at UTC. And ```months``` must be an integer.
Month calculation uses the standard calendar rules (e.g., adding 1 month to Jan 31 results in Feb 28/29).

**Example:**

The expression ```time.plusMonths("2021-11-08T13:00:00Z", 2)```
returns ```"2022-01-08T13:00:00Z"```.

---

## time.after(Text timeA, Text timeB)

```after(TEXT timeA, TEXT timeB)```: This function compares two instants. Both, ```timeA``` and ```timeB```
must be expressed as ISO 8601 strings at UTC.
The function returns ```true```, if ```timeA``` is after ```timeB```.

**Example:**

The expression ```time.after("2021-11-08T13:00:01Z", "2021-11-08T13:00:00Z")``` returns ```true```.

---

## time.ofEpochMilli(Int epochMillis)

```ofEpochMilli(INTEGER epochMillis)```:
This function converts an offset from the epoch date
```"1970-01-01T00:00:00Z"``` in milliseconds to an instant represented as an ISO 8601 string at UTC.

**Example:**

The expression ```time.ofEpochMilli(1636376400000)``` returns ```"2021-11-08T13:00:00Z"```.

---

## time.ageInYears(Text birthDate, Text currentDate)

```ageInYears(TEXT birthDate, TEXT currentDate)```:
This function calculates the age in complete years between ```birthDate``` and ```currentDate```.
Both dates must be ISO 8601 strings.

**Example:**

The expression ```time.ageInYears("1990-05-15", "2021-11-08")``` returns ```31```.

---

## time.truncateToMonth(Text dateTime)

```truncateToMonth(TEXT dateTime)```:
This function truncates the given date-time to the start of the month (first day at 00:00:00.000).

**Example:**

The expression ```time.truncateToMonth("2021-11-08T13:45:30Z")``` returns ```"2021-11-01T00:00:00Z"```.

---

## time.timeAMPM(Text timeInAMPM)

```timeAMPM(TEXT timeInAMPM)```:
This function parses the given string ```timeInAMPM``` as local time in AM/PM-format
and converts it to 24-hour format.

**Example:**

The expression ```time.timeAMPM("08:12:35 PM")``` returns ```"20:12:35"```.

---

## time.epochMilli(Text utcDateTime)

```epochMilli(TEXT utcDateTime)```:
This function converts an ISO 8601 string at UTC ```utcDateTime``` to the offset of this instant to the epoch date
```"1970-01-01T00:00:00Z"``` in milliseconds.

**Example:**

The expression ```time.epochMilli("2021-11-08T13:00:00Z")``` returns ```1636376400000```.

---

## time.validUTC(Text utcDateTime)

```validUTC(TEXT utcDateTime)```:
This function validates if a value is a string in ISO 8601 string at UTC.

**Example:**

The expression ```time.validUTC("2021-11-08T13:00:00Z")``` returns ```true```.
The expression ```time.validUTC("20111-000:00Z")``` returns ```false```.

---

## time.plusMillis(Text startTime, Int millis)

```plusMillis(TEXT startTime, INTEGER millis)```:
This function adds ```millis``` milliseconds to ```startTime```.
The parameter ```startTime``` must be expressed as ISO 8601 strings at UTC. And ```millis``` must be an integer.

**Example:**

The expression ```time.plusMillis("2021-11-08T13:00:00Z", 10000)```
returns ```"2021-11-08T13:00:10Z"```.

---

## time.validRFC3339(Text timestamp)

```validRFC3339(TEXT timestamp)```:
This function validates if a value is a valid RFC3339 timestamp. RFC3339 is stricter than ISO 8601
and requires a timezone designator (Z or offset like +05:00).

**Example:**

The expression ```time.validRFC3339("2021-11-08T13:00:00Z")``` returns ```true```.
The expression ```time.validRFC3339("2021-11-08T13:00:00")``` returns ```false``` (missing timezone).
The expression ```time.validRFC3339("2021-11-08")``` returns ```false``` (date only, no time).

---

## time.minusNanos(Text startTime, Int nanos)

```minusNanos(TEXT startTime, INTEGER nanos)```:
This function subtracts ```nanos``` nanoseconds from ```startTime```.
The parameter ```startTime``` must be expressed as ISO 8601 strings at UTC. And ```nanos``` must be an integer.

**Example:**

The expression ```time.minusNanos("2021-11-08T13:00:00Z", 10000000000)```
returns ```"2021-11-08T12:59:50Z"```.

---

## time.durationToISOVerbose(Number milliseconds)

```durationToISOVerbose(NUMBER milliseconds)```:
This function converts a duration in milliseconds to a verbose ISO 8601 duration string
with approximate years and months for better readability of large durations.

Uses the approximation: 1 year = 365.2425 days, 1 month = 30.436875 days.

**Examples:**

The expression ```time.durationToISOVerbose(31536000000)``` returns approximately ```"P1Y"```.
The expression ```time.durationToISOVerbose(86400000)``` returns ```"P1D"```.

---

## time.ageInMonths(Text birthDate, Text currentDate)

```ageInMonths(TEXT birthDate, TEXT currentDate)```:
This function calculates the age in complete months between ```birthDate``` and ```currentDate```.
Both dates must be ISO 8601 strings.

**Example:**

The expression ```time.ageInMonths("1990-05-15", "1990-08-20")``` returns ```3```.

---

## time.durationFromISO(Text isoDuration)

```durationFromISO(TEXT isoDuration)```:
This function parses an ISO 8601 duration string and returns the duration in milliseconds.
Supports both Period format (years, months, days) and Duration format (hours, minutes, seconds).

Format: ```P[n]Y[n]M[n]DT[n]H[n]M[n]S```
- P: required prefix
- Years (Y) and Months (M) are approximated: 1 year = 365.2425 days, 1 month = 30.436875 days
- T: separator between date and time parts (required if time part present)

**Examples:**

The expression ```time.durationFromISO("P1D")``` returns ```86400000``` (1 day in milliseconds).
The expression ```time.durationFromISO("PT2H30M")``` returns ```9000000``` (2.5 hours in milliseconds).
The expression ```time.durationFromISO("P1Y2M3DT4H5M6S")``` returns duration in milliseconds (approximate for years/months).

---

## time.plusSeconds(Text startTime, Int seconds)

```plusSeconds(TEXT startTime, INTEGER seconds)```:
This function adds ```seconds``` seconds to ```startTime```.
The parameter ```startTime``` must be expressed as ISO 8601 strings at UTC. And ```seconds``` must be an integer.

**Example:**

The expression ```time.plusSeconds("2021-11-08T13:00:00Z", 10)```
returns ```"2021-11-08T13:00:10Z"```.

---

## time.weekOfYear(Text isoDateTime)

```weekOfYear(TEXT utcDateTime)```:
This function returns the number of the calendar week (1-52) of the year for any
date represented as an ISO 8601 string at UTC.

**Example:**

The expression ```time.weekOfYear("2021-11-08T13:00:00Z")``` returns ```45```.

---

## time.timeAtOffset(Text localTime, Text offsetId)

```timeAtOffset(TEXT localTime, TEXT offsetId)```: This function parses a time ```localTime``` with a separate
```offsetId``` parameter and returns the matching time at UTC.

**Example:**

The expression ```time.timeAtOffset("13:12:35", "-05:00")``` returns ```"18:12:35"```.

---

## time.dayOfYear(Text isoDateTime)

```dayOfYear(TEXT utcDateTime)```:
This function returns the day (1-365) of the year for any
date represented as an ISO 8601 string at UTC.

**Example:**

The expression ```time.dayOfYear("2021-11-08T13:00:00Z")``` returns ```312```.

---

## time.plusDays(Text startTime, Int days)

```plusDays(TEXT startTime, INTEGER days)```:
This function adds ```days``` days to ```startTime```.
The parameter ```startTime``` must be expressed as ISO 8601 strings at UTC. And ```days``` must be an integer.

**Example:**

The expression ```time.plusDays("2021-11-08T13:00:00Z", 5)```
returns ```"2021-11-13T13:00:00Z"```.

---

## time.minuteOf(Text isoDateTime)

```minuteOf(TEXT isoDateTime)```:
This function returns the minute of the ISO 8601 string ```isoDateTime```.

**Example:**

The expression ```time.minuteOf("2021-11-08T13:17:23Z")``` returns ```17```.

---

## time.secondOf(Text isoDateTime)

```secondOf(TEXT isoDateTime)```:
This function returns the second of the ISO 8601 string ```isoDateTime```.

**Example:**

The expression ```time.secondOf("2021-11-08T13:00:23Z")``` returns ```23```.

---

## time.durationOfSeconds(Number seconds)

```durationOfSeconds(NUMBER seconds)```:
For the temporal library, a duration is always defined in milliseconds. This function converts ```seconds```
to milliseconds, multiplying them by ```1000```.

**Example:**

The expression ```time.durationOfSeconds(20.5)``` will return ```20500```.


---

## time.durationToISOCompact(Number milliseconds)

```durationToISOCompact(NUMBER milliseconds)```:
This function converts a duration in milliseconds to a compact ISO 8601 duration string.
Uses only time-based units (days, hours, minutes, seconds) for precision.

**Examples:**

The expression ```time.durationToISOCompact(86400000)``` returns ```"P1D"```.
The expression ```time.durationToISOCompact(9000000)``` returns ```"PT2H30M"```.
The expression ```time.durationToISOCompact(90061000)``` returns ```"P1DT1H1M1S"```.

---

## time.between(Text time, Text intervalStart, Text intervalEnd)

```between(TEXT time, TEXT intervalStart, TEXT intervalEnd)```:
This function tests if ```time``` is inside of the closed interval defined by ```intervalStart``` and
```intervalEnd```, where ```intervalStart``` must be before ```intervalEnd```.
All parameters must be expressed as ISO 8601 strings at UTC.

The function returns ```true```, if ```time``` is inside of the closed interval defined by ```intervalStart```
and ```intervalEnd```.

**Example:**

The expression ```time.between("2021-11-08T13:00:00Z", "2021-11-07T13:00:00Z", "2021-11-09T13:00:00Z")```
returns ```true```.

---

## time.dateOf(Text isoDateTime)

```dateOf(TEXT isoDateTime)```:
This function returns the date part of the ISO 8601 string ```isoDateTime```.

**Example:**

The expression ```time.dateOf("2021-11-08T13:00:00Z")``` returns ```"2021-11-08"```.

---

## time.durationOfHours(Number hours)

```durationOfHours(NUMBER hours)```:
For the temporal library, a duration is always defined in milliseconds. This function converts ```hours```
to milliseconds, multiplying them by ```3600000```.

**Example:**

The expression ```time.durationOfHours(4.5)``` will return ```16200000```.

---

## time.ofEpochSecond(Int epochSeconds)

```ofEpochSecond(INTEGER epochSeconds)```:
This function converts an offset from the epoch date
```"1970-01-01T00:00:00Z"``` in seconds to an instant represented as an ISO 8601 string at UTC.

**Example:**

The expression ```time.ofEpochSecond(1636376400)``` returns ```"2021-11-08T13:00:00Z"```.

---

## time.truncateToWeek(Text dateTime)

```truncateToWeek(TEXT dateTime)```:
This function truncates the given date-time to the start of the week (Monday 00:00:00.000).

**Example:**

The expression ```time.truncateToWeek("2021-11-08T13:45:30Z")``` returns ```"2021-11-08T00:00:00Z"```.

---

## time.truncateToYear(Text dateTime)

```truncateToYear(TEXT dateTime)```:
This function truncates the given date-time to the start of the year (January 1 at 00:00:00.000).

**Example:**

The expression ```time.truncateToYear("2021-11-08T13:45:30Z")``` returns ```"2021-01-01T00:00:00Z"```.

---

## time.dateTimeAtZone(Text localDateTime, Text zoneId)

```dateTimeAtZone(TEXT localDateTime, TEXT zoneId)```: This function parses an ISO 8601 date-time string and
for the provided [```zoneId```](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)
returns the matching ISO 8601 instant at UTC.

If ```zoneId``` is empty or blank, the system default time zone is used.

**Example:**

The expression ```time.dateTimeAtZone("2021-11-08T13:12:35", "Europe/Berlin")```
returns ```"2021-11-08T12:12:35Z"```.

---

## time.startOfDay(Text dateTime)

```startOfDay(TEXT dateTime)```:
This function returns the start of the day (00:00:00.000) for the given date-time at UTC.

**Example:**

The expression ```time.startOfDay("2021-11-08T13:45:30Z")``` returns ```"2021-11-08T00:00:00Z"```.

---

## time.dayOfWeek(Text isoDateTime)

```dayOfWeek(TEXT utcDateTime)```:
This function returns the name of the day for any date represented as an ISO 8601 string at UTC.
The function returns one of: ```"SUNDAY"```, ```"MONDAY"```, ```"TUESDAY"```, ```"WEDNESDAY"```,
```"THURSDAY"```, ```"FRIDAY"```, ```"SATURDAY"```.

**Example:**

The expression ```time.dayOfWeek("2021-11-08T13:00:00Z")``` returns ```"MONDAY"```.

---

## time.durationOfDays(Number days)

```durationOfDays(NUMBER days)```:
For the temporal library, a duration is always defined in milliseconds. This function converts ```days```
to milliseconds, multiplying them by ```86400000```.

**Example:**

The expression ```time.durationOfDays(365)``` will return ```31536000000```.

---

## time.offsetDateTime(Text isoDateTime)

```offsetDateTime(TEXT isoDateTime)```: This function parses an ISO 8601 date-time with an offset
returns the matching ISO 8601 instant at UTC.

**Example:**

The expression ```time.offsetDateTime("2021-11-08T13:12:35+05:00")```
returns ```"2021-11-08T08:12:35Z"```.

---

## time.toOffset(Text utcTime, Text offsetId)

```toOffset(TEXT utcTime, TEXT offsetId)```:
This function converts a UTC timestamp to a specific offset, returning an ISO 8601 timestamp with that offset.

**Example:**

The expression ```time.toOffset("2021-11-08T13:00:00Z", "+05:30")```
returns ```"2021-11-08T18:30:00+05:30"```.

---

## time.endOfMonth(Text dateTime)

```endOfMonth(TEXT dateTime)```:
This function returns the end of the month (last day at 23:59:59.999999999) for the given date-time at UTC.

**Example:**

The expression ```time.endOfMonth("2021-11-08T13:45:30Z")``` returns ```"2021-11-30T23:59:59.999999999Z"```.

---

## time.before(Text timeA, Text timeB)

```before(TEXT timeA, TEXT timeB)```: This function compares two instants. Both, ```timeA``` and ```timeB```
must be expressed as ISO 8601 strings at UTC.
The function returns ```true```, if ```timeA``` is before ```timeB```.

**Example:**

The expression ```time.before("2021-11-08T13:00:00Z", "2021-11-08T13:00:01Z")``` returns ```true```.

---

## time.localIso(Text localDateTime)

```localIso(TEXT localDateTime)```: This function parses a date-time ISO 8601 string without an offset,
such as ```"2011-12-03T10:15:30"``` while using the PDP's system default time zone.

**Example:**

In case the systems default time zone is ```Europe/Berlin``` the expression
```time.localIso("2021-11-08T13:00:00")``` returns ```"2021-11-08T12:00:00Z"```.

---

## time.minusMonths(Text startTime, Int months)

```minusMonths(TEXT startTime, INTEGER months)```:
This function subtracts ```months``` months from ```startTime```.
The parameter ```startTime``` must be expressed as ISO 8601 strings at UTC. And ```months``` must be an integer.
Month calculation uses the standard calendar rules.

**Example:**

The expression ```time.minusMonths("2021-11-08T13:00:00Z", 2)```
returns ```"2021-09-08T13:00:00Z"```.

---

## time.minusDays(Text startTime, Int days)

```minusDays(TEXT startTime, INTEGER days)```:
This function subtracts ```days``` days from ```startTime```.
The parameter ```startTime``` must be expressed as ISO 8601 strings at UTC. And ```days``` must be an integer.

**Example:**

The expression ```time.minusDays("2021-11-08T13:00:00Z", 5)```
returns ```"2021-11-03T13:00:00Z"```.

---

## time.epochSecond(Text utcDateTime)

```epochSecond(TEXT utcDateTime)```:
This function converts an ISO 8601 string at UTC ```utcDateTime``` to the offset of this instant to the epoch date
```"1970-01-01T00:00:00Z"``` in seconds.

**Example:**

The expression ```time.epochSecond("2021-11-08T13:00:00Z")``` returns ```1636376400```.

---

## time.toZone(Text utcTime, Text zoneId)

```toZone(TEXT utcTime, TEXT zoneId)```:
This function converts a UTC timestamp to a specific timezone, returning an ISO 8601 timestamp with offset.

**Example:**

The expression ```time.toZone("2021-11-08T13:00:00Z", "Europe/Berlin")```
returns ```"2021-11-08T14:00:00+01:00"```.

---

## time.minusMillis(Text startTime, Int millis)

```minusMillis(TEXT startTime, INTEGER millis)```:
This function subtracts ```millis``` milliseconds from ```startTime```.
The parameter ```startTime``` must be expressed as ISO 8601 strings at UTC. And ```millis``` must be an integer.

**Example:**

The expression ```time.minusMillis("2021-11-08T13:00:00Z", 10000)```
returns ```"2021-11-08T12:59:50Z"```.

---

## time.truncateToHour(Text dateTime)

```truncateToHour(TEXT dateTime)```:
This function truncates the given date-time to the hour, setting minutes, seconds, and nanoseconds to zero.

**Example:**

The expression ```time.truncateToHour("2021-11-08T13:45:30.123Z")``` returns ```"2021-11-08T13:00:00Z"```.

---

## time.timeOf(Text isoDateTime)

```timeOf(TEXT isoDateTime)```:
This function returns the local time of the ISO 8601 string ```isoDateTime```, truncated to seconds.

**Example:**

The expression ```time.timeOf("2021-11-08T13:00:00Z")``` returns ```"13:00:00"```.

---

