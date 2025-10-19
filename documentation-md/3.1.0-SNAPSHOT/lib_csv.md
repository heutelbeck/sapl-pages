---
title: csv
parent: Function Libraries
nav_order: 104
---
# csv

CSV parsing and generation for authorization policies.

# CSV Operations

Parse CSV documents into SAPL data structures for authorization decisions based on
tabular data. Convert SAPL arrays into CSV format for audit logs and reports.
Process user lists, permission matrices, and configuration tables stored as CSV.

## Core Principles

CSV parsing treats the first row as column headers. Each subsequent row becomes an
object with properties named after the headers. All values are parsed as strings -
type conversion must be done explicitly in policies. CSV generation takes an array
of objects and uses the first object's keys as column headers. Empty arrays produce
empty CSV output.

## Access Control Patterns

Parse allowlists from CSV files to check if users or resources are permitted.
Compare incoming requests against lists maintained in external systems.

```sapl
policy "check_allowlist"
permit action == "access_resource"
where
    var allowlistCsv = resource.config.allowedUsers;
    var allowlist = csv.csvToVal(allowlistCsv);
    var usernames = allowlist.map(entry -> entry.username);
    array.containsAny(usernames, [subject.username]);
```

Parse permission matrices that define which roles can perform which actions on
which resource types. Match the current request against the matrix.

```sapl
policy "permission_matrix"
permit
where
    var matrixCsv = environment.permissionMatrix;
    var matrix = csv.csvToVal(matrixCsv);
    var matchingEntry = matrix.filter(row ->
        row.role == subject.role &&
        row.action == action.name &&
        row.resourceType == resource.type
    );
    !array.isEmpty(matchingEntry);
```

Validate bulk operations by parsing uploaded CSV files and checking each row
against authorization rules before processing.

```sapl
policy "bulk_import"
permit action == "import_users"
where
    var uploadedCsv = resource.fileContent;
    var users = csv.csvToVal(uploadedCsv);
    var invalidUsers = users.filter(user ->
        !subject.allowedDomains.contains(user.domain)
    );
    array.isEmpty(invalidUsers);
```

Generate audit logs as CSV for compliance reporting. Convert policy evaluation
results into tabular format for analysis.

```sapl
policy "audit_access"
permit
obligation
    {
        "type": "audit",
        "format": "csv",
        "data": csv.valToCsv([{
            "user": subject.username,
            "action": action.name,
            "resource": resource.id,
            "timestamp": time.now()
        }])
    }
```

Parse department hierarchies or organizational structures from CSV to determine
authorization scope based on reporting relationships.

```sapl
policy "hierarchical_access"
permit action == "view_employee_data"
where
    var orgStructure = csv.csvToVal(environment.organizationCsv);
    var subordinates = orgStructure.filter(row ->
        row.managerId == subject.employeeId
    );
    var subordinateIds = subordinates.map(row -> row.employeeId);
    array.containsAny(subordinateIds, [resource.employeeId]);
```

Parse configuration tables that map resource types to required permissions.
Look up the required permissions for the requested resource type.

```sapl
policy "resource_permissions"
permit
where
    var configCsv = environment.resourcePermissionConfig;
    var config = csv.csvToVal(configCsv);
    var resourceConfig = config.filter(row ->
        row.resourceType == resource.type
    )[0];
    var requiredPermissions = resourceConfig.permissions;
    array.containsAll(subject.permissions, [requiredPermissions]);
```


---

## csv.csvToVal(Text csv)

```csv.csvToVal(TEXT csv)```

Parses a CSV document with headers into a SAPL array of objects. The first row is
treated as column headers, and each subsequent row becomes an object with properties
named after those headers. All values are parsed as strings.

Parameters:
- csv: CSV text with headers in first row

Returns: Array of objects, one per data row

Example - parse user allowlist:
```sapl
policy "example"
permit
where
    var csvText = "username,department\nalice,engineering\nbob,sales";
    var users = csv.csvToVal(csvText);
    var usernames = users.map(u -> u.username);
    array.containsAny(usernames, [subject.username]);
```


---

## csv.valToCsv(Array array)

```csv.valToCsv(ARRAY array)```

Converts a SAPL array of objects into a CSV string with headers. The keys of the
first object determine the column headers. Subsequent objects should have the same
keys for consistent output. Returns an empty string for empty arrays.

Parameters:
- array: Array of objects to convert

Returns: CSV string with headers

Example - generate audit log:
```sapl
policy "example"
permit
obligation
    {
        "type": "audit",
        "log": csv.valToCsv([{
            "user": subject.username,
            "action": action.name,
            "resource": resource.id
        }])
    }
```


---

