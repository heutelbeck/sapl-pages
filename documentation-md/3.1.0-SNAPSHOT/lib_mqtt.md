---
layout: default
title: mqtt
parent: Functions
grand_parent: SAPL Reference
nav_order: 118
---
# mqtt

Functions for matching topics to mqtt topics which contain wildcards.



---

## mqtt.isMatchingAllTopics(Text wildcardTopic, Text|Array topics)

```isMatchingAllTopics(Text wildcardTopic, Text|Array topics)```:
            Checks whether all ```topics``` match the wildcard ```wildcardTopic```.

**Example:**
```
policy "allTopicsMatchMultilevelWildcardTopic"
permit
  subject == "firstSubject"
where
  mqtt.isMatchingAllTopics(resource, ["first/second/third", "first/second/fourth"]);
```


---

## mqtt.isMatchingAtLeastOneTopic(Text wildcardTopic, Text|Array topics)

```mqtt.isMatchingAtLeastOneTopic(Text wildcardTopic, Text|Array topics)```
Checks whether at least one topic in ```topics``` matches the wildcard ```wildcardTopic```.

**Example:**
```
policy "atLeastOneTopicMatchesMultilevelWildcardTopic"
permit
  subject == "secondSubject"
where
  mqtt.isMatchingAtLeastOneTopic(resource, ["first/second/third", "first/third"]);
```


---

