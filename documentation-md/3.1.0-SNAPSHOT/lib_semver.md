---
layout: default
title: semver
parent: Functions
grand_parent: SAPL Reference
nav_order: 126
---
# semver

Functions for semantic version comparison and validation in authorization policies.

# Semantic Versioning in Authorization Policies

This library provides functions for working with semantic versions in SAPL policies, following the Semantic Versioning 2.0.0 specification. Use these functions to implement version-based access control, check API compatibility between services, and gate features based on client versions.

## Understanding Version Format

Semantic versions follow the format `MAJOR.MINOR.PATCH[-PRERELEASE][+BUILDMETADATA]`. Each component serves a specific purpose:

- MAJOR: Incremented for incompatible API changes (e.g., `2.0.0`)
- MINOR: Incremented when adding backwards-compatible functionality (e.g., `1.5.0`)
- PATCH: Incremented for backwards-compatible bug fixes (e.g., `1.0.3`)
- PRERELEASE: Optional pre-release identifier with dot-separated alphanumeric parts (e.g., `alpha`, `beta.1`, `rc.2`)
- BUILDMETADATA: Optional build metadata with dot-separated alphanumeric parts (e.g., `build.123`, `sha.5114f85`)

Valid examples include `1.0.0`, `2.3.5-alpha`, and `1.0.0-beta.2+build.456`.

The library accepts a lowercase `v` prefix for compatibility with Git tags (e.g., `v1.0.0`). However, uppercase `V` is not supported. While the strict SemVer 2.0.0 specification excludes any prefix, lowercase `v` is widely adopted in version control systems.

## How Version Comparison Works

Version precedence follows semantic versioning rules. Major, minor, and patch numbers are compared numerically. Pre-release versions always come before their corresponding normal versions (e.g., `1.0.0-alpha` is lower than `1.0.0`). When comparing pre-release identifiers, the comparison is alphanumeric. Build metadata never affects version precedence.

## Expressing Version Ranges

The library supports NPM-style range syntax for flexible version matching:

- **Operators**: `>=1.0.0`, `>1.0.0`, `<=2.0.0`, `<2.0.0`, `=1.0.0`
- **Hyphen ranges**: `1.2.3 - 2.3.4` (both ends inclusive)
- **X-ranges**: `1.2.x`, `1.x`, `*` (wildcards for matching any value)
- **Tilde**: `~1.2.3` (allows patch-level changes: `>=1.2.3 <1.3.0`)
- **Caret**: `^1.2.3` (allows minor-level changes: `>=1.2.3 <2.0.0`)
- **OR**: `>=1.0.0 || >=2.0.0`
- **AND**: `>=1.0.0 <2.0.0` (space-separated conditions)

## Common Authorization Scenarios

Version-based access control is essential for managing API lifecycle and ensuring security. For instance, you might need to block clients using deprecated API versions to force security updates. Here's how to enforce a minimum client version:

```sapl
policy "enforce_minimum_secure_version"
deny
where
  semver.isLower(subject.clientVersion, "2.5.0");
```

Feature gating lets you enable advanced functionality only for clients meeting version requirements. This prevents older clients from attempting to use features they don't support:

```sapl
policy "advanced_analytics_feature"
permit action.name == "useAdvancedAnalytics"
where
  semver.isAtLeast(subject.appVersion, "3.2.0");
```

API compatibility checking ensures services can communicate properly. When services depend on each other, you need to verify they speak compatible API versions:

```sapl
policy "service_compatibility"
permit action.name == "invokeService"
where
  semver.isCompatibleWith(subject.serviceVersion, resource.requiredApiVersion);
```

Restricting pre-release versions to specific roles prevents unstable builds from reaching production environments. Development and staging teams might use pre-release versions, but production systems should only run stable releases:

```sapl
policy "production_stable_only"
deny action.name == "deployToProduction"
where
  semver.isPreRelease(resource.version);
  subject.role != "release-manager";
```

Compatibility windows help manage gradual rollouts. When migrating between major versions, you often need to support a range of client versions temporarily:

```sapl
policy "migration_compatibility_window"
permit
where
  semver.isBetween(subject.clientVersion, "2.0.0", "3.5.0");
```


---

## semver.compare(Text version1, Text version2)

```compare(TEXT version1, TEXT version2)```: Compares two semantic versions.

Returns -1 if version1 < version2, 0 if equal, 1 if version1 > version2.
Build metadata ignored per specification.

```sapl
policy "minimum_version"
permit
where
  semver.compare(resource.version, "2.0.0") >= 0;
```


---

## semver.minSatisfying(Array versions, Text range)

```minSatisfying(ARRAY versions, TEXT range)```: Finds lowest version matching range.

Returns lowest version from array satisfying range, or null if none match.

```sapl
policy "require_minimum"
permit
where
  var minimum = semver.minSatisfying(resource.supportedVersions, ">=1.0.0");
  semver.isAtLeast(subject.clientVersion, minimum);
```


---

## semver.parse(Text versionString)

```parse(TEXT versionString)```: Parses a semantic version string into components.

Returns an object with version parts. Accepts versions with or without lowercase `v` prefix.
Returns error if string is not valid.

Result fields:
- `version`: Complete version without v-prefix
- `major`, `minor`, `patch`: Version numbers
- `isStable`: Boolean indicating stable release (no pre-release)
- `isPreRelease`: Boolean indicating pre-release
- `preRelease`: Array of pre-release identifiers
- `buildMetadata`: Array of build metadata identifiers

```sapl
policy "require_stable_major_2"
permit
where
  var parsed = semver.parse(request.clientVersion);
  parsed.major >= 2;
  parsed.isStable;
```


---

## semver.haveSamePatch(Text version1, Text version2)

```haveSamePatch(TEXT version1, TEXT version2)```: Tests for matching major, minor, and patch version.

```sapl
policy "exact_patch_match"
permit
where
  semver.haveSamePatch(resource.version, "2.3.5");
```


---

## semver.getMinor(Text version)

```getMinor(TEXT version)```: Extracts minor version number.

```sapl
policy "feature_availability"
permit
where
  semver.getMajor(subject.version) == 2;
  semver.getMinor(subject.version) >= 3;
```


---

## semver.isLowerOrEqual(Text version1, Text version2)

```isLowerOrEqual(TEXT version1, TEXT version2)```: Tests if version1 <= version2.

```sapl
policy "version_ceiling"
permit
where
  semver.isLowerOrEqual(resource.apiVersion, "3.5.0");
```


---

## semver.satisfies(Text version, Text range)

```satisfies(TEXT version, TEXT range)```: Tests if version satisfies range expression.

Returns true if version satisfies NPM-style range. Supports operators (>=, >, <=, <, =),
hyphen ranges (1.2.3 - 2.3.4), X-ranges (1.2.x, 1.x, *), tilde (~1.2.3 allows patch),
caret (^1.2.3 allows minor), and logical operators (||, space-separated AND).

```sapl
policy "version_range"
permit
where
  semver.satisfies(subject.clientVersion, ">=2.0.0 <3.0.0");
```


---

## semver.isValid(Text versionString)

```isValid(TEXT versionString)```: Validates semantic version format.

Returns true if string conforms to Semantic Versioning 2.0.0. Accepts lowercase `v` prefix.

```sapl
policy "require_valid_version"
deny
where
  !semver.isValid(resource.serviceVersion);
```


---

## semver.getMajor(Text version)

```getMajor(TEXT version)```: Extracts major version number.

```sapl
policy "api_v3_only"
permit
where
  semver.getMajor(subject.apiVersion) == 3;
```


---

## semver.isCompatibleWith(Text version1, Text version2)

```isCompatibleWith(TEXT version1, TEXT version2)```: Tests API compatibility.

Returns true if versions are API-compatible per semantic versioning:
- Major 0 (0.y.z): Only exact major.minor match is compatible
- Major 1+: Same major version indicates compatibility

```sapl
policy "api_compatibility"
permit
where
  semver.isCompatibleWith(subject.clientVersion, resource.apiVersion);
```


---

## semver.isAtMost(Text version, Text maximum)

```isAtMost(TEXT version, TEXT maximum)```: Tests if version is at or below maximum.

Alias for isLowerOrEqual. Enforces maximum version constraints.

```sapl
policy "deprecated_after"
deny
where
  !semver.isAtMost(subject.apiVersion, "2.9.9");
```


---

## semver.isHigher(Text version1, Text version2)

```isHigher(TEXT version1, TEXT version2)```: Tests if version1 > version2.

```sapl
policy "early_access_features"
permit
where
  semver.isHigher(subject.clientVersion, "3.0.0");
```


---

## semver.equals(Text version1, Text version2)

```equals(TEXT version1, TEXT version2)```: Checks version equality.

Returns true if versions are semantically equal. Build metadata ignored.

```sapl
policy "exact_version_required"
permit
where
  semver.equals(resource.apiVersion, "2.1.0");
```


---

## semver.diff(Text version1, Text version2)

```diff(TEXT version1, TEXT version2)```: Determines version change type.

Returns "major", "minor", "patch", "prerelease", or "none" for equal versions.
Determines if version change requires approval or special handling.

```sapl
policy "breaking_change_approval"
permit action.name == "deploy"
where
  var changeType = semver.diff(resource.currentVersion, resource.newVersion);
  changeType == "major" implies subject.role == "architect";
```


---

## semver.coerce(Text value)

```coerce(TEXT value)```: Coerces string to valid semantic version.

Normalizes common formats including partial versions (e.g., "1.2" becomes "1.2.0"),
lowercase v-prefix removal, and other standard version formats.

```sapl
policy "normalize_version"
permit
where
  var normalized = semver.coerce(request.version);
  semver.isAtLeast(normalized, "2.0.0");
```


---

## semver.isHigherOrEqual(Text version1, Text version2)

```isHigherOrEqual(TEXT version1, TEXT version2)```: Tests if version1 >= version2.

```sapl
policy "feature_gate"
permit
where
  action.name == "advancedFeature";
  semver.isHigherOrEqual(request.version, "2.5.0");
```


---

## semver.getPatch(Text version)

```getPatch(TEXT version)```: Extracts patch version number.

```sapl
policy "specific_patch"
permit
where
  semver.getMajor(subject.version) == 1;
  semver.getMinor(subject.version) == 0;
  semver.getPatch(subject.version) >= 5;
```


---

## semver.haveSameMajor(Text version1, Text version2)

```haveSameMajor(TEXT version1, TEXT version2)```: Tests for matching major version.

```sapl
policy "api_v2_only"
permit
where
  semver.haveSameMajor(resource.apiVersion, "2.0.0");
```


---

## semver.isAtLeast(Text version, Text minimum)

```isAtLeast(TEXT version, TEXT minimum)```: Tests if version meets minimum.

Alias for isHigherOrEqual. Enforces minimum version requirements.

```sapl
policy "security_requirement"
permit
where
  semver.isAtLeast(request.version, resource.minimumSecureVersion);
```


---

## semver.isStable(Text version)

```isStable(TEXT version)```: Tests if version is stable release.

Returns true if version does not contain pre-release identifier.

```sapl
policy "production_ready"
permit
where
  semver.isStable(resource.version);
  action.name == "production";
```


---

## semver.isBetween(Text version, Text minimum, Text maximum)

```isBetween(TEXT version, TEXT minimum, TEXT maximum)```: Tests if version is in range.

Returns true if minimum <= version <= maximum. Both bounds inclusive.

```sapl
policy "compatibility_window"
permit
where
  semver.isBetween(request.version, resource.minVersion, resource.maxVersion);
```


---

## semver.isLower(Text version1, Text version2)

```isLower(TEXT version1, TEXT version2)```: Tests if version1 < version2.

```sapl
policy "block_outdated_clients"
deny
where
  semver.isLower(subject.clientVersion, "2.0.0");
```


---

## semver.haveSameMinor(Text version1, Text version2)

```haveSameMinor(TEXT version1, TEXT version2)```: Tests for matching major and minor version.

```sapl
policy "minor_version_match"
permit
where
  semver.haveSameMinor(resource.version, "2.3.0");
```


---

## semver.maxSatisfying(Array versions, Text range)

```maxSatisfying(ARRAY versions, TEXT range)```: Finds highest version matching range.

Returns highest version from array satisfying range, or null if none match.

```sapl
policy "use_latest_compatible"
permit
where
  var compatible = semver.maxSatisfying(resource.availableVersions, "^2.0.0");
  compatible != null;
```


---

## semver.isPreRelease(Text version)

```isPreRelease(TEXT version)```: Tests if version is pre-release.

Returns true if version contains pre-release identifier (e.g., alpha, beta, rc).

```sapl
policy "block_unstable"
deny
where
  semver.isPreRelease(resource.version);
```


---

