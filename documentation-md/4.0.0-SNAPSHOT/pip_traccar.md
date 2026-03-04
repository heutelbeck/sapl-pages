---
layout: default
title: traccar
parent: Attribute Finders
grand_parent: SAPL Reference
nav_order: 205
---
# traccar

This policy information point can fetch device positions and geofences from a traccar server.

 This policy information point allows interaction with a single
 [Traccar](https://www.traccar.org/) GPS tracking server, fetching device positions,
 geofences, and server metadata.

 By integrating with the geographical function library (`geo`), this allows for
 policies that enforce geographical access control and geofencing. The library
 provides both Traccar-native data (positions, geofences in Traccar schema) and
 GeoJSON-converted data for use with the `geo` function library operators.

 ## Available Attributes

 Environment attributes (no left-hand operand):

 | Attribute | Description |
 |---|---|
 | `<traccar.server>` | Traccar server metadata |
 | `<traccar.devices>` | List of all devices |
 | `<traccar.geofences>` | List of all geofences |

 Left-hand operand attributes (entity ID on the left):

 | Attribute | Description |
 |---|---|
 | `deviceId.<traccar.device>` | Single device metadata |
 | `deviceId.<traccar.traccarPosition>` | Most recent position (Traccar schema) |
 | `deviceId.<traccar.position>` | Most recent position (GeoJSON) |
 | `geofenceId.<traccar.traccarGeofence>` | Single geofence metadata (Traccar schema) |
 | `geofenceId.<traccar.geofenceGeometry>` | Single geofence geometry (GeoJSON) |

 Every attribute has two variations:
 * Without parameter: uses the `TRACCAR_CONFIG` environment variable.
 * With `traccarConfig` parameter: uses the inline configuration object.

 Both variations use the same `secrets.traccar` credentials (see below).

 ## Server Configuration

 The Traccar server configuration is a JSON object with non-sensitive connection
 settings. It does not contain any credentials.

 Configuration fields:
 * `baseUrl` (required): The base URL of the Traccar server.
 * `pollingIntervalMs` (optional): Interval in milliseconds between polling requests.
   Defaults to 1000.
 * `repetitions` (optional): Maximum number of repeated polling requests. Defaults to
   `Long.MAX_VALUE`.

 The configuration is provided via the `TRACCAR_CONFIG` environment variable in
 `pdp.json`:
 ```json
 {
   "variables": {
     "TRACCAR_CONFIG": {
       "baseUrl": "https://demo.traccar.org",
       "pollingIntervalMs": 250
     }
   }
 }
 ```

 This PIP connects to a single Traccar server. There is no multi-server support.
 All attribute finders -- whether invoked with or without the inline `traccarConfig`
 parameter -- authenticate against the same `secrets.traccar` credentials.

 ## Secrets Configuration

 Credentials are sourced exclusively from the `secrets` section in `pdp.json`. They
 are never read from the `TRACCAR_CONFIG` variable, inline configuration parameters,
 or any other policy-visible source. Even if a `traccarConfig` object contains
 `userName` or `password` fields, they are ignored for authentication.

 There is a single set of Traccar credentials per PDP. All attribute finders use
 the same `secrets.traccar` entry regardless of whether they use `TRACCAR_CONFIG`
 or an inline configuration parameter.

 Two authentication methods are supported:

 **API token authentication (recommended for Traccar 6.x):**

 The token is passed as a `?token=` query parameter on every API request.
 ```json
 { "secrets": { "traccar": { "token": "YOUR_API_TOKEN" } } }
 ```

 **Basic authentication with email and password:**

 An `Authorization: Basic ...` header is added to every API request.
 ```json
 { "secrets": { "traccar": { "userName": "email@address.org", "password": "password" } } }
 ```

 Credential resolution:
 1. If `secrets.traccar.token` is present, use token authentication.
 2. Otherwise, if `secrets.traccar.userName` is present, use basic authentication.
 3. If neither is present, the attribute returns an error.

 If both `token` and `userName`/`password` are present, token authentication takes
 precedence.

 ## Attribute Invocation and Resolution

 **Without parameter** (uses `TRACCAR_CONFIG` environment variable):
 ```sapl
 policy "check_server"
 permit
   <traccar.server>.version == "6.7";
 ```
 Resolution: reads `TRACCAR_CONFIG` from `ctx.variables()`, reads credentials from
 `ctx.pdpSecrets().traccar`, makes the API call.

 **With inline config** (overrides connection settings only):
 ```sapl
 policy "check_position"
 permit
   subject.device.<traccar.position({
                    "baseUrl": "https://other.traccar.org",
                    "pollingIntervalMs": 500
                  })>;
 ```
 Resolution: uses the inline object for `baseUrl` and `pollingIntervalMs`, but
 credentials still come from `ctx.pdpSecrets().traccar` -- the same single set of
 secrets. The inline object cannot override authentication.

 ## Complete pdp.json Example

 ```json
 {
   "variables": {
     "TRACCAR_CONFIG": {
       "baseUrl": "https://traccar.example.com",
       "pollingIntervalMs": 1000
     }
   },
   "secrets": {
     "traccar": { "token": "YOUR_API_TOKEN" }
   }
 }
 ```

 With this configuration:
 * `<traccar.devices>` fetches devices from `traccar.example.com` using the API token.
 * `"42".<traccar.position>` fetches the position of device 42 from the same server.
 * `"42".<traccar.position({ "baseUrl": "https://other.traccar.org" })>` fetches
   from a different server, but still authenticates with the same API token from
   `secrets.traccar`.

 ## Geofencing Example

 ```sapl
 policy "geofence_check"
 permit
   var position = subject.device.<traccar.position>;
   var fence    = subject.geofence.<traccar.geofenceGeometry>;
   geo.contains(fence, position);
 ```


---

## position

```deviceEntityId.<traccar.position(traccarConfig)>``` is an attribute that converts the most recent position of a
specific device from the Traccar server into GeoJSON format using the provided `traccarConfig` parameter.

**Parameters:**
- `deviceEntityId` *(Text)*: The identifier of the device in the Traccar system.
- `traccarConfig` *(Object)*: A JSON object containing the configuration to connect to the Traccar server.

**Example:**

```
"12345".<traccar.position({
    "baseUrl": "https://demo.traccar.org",
    "pollingIntervalMs": 250
})>
```

This may return a value like:
```json
{
    "type": "Point",
    "coordinates": [102.0, 0.5]
}
```


---

## position

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

## server

```<traccar.server>``` is an environment attribute that retrieves server metadata from the
[Traccar server endpoint](https://www.traccar.org/api-reference/#tag/Server/paths/~1server/get).
It uses the value of the environment variable `TRACCAR_CONFIG` to connect to the server.

**Example:**

```
<traccar.server>
```

This may return a value like:

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

## server

```<traccar.server(traccarConfig)>``` is an environment attribute that retrieves server metadata from the
[Traccar server endpoint](https://www.traccar.org/api-reference/#tag/Server/paths/~1server/get).
It uses the settings provided in the `traccarConfig` parameter to connect to the server.

 **Parameters:**

- `traccarConfig` *(Object)*: A JSON object containing the configuration to connect to the Traccar server.

**Example:**

```
<traccar.server({
                  "baseUrl": "https://demo.traccar.org",
                  "pollingIntervalMs": 500
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

## devices

```<traccar.devices>``` is an environment attribute that retrieves a list of devices from the
[Traccar server endpoint](https://www.traccar.org/api-reference/#tag/Devices/paths/~1devices/get).
It uses the value of the environment variable `TRACCAR_CONFIG` to connect to the server.

 **Example:**

```
<traccar.devices>
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

## devices

```<traccar.devices(traccarConfig)>``` is an environment attribute that retrieves a list of devices from the
[Traccar server endpoint](https://www.traccar.org/api-reference/#tag/Devices/paths/~1devices/get).
It uses the settings provided in the `traccarConfig` parameter to connect to the server.

**Parameters:**

 - `traccarConfig` *(Object)*: A JSON object containing the configuration to connect to the Traccar server.

**Example:**

```
<traccar.devices({
                  "baseUrl": "https://demo.traccar.org",
                  "pollingIntervalMs": 500
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

## device

```deviceEntityId.<traccar.device(traccarConfig)>``` is an attribute that fetches detailed metadata for a specific device from
the Traccar server.
The device is identified using the `deviceEntityId` parameter, which is the identifier of the device in Traccar,
not the device's `uniqueId` in the database.
It uses the provided `traccarConfig` parameter to connect to the server.

 **Parameters:**
 - `deviceEntityId` *(Text)*: The identifier of the device in the Traccar system.
 - `traccarConfig` *(Object)*: A JSON object containing the configuration to connect to the Traccar server.

**Example:**

```
"12345".<traccar.device({
                  "baseUrl": "https://demo.traccar.org",
                  "pollingIntervalMs": 500
                })>
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

## device

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

## geofences

```<traccar.geofences>``` is an environment attribute that retrieves a list of all geofences from the Traccar server.
It uses the value of the environment variable `TRACCAR_CONFIG` to connect to the server.

**Example:**

```
<traccar.geofences>
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

## geofences

```<traccar.geofences(traccarConfig)>``` is an environment attribute that retrieves a list of all geofences from
the Traccar server. It uses the provided `traccarConfig` parameter to connect to the server.

**Parameters:**

- `traccarConfig` *(Object)*: A JSON object containing the configuration to connect to the Traccar server.

**Example:**

```
<traccar.geofences({
    "baseUrl": "https://demo.traccar.org",
    "pollingIntervalMs": 250
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

## traccarGeofence

```geofenceEntityId.<traccar.traccarGeofence(traccarConfig)>``` is an attribute that retrieves metadata for a specific
geofence from the Traccar server using the provided geofence identifier and configuration.

**Parameters:**
- `geofenceEntityId` *(Text)*: The identifier of the geofence in the Traccar system.
- `traccarConfig` *(Object)*: A JSON object containing the configuration to connect to the Traccar server.

**Example:**

```
"12345".<traccar.traccarGeofence({
    "baseUrl": "https://demo.traccar.org",
    "pollingIntervalMs": 250
})>
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

## traccarGeofence

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

## geofenceGeometry

```geofenceEntityId.<traccar.geofenceGeometry>``` is an attribute that converts geofence metadata into GeoJSON format
for geometric representation. This method uses the environment variable `TRACCAR_CONFIG` to retrieve the
server connection configuration.

**Parameters:**
- `geofenceEntityId` *(Text)*: The identifier of the geofence in the Traccar system.

**Example:**

```
"12345".<traccar.geofenceGeometry>
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

## geofenceGeometry

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
    "pollingIntervalMs": 250
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

## traccarPosition

```deviceEntityId.<traccar.traccarPosition(traccarConfig)>``` is an attribute that retrieves the most recent position of
a specific device from the Traccar server using the provided `traccarConfig` parameter.

**Parameters:**

- `deviceEntityId` *(Text)*: The identifier of the device in the Traccar system.
- `traccarConfig` *(Object)*: A JSON object containing the configuration to connect to the Traccar server.

**Example:**

```
"12345".<traccar.traccarPosition({
    "baseUrl": "https://demo.traccar.org",
    "pollingIntervalMs": 250
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

## traccarPosition

```deviceEntityId.<traccar.traccarPosition>``` is an attribute that retrieves the most recent position of a specific
device from the Traccar server. This method uses the environment variable `TRACCAR_CONFIG` to retrieve the
server connection configuration.

**Parameters:**
- `deviceEntityId` *(Text)*: The identifier of the device in the Traccar system.

**Example:**

```
"12345".<traccar.traccarPosition>
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

