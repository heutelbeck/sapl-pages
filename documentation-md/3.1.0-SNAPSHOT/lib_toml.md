---
title: toml
parent: Function Libraries
nav_order: 131
---
# toml

Function library for TOML marshalling and unmarshalling operations.



---

## toml.tomlToVal(Text toml)

```tomlToVal(TEXT toml)```: Converts a well-formed TOML document ```toml``` into a SAPL
value representing the content of the TOML document.

**Example:**
```
import toml.*
policy "example"
permit
where
   var tomlText = "[flower]\nname = \"Poppy\"\ncolor = \"RED\"\npetals = 9";
   tomlToVal(tomlText) == {"flower":{"name":"Poppy","color":"RED","petals":9}};
```


---

## toml.valToToml(value)

```valToToml(value)```: Converts a SAPL ```value``` into a TOML string representation.

**Example:**
```
import toml.*
policy "example"
permit
where
   var object = {"flower":{"name":"Poppy","color":"RED","petals":9}};
   var expected = "[flower]\nname = \"Poppy\"\ncolor = \"RED\"\npetals = 9\n";
   valToToml(object) == expected;
```


---

