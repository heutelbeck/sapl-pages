---
layout: default
title: mqtt
parent: Functions
grand_parent: SAPL Reference
nav_order: 117
---
# mqtt

Functions for matching topics to mqtt topics which contain wildcards.



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

