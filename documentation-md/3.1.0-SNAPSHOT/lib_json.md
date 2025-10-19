---
layout: default
title: json
parent: Functions
grand_parent: SAPL Reference
nav_order: 111
---
# json

Function library for JSON marshalling and unmarshalling operations.



---

## json.jsonToVal(Text json)

```jsonToVal(TEXT json)```: Converts a well-formed JSON document ```json``` into a SAPL
value representing the content of the JSON document.

**Example:**
```
import json.*
policy "example"
permit
where
   var jsonText = "{ \"hello\": \"world\" }";
   jsonToVal(jsonText) == { "hello":"world" };
```


---

## json.valToJson(value)

```valToJson(value)```: Converts a SAPL ```value``` into a JSON string representation.

**Example:**
```
import json.*
policy "example"
permit
where
   var object = { "hello":"world" };
   valToJson(object) == "{\"hello\":\"world\"}";
```


---

