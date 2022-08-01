---
layout: page
---

<p><center><h2>The Streaming Attribute Policy Language and Engine</h2></center></p>

{% include youtubePlayer.html id="ZizNrdpygNM" %}
<p><center>Simple flexible and dynamic attribute based access-control (ABAC).</center></p>

<p><center>The reactive open source engine to bring ABAC to you applications supporting steams of attributes for efficient interactive real-time access control.</center></p>

## Streaming Attribute Policy Language (SAPL)

The Streaming Attribute Policy Language (SAPL) offers a compact easy to read and write syntax to express your access-control policies. Policies written in SAPL require little code and do not obfuscate the meaning of the policy in extensive structural boilerplate code, as found in the Xtensible Access Control Markup Language (XACML).

SAPL supports a JSON oriented data model including rich JSON path-like querying of JSON objects.

SAPL supports both traditional request-response-based policy decision making as well as publish-subscribe attribute stream driven decision making based on an reactive API.

## Spring Security Integration

The SAPL Engine provides a deep integration into the Spring Security software stack offering easy integration of policy enforcement points into Spring applications.

The SAPL libraries offer support for:
* Embedded policy decision points.
* Remote policy decison points.
* Reactive API.
* Declarative method security.
* URL filtering.
* Customizalble Spring Boot autoconfiguration of the Policy Engine components.
* Easy APIs to define Spring Beans for handling the enforcement of policy driven obligations and advices.

The SAPL libraries default to automatic authorization request generation, which is fully customizalble.

## Open Source

The complete language and core policy engine is open-source licensed under the Apache 2.0 license, allowing for easy auditing of the software stack, extensibility, availability and low barriers for testing and adoption.

## Open Lightweigt Authorization Server

A lightweigt SAPL-based authorization server, i.e., a policy decision point (PDP), implementation is available for centrally administrating policies providing request-response and subscription-based authorization as a service through a simple REST style API.

## Lightweigt Embedded PDP

The SAPL policy engine includes an embedded Policy Decision Point (PDP) into Java applications for ease of development and performance.
