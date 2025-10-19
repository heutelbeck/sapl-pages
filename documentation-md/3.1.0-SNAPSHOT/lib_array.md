---
layout: default
title: array
parent: Functions
grand_parent: SAPL Reference
nav_order: 101
---
# array

Array manipulation functions for authorization policies.

# Array Functions

Array operations for building authorization policies that work with collections of values.
Test membership, combine sets of permissions, aggregate numeric data, and transform
attribute lists.

## Core Principles

Array functions treat inputs as immutable collections and return new arrays. Equality
comparison uses JSON value equality - numerically equivalent but differently formatted
numbers (e.g., 0 versus 0.000) may not match. Empty arrays are valid inputs and follow
mathematical conventions: empty union returns empty, empty intersection returns empty,
sum of empty returns 0, product of empty returns 1.

## Access Control Patterns

Check if a user possesses required permissions from a set. Verify that subjects hold
all mandatory roles before granting access.

```sapl
policy "require_admin_or_editor"
permit action == "modify_content"
where
    var required = ["admin", "editor"];
    array.containsAny(subject.roles, required);
```

Combine permissions from multiple sources when evaluating group memberships or
inherited roles.

```sapl
policy "aggregate_permissions"
permit
where
    var direct = subject.directPermissions;
    var inherited = subject.groupPermissions;
    var all = array.union(direct, inherited);
    array.containsAll(all, ["read", "write"]);
```

Find common capabilities between user privileges and resource requirements to
determine allowed operations.

```sapl
policy "intersection_access"
permit
where
    var allowed = array.intersect(subject.capabilities, resource.requirements);
    !array.isEmpty(allowed);
obligation
    {
        "type": "limit_operations",
        "operations": allowed
    }
```

Validate approval workflows by checking that signatories appear in the correct
sequence. Enforce that approvals happen in order without gaps.

```sapl
policy "approval_sequence"
permit action == "finalize_transaction"
where
    var required = ["manager", "director", "cfo"];
    array.containsAllInOrder(resource.approvals, required);
```

Filter sensitive attributes before releasing data. Remove fields that exceed the
user's clearance level.

```sapl
policy "filter_classified"
permit action == "read_document"
where
    subject.clearance >= resource.classification;
transform
    var allowed = subject.viewableFields;
    var actual = resource.fieldNames;
    var permitted = array.intersect(allowed, actual);
    resource |- { @.fields : permitted }
```

Calculate aggregate metrics for rate limiting or quota enforcement. Sum request
counts or average response times across time windows.

```sapl
policy "rate_limit"
deny action == "api_call"
where
    var counts = subject.requestsPerMinute;
    array.sum(counts) > 100;
```


---

## array.isEmpty(Array array)

```array.isEmpty(ARRAY array)```

Returns true if the array has no elements.

Parameters:
- array: Array to test

Returns: Boolean indicating whether array is empty

Example:
```sapl
policy "example"
permit
where
    !array.isEmpty(subject.permissions);
```


---

## array.containsAllInOrder(Array array, Array elements)

```array.containsAllInOrder(ARRAY array, ARRAY elements)```

Returns true if the array contains all elements from the elements array in the same
sequential order, though not necessarily consecutively. Returns true if the elements
array is empty.

Parameters:
- array: Array to search in
- elements: Elements that must appear in this order

Returns: Boolean indicating whether elements appear in order

Example - verify approval workflow sequence:
```sapl
policy "example"
permit action == "finalize_contract"
where
    var required = ["legal_review", "manager_approval", "director_signature"];
    array.containsAllInOrder(resource.approvalSteps, required);
```


---

## array.rangeStepped(Number from, Number to, Number step)

```array.rangeStepped(NUMBER from, NUMBER to, NUMBER step)```

Creates an array containing integers from from to to (both inclusive), incrementing
by step. The step can be positive or negative. Returns an error if step is zero.
All parameters must be integers. For positive step, from must be less than or equal
to to. For negative step, from must be greater than or equal to to. Range is
inclusive on both ends.

Parameters:
- from: Starting value (inclusive)
- to: Ending value (inclusive)
- step: Increment value (positive or negative, not zero)

Returns: Array of integers with specified step

Example:
```sapl
policy "example"
permit
where
    array.rangeStepped(1, 10, 2) == [1, 3, 5, 7, 9];
    array.rangeStepped(10, 1, -2) == [10, 8, 6, 4, 2];
```


---

## array.head(Array array)

```array.head(ARRAY array)```

Returns the first element of the array. Returns an error if the array is empty.

Parameters:
- array: Array to extract from

Returns: First element

Example:
```sapl
policy "example"
permit
where
    array.head(subject.roles) == "admin";
```


---

## array.sum(Array array)

```array.sum(ARRAY array)```

Returns the sum of all numeric elements in the array. Returns 0 for an empty array.
All elements must be numeric or an error is returned.

Parameters:
- array: Array of numbers to sum

Returns: Sum of all elements

Example - enforce rate limit:
```sapl
policy "example"
deny action == "api_call"
where
    array.sum(subject.requestCounts) > 1000;
```


---

## array.min(Array array)

```array.min(ARRAY array)```

Returns the minimum value from the array. For numeric arrays, returns the smallest
number. For string arrays, returns the first string in lexicographic order. All
elements must be of the same type. Returns an error for empty arrays, mixed types,
or unsupported types.

Parameters:
- array: Array to find minimum in

Returns: Minimum value

Example:
```sapl
policy "example"
permit
where
    array.min(subject.securityLevels) >= 3;
```


---

## array.range(Number from, Number to)

```array.range(NUMBER from, NUMBER to)```

Creates an array containing all integers from from to to (both inclusive).
Returns an empty array if the range is invalid (from greater than to).
Both parameters must be integers.

Parameters:
- from: Starting value (inclusive)
- to: Ending value (inclusive)

Returns: Array of consecutive integers

Example:
```sapl
policy "example"
permit
where
    array.range(1, 5) == [1, 2, 3, 4, 5];
```


---

## array.avg(Array array)

```array.avg(ARRAY array)```

Returns the arithmetic mean (average) of all numeric elements in the array. Returns
an error for empty arrays. All elements must be numeric.

Parameters:
- array: Array of numbers to average

Returns: Average value

Example:
```sapl
policy "example"
permit
where
    array.avg(subject.performanceScores) >= 8.0;
```


---

## array.reverse(Array array)

```array.reverse(ARRAY array)```

Returns the array with its elements in reversed order.

Parameters:
- array: Array to reverse

Returns: New array with elements in reverse order

Example:
```sapl
policy "example"
permit
where
    array.reverse([1, 2, 3, 4]) == [4, 3, 2, 1];
```


---

## array.containsAny(Array array, Array elements)

```array.containsAny(ARRAY array, ARRAY elements)```

Returns true if the array contains at least one element from the elements array.
Returns false if no elements are found or if the elements array is empty.

Parameters:
- array: Array to search in
- elements: Elements to search for

Returns: Boolean indicating whether any element was found

Example - check if user has any admin role:
```sapl
policy "example"
permit action == "admin_panel"
where
    var adminRoles = ["superadmin", "admin", "moderator"];
    array.containsAny(subject.roles, adminRoles);
```


---

## array.crossProduct(Array array1, Array array2)

```array.crossProduct(ARRAY array1, ARRAY array2)```

Returns the Cartesian product of two arrays. The result is an array of 2-element
arrays, where each element contains one item from array1 paired with one item from
array2. Returns an empty array if either input array is empty.

Parameters:
- array1: First array
- array2: Second array

Returns: Array of all possible pairs

Example - generate permission-resource combinations:
```sapl
policy "example"
permit
where
    var actions = ["read", "write"];
    var resources = ["doc1", "doc2"];
    var combinations = array.crossProduct(actions, resources);
```


---

## array.median(Array array)

```array.median(ARRAY array)```

Returns the median value of all numeric elements in the array. The median is the
middle value when the numbers are sorted. For arrays with an even number of elements,
returns the average of the two middle values. Returns an error for empty arrays.
All elements must be numeric.

Parameters:
- array: Array of numbers to find median of

Returns: Median value

Example:
```sapl
policy "example"
permit
where
    array.median([1, 2, 3, 4, 5]) == 3;
    array.median([1, 2, 3, 4]) == 2.5;
```


---

## array.toSet(Array array)

```array.toSet(ARRAY array)```

Creates a copy of the array preserving the original order but removing all
duplicate elements. Keeps the first occurrence of each element.

Parameters:
- array: Array to deduplicate

Returns: New array with unique elements

Example:
```sapl
policy "example"
permit
where
    array.toSet([1, 2, 3, 4, 3, 2, 1]) == [1, 2, 3, 4];
```


---

## array.concatenate(Array arrays...)

```array.concatenate(ARRAY...arrays)```

Creates a new array by appending all parameter arrays in order. Preserves element
order within each array and the order of array parameters. Duplicates are retained.

Parameters:
- arrays: Arrays to concatenate

Returns: New array containing all elements in order

Example:
```sapl
policy "example"
permit
where
    array.concatenate([1, 2], [3, 4], [5]) == [1, 2, 3, 4, 5];
```


---

## array.sort(Array array)

```array.sort(ARRAY array)```

Returns a new array with elements sorted in ascending order. The function determines
the sort order based on the type of the first element. Numeric arrays are sorted
numerically, string arrays are sorted lexicographically. All elements must be of the
same type. Returns an error for empty arrays, mixed types, or unsupported types.

Numeric sorting uses floating-point comparison for performance, which is appropriate
for SAPL's authorization policy use cases. Very large integers beyond 2^53 may lose
precision during comparison.

Parameters:
- array: Array to sort

Returns: New sorted array

Example:
```sapl
policy "example"
permit
where
    array.sort([3, 1, 4, 1, 5, 9, 2, 6]) == [1, 1, 2, 3, 4, 5, 6, 9];
    array.sort(["dog", "cat", "bird", "ant"]) == ["ant", "bird", "cat", "dog"];
```


---

## array.difference(Array array1, Array array2)

```array.difference(ARRAY array1, ARRAY array2)```

Returns the set difference between array1 and array2, removing duplicates. Creates a
new array containing elements from array1 that do not appear in array2.

Parameters:
- array1: Array to subtract from
- array2: Array of elements to remove

Returns: New array with elements in array1 but not in array2

Example - remove revoked permissions:
```sapl
policy "example"
permit
where
    var granted = subject.grantedPermissions;
    var revoked = subject.revokedPermissions;
    var effective = array.difference(granted, revoked);
    array.containsAll(effective, resource.requiredPermissions);
```


---

## array.intersect(Array arrays...)

```array.intersect(ARRAY...arrays)```

Creates a new array containing only elements present in all parameter arrays.
Removes duplicates from the result.

Parameters:
- arrays: Arrays to intersect

Returns: New array with common elements

Example - find permissions shared across all roles:
```sapl
policy "example"
permit
where
    var rolePerms = subject.roles.map(role -> role.permissions);
    var common = array.intersect(rolePerms);
    array.containsAll(common, resource.minimumPermissions);
```


---

## array.containsAll(Array array, Array elements)

```array.containsAll(ARRAY array, ARRAY elements)```

Returns true if the array contains all elements from the elements array. The elements
do not need to appear in the same order. Returns true if the elements array is empty.

Parameters:
- array: Array to search in
- elements: Elements that must all be present

Returns: Boolean indicating whether all elements were found

Example - verify user has all required permissions:
```sapl
policy "example"
permit action == "publish_article"
where
    var required = ["write", "publish", "notify"];
    array.containsAll(subject.permissions, required);
```


---

## array.isSet(Array array)

```array.isSet(ARRAY array)```

Returns true if the array contains only distinct elements with no duplicates.
An empty array is considered a set.

Parameters:
- array: Array to test

Returns: Boolean indicating whether array is a set

Example:
```sapl
policy "example"
permit
where
    array.isSet([1, 2, 3, 4]);
    !array.isSet([1, 2, 3, 2]);
```


---

## array.multiply(Array array)

```array.multiply(ARRAY array)```

Returns the product of all numeric elements in the array. Returns 1 for an empty
array. All elements must be numeric or an error is returned.

Parameters:
- array: Array of numbers to multiply

Returns: Product of all elements

Example:
```sapl
policy "example"
permit
where
    array.multiply([2, 3, 4]) == 24;
```


---

## array.max(Array array)

```array.max(ARRAY array)```

Returns the maximum value from the array. For numeric arrays, returns the largest
number. For string arrays, returns the last string in lexicographic order. All
elements must be of the same type. Returns an error for empty arrays, mixed types,
or unsupported types.

Parameters:
- array: Array to find maximum in

Returns: Maximum value

Example:
```sapl
policy "example"
permit
where
    array.max([3, 1, 4, 1, 5, 9]) == 9;
```


---

## array.union(Array arrays...)

```array.union(ARRAY...arrays)```

Creates a new array containing all unique elements from all parameter arrays.
Removes duplicates while preserving the first occurrence of each element.

Parameters:
- arrays: Arrays to combine

Returns: New array with all unique elements

Example - combine permissions from multiple sources:
```sapl
policy "example"
permit
where
    var all = array.union(subject.directPermissions, subject.groupPermissions);
    array.containsAll(all, ["read", "write"]);
```


---

## array.flatten(Array array)

```array.flatten(ARRAY array)```

Flattens a nested array structure by one level. Takes an array that may contain
other arrays and returns a new array with all nested arrays expanded into the
top level.

Parameters:
- array: Array to flatten

Returns: New flattened array

Example:
```sapl
policy "example"
permit
where
    array.flatten([1, [2, 3], 4, [5]]) == [1, 2, 3, 4, 5];
```


---

## array.size(Array value)

```array.size(ARRAY value)```

Returns the number of elements in the array.

Parameters:
- value: Array to measure

Returns: Integer count of elements

Example:
```sapl
policy "example"
permit
where
    array.size(subject.roles) >= 2;
```


---

## array.zip(Array array1, Array array2)

```array.zip(ARRAY array1, ARRAY array2)```

Combines two arrays element-wise into an array of 2-element arrays (pairs).
The resulting array has length equal to the shorter of the two input arrays.

Parameters:
- array1: First array
- array2: Second array

Returns: Array of paired elements

Example:
```sapl
policy "example"
permit
where
    array.zip([1, 2, 3], ["a", "b", "c"]) == [[1, "a"], [2, "b"], [3, "c"]];
```


---

## array.last(Array array)

```array.last(ARRAY array)```

Returns the last element of the array. Returns an error if the array is empty.

Parameters:
- array: Array to extract from

Returns: Last element

Example:
```sapl
policy "example"
permit action == "finalize"
where
    array.last(resource.approvals) == "cfo_signature";
```


---

