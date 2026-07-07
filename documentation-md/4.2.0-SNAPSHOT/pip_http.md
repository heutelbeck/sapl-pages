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
| `maxResponseBytes` | number | `1048576` | Maximum response body, SSE event, or WebSocket message size in bytes; an oversized payload fails closed to an error value. |
| `secretsKey` | text | (none) | Selects a named credential set from secrets (see below). |

The `secretsKey` field is request metadata and is stripped before the HTTP request is
sent.

Polling cadence is not a request setting. Each call issues one request and emits one
value; the engine re-evaluates the attribute on its own schedule via the
`pollIntervalMs` attribute option (see Functions and Attributes), uniformly with every
streaming attribute.

## Secrets Configuration

HTTP credentials (API keys, bearer tokens, custom headers) are sourced from the
`secrets` section in `pdp.json` and/or from subscription secrets. They are never
embedded directly in policies.

Every credential is a **named** entry that declares both its headers and the
destinations it may be sent to. A policy selects an entry with `secretsKey`; it can
never supply the credential itself, and the entry can never be sent to a URL outside
its `allowedBaseUrls`. There is no unnamed default credential.

### Named Credentials

Each entry lives at `secrets.http.<name>` and has two fields:

| Field | Description |
|---|---|
| `headers` | The credential headers to attach. |
| `allowedBaseUrls` | The destinations the entry may be sent to. Required. An entry that declares none permits nothing. |

For a request with `"secretsKey": "weather-api"`, the PDP resolves
`secrets.http.weather-api` from each secrets source, checks the request `baseUrl`
against that entry's `allowedBaseUrls`, and attaches its `headers` only if the
destination is permitted.

An `allowedBaseUrls` prefix matches by scheme, host, and port, then by path prefix at
a segment boundary. It is a structural match, not a string prefix, so
`https://api.example.com` does not match `https://api.example.com.attacker.com`. The
scheme is part of the match, so plaintext transport is permitted only when the operator
lists an `http`/`ws` prefix explicitly.

### Header Precedence

Header precedence (highest to lowest):
1. **pdpSecrets** -- operator-configured secrets always win
2. **Policy headers** -- non-credential headers specified in the `requestSettings` object
3. **subscriptionSecrets** -- headers from the authorization subscription

When headers from multiple sources use the same header name, the higher-priority
source overwrites the lower-priority value. Each secrets source authorizes the
destination through its own entry, so a credential can only reach a host that source
bound it to.

### Multi-Service Secrets Example

```json
{
  "variables": { },
  "secrets": {
    "http": {
      "weather-api": {
        "allowedBaseUrls": [ "https://api.weather.example" ],
        "headers": { "X-API-Key": "abc123" }
      },
      "internal-api": {
        "allowedBaseUrls": [ "https://api.internal.corp" ],
        "headers": { "Authorization": "Bearer infra-token" }
      }
    }
  }
}
```

With this configuration:
* `{ "secretsKey": "weather-api", "baseUrl": "https://api.weather.example/v1" }` gets
  header `X-API-Key: abc123`.
* `{ "secretsKey": "internal-api", "baseUrl": "https://attacker.example.com" }` is
  rejected. The secret does not permit that host.
* `{ "secretsKey": "internal-api", "baseUrl": "http://api.internal.corp" }` is
  rejected. The allowlist pins `https`.

### Subscription Secrets

Subscription secrets follow the same named structure and can be supplied per
authorization subscription. They have the lowest priority and are overridden by both
policy headers and pdpSecrets headers.

## Security

Credentials never travel in policy text, and a secret only travels to a destination the
operator bound it to. Both rules are enforced fail closed, so a violating request
returns an error instead of leaking the secret.

* A `requestSettings.headers` object that carries a credential header
  (`Authorization` or `Proxy-Authorization`) is rejected. Supply credentials through
  the `secrets` channels instead and select them with `secretsKey`. The `secretsKey`
  field itself is non-sensitive metadata and is safe to use in policies.
* A named secret is attached only when the request `baseUrl` matches that secret's
  `allowedBaseUrls`. A secret with no matching entry, including one that declares none,
  is never sent. Because the match includes the scheme, cleartext transport is an
  explicit operator choice per destination, not a policy decision.

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

## delete

```(TEXT resourceUrl).<delete>``` is an attribute of the resource identified by the ```resourceUrl```.
Performs an HTTP DELETE request with default settings.


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

## patch

```(TEXT resourceUrl).<patch>``` is an attribute of the resource identified by the ```resourceUrl```.
Performs an HTTP PATCH request with default settings.


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



---

## post



---

## post

```(TEXT resourceUrl).<post>``` is an attribute of the resource identified by the ```resourceUrl```.
Performs an HTTP POST request with default settings.


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

## websocket



---

## websocket

```(TEXT resourceUrl).<websocket>``` is an attribute of the resource identified by the ```resourceUrl```.
Connects to a WebSocket with default settings.


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

