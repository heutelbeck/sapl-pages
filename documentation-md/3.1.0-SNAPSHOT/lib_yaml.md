---
title: yaml
parent: Functions
nav_order: 137
---
# yaml

Function library for YAML marshalling and unmarshalling operations.



---

## yaml.valToYaml(value)

```valToYaml(value)```: Converts a SAPL ```value``` into a YAML string representation.

**Example:**
```
import yaml.*
policy "example"
permit
where
   var object = {"name":"Poppy","color":"RED","petals":9};
   var expected = "---\nname: \"Poppy\"\ncolor: \"RED\"\npetals: 9\n";
   valToYaml(object) == expected;
```


---

## yaml.yamlToVal(Text yaml)

```yamlToVal(TEXT yaml)```: Converts a well-formed YAML document ```yaml``` into a SAPL
value representing the content of the YAML document.

**Example:**
```
import yaml.*
policy "example"
permit
where
   var yamlText = "name: Poppy\ncolor: RED\npetals: 9";
   yamlToVal(yamlText) == {"name":"Poppy","color":"RED","petals":9};
```


---

