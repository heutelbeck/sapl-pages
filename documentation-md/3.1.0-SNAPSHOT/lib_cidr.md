---
layout: default
title: cidr
parent: Functions
grand_parent: SAPL Reference
nav_order: 103
---
# cidr

CIDR network operations and IP address validation for authorization policies.

# CIDR Network Functions

Network-based access control using IP addresses and CIDR notation. Test membership,
validate configurations, anonymize addresses for privacy compliance, and calculate
subnet properties.

## Access Control Patterns

Restrict access based on network location. Check if client IPs fall within trusted
corporate networks or geographic regions.

```sapl
policy "corporate_only"
permit action == "access_api"
where
    cidr.contains("10.0.0.0/8", subject.ipAddress);
```

Prevent Server-Side Request Forgery by blocking requests to internal networks.

```sapl
policy "block_ssrf"
deny action == "fetch_url"
where
    var ip = resource.url.resolvedIp;
    cidr.isPrivateIpv4(ip) || cidr.isLoopback(ip);
```

Anonymize client IPs before logging to comply with GDPR while maintaining geographic
or organizational context for analytics.

```sapl
policy "log_access"
permit
obligation
    {
        "type": "log",
        "subnet": cidr.anonymizeIp(subject.ipAddress, 24)
    }
```

Validate network configurations to prevent overlapping address assignments or
security zone violations.

```sapl
policy "no_dmz_overlap"
permit action == "create_subnet"
where
    !cidr.intersects(resource.cidr, "203.0.113.0/24");
```


---

## cidr.containsMatches(Array cidrs, Array cidrsOrIps)

```cidr.containsMatches(ARRAY cidrs, ARRAY cidrsOrIps)```

Batch containment checking across multiple CIDRs and IPs. Returns index pairs
identifying all matches as [cidrIndex, ipIndex]. More efficient than individual
contains() calls when checking many addresses against many ranges.

Parameters:
- cidrs: Array of CIDR strings to check against
- cidrsOrIps: Array of IP addresses or CIDRs to test

Returns: Array of [cidrIndex, ipIndex] tuples for each match

Example - verify any user IP matches trusted networks:

```sapl
policy "multi_location"
permit
where
    var trusted = ["10.0.0.0/8", "172.16.0.0/12"];
    var matches = cidr.containsMatches(trusted, subject.recentIps);
    matches != [];
```


---

## cidr.hashIpPrefix(Text ipAddress, Int prefixLength, Text salt)

```cidr.hashIpPrefix(STRING ipAddress, INT prefixLength, STRING salt)```

Hashes an IP prefix with a salt for privacy-preserving analytics and rate limiting.
First anonymizes to subnet level, then applies SHA-256 to produce a pseudonymous
identifier. Same subnet and salt always produce the same hash.

The salt must be secret and unique per application. Without it, attackers can
pre-compute hashes of all possible subnets. Store salts like cryptographic keys
in environment variables or key vaults. Different salts for different purposes
prevent correlation across systems.

Parameters:
- ipAddress: IP address to hash
- prefixLength: Network bits to include
- salt: Secret salt string

Returns: Hexadecimal SHA-256 hash (64 characters)

Example - rate limit by subnet without storing IPs:

```sapl
policy "rate_limit"
deny
where
    var hash = cidr.hashIpPrefix(subject.ipAddress, 24, environment.salt);
    var count = cache.get(hash);
    count > 100;
advice
    {
        "type": "increment",
        "key": hash
    }
```


---

## cidr.anonymizeIp(Text ipAddress, Int prefixLength)

```cidr.anonymizeIp(STRING ipAddress, INT prefixLength)```

Anonymizes an IP by zeroing host bits beyond the prefix length. All addresses
in the same subnet produce identical results. Enables GDPR-compliant logging
while maintaining geographic or organizational context.

The prefix determines granularity. For IPv4, /24 preserves organization-level
context (254 hosts), while /16 preserves city-level (65534 hosts). For IPv6,
/48 represents a site and /64 represents a subnet.

Parameters:
- ipAddress: IP address to anonymize
- prefixLength: Network bits to preserve

Returns: Anonymized IP address string

Example - log client access with privacy protection:

```sapl
policy "privacy_log"
permit
obligation
    {
        "type": "log",
        "subnet": cidr.anonymizeIp(subject.ipAddress, 24)
    }
```


---

## cidr.getFirstUsableAddress(Text cidr)

```cidr.getFirstUsableAddress(STRING cidr)```

Returns the first usable host address (network address + 1).

Parameters:
- cidr: CIDR range

Returns: First usable address string


---

## cidr.isPrivateIpv4(Text ipAddress)

```cidr.isPrivateIpv4(STRING ipAddress)```

Tests if an IPv4 address falls in RFC 1918 private ranges: 10.0.0.0/8,
172.16.0.0/12, or 192.168.0.0/16. Returns false for IPv6 addresses.

Parameters:
- ipAddress: IP address to test

Returns: Boolean indicating private address


---

## cidr.getNetworkAddress(Text cidr)

```cidr.getNetworkAddress(STRING cidr)```

Returns the first address in a CIDR range (network address).

Parameters:
- cidr: CIDR range

Returns: Network address string


---

## cidr.isBenchmark(Text ipAddress)

```cidr.isBenchmark(STRING ipAddress)```

Tests if an IPv4 address is in the benchmarking range (198.18.0.0/15).
Reserved for network testing. Returns false for IPv6.

Parameters:
- ipAddress: IP address to test

Returns: Boolean indicating benchmark range


---

## cidr.isLinkLocal(Text ipAddress)

```cidr.isLinkLocal(STRING ipAddress)```

Tests for link-local addresses: 169.254.0.0/16 (IPv4) or fe80::/10 (IPv6).
These addresses are only valid on the local network segment.

Parameters:
- ipAddress: IP address to test

Returns: Boolean indicating link-local address


---

## cidr.isCgnat(Text ipAddress)

```cidr.isCgnat(STRING ipAddress)```

Tests if an IPv4 address is in the Carrier-Grade NAT range (100.64.0.0/10).
ISPs use this range for shared address space. Returns false for IPv6.

Parameters:
- ipAddress: IP address to test

Returns: Boolean indicating CGNAT range


---

## cidr.getLastUsableAddress(Text cidr)

```cidr.getLastUsableAddress(STRING cidr)```

Returns the last usable host address. For IPv4, returns broadcast address - 1.
For IPv6, returns the last address in the range.

Parameters:
- cidr: CIDR range

Returns: Last usable address string


---

## cidr.canSubdivide(Text cidr, Int targetPrefixLength)

```cidr.canSubdivide(STRING cidr, INT targetPrefixLength)```

Tests whether a CIDR can be evenly subdivided into smaller subnets. Returns true
only if the target prefix is larger (more specific) and the CIDR is aligned on
its network boundary.

Parameters:
- cidr: CIDR range to subdivide
- targetPrefixLength: Desired subdivision prefix

Returns: Boolean indicating subdivision possibility


---

## cidr.getUsableHostCount(Text cidr)

```cidr.getUsableHostCount(STRING cidr)```

Returns usable host addresses in a CIDR range. For IPv4, excludes network and
broadcast addresses. For /31 and /32, returns 0. Returns string to handle
large IPv6 ranges.

Parameters:
- cidr: CIDR range

Returns: Usable host count as string


---

## cidr.isDocumentation(Text ipAddress)

```cidr.isDocumentation(STRING ipAddress)```

Tests if an address is in ranges reserved for documentation and examples.
IPv4: 192.0.2.0/24, 198.51.100.0/24, 203.0.113.0/24
IPv6: 2001:db8::/32

Parameters:
- ipAddress: IP address to test

Returns: Boolean indicating documentation range


---

## cidr.getCommonPrefixLength(Text ip1, Text ip2)

```cidr.getCommonPrefixLength(STRING ip1, STRING ip2)```

Calculates how many leading bits are identical between two IP addresses.
Returns 0 for different address families.

Parameters:
- ip1: First IP address
- ip2: Second IP address

Returns: Number of common prefix bits


---

## cidr.merge(Array addresses)

```cidr.merge(ARRAY addresses)```

Consolidates IP addresses and subnets into the minimal set of non-overlapping CIDRs.
Eliminates duplicates, removes contained ranges, and combines adjacent blocks. IPv6
addresses use RFC 5952 canonical form.

Parameters:
- addresses: Array of IP addresses and CIDR strings

Returns: Array of minimal CIDR strings


---

## cidr.sameSubnet(Text ip1, Text ip2, Int prefixLength)

```cidr.sameSubnet(STRING ip1, STRING ip2, INT prefixLength)```

Tests whether two IP addresses belong to the same subnet. Mixing address
families returns false.

Parameters:
- ip1: First IP address
- ip2: Second IP address
- prefixLength: Subnet mask length

Returns: Boolean indicating same subnet


---

## cidr.contains(Text cidr, Text cidrOrIp)

```cidr.contains(STRING cidr, STRING cidrOrIp)```

Tests if an IP address or CIDR range falls within another CIDR. Works with both
IPv4 and IPv6 addresses. Mixing address families returns false.

Parameters:
- cidr: The containing CIDR range (e.g., "10.0.0.0/8")
- cidrOrIp: IP address or CIDR to test (e.g., "10.0.1.5" or "10.0.1.0/24")

Returns: Boolean indicating containment

Example - restrict API access to corporate network:

```sapl
policy "corporate_api"
permit action == "call_api"
where
    cidr.contains("198.51.100.0/24", subject.ipAddress);
```


---

## cidr.expand(Text cidr)

```cidr.expand(STRING cidr)```

Enumerates all IP addresses in a CIDR range. Limited to 65535 addresses to
prevent memory exhaustion. IPv6 addresses use RFC 5952 canonical form.

Parameters:
- cidr: CIDR range to expand (e.g., "192.168.0.0/30")

Returns: Array of IP address strings


---

## cidr.isBroadcast(Text ipAddress)

```cidr.isBroadcast(STRING ipAddress)```

Tests if an IPv4 address is the broadcast address (255.255.255.255).
Returns false for IPv6.

Parameters:
- ipAddress: IP address to test

Returns: Boolean indicating broadcast address


---

## cidr.isReserved(Text ipAddress)

```cidr.isReserved(STRING ipAddress)```

Tests if an address is in ranges reserved for future use or special purposes.
IPv4: 240.0.0.0/4
IPv6: ::/128, ::ffff:0:0/96, 100::/64, 2001::/23, 2001:db8::/32

Parameters:
- ipAddress: IP address to test

Returns: Boolean indicating reserved range


---

## cidr.isPublicRoutable(Text ipAddress)

```cidr.isPublicRoutable(STRING ipAddress)```

Tests if an address is publicly routable. Returns true only if the address
is not private, loopback, link-local, multicast, documentation, CGNAT,
benchmark, reserved, or broadcast.

Parameters:
- ipAddress: IP address to test

Returns: Boolean indicating publicly routable address


---

## cidr.isLoopback(Text ipAddress)

```cidr.isLoopback(STRING ipAddress)```

Tests for loopback addresses: 127.0.0.0/8 (IPv4) or ::1/128 (IPv6).

Parameters:
- ipAddress: IP address to test

Returns: Boolean indicating loopback address


---

## cidr.isValid(Text cidr)

```cidr.isValid(STRING cidr)```

Validates CIDR notation or IP address syntax for both IPv4 and IPv6.

Parameters:
- cidr: String to validate

Returns: Boolean indicating validity


---

## cidr.isMulticast(Text ipAddress)

```cidr.isMulticast(STRING ipAddress)```

Tests for multicast addresses: 224.0.0.0/4 (IPv4) or ff00::/8 (IPv6).

Parameters:
- ipAddress: IP address to test

Returns: Boolean indicating multicast address


---

## cidr.getAddressCount(Text cidr)

```cidr.getAddressCount(STRING cidr)```

Returns total addresses in a CIDR range as a string to handle large IPv6 ranges.

Parameters:
- cidr: CIDR range

Returns: Address count as string


---

## cidr.intersects(Text cidr1, Text cidr2)

```cidr.intersects(STRING cidr1, STRING cidr2)```

Tests whether two CIDR ranges share any addresses. Use this to validate network
allocations don't conflict or to detect overlapping security zones.

Parameters:
- cidr1: First CIDR range
- cidr2: Second CIDR range

Returns: Boolean indicating overlap


---

## cidr.getBroadcastAddress(Text cidr)

```cidr.getBroadcastAddress(STRING cidr)```

Returns the last address in a CIDR range (broadcast address for IPv4).

Parameters:
- cidr: CIDR range

Returns: Broadcast address string


---

