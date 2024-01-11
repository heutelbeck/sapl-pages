---
layout: page
title: FAQ
permalink: /faq
---

## What is SAPL?

SAPL, or the Streaming Attribute Policy Language, is an open-source implementation of the Attribute-based access control (ABAC) paradigm. SAPL comes with an expressive policy language, policy engine, authorization servers, and framework integrations.
SAPL extends the basic ABAC paradigm by following a publish-subscribe pattern instead of the traditional request-response pattern used in most ABAC implementations. So more precisely, SAPL implements Attribute stream-based access control (ASBAC).

## What is Attribute-based access control (ABAC)?

Attribute-based access control (ABAC) is an access control paradigm. A system can use ABAC to determine if a subject is permitted to perform a specific action on a resource. 

The subject may be a user, a machine, another application, or a service.

The action can be any CRUD operation like read, write, delete, or update. Often actions are more domain-specific, e.g., "approve loan", or "escalate task". Actions can also be technical, e.g., an HTTP action like POST, or a specific function call in an application.

Resources are the entities towards which the subject directs the action. A resource may be a URL, the result of a database query, or specific domain objects of the application. 

In some cases, it is also helpful to consider the authorization environment. The environment has attributes like current time, IP address, or system load.

These entities, i.e., subject, action, resource, and environment, constitute an authorization question. And all of them have specific information called attributes associated with them, e.g., security clearance, job occupation, parameters, integrity levels, schedules, location, etc.

ABAC uses rules based on the attributes to infer whether the action is permitted or not. 

ABAC allows the implementation of fine-grained access control rules and flexible access control models, such as Role-based access control (RBAC), Mandatory Access Control (MAC), BellBell-LaPadula, Clark-Wilson, Biba, Brewer-Nash, or very domain-specific models for an application.

## What is Attribute stream-based access control (ASBAC)?

Attribute stream-based access control (ASBAC) is an extension of ABAC because it uses a publish-subscribe pattern instead of a request-response pattern. In use-cases only requiring a single decision, ASBAC can be used similarly to ABAC by only consuming the first published decision. A request-response-based approach to the authorization may introduce risks to applications using sessions or long-standing connections.

The attributes used in the rules for authorization may change during the session, or even the rules may vary over time. Examples:
* In a collaborative whiteboard application, attributes of a user change during a session, and the user is no longer permitted to manipulate particular objects in the session.
* An operator physically enters an area (i.e., a geofence) limiting access to machine data and should immediately see it on a mobile device as soon as it becomes available.
* While a subscription is active, a customer is permitted access to monitoring a system's data via a data streaming protocol, e.g., Websocket, MQTT, or server-sent events.
* Due to a security audit, an organization limits access to a dataset for a subset of its employees by introducing a new temporary rule. All ongoing access must be interrupted immediately. When the organization removes the rule, the systems in use by the employees should start showing the related data again.

Suppose a system only performs authorization at the beginning of a long-standing session or connection. In that case, the system may violate the organization's confidentiality objectives as the attributes or rules change over time. If the system uses traditional ABAC, it has to poll the authorization system, which strains the infrastructure and introduces latencies.

Suppose changes to attributes or rules imply the authorization system will now grant a previously denied access. Users may not become aware of the newly available information without actively refreshing the application, violating the organization's availability goals. Again, the system could resort to undesirable polling to solve the issue.

ASBAC uses a publish-subscribe pattern for authorization. The authorization system and rules explicitly refer to attributes subject to change and will immediately inform clients if decisions change based on changed attributes or rules. Following this approach, applications can dynamically react to changing permissions without resorting to wasteful polling.

## What is fine-grained authorization?

Several factors determine the granularity of an access control mechanism:
* What kind of access control models can the mechanism express? A mechanism only able to distinguish between authenticated and unauthenticated users is a very coarse-grained access control mechanism. On the other hand, if the mechanism can express complex models, e.g., a combination of BellBell-LaPadula with time, location-based conditions, and role-based access control rules, it is considered fine-grained.
* Which information can the access control mechanism use to make authorization decisions? E.g., is the only data available for decision-making a user ID, or can the mechanism collect information about protocol usage (e.g., HTTP, MQTT), application context, domain-specific classification of actions, or technical information about implementation details of the services.
* What kind of decisions can the mechanism make? A mechanism that can only express decisions as "permit" or "deny" is less fine-grained than a mechanism that can filter data and express additional conditions and activities that an application must execute.
* Can the mechanism control data access on a content level? I.e., can the mechanism help to filter or change the content of data objects, tailoring it to different user groups? 

## What is dynamic authorization?

Dynamic Authorization Management (DAM) refers to systems using a dedicated, often centrally-managed,  authorization service that evaluates access rules and policies in real-time. The critical aspects of DAM are:
* It potentially decouples the management of rules and policies from the application development process. 
* It enables different lifecycles for policies and application code, increasing the overall flexibility of the organization's IT to respond to emerging security requirements.
* It enables consistent enforcement of access policies across the organization.
