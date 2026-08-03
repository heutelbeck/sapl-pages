---
layout: default
title: traccar
parent: Attribute Finders
nav_order: 205
---
# traccar

This policy information point can fetch device positions and geofences from a traccar server.

 This policy information point fetches device positions, geofences, and server
 metadata from operator-defined [Traccar](https://www.traccar.org/) GPS tracking
 servers.

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
 * Without parameter: uses the operator's default server from `TRACCAR_CONFIG`.
 * With `serverName` parameter: selects the named operator server from `TRACCAR_CONFIG`.

 A policy selects a server only by name. It can never supply a `baseUrl` or any
 connection object. The destination host, transport policy, and credentials are
 bound by the operator per server.

 ## Server Configuration

 The Traccar server configuration is a JSON object provided via the `TRACCAR_CONFIG`
 environment variable in `pdp.json`. It holds an operator-defined dictionary of
 named servers and never contains credentials.

 New form (named servers):
 ```json
 {
   "variables": {
     "TRACCAR_CONFIG": {
       "defaultServerName": "prod",
       "servers": [
         { "name": "prod", "baseUrl": "https://traccar.example.com" },
         { "name": "lab",  "baseUrl": "http://localhost:8082", "allowInsecureHttp": true }
       ]
     }
   }
 }
 ```

 Per-server fields:
 * `name` (required): server identifier used for selection and secrets matching.
 * `baseUrl` (required): the base URL of that Traccar server.
 * `allowInsecureHttp` (optional, default `false`): when the `baseUrl` scheme is not
   `https`, the attribute returns an error unless this is `true` for that server.

 Back-compatible single-server form (treated as the implicit default server):
 ```json
 {
   "variables": {
     "TRACCAR_CONFIG": { "baseUrl": "https://traccar.example.com" }
   }
 }
 ```

 Refresh cadence is not a configuration field. Like every streaming attribute, the
 engine re-evaluates this attribute on its own schedule via the `pollIntervalMs`
 attribute option (see Functions and Attributes).

 ## Secrets Configuration

 Credentials are sourced exclusively from the `secrets` section in `pdp.json`. They
 are never read from `TRACCAR_CONFIG` or any policy-visible source.

 The server `name` is the join key. For a server named `prod`, the PDP looks up
 `secrets.traccar.prod`. A flat `secrets.traccar` (no per-server nesting) is used as
 the default server's credentials for back-compatibility.

 Two authentication methods are supported per server:

 **API token authentication (recommended for Traccar 6.x):**
 The token is passed as a `?token=` query parameter on every API request.
 ```json
 { "secrets": { "traccar": { "prod": { "token": "YOUR_API_TOKEN" } } } }
 ```

 **Basic authentication with email and password:**
 An `Authorization: Basic ...` header is added to every API request.
 ```json
 { "secrets": { "traccar": { "prod": { "userName": "email@address.org", "password": "password" } } } }
 ```

 Per-server credential resolution:
 1. If `secrets.traccar.<name>.token` is present, use token authentication.
 2. Otherwise, if `secrets.traccar.<name>.userName` is present, use basic authentication.
 3. If no per-server entry matches, fall back to flat `secrets.traccar`.
 4. If neither is present, the attribute returns an error.

 If both `token` and `userName`/`password` are present, token authentication takes
 precedence.

 ## Attribute Invocation and Resolution

 **Without parameter** (uses the default server from `TRACCAR_CONFIG`):
 ```sapl
 policy "check_server"
 permit
   <traccar.server>.version == "6.7";
 ```

 **With server name** (selects a named operator server):
 ```sapl
 policy "check_position"
 permit
   subject.device.<traccar.position("lab")[{pollIntervalMs: 250}]>;
 ```
 Resolution: looks up the `lab` server in `TRACCAR_CONFIG.servers`, reads credentials
 from `secrets.traccar.lab`, makes the API call. The `[{pollIntervalMs: 250}]`
 attribute option sets how often the engine re-evaluates the attribute and is optional.

 ## Complete pdp.json Example

 ```json
 {
   "variables": {
     "TRACCAR_CONFIG": {
       "defaultServerName": "prod",
       "servers": [
         { "name": "prod", "baseUrl": "https://traccar.example.com" }
       ]
     }
   },
   "secrets": {
     "traccar": { "prod": { "token": "YOUR_API_TOKEN" } }
   }
 }
 ```

 With this configuration:
 * `<traccar.devices>` fetches devices from `traccar.example.com` using the `prod` token.
 * `"42".<traccar.position>` fetches the position of device 42 from the same server.
 * `"42".<traccar.position("prod")>` selects the `prod` server explicitly.

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

```deviceEntityId.<traccar.position(serverName)>``` is an attribute that converts the most recent position of a
specific device from the Traccar server into GeoJSON format.
It selects the named operator server from the `TRACCAR_CONFIG` environment variable.

**Parameters:**
- `deviceEntityId` *(Text)*: The identifier of the device in the Traccar system.
- `serverName` *(Text)*: The name of the operator-configured Traccar server.

**Example:**

```
"12345".<traccar.position("prod")>
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

```<traccar.server(serverName)>``` is an environment attribute that retrieves server metadata from the
[Traccar server endpoint](https://www.traccar.org/api-reference/#tag/Server/paths/~1server/get).
It selects the named operator server from the `TRACCAR_CONFIG` environment variable.

 **Parameters:**

- `serverName` *(Text)*: The name of the operator-configured Traccar server.

**Example:**

```
<traccar.server("prod")>
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

## traccarGeofence

```geofenceEntityId.<traccar.traccarGeofence(serverName)>``` is an attribute that retrieves metadata for a specific
geofence from the Traccar server using the provided geofence identifier.
It selects the named operator server from the `TRACCAR_CONFIG` environment variable.

**Parameters:**
- `geofenceEntityId` *(Text)*: The identifier of the geofence in the Traccar system.
- `serverName` *(Text)*: The name of the operator-configured Traccar server.

**Example:**

```
"12345".<traccar.traccarGeofence("prod")>
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

## traccarPosition

```deviceEntityId.<traccar.traccarPosition(serverName)>``` is an attribute that retrieves the most recent position of
a specific device from the Traccar server.
It selects the named operator server from the `TRACCAR_CONFIG` environment variable.

**Parameters:**

- `deviceEntityId` *(Text)*: The identifier of the device in the Traccar system.
- `serverName` *(Text)*: The name of the operator-configured Traccar server.

**Example:**

```
"12345".<traccar.traccarPosition("prod")>
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

## geofenceGeometry

```geofenceEntityId.<traccar.geofenceGeometry(serverName)>``` is an attribute that converts geofence metadata into
GeoJSON format for geometric representation.
It selects the named operator server from the `TRACCAR_CONFIG` environment variable.

**Parameters:**

- `geofenceEntityId` *(Text)*: The identifier of the geofence in the Traccar system.
- `serverName` *(Text)*: The name of the operator-configured Traccar server.

**Example:**

```
"12345".<traccar.geofenceGeometry("prod")>
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

```<traccar.devices(serverName)>``` is an environment attribute that retrieves a list of devices from the
[Traccar server endpoint](https://www.traccar.org/api-reference/#tag/Devices/paths/~1devices/get).
It selects the named operator server from the `TRACCAR_CONFIG` environment variable.

**Parameters:**

 - `serverName` *(Text)*: The name of the operator-configured Traccar server.

**Example:**

```
<traccar.devices("prod")>
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

## geofences

```<traccar.geofences(serverName)>``` is an environment attribute that retrieves a list of all geofences from
the Traccar server. It selects the named operator server from the `TRACCAR_CONFIG` environment variable.

**Parameters:**

- `serverName` *(Text)*: The name of the operator-configured Traccar server.

**Example:**

```
<traccar.geofences("prod")>
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

## device

```deviceEntityId.<traccar.device(serverName)>``` is an attribute that fetches detailed metadata for a specific device from
the Traccar server.
The device is identified using the `deviceEntityId` parameter, which is the identifier of the device in Traccar,
not the device's `uniqueId` in the database.
It selects the named operator server from the `TRACCAR_CONFIG` environment variable.

 **Parameters:**
 - `deviceEntityId` *(Text)*: The identifier of the device in the Traccar system.
 - `serverName` *(Text)*: The name of the operator-configured Traccar server.

**Example:**

```
"12345".<traccar.device("prod")>
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

