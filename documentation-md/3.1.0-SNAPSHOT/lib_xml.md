---
layout: default
title: xml
parent: Functions
grand_parent: SAPL Reference
nav_order: 136
---
# xml

Function library for XML marshalling and unmarshalling operations.



---

## xml.xmlToVal(Text xml)

```xmlToVal(TEXT xml)```: Converts a well-formed XML document ```xml``` into a SAPL
value representing the content of the XML document.

**Example:**
```
import xml.*
policy "example"
permit
where
   var xmlText = "<Flower><name>Poppy</name><color>RED</color><petals>9</petals></Flower>";
   xmlToVal(xmlText) == {"n":"Poppy","color":"RED","petals":"9"};
```


---

## xml.valToXml(value)

```valToXml(value)```: Converts a SAPL ```value``` into an XML string representation.

**Example:**
```
import xml.*
policy "example"
permit
where
   var object = {"name":"Poppy","color":"RED","petals":9};
   var expected = "<LinkedHashMap><name>Poppy</name><color>RED</color><petals>9</petals></LinkedHashMap>";
   valToXml(object) == expected;
```


---

