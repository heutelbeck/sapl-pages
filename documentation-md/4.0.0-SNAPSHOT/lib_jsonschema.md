---
layout: default
title: jsonschema
parent: Functions
grand_parent: SAPL Reference
nav_order: 112
---
# jsonschema

This library contains the functions for testing the compliance of a value with a JSON schema.



---

## validate

```validate(validationSubject, OBJECT schema)```:
This function validates the `validationSubject` against the provided JSON schema `schema` and returns
a detailed validation result.

The result contains a `valid` boolean field and an `errors` array with detailed information about any
validation failures. Each error includes the location in the subject (`path`), a human-readable message,
the validation keyword that failed (`type`), and the schema location (`schemaPath`).

The schema itself cannot be validated and improper schema definitions may lead to unexpected results.

*Note:* The schema is expected to comply with: [JSON Schema 2020-12](https://json-schema.org/draft/2020-12)

**Example:**
```sapl
policy "validate_document_metadata"
permit action == "upload:document";
  var metadataSchema = {
    "type": "object",
    "properties": {
      "classification": { "enum": ["public", "internal", "confidential", "secret"] },
      "owner": { "type": "string", "minLength": 1 },
      "createdAt": { "type": "string", "format": "date-time" }
    },
    "required": ["classification", "owner"]
  };
  var result = jsonschema.validate(resource.metadata, metadataSchema);
  result.valid;
```


---

## validateWithExternalSchemas

```validateWithExternalSchemas(validationSubject, OBJECT jsonSchema, ARRAY externalSchemas)```:
This function validates the ```validationSubject``` against the provided JSON schema `schema` and returns
a detailed validation result including error details.

The result contains a `valid` boolean field and an `errors` array with detailed information about any
validation failures. Each error includes the location in the subject (`path`), a human-readable message,
the validation keyword that failed (`type`), and the schema location (`schemaPath`).

The schema itself cannot be validated and improper schema definitions may lead to unexpected results.
If the ```jsonSchema``` contains external references to other ```schemas```, the validation function
looks up the schemas in ```externalSchemas``` based on explicitly defined ```$id``` field in the schemas.
If no $id field is provided, the schema will not be detectable.

*Note:* The schema is expected to comply with: [JSON Schema 2020-12](https://json-schema.org/draft/2020-12)

**Example:**
```sapl
policy "validate_api_request_with_shared_schemas"
permit action == "api:call";
  var addressSchema = {
    "$id": "https://schemas.company.com/address",
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "street": { "type": "string" },
      "city": { "type": "string" },
      "country": { "type": "string", "minLength": 2, "maxLength": 2 }
    },
    "required": ["street", "city", "country"]
  };
  var userSchema = {
    "$id": "https://schemas.company.com/user",
    "$schema": "https://json-schema.org/draft/2020-12/schema",
    "type": "object",
    "properties": {
      "userId": { "type": "string", "format": "uuid" },
      "email": { "type": "string", "format": "email" },
      "role": { "enum": ["user", "admin", "auditor"] },
      "address": { "$ref": "https://schemas.company.com/address" }
    },
    "required": ["userId", "email", "role"]
  };
  var result = jsonschema.validateWithExternalSchemas(
    resource.userData,
    userSchema,
    [addressSchema]
  );
  result.valid || result.errors[0].type == "required";
```


---

## isCompliant

```isCompliant(validationSubject, OBJECT schema)```:
This function tests the `validationSubject` for compliance with the with the provided JSON schema `schema`.

The schema itself cannot be validated and improper schema definitions may lead to unexpected results.
If ```validationSubject``` is compliant with the ```schema```, the function returns ```true```,
else it returns ```false```.

*Note:* The schema is expected to comply with: [JSON Schema 2020-12](https://json-schema.org/draft/2020-12)

**Example:**
```sapl
policy "example"
permit
  var jsonSchema = {
                     "type": "boolean"
                   };
  jsonschema.isCompliant(true, jsonSchema) == true;
  jsonschema.isCompliant(123, jsonSchema) == false;
```


---

## isCompliantWithExternalSchemas

```isCompliantWithExternalSchemas(validationSubject, OBJECT jsonSchema, ARRAY externalSchemas)```:
This function tests the ```validationSubject``` for compliance with the with the provided JSON
schema `schema`.

The schema itself cannot be validated and improper schema definitions may lead to unexcpected results.
If ```validationSubject``` is compliant with the ```schema```, the function returns ```true```,
else it returns ```false```.
If the ```jsonSchema``` contains external references to other ```schemas```, the validation function
looks up the schemas in ```externalSchemas``` based on explicitly defined ```$id``` field in the schemas.
If no $id field is provided, the schema will not be detectable.

*Note:* The schema is expected to comply with: [JSON Schema 2020-12](https://json-schema.org/draft/2020-12)

**Example:**
```sapl
policy "example"
permit
  var externals = {
        "$id": "https://example.com/coordinates",
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "title": "Coordinates",
        "type": "object",
        "properties" : {
            "x": { "type": "integer" },
            "y": { "type": "integer" },
            "z": { "type": "integer" }
        }
    };
  var schema = {
        "$id": "https://example.com/triangle.schema.json",
        "$schema": "https://json-schema.org/draft/2020-12/schema",
        "title": "Triangle",
        "type": "object",
        "properties": {
            "A": { "$ref": "https://example.com/coordinates" },
            "B": { "$ref": "https://example.com/coordinates" },
            "C": { "$ref": "https://example.com/coordinates" }
      };
  var valid = {
           "A" : { "x" : 1, "y" : 2, "z" : 3 },
           "B" : { "x" : 1, "y" : 2, "z" : 3 },
           "C" : { "x" : 1, "y" : 2, "z" : 3 }
        };
  isCompliantWithExternalSchemas(valid, schema, externals) == true;
  var invalid = {
           "A" : { "x" : "I AM NOT A NUMBER I AM A FREE MAN", "y" : 2, "z" : 3 },
           "B" : { "x" : 1, "y" : 2, "z" : 3 },
           "C" : { "x" : 1, "y" : 2, "z" : 3 }
        };
  isCompliantWithExternalSchemas(invalid, schema, externals) == false;
```


---

