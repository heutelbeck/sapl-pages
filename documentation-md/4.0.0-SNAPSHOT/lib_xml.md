---
layout: default
title: xml
parent: Functions
grand_parent: SAPL Reference
nav_order: 134
---
# xml

Function library for XML marshalling and unmarshalling operations.

# XML Function Library

Enables XML processing in SAPL policies for systems that exchange authorization-relevant
data in XML format. Parse XML from external systems into SAPL values for policy evaluation,
or serialize policy decisions and context into XML for logging or integration.


---

## xmlToVal

```xmlToVal(TEXT xml)```: Converts a well-formed XML document into a SAPL value
representing the content of the XML document.

**Example:**
```sapl
policy "permit_with_resource_attributes"
permit
   var resourceXml = "<Resource><owner>alice</owner><classification>PUBLIC</classification></Resource>";
   var resource = xml.xmlToVal(resourceXml);
   resource.owner == subject.name;
```


---

## valToXml

```valToXml(value)```: Converts a SAPL value into an XML string representation.

**Example:**
```sapl
policy "log_access_attempt"
permit
   var accessLog = {"user":"bob","resource":"/documents/report.pdf","action":"READ","timestamp":"2025-01-15T10:30:00Z"};
   var logXml = xml.valToXml(accessLog);
   // logXml contains XML-formatted access log
```


---

