---
layout: default
title: http
parent: Attribute Finders
nav_order: 201
---
# http

This Policy Information Point to get and monitor HTTP based information.

This Policy Information Point provides means to source attribute data by consuming
HTTP-based APIs and WebSockets.

## Attribute Invocation

Attributes are named after the HTTP verb: `get`, `post`, `put`, `patch`, `delete`,
and `websocket`. Each is available as an environment attribute or as an attribute of
a resource URL.

| Policy syntax | Meaning |
|---|---|
| `<http.get(request)>` | Environment attribute, HTTP GET with request settings. |
| `"https://api.example.com".<http.get>` | Entity attribute, HTTP GET with default settings. |
| `"https://api.example.com".<http.get(request)>` | Entity attribute, URL used as `baseUrl`, custom settings. |
| `<http.post(request)>` | Environment attribute, HTTP POST. |
| `<http.websocket(request)>` | Environment attribute, WebSocket connection. |

## Request Settings

All attributes take a `requestSettings` object parameter with the following fields:

| Field | Type | Default | Description |
|---|---|---|---|
| `baseUrl` | text | (required) | The base URL for the HTTP request. |
| `path` | text | `""` | Path appended to the base URL. |
| `urlParameters` | object | `{}` | Key-value pairs for HTTP query parameters. |
| `headers` | object | `{}` | Key-value pairs for HTTP request headers. |
| `body` | any | (none) | The request body. |
| `accept` | text | `"application/json"` | Accepted response media type. |
| `contentType` | text | `"application/json"` | Media type of the request body. |
| `pollingIntervalMs` | number | `1000` | Milliseconds between polling requests. |
| `repetitions` | number | `Long.MAX_VALUE` | Upper bound for repeated requests. |
| `secretsKey` | text | (none) | Selects a named credential set from secrets (see below). |

The `secretsKey` field is metadata for credential selection and is stripped before
the HTTP request is sent.

## Secrets Configuration

HTTP credentials (API keys, bearer tokens, custom headers) are sourced from the
`secrets` section in `pdp.json` and/or from subscription secrets. They are never
embedded directly in policies.

Header precedence (highest to lowest):
1. **pdpSecrets** -- operator-configured secrets always win
2. **Policy headers** -- headers specified in the `requestSettings` object
3. **subscriptionSecrets** -- headers from the authorization subscription

When headers from multiple sources use the same header name, the higher-priority
source overwrites the lower-priority value.

### Named Credentials with `secretsKey`

Use the `secretsKey` field in `requestSettings` to select which named credential
set to use. For a request with `"secretsKey": "weather-api"`, the PDP resolves
`secrets.http.weather-api.headers` from each secrets source.

If the `secretsKey` is specified but the named entry does not exist in a given
secrets source, no headers are contributed from that source (fail closed).

### Flat Fallback (no `secretsKey`)

When no `secretsKey` is specified, the PDP falls back to `secrets.http.headers`
as a flat default for each secrets source.

### Resolution Walkthrough

For each secrets source (pdpSecrets and subscriptionSecrets):
1. If `secretsKey` is present, look up `secrets.http.<secretsKey>.headers`.
2. If `secretsKey` is absent, look up `secrets.http.headers`.
3. If neither exists, no headers from that source.

### Multi-Service Secrets Example

```json
{
  "variables": { },
  "secrets": {
    "http": {
      "weather-api": {
        "headers": { "X-API-Key": "abc123" }
      },
      "internal-api": {
        "headers": { "Authorization": "Bearer infra-token" }
      },
      "headers": { "Authorization": "Bearer default-fallback" }
    }
  }
}
```

With this configuration:
* A request with `"secretsKey": "weather-api"` gets header `X-API-Key: abc123`.
* A request with `"secretsKey": "internal-api"` gets header
  `Authorization: Bearer infra-token`.
* A request without `secretsKey` gets header
  `Authorization: Bearer default-fallback`.

### Subscription Secrets

Subscription secrets follow the same structure and can be supplied per authorization
subscription. They have the lowest priority and are overridden by both policy headers
and pdpSecrets headers.

## Security

Avoid embedding credentials directly in policy `headers`. Use the secrets
configuration to keep credentials separate from policy logic. The `secretsKey`
field itself is non-sensitive metadata and is safe to use in policies.

## Media Type Handling

* `application/json`: Response body is parsed and mapped to a SAPL value.
* `text/event-stream`: The PIP subscribes to server-sent events (SSEs) instead
  of polling.
* Other types: Response body is returned as a text value.

## Timeouts

Connection timeout is 10 seconds, read timeout is 30 seconds. Unresponsive
endpoints result in an error value.


---

## get

```(TEXT resourceUrl).<get(OBJECT requestSettings)>``` is an attribute of the resource identified by
the ```resourceUrl```.
This attribute takes a ```requestSettings``` object as a parameter and performs the matching HTTP GET
request and polls it according the the settings.

Example:
```sapl
policy "http example"
permit
  "https://example.com/resources/123".<http.get({ })>.status == "HEALTHY";
```


---

## get

```(TEXT resourceUrl).<get>``` is an attribute of the resource identified by the ```resourceUrl```.
Performs an HTTP GET request with default settings.

Example:
```sapl
policy "http example"
permit
  "https://example.com/resources/123".<http.get>.status == "HEALTHY";
```


---

## get



---

## put

```(TEXT resourceUrl).<put>``` is an attribute of the resource identified by the ```resourceUrl```.
Performs an HTTP PUT request with default settings.


---

## put

```(TEXT resourceUrl).<put(OBJECT requestSettings)>``` is an attribute of the resource identified by
the ```resourceUrl```.
This attribute takes a ```requestSettings``` object as a parameter and performs the matching HTTP PUT
request and polls it according the the settings.

Example:
```sapl
policy "http example"
permit
  "https://example.com/resources/123".<http.put({ "body": "\"test\"" })>.status == "OK";
```


---

## put



---

## delete

```(TEXT resourceUrl).<delete(OBJECT requestSettings)>``` is an attribute of the resource identified by
the ```resourceUrl```.
This attribute takes a ```requestSettings``` object as a parameter and performs the matching HTTP DELETE
request and polls it according the the settings.

Example:
```sapl
policy "http example"
permit
  "https://example.com/resources/123".<http.delete({})> != undefined;
```


---

## delete



---

## delete

```(TEXT resourceUrl).<delete>``` is an attribute of the resource identified by the ```resourceUrl```.
Performs an HTTP DELETE request with default settings.


---

## patch

```(TEXT resourceUrl).<patch(OBJECT requestSettings)>``` is an attribute of the resource identified by
the ```resourceUrl```.
This attribute takes a ```requestSettings``` object as a parameter and performs the matching HTTP PATCH
request and polls it according the the settings.

Example:
```sapl
policy "http example"
permit
  "https://example.com/resources/123".<http.patch({ "body": "\"test\"" })>.status == "OK";
```


---

## patch

```(TEXT resourceUrl).<patch>``` is an attribute of the resource identified by the ```resourceUrl```.
Performs an HTTP PATCH request with default settings.


---

## patch



---

## post



---

## post

```(TEXT resourceUrl).<post(OBJECT requestSettings)>``` is an attribute of the resource identified by
the ```resourceUrl```.
This attribute takes a ```requestSettings``` object as a parameter and performs the matching HTTP POST
request and polls it according the the settings.

Example:
```sapl
policy "http example"
permit
  "https://example.com/resources/123".<http.post({ "body": "\"test\"" })>.status == "OK";
```


---

## post

```(TEXT resourceUrl).<post>``` is an attribute of the resource identified by the ```resourceUrl```.
Performs an HTTP POST request with default settings.


---

## websocket

```(TEXT resourceUrl).<websocket>``` is an attribute of the resource identified by the ```resourceUrl```.
Connects to a WebSocket with default settings.


---

## websocket



---

## websocket

```(TEXT resourceUrl).<websocket(OBJECT requestSettings)>``` is an attribute of the resource identified by
the ```resourceUrl```.
This attribute takes a ```requestSettings``` object as a parameter and connects to a Websocket and emits events
as sent by the server. Upon connection, the ```body``` of the settings is sent to the server.

Example:
```sapl
policy "http example"
permit
  var request = { "body": "message" };
  "https://example.com/status".<http.websocket(request)>.health == "GOOD";
```


---

