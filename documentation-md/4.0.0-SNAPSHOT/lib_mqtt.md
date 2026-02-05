---
layout: default
title: mqtt
parent: Functions
grand_parent: SAPL Reference
nav_order: 117
---
# mqtt

Functions for matching MQTT topics against wildcard patterns.

# MQTT Topic Matching

Functions for matching MQTT topics against wildcard patterns, enabling
topic-based access control for IoT and messaging systems.

## MQTT Wildcard Syntax

- `+` matches exactly one topic level: `home/+/temperature` matches `home/kitchen/temperature`
- `#` matches zero or more levels: `sensors/#` matches `sensors/floor1/room2/temp`

## Access Control Patterns

Restrict a client to topics within their assigned namespace:

```sapl
policy "client can only publish to own topics"
permit
    action == "publish"
where
    mqtt.isMatchingAllTopics("clients/" + subject.clientId + "/#", resource.topic);
```

Allow subscription if at least one requested topic is in an allowed set:

```sapl
policy "subscriber has partial access"
permit
    action == "subscribe"
where
    mqtt.isMatchingAtLeastOneTopic("public/#", resource.topics);
```


---

## isMatchingAllTopics

```isMatchingAllTopics(Text wildcardTopic, Text|Array topics)```:
Checks whether all ```topics``` match the wildcard ```wildcardTopic```.

**Example with array:**
```sapl
policy "allTopicsMatchMultilevelWildcardTopic"
permit
  subject == "firstSubject";
  mqtt.isMatchingAllTopics(resource, ["first/second/third", "first/second/fourth"]);
```

**Example with single topic:**
```sapl
policy "topicMatchesMultilevelWildcardTopic"
permit
  subject == "firstSubject";
  mqtt.isMatchingAllTopics(resource, "first/second/third");
```


---

## isMatchingAtLeastOneTopic

```mqtt.isMatchingAtLeastOneTopic(Text wildcardTopic, Text|Array topics)```
Checks whether at least one topic in ```topics``` matches the wildcard ```wildcardTopic```.

**Example with array:**
```sapl
policy "atLeastOneTopicMatchesMultilevelWildcardTopic"
permit
  subject == "secondSubject";
  mqtt.isMatchingAtLeastOneTopic(resource, ["first/second/third", "first/third"]);
```

**Example with single topic:**
```sapl
policy "topicMatchesMultilevelWildcardTopic"
permit
  subject == "secondSubject";
  mqtt.isMatchingAtLeastOneTopic(resource, "first/second/third");
```


---

