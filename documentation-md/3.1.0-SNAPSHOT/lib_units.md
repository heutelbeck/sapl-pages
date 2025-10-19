---
layout: default
title: units
parent: Functions
nav_order: 133
---
# units

Functions for converting human-readable unit strings into numeric values.



---

## units.parse(Text unitString)

```units.parse(TEXT unitString)```: Transforms human-readable unit notation into numeric values.
This function processes strings containing a number followed by an optional unit designator,
supporting both decimal and binary SI prefixes. The result is a numeric value representing
the calculation of the input number multiplied by the appropriate unit multiplier.

**Supported Units:**
- **Decimal SI units**: m (milli, 0.001), K (kilo, 1000), M (mega, 1,000,000),
  G (giga, 1 billion), T (tera, 1 trillion), P (peta), E (exa)
- **Binary SI units**: Ki (kibi, 1024), Mi (mebi, 1,048,576), Gi (gibi, 1,073,741,824),
  Ti (tebi), Pi (pebi), Ei (exbi)

**Important Notes:**
- The 'm' and 'M' prefixes are case-sensitive to differentiate between milli and mega
- All other unit prefixes are case-insensitive
- Scientific notation is supported (e.g., "1.5e3K", "2e-2M")
- Decimal values are permitted (e.g., "3.14M", "0.5G")
- If no unit is specified, the input number is returned unchanged

**Examples:**
```sapl
policy "demonstrate_unit_parsing"
permit
where
  // Basic decimal units
  var fiveThousand = units.parse("5K");           // Returns 5000
  var fourMillion = units.parse("4M");            // Returns 4000000
  var tenGigavalue = units.parse("10G");          // Returns 10000000000

  // Milli prefix (case-sensitive)
  var milliValue = units.parse("1500m");          // Returns 1.5
  var megaValue = units.parse("1500M");           // Returns 1500000000

  // Binary units
  var oneKibi = units.parse("1Ki");               // Returns 1024
  var twoMebi = units.parse("2Mi");               // Returns 2097152

  // Scientific notation support
  var scientificKilo = units.parse("1e-3K");      // Returns 1
  var largeMega = units.parse("2.5e6M");          // Returns 2500000000000000

  // Decimal values
  var fractional = units.parse("3.14M");          // Returns 3140000
  var smallValue = units.parse("0.75K");          // Returns 750

  // No unit specified
  var plainNumber = units.parse("42");            // Returns 42

  // Invalid formats return errors
  var error1 = units.parse("invalid");            // Returns error
  var error2 = units.parse("10ZZ");               // Returns error (unknown unit)
```


---

## units.parseBytes(Text byteString)

```units.parseBytes(TEXT byteString)```: Converts byte size notation into precise byte counts.
This function interprets strings expressing data sizes in human-readable format and transforms
them into exact byte values. It distinguishes between decimal units (based on powers of 1000)
and binary units (based on powers of 1024), following standard computing conventions.

**Supported Units:**
- **Decimal byte units**: KB/kb (1000 bytes), MB/mb (1,000,000 bytes),
  GB/gb (1 billion bytes), TB/tb (1 trillion bytes)
- **Binary byte units**: KiB/Ki (1024 bytes), MiB/Mi (1,048,576 bytes),
  GiB/Gi (1,073,741,824 bytes), TiB/Ti (1,099,511,627,776 bytes)
- **Base unit**: B/b (1 byte)

**Important Notes:**
- The byte suffix ('B' or 'b') is optional and can be omitted (e.g., "Mi" equals "MiB")
- Decimal units (KB, MB, GB) use base-1000 multipliers
- Binary units (KiB, MiB, GiB) use base-1024 multipliers
- Unit prefixes are case-insensitive (e.g., "KB", "kb", "Kb", "kB" are all valid)
- Scientific notation is fully supported (e.g., "1.5e3MB", "2e6GiB")
- Decimal values are allowed (e.g., "2.5GB", "10.75MiB")
- If no unit is specified, the value is interpreted as bytes

**Examples:**
```sapl
policy "demonstrate_byte_parsing"
permit
where
  // Basic decimal byte units
  var tenKilobytes = units.parseBytes("10KB");        // Returns 10000
  var fiveKilo = units.parseBytes("5K");              // Returns 5000 (B is optional)
  var fourMegabytes = units.parseBytes("4mb");        // Returns 4000000 (case-insensitive)
  var oneGigabyte = units.parseBytes("1GB");          // Returns 1000000000

  // Binary byte units (powers of 1024)
  var oneKibibyte = units.parseBytes("1KiB");         // Returns 1024
  var twoKibi = units.parseBytes("2Ki");              // Returns 2048 (B is optional)
  var threeMebibytes = units.parseBytes("3MiB");      // Returns 3145728
  var halfGibibyte = units.parseBytes("0.5GiB");      // Returns 536870912

  // Scientific notation examples
  var largeMegabytes = units.parseBytes("1.5e3MB");   // Returns 1500000000 (1500 MB)
  var massiveGibibytes = units.parseBytes("2e6GiB");  // Returns 2147483648000000 (2 million GiB)
  var smallKilobytes = units.parseBytes("1e-2KB");    // Returns 10 (0.01 KB)

  // Decimal precision
  var preciseSize = units.parseBytes("2.5GB");        // Returns 2500000000
  var fractionalMiB = units.parseBytes("10.75MiB");   // Returns 11272192

  // Just bytes
  var plainBytes = units.parseBytes("1024");          // Returns 1024
  var explicitBytes = units.parseBytes("1024B");      // Returns 1024

  // Case variations (all valid)
  var lowercase = units.parseBytes("100mb");          // Returns 100000000
  var mixedCase = units.parseBytes("100Mb");          // Returns 100000000
  var uppercase = units.parseBytes("100MB");          // Returns 100000000

  // Comparison: decimal vs binary
  var decimalMB = units.parseBytes("1MB");            // Returns 1000000
  var binaryMiB = units.parseBytes("1MiB");           // Returns 1048576

  // Invalid formats return errors
  var error1 = units.parseBytes("not-a-size");        // Returns error
  var error2 = units.parseBytes("10PB");              // Returns error (unsupported unit)
```


---

