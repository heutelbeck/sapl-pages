---
layout: default
title: xml
parent: Functions
nav_order: 133
---
# xml

Function library for XML marshalling and unmarshalling operations.

# XML Function Library

Enables XML processing in SAPL policies for systems that exchange authorization-relevant
data in XML format. Parse XML from external systems into SAPL values for policy evaluation,
or serialize policy decisions and context into XML for logging or integration.

## Limits

To bound memory and computation on untrusted input, the following limits apply:

- The input is limited to 1 MB.
- Parsing is bounded to a maximum nesting depth of 500 and a maximum number length of 1000 characters.

DTD processing and external entity resolution are disabled, so XXE and entity-expansion payloads are rejected with an error.

These limits apply because this input may originate from the authorization subscription or from policy information points, which are not vetted to the same degree as the policies and variables shipped with the PDP configuration.


---

## xmlToVal

```xmlToVal(TEXT xml)```: Converts a well-formed XML document into a SAPL value
representing the content of the XML document.

DTD processing and external entity resolution are disabled. Documents that declare
or reference entities, such as XXE or entity-expansion payloads, are rejected with
an error. Plain data XML without a document type definition is supported.

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

