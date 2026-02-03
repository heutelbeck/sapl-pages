---
layout: default
title: http
parent: Attribute Finders
grand_parent: SAPL Reference
nav_order: 201
---
# http

This Policy Information Point to get and monitor HTTP based information.

This Policy Information Point provides basic means to source attribute data by consuming
HTTP-based APIs and Websockets.

The Attributes are named according to the HTTP verb, i.e., get, put, delete, post, and patch.
And are available as either environment attributes or attributes of a an URL which semantically
identifies a resource used as the left-hand input parameter of the attribute finders.

This PIP is more technical than domain driven and therefore the attributes are specified by
defining HTTP requests by defining a ```requestSetings``` object, which may contain the following
parameters:
* ```baseUrl```: The starting URL to build the request path.
* ```path```: Path components to be appended to the baseUrl.
* ```urlParameters```: An object with key-value pairs representing the HTTP query parameters to
be embedded in the request URL.
* ```headers```: An object with key-value pairs representing the HTTP headers.
* ```body```: The request body.
* ```accept```: The accepted mime media type.
* ```contentType```: The mime type of the request body.
* ```pollingIntervalMs```: The number of milliseconds between polling the HTTP endpoint. Defaults to 1000ms.
* ```repetitions```: Upper bound for number of repeated requests. Defaults to 0x7fffffffffffffffL.

For the media type ```text/event-stream```, the attribute finder will treat the consumed
endpoint to be sending server-sent events (SSEs) and will not poll the endpoint, but subscribe
to the events emitted by the consumed API.

If the accepted media type is ```application/json```, the PIP will attempt to parse it and map
the response body to a SAPL value. Else, the response body is returned as a text value.

Connection timeout is 10 seconds, read timeout is 30 seconds. Unresponsive endpoints will
result in an error value.

Example:
```json
{
  "baseUrl": "https://example.com",
  "path": "/api/owners",
  "urlParameters": {
                      "age": 5,
                      "sort": "ascending"
                   },
  "headers": {
               "Authorization": "Bearer <token>",
               "If-Modified-Since": "Tue, 19 Jul 2016 12:22:11 UTC"
             },
  "body": "<tag>abc</tag>",
  "accept": "application/json",
  "contentType": "application/xml",
  "pollingIntervalMs": 4500,
  "repetitions": 999
}
```


---

## get



---

## get



---

## put



---

## put



---

## delete



---

## delete



---

## patch



---

## patch



---

## post



---

## post



---

## websocket



---

## websocket



---

