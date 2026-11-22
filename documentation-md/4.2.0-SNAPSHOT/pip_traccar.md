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
* Without parameter: uses the operator's default server from `variables.traccar.servers`.
* With `serverName` parameter: selects the named operator server from `variables.traccar.servers`.

A policy selects a server only by name. It can never supply a `baseUrl` or any
connection object. The destination host, transport policy, and credentials are
bound by the operator per server.

## Selecting a server

A policy selects its default server with `<traccar.server>`, or a named server with `<traccar.devices("depot")>`. Set polling cadence through the broker's `pollIntervalMs` attribute option. The server entry may explicitly enable `allowInsecureHttp` for local development over HTTP. A trust profile requires HTTPS.

## Geofencing Example

```sapl
policy "geofence_check"
permit
  var position = subject.device.<traccar.position>;
  var fence    = subject.geofence.<traccar.geofenceGeometry>;
  geo.contains(fence, position);
```

## Configure TLS trust

The Traccar PIP reads its endpoint from the public PDP configuration. For a private CA, start with the following `pdp.json` settings and install the referenced profile before deployment. Multiple endpoints and PIPs can reference the same profile.

```json
{
  "variables": {
    "traccar": {
      "default": "depot",
      "servers": {
        "depot": {
          "baseUrl": "https://fleet.example.org",
          "trustProfile": "site-ca"
        }
      }
    }
  }
}
```

Read the named server with `<traccar.devices("depot")>`. Without a name, the PIP selects the configured `default`, or the server named `default` if the setting is absent. An unknown server is an error.

The operator supplies a token or a `userName` and `password` pair under the exact server name. Replace the sample token with a Traccar API token.

```json
{
  "traccar": {
    "depot": {
      "token": "REPLACE_WITH_TRACCAR_TOKEN"
    }
  }
}
```

The operator secrets file is `secrets.json` for explicitly enabled cleartext development or `secrets.sealed.json` for sealed deployment. Broker and server credentials are selected only by their configured name.

### Obtain and verify the CA certificate

Ask the administrator of the Traccar server or its HTTPS reverse proxy for its public CA certificate and confirm its SHA-256 fingerprint through your organization's PKI or another authenticated channel. A PEM file contains a `-----BEGIN CERTIFICATE-----` block. If the administrator provides a binary DER certificate, convert it first.

```sh
openssl x509 -inform DER -in issuer.cer -out ca.pem
```

If the CA is already in an approved Java truststore, export its trusted-certificate alias. `keytool` prompts for the store password.

```sh
keytool -exportcert -rfc -keystore truststore.p12 -alias issuing-ca -file ca.pem
```

Check the identity and fingerprint of each certificate before installing it.

```sh
openssl x509 -in ca.pem -noout -subject -issuer -fingerprint -sha256
```

### Install the named profile

In the following command, `pdp.input.json` is the complete configuration with the endpoint settings above. `jq --rawfile` reads the public certificate including its PEM delimiters and line breaks. The resulting `pdp.json` keeps the other configuration fields.

```sh
jq --rawfile ca ca.pem '.variables.tlsTrustProfiles["site-ca"] = {trustedCaPem: $ca, includeDefaultTrustRoots: false}' pdp.input.json > pdp.json
```

| Endpoint setting | Trusted roots |
| --- | --- |
| Omit `trustProfile` | Runtime defaults. |
| Select a profile with `includeDefaultTrustRoots` absent or `false` | Only the CA certificates in that profile. |
| Select a profile with `includeDefaultTrustRoots: true` | Profile certificates and runtime defaults. |

A named profile requires a nonempty `trustedCaPem` string. Each PEM block must contain a public X.509 certificate. The Java client uses the JVM trust configuration by default. The certificate must match the server's hostname. An invalid bundle, an unknown profile, or a profile on a plaintext endpoint prevents the new PDP configuration from taking effect.

For a CA rollover, deploy the old and new CA certificates together as consecutive PEM blocks in the profile. After the service switches certificates, remove the retired CA and deploy the configuration again.


---

## position

```deviceEntityId.<traccar.position(serverName)>``` is an attribute that converts the most recent position of a
specific device from the Traccar server into GeoJSON format.
It selects the named operator server from `variables.traccar.servers`.

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
from the Traccar server into GeoJSON format. This method uses `variables.traccar.servers`
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
It uses `variables.traccar.servers` to connect to the server.

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
It selects the named operator server from `variables.traccar.servers`.

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
the Traccar server using the provided geofence identifier. This method uses the configured servers in
`variables.traccar.servers` to retrieve the server connection configuration.

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
It selects the named operator server from `variables.traccar.servers`.

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
It selects the named operator server from `variables.traccar.servers`.

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
device from the Traccar server. This method uses `variables.traccar.servers` to retrieve the
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
It selects the named operator server from `variables.traccar.servers`.

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
for geometric representation. This method uses `variables.traccar.servers` to retrieve the
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
It uses `variables.traccar.servers` to connect to the server.

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
It selects the named operator server from `variables.traccar.servers`.

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

```<traccar.geofences>``` is an environment attribute that retrieves a list of all geofences from the Traccar server.
It uses `variables.traccar.servers` to connect to the server.

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

```<traccar.geofences(serverName)>``` is an environment attribute that retrieves a list of all geofences from
the Traccar server. It selects the named operator server from `variables.traccar.servers`.

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

## device

```deviceEntityId.<traccar.device>``` is an attribute that fetches detailed metadata for a specific device from
the Traccar server.
The device is identified using the `deviceEntityId` parameter, which is the identifier of the device in Traccar,
not the device's `uniqueId` in the database.
This method uses `variables.traccar.servers` to retrieve the server connection configuration.

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

## device

```deviceEntityId.<traccar.device(serverName)>``` is an attribute that fetches detailed metadata for a specific device from
the Traccar server.
The device is identified using the `deviceEntityId` parameter, which is the identifier of the device in Traccar,
not the device's `uniqueId` in the database.
It selects the named operator server from `variables.traccar.servers`.

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

