---
layout: default
title: xml
parent: Functions
grand_parent: SAPL Reference
nav_order: 136
---
# xml

Function library for XML marshalling and unmarshalling operations.

## XML Functions

Enables XML processing in SAPL policies for systems that exchange authorization-relevant data in XML format.
Parse XML from external systems into SAPL values for policy evaluation, or serialize policy decisions and
context into XML for logging or integration.


---

## xml.xmlToVal(Text xml)

```xmlToVal(TEXT xml)```: Converts a well-formed XML document ```xml``` into a SAPL
value representing the content of the XML document.

**Example:**
```sapl
policy "permit_with_resource_attributes"
permit
where
   var resourceXml = "<Resource><owner>alice</owner><classification>PUBLIC</classification></Resource>";
   var resource = xml.xmlToVal(resourceXml);
   resource.owner == subject.name;
```


---

## xml.valToXml(value)

```valToXml(value)```: Converts a SAPL ```value``` into an XML string representation.

**Example:**
```sapl
policy "log_access_attempt"
permit
where
   var accessLog = {"user":"bob","resource":"/documents/report.pdf","action":"READ","timestamp":"2025-01-15T10:30:00Z"};
   var logXml = xml.valToXml(accessLog);
   // logXml contains: <LinkedHashMap><user>bob</user><resource>/documents/report.pdf</resource>...
```


---

