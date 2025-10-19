---
layout: default
title: mqtt
parent: Attribute Finders
grand_parent: SAPL Reference
nav_order: 203
---
# mqtt

Policy Information Point for subscribing to MQTT topics.

This Policy Information Point subscribes to MQTT topics and returns messages from
MQTT brokers as a reactive stream of attribute values.

Subscribe to single or multiple topics with configurable Quality of Service levels
and broker configurations.

## Quality of Service Levels

MQTT QoS levels determine message delivery guarantees:
* QoS 0: At most once - fire and forget, no acknowledgment
* QoS 1: At least once - acknowledged delivery, possible duplicates
* QoS 2: Exactly once - assured delivery, no duplicates

## Configuration

Configure the PIP through the SAPL environment variables. The `mqttPipConfig`
variable contains:

* `brokerConfig`: Single object or array of broker configuration objects
* `defaultBrokerConfigName`: Default broker configuration name (optional)
* `defaultResponse`: Default response when no messages arrive - "undefined" or "error" (defaults to "undefined")
* `defaultResponseTimeout`: Timeout in milliseconds before emitting default response (defaults to 1000ms)
* `emitAtRetry`: Emit value on reconnection - "true" or "false" (defaults to "false")

Each broker configuration object contains:
* `name`: Broker configuration identifier (optional)
* `brokerAddress`: Hostname or IP address of the MQTT broker
* `brokerPort`: Port number of the MQTT broker
* `clientId`: Unique identifier for the MQTT client connection
* `username`: Username for broker authentication (optional, defaults to empty string)
* `password`: Password for broker authentication (optional, defaults to empty string)

Configuration example without authentication:
```json
{
  "defaultBrokerConfigName": "production",
  "defaultResponse": "undefined",
  "defaultResponseTimeout": 5000,
  "emitAtRetry": "false",
  "brokerConfig": [
    {
      "name": "production",
      "brokerAddress": "mqtt.example.com",
      "brokerPort": 1883,
      "clientId": "sapl-client-prod"
    },
    {
      "name": "staging",
      "brokerAddress": "mqtt-staging.example.com",
      "brokerPort": 1883,
      "clientId": "sapl-client-staging"
    }
  ]
}
```

Configuration example with authentication:
```json
{
  "defaultBrokerConfigName": "production",
  "brokerConfig": {
    "name": "production",
    "brokerAddress": "mqtt.example.com",
    "brokerPort": 1883,
    "clientId": "sapl-client-prod",
    "username": "sapl-user",
    "password": "secure-password"
  }
}
```

## Message Format

Received messages are automatically converted based on their MQTT payload format:
* Messages with content type `application/json` are parsed as JSON values
* UTF-8 encoded text messages are returned as text values
* Binary payloads are returned as arrays of byte values (as integers)

## Topic Wildcards

The PIP supports MQTT topic wildcards for flexible subscriptions:
* `+` - Single-level wildcard (matches one topic level)
* `#` - Multi-level wildcard (matches zero or more topic levels, must be last)

Examples:
* `sensors/+/temperature` matches `sensors/room1/temperature` and `sensors/room2/temperature`
* `building/#` matches `building/floor1/room1` and `building/floor2/room3/sensor5`

## Example Policy

```sapl
policy "temperature_monitoring"
permit
    action == "monitor"
where
    var sensors = ["sensors/room1/temp", "sensors/room2/temp"];
    sensors.<mqtt.messages>.celsius < 30.0;
```

## Reconnection Behavior

The PIP automatically handles broker reconnection in case of connection loss.
When reconnection occurs, the PIP re-subscribes to all active topics and continues
emitting messages.


---

## messages


# Input Entity of Attribute Finder

Name: topic [TEXT|ARRAY]

# Parameters of Attribute Finder

Name: qos [INTEGER]
Subscribes to MQTT topics with a specified Quality of Service level.

QoS levels and their trade-offs:
* QoS 0: At most once - fastest but may lose messages
* QoS 1: At least once - acknowledged delivery, may receive duplicates
* QoS 2: Exactly once - slowest but guaranteed

Example with QoS 1 for reliable monitoring:
```sapl
policy "critical_alarm_monitoring"
permit
where
  "alarms/critical".<mqtt.messages(1)>.severity == "HIGH";
```

Example with QoS 2 for command processing:
```sapl
policy "device_command_processing"
permit
where
  var commandTopics = ["device/shutdown", "device/restart"];
  commandTopics.<mqtt.messages(2)>.confirmed == true;
```

Example with QoS 0 for high-frequency sensor data:
```sapl
policy "sensor_stream"
permit
where
  "sensors/motion/#".<mqtt.messages(0)> != undefined;
```


---

