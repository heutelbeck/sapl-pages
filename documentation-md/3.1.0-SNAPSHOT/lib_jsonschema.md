---
title: jsonschema
parent: Function Libraries
nav_order: 112
---
# jsonschema

This library contains the functions for testing the compliance of a value with a JSON schema.



---

## jsonschema.isCompliant(validationSubject, JsonObject jsonSchema)

```isCompliantWithSchema(validationSubject, OBJECT schema)```:
This function tests the ```validationSubject``` for compliance with the with the provided JSON schema
```schema```.
The schema itself cannot be validated and improper schema definitions may lead to unexpected results.
If ```validationSubject``` is compliant with the ```schema```, the function returns ```true```,
else it returns ```false```.

*Note:* The schema is expected to comply with: [JSON Schema 2020-12](https://json-schema.org/draft/2020-12)

**Example:**
```
policy "example"
permit
where
  var jsonSchema = {
                     "type": "boolean"
                   };
  jsonschema.isCompliant(true, jsonSchema) == true;
  jsonschema.isCompliant(123, jsonSchema) == false;
```


---

## jsonschema.isCompliantWithExternalSchemas(validationSubject, JsonObject jsonSchema, externalSchemas)

```isCompliantWithSchema(validationSubject, OBJECT jsonSchema, ARRAY externalSchemas)```:
This function tests the ```validationSubject``` for compliance with the with the provided JSON schema
```schema```.
The schema itself cannot be validated and improper schema definitions may lead to unexcpected results.
If ```validationSubject``` is compliant with the ```schema```, the function returns ```true```,
else it returns ```false```.
If the ```jsonSchema``` contains external references to other ```schemas```, the validation function
looks up the schemas in ```externalSchemas``` based on explicitly defined ```$id``` field in the schemas.
If no $id field is provided, the schema will not be detectable.

*Note:* The schema is expected to comply with: [JSON Schema 2020-12](https://json-schema.org/draft/2020-12)

**Example:**
```
policy "example"
permit
where
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

