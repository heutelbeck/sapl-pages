---
title: traccar
parent: Attribute Finders
nav_order: 205
---
# traccar

This policy information point can fetch device positions and geofences from a traccar server.

 This policy information point allows interaction with Traccar servers.
 [Traccar](https://www.traccar.org/) is a GPS tracking platform for monitoring the location of devices and
 managing geofences.

 This library enables fetching device positions as device attributes and geofence geometries as fence attributes.
 By integrating with the geographical function library (`geo`), this allows for policies that enforce geographical
 access control and geofencing. This library also allows direct access to Traccar-specific data within its schema,
 allowing to retrieve positions and geofences as GeoJSON objects for use with the operators of the `geo`
 function library.

 **Traccar Server Configuration**

 This library uses email and password authentication.
 A Traccar server configuration is a JSON object named `traccarConfiguration` containing the following attributes:
  - `baseUrl`: The base URL for constructing API requests. Example: `https://demo.traccar.org`.
  - `userName`: The email address used to authenticate to the Traccar Server.
  - `password`: The password to authenticate to the Traccar Server.
  - `pollingIntervalMs`: The interval, in milliseconds, between polling the Traccar server endpoint. Defaults to 1000ms.
  - `repetitions`: The maximum number of repeated requests. Defaults to `0x7fffffffffffffffL`.

 *** Example: ***

 ```json
 {
     "baseUrl": "https://demo.traccar.org",
     "userName": "email@address.org",
     "password": "password",
     "pollingIntervalMs": 250
 }
 ```

 All attribute finders of this library offer a variation with or without the `traccarConfiguration` as a parameter.
 If the parameter is not used in a policy, the attribute finder will default to the value of the environment variable
 `TRACCAR_CONFIG`.

 *** Examples: ***

  - `subject.device.<traccar.position>` will use the value of the environment variable `TRACCAR_CONFIG`
   to connect to the Traccar server.

  - Alternatively, a policy-specific set of settings can be used:
   ```
   subject.device.<{
                     "baseUrl": "https://demo.traccar.org",
                     "userName": "email@address.org",
                     "password": "password"
                   }>
   ```

  - `subject.device.<traccar.position(TRACCAR_SERVER_1)>` will use the value of the environment variable
   `TRACCAR_SERVER_1` to connect to the Traccar server.

As a best practice, credentials should be stored in an environment variable and marked as secret to minimize
the risk of exposing credentials.


---

## server


# Parameters of Attribute Finder

Name: traccarConfig [JSON]

# Schema of Return Value

```JSON
```
```<traccar.server(traccarConfig)>``` is an environment attribute that retrieves server metadata from the
[Traccar server endpoint](https://www.traccar.org/api-reference/#tag/Server/paths/~1server/get).
It uses the settings provided in the `traccarConfig` parameter to connect to the server.

 **Parameters:**

- `traccarConfig` *(Object)*: A JSON object containing the configuration to connect to the Traccar server.

**Example:**

```
<traccar.server({
                  "baseUrl": "https://demo.traccar.org",
                  "userName": "email@address.org",
                  "password": "password"
                })>
```

This attribute may return a value like:

```json
{
  "id": 0,
  "registration": true,
  "readonly": true,
  "deviceReadonly": true,
  "limitCommands": true,
  "map": "string",
  "bingKey": "string",
  "mapUrl": "string",
  "poiLayer": "string",
  "latitude": 0,
  "longitude": 0,
  "zoom": 0,
  "version": "string",
  "forceSettings": true,
  "coordinateFormat": "string",
  "openIdEnabled": true,
  "openIdForce": true,
  "attributes": {}
}
```


---

## traccarGeofence


# Input Entity of Attribute Finder

Name: geofenceEntityId [TEXT]

# Schema of Return Value

```JSON
```
```geofenceEntityId.<traccar.traccarGeofence>``` is an attribute that retrieves metadata for a specific geofence from
the Traccar server using the provided geofence identifier. This method uses the environment variable
`TRACCAR_CONFIG` to retrieve the server connection configuration.

**Parameters:**
- `geofenceEntityId` *(Text)*: The identifier of the geofence in the Traccar system.

**Example:**

```
"12345".<traccar.traccarGeofence>
```

This may return a value like:
```json
{
    "id": 12345,
    "name": "Geofence A",
    "area": "Polygon",
    "attributes": {}
}
```


---

## devices


# Parameters of Attribute Finder

Name: traccarConfig [JSON]

# Schema of Return Value

```JSON
```
```<traccar.devices(traccarConfig)>``` is an environment attribute that retrieves a list of devices from the
[Traccar server endpoint](https://www.traccar.org/api-reference/#tag/Devices/paths/~1devices/get).
It uses the settings provided in the `traccarConfig` parameter to connect to the server.

**Parameters:**

 - `traccarConfig` *(Object)*: A JSON object containing the configuration to connect to the Traccar server.

**Example:**

```
<traccar.devices({
                  "baseUrl": "https://demo.traccar.org",
                  "userName": "email@address.org",
                  "password": "password"
                })>
```

This attribute may return a value like:
```json
[
  {
    "id": 0,
    "name": "string",
    "uniqueId": "string",
    "status": "string",
    "disabled": true,
    "lastUpdate": "2019-08-24T14:15:22Z",
    "positionId": 0,
    "groupId": 0,
    "phone": "string",
    "model": "string",
    "contact": "string",
    "category": "string",
    "attributes": {}
  }
]
```


---

## geofenceGeometry


# Input Entity of Attribute Finder

Name: geofenceEntityId [TEXT]

# Parameters of Attribute Finder

Name: traccarConfig [JSON]

# Schema of Return Value

```JSON
```
```geofenceEntityId.<traccar.geofenceGeometry(traccarConfig)>``` is an attribute that converts geofence metadata into
GeoJSON format for geometric representation. It uses the provided `traccarConfig` parameter to connect to the
Traccar server.

**Parameters:**

- `geofenceEntityId` *(Text)*: The identifier of the geofence in the Traccar system.
- `traccarConfig` *(Object)*: A JSON object containing the configuration to connect to the Traccar server.

**Example:**

```
"12345".<traccar.geofenceGeometry({
    "baseUrl": "https://demo.traccar.org",
    "userName": "email@address.org",
    "password": "password"
})>
```

This may return a value like:
```json
{
    "type": "Polygon",
    "coordinates": [
        [
            [102.0, 2.0],
            [103.0, 2.0],
            [103.0, 3.0],
            [102.0, 3.0],
            [102.0, 2.0]
        ]
    ]
}
```


---

## geofences


# Parameters of Attribute Finder

Name: traccarConfig [JSON]

# Schema of Return Value

```JSON
```
```<traccar.geofences(traccarConfig)>``` is an environment attribute that retrieves a list of all geofences from
the Traccar server. It uses the provided `traccarConfig` parameter to connect to the server.

**Parameters:**

- `traccarConfig` *(Object)*: A JSON object containing the configuration to connect to the Traccar server.

**Example:**

```
<traccar.geofences({
    "baseUrl": "https://demo.traccar.org",
    "userName": "email@address.org",
    "password": "password"
})>
```

This may return a value like:
```json
[
    {
        "id": 0,
        "name": "string",
        "description": "string",
        "area": "string",
        "attributes": {}
    }
]
```


---

## position


# Input Entity of Attribute Finder

Name: deviceEntityId [TEXT]

# Schema of Return Value

```JSON
```
```deviceEntityId.<traccar.position>``` is an attribute that converts the most recent position of a specific device
from the Traccar server into GeoJSON format. This method uses the environment variable `TRACCAR_CONFIG`
to retrieve the server connection configuration.

**Parameters:**
- `deviceEntityId` *(Text)*: The identifier of the device in the Traccar system.

**Example:**

```
"12345".<traccar.position>
```

This may return a value like:
```json
{
    "type": "Point",
    "coordinates": [102.0, 0.5]
}
```


---

## device


# Input Entity of Attribute Finder

Name: deviceEntityId [TEXT]

# Schema of Return Value

```JSON
```
```deviceEntityId.<traccar.device>``` is an attribute that fetches detailed metadata for a specific device from
the Traccar server.
The device is identified using the `deviceEntityId` parameter, which is the identifier of the device in Traccar,
not the device's `uniqueId` in the database.
This method uses the environment variable `TRACCAR_CONFIG` to retrieve the server connection configuration.

 **Parameters:**
 - `deviceEntityId` *(Text)*: The identifier of the device in the Traccar system.

**Example:**

```
"12345".<traccar.device>
```

This may return a value like:
```json
{
    "id": 0,
    "name": "string",
    "uniqueId": "string",
    "status": "string",
    "disabled": true,
    "lastUpdate": "2019-08-24T14:15:22Z",
    "positionId": 0,
    "groupId": 0,
    "phone": "string",
    "model": "string",
    "contact": "string",
    "category": "string",
    "attributes": {}
}
```


---

## traccarPosition


# Input Entity of Attribute Finder

Name: deviceEntityId [TEXT]

# Parameters of Attribute Finder

Name: traccarConfig [JSON]

# Schema of Return Value

```JSON
```
```deviceEntityId.<traccar.traccarPosition(traccarConfig)>``` is an attribute that retrieves the most recent position of
a specific device from the Traccar server using the provided `traccarConfig` parameter.

**Parameters:**

- `deviceEntityId` *(Text)*: The identifier of the device in the Traccar system.
- `traccarConfig` *(Object)*: A JSON object containing the configuration to connect to the Traccar server.

**Example:**

```
"12345".<traccar.traccarPosition({
    "baseUrl": "https://demo.traccar.org",
    "userName": "email@address.org",
    "password": "password"
})>
```

This may return a value like:
```json
{
    "id": 0,
    "protocol": "string",
    "deviceId": 12345,
    "serverTime": "2019-08-24T14:15:22Z",
    "deviceTime": "2019-08-24T14:15:22Z",
    "fixTime": "2019-08-24T14:15:22Z",
    "valid": true,
    "latitude": 0,
    "longitude": 0,
    "altitude": 0,
    "speed": 0,
    "course": 0,
    "address": "string",
    "attributes": {}
}
```


---

