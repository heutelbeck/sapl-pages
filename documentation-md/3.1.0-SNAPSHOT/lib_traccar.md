---
layout: default
title: traccar
parent: Functions
grand_parent: SAPL Reference
nav_order: 132
---
# traccar

An utility function library for extracting geometries from Traccar positions and geofences.



---

## traccar.traccarPositionToGeoJSON(traccarPosition)

```traccarPositionToGeoJSON(OBJECT traccarPosition)```: Converts a Traccar position object to a GeoJSON string
representing a Point.
The function expects a Traccar position object as input, which must contain at least the `latitude` and
`longitude` fields.
If the position object also contains an `altitude` field, this will be included in the GeoJSON output.
The output GeoJSON will also include the WGS84 CRS (Coordinate Reference System) as "EPSG:4326".

**Example:**

```sapl
policy "example"
permit
where
    var position = {
        "id": 123,
        "deviceId": 456,
        "type": "position",
        "protocol": "h02",
        "latitude": 37.7749,
        "longitude": -122.4194,
        "altitude": 100.0,
        "speed": 0.0,
        "course": 0.0,
        "accuracy": 5.0,
        "timestamp": "2024-03-08T12:00:00Z",
        "serverTime": "2024-03-08T12:00:05Z",
        "valid": true,
        "attributes": {
          "battery": 95.5,
          "motion": false
          }
    };
    traccar.traccarPositionToGeoJSON(position) == '{"type":"Point","coordinates":[-122.4194,37.7749,100.0],"crs":{"type":"name","properties":{"name":"EPSG:4326"}}}';
```


---

## traccar.traccarGeofenceToGeoJson(geofence)

```traccarGeofenceToGeoJson(OBJECT geofence)```: Converts a Traccar geofence object to a GeoJSON string
representing the geofence's geometry.
The function expects a Traccar geofence object as input, which must contain an `area` field. The `area` field
represents the geofence's geometry in Well-Known Text (WKT) format.
The function will flip the coordinates within the WKT to match the GeoJSON convention of [longitude, latitude].
The output GeoJSON will also include the WGS84 CRS (Coordinate Reference System) as "EPSG:4326".

**Example:**

```sapl
policy "example"
permit
where
     var geofence = {
         "id": 789,
         "name": "Test Geofence",
         "calendarId": 1,
         "description": "A test geofence",
         "area": "POLYGON ((30 10, 40 40, 20 40, 10 20, 30 10))",
         "attributes": {
              "type": "polygon"
          }
       };
     traccar.traccarGeofenceToGeoJson(geofence) == '{"type":"Polygon","coordinates":[[[10.0,30.0],[40.0,40.0],[40.0,20.0],[20.0,10.0],[10.0,30.0]]],"crs":{"type":"name","properties":{"name":"EPSG:4326"}}}';
```


---

