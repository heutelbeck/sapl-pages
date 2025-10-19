---
layout: default
title: geo
parent: Functions
grand_parent: SAPL Reference
nav_order: 108
---
# geo

A function library to manipulate, inspect, and convert geograpihc data.

# Geographic Function Library

The Geographic Function Library provides a rich set of geospatial functions for manipulating, analyzing, and converting geographic data. It is designed to work with GeoJSON as the primary format for representing geographic features.

## Overview
This library allows users to perform:

1. **Geometric Comparisons:** Evaluate spatial relationships between geometries, such as equality, disjointedness, adjacency, and intersection.
2. **Geometric Operations:** Transform geometries through buffering, convex hull computation, unions, intersections, and differences.
3. **Measurement Calculations:** Measure distances, lengths, areas, and geodesic distances between geometries.
4. **Geometry Validation:** Check validity, simplicity, and closure of geometries.
5. **Collection Operations:** Combine, subset, and test membership of geometries within collections.
6. **Unit Conversions:** Convert measurements between units such as miles, yards, and degrees into meters.
7. **Format Conversions:** Parse and convert geographic data between KML, GML, WKT, and GeoJSON formats.

## GeoJSON Format
GeoJSON is a widely used format for encoding geographic data structures. It supports:
- **Point:** Represents a single location (e.g., [longitude, latitude]).
- **LineString:** Represents a sequence of points forming a line.
- **Polygon:** Represents an area bounded by linear rings.
- **MultiPoint, MultiLineString, MultiPolygon:** Collections of points, lines, or polygons.
- **GeometryCollection:** Groups multiple geometries into a single structure.

GeoJSON also includes properties for defining coordinate reference systems, though it defaults to WGS84 (EPSG:4326).

## Use Cases
The library is suitable for:
- Spatial analysis and validation.
- Geographic data transformations and conversions.
- Calculating distances and areas for geospatial features.
- Validating and simplifying complex geometries.
- Building complex policies for geospatial access control.

## Notes
- The library assumes all geometries are in GeoJSON format.
- All functions are schema-validated for correctness.
- Methods operate seamlessly with input data using JSON processing.

For more details, refer to individual function documentation.


---

## geo.gml3ToGeoJSON(Text gml)

```gml3ToGeoJSON(TEXT gml)```: Converts GML 3 data to GeoJSON format.

**Inputs:**

- `gml`: A string containing GML 3 data.

**Output:**
- Returns a GeoJSON object representing the converted GML 3 data.

**Example:**
```sapl
policy "example"
permit
where
    var gmlData = "<gml:Point><gml:coordinates>10,20</gml:coordinates></gml:Point>";
    geo.gml3ToGeoJSON(gmlData) == { "type": "Point", "coordinates": [10, 20] };
```

**Notes:**

- Designed for compatibility with GML 3 formatted data.


---

## geo.isSimple(Schema|JsonObject geometry)

```isSimple(GEOMETRY geometry)```:
Tests whether a geometry is simple, meaning it has no self-intersections or anomalies.

**Inputs:**

- `geometry`: A geometry object in GeoJSON format.

**Output:**

- Returns `true` if the geometry is simple.
- Returns `false` otherwise.

**Example:**

```sapl
policy "example"
permit
where
    var line = { "type": "LineString", "coordinates": [[0,0], [1,1], [1,0], [0,0]] };
    geo.isSimple(line) == false;
```

**Notes:**

- Use this function to validate geometry simplicity, especially for topological checks.


---

## geo.overlaps(Schema|JsonObject thisGeometry, Schema|JsonObject thatGeometry)

```overlaps(GEOMETRY thisGeometry, GEOMETRY thatGeometry)```:
Tests whether two geometries overlap, meaning they share some but not all interior points.

**Inputs:**

- `thisGeometry`: A geometry object in GeoJSON format.
- `thatGeometry`: Another geometry object in GeoJSON format.

**Output:**

- Returns `true` if the geometries overlap and share some but not all points.
- Returns `false` otherwise.

**Example:**

```sapl
policy "example"
permit
where
    var polygon1 = { "type": "Polygon", "coordinates": [[[0,0], [0,10], [10,10], [10,0], [0,0]]] };
    var polygon2 = { "type": "Polygon", "coordinates": [[[5,5], [5,15], [15,15], [15,5], [5,5]]] };
    geo.overlaps(polygon1, polygon2) == true;
```

**Notes:**

- Use this function to check partial overlap without full containment.


---

## geo.symDifference(Schema|JsonObject thisGeometry, Schema|JsonObject thatGeometry)

```symDifference(GEOMETRY thisGeometry, GEOMETRY thatGeometry)```: Computes the symmetric difference between two geometries.

**Inputs:**

- `thisGeometry`: A geometry object in GeoJSON format.
- `thatGeometry`: Another geometry object in GeoJSON format.

**Output:**

- Returns a geometry representing the parts of both geometries that do not intersect.

**Example:**

```sapl
policy "example"
permit
where
    var polygon1 = { "type": "Polygon", "coordinates": [[[0,0], [0,10], [10,10], [10,0], [0,0]]] };
    var polygon2 = { "type": "Polygon", "coordinates": [[[5,5], [5,15], [15,15], [15,5], [5,5]]] };
    geo.symDifference(polygon1, polygon2) == { "type": "MultiPolygon", "coordinates": [[[[0,0], [0,10], [10,10], [10,0], [0,0]]], [[[5,5], [5,15], [15,15], [15,5], [5,5]]]] };
```

**Notes:**

- Computes areas that are exclusive to each input geometry.
- Useful for highlighting non-overlapping regions.


---

## geo.gml2ToGeoJSON(Text gml)

```gml2ToGeoJSON(TEXT gml)```: Converts GML 2 data to GeoJSON format.

**Inputs:**

- `gml`: A string containing GML 2 data.

**Output:**

- Returns a GeoJSON object representing the converted GML 2 data.

**Example:**

```sapl
policy "example"
permit
where
    var gmlData = "<gml:Point><gml:coordinates>10,20</gml:coordinates></gml:Point>";
    geo.gml2ToGeoJSON(gmlData) == { "type": "Point", "coordinates": [10, 20] };
```

**Notes:**

- Designed for compatibility with GML 2 formatted data.


---

## geo.centroid(Schema|JsonObject geometry)

```centroid(GEOMETRY geometry)```: Returns the geometric center (centroid) of the geometry.

**Inputs:**

- `geometry`: A geometry object in GeoJSON format.

**Output:**

- Returns a Point geometry representing the centroid.

**Example:**

```sapl
policy "example"
permit
where
    var polygon = { "type": "Polygon", "coordinates": [[[0,0], [0,10], [10,10], [10,0], [0,0]]] };
    geo.centroid(polygon) == { "type": "Point", "coordinates": [5, 5] };
```

**Notes:**

- The centroid is the center of mass for the geometry.
- For multi-part geometries, the result considers all components.


---

## geo.isWithinDistance(Schema|JsonObject thisGeometry, Schema|JsonObject thatGeometry, Number distance)

```isWithinDistance(GEOMETRY thisGeometry, GEOMETRY thatGeometry, DOUBLE distance)```:
Tests whether the distance between two geometries is within a specified value.

**Inputs:**

- `thisGeometry`: A geometry object in GeoJSON format.
- `thatGeometry`: Another geometry object in GeoJSON format.
- `distance`: A numeric value specifying the distance threshold.

**Output:**

- Returns `true` if the distance between the geometries is less than or equal to `distance`.
- Returns `false` otherwise.

**Example:**

```sapl
policy "example"
permit
where
    var point1 = { "type": "Point", "coordinates": [0, 0] };
    var point2 = { "type": "Point", "coordinates": [3, 4] };
    geo.isWithinDistance(point1, point2, 5.0) == true;
```

**Notes:**

- Use this function for proximity checks between geometries.


---

## geo.length(Schema|JsonObject geometry)

```length(GEOMETRY geometry)```: Returns the length of a geometry, including perimeter for polygons.

**Inputs:**

- `geometry`: A geometry object in GeoJSON format.

**Output:**

- Returns a numeric value representing the length.

**Example:**

```sapl
policy "example"
permit
where
    var line = { "type": "LineString", "coordinates": [[0,0], [0,10], [10,10], [10,0], [0,0]] };
    geo.length(line) == 40.0;
```

**Notes:**

- Measures the total length or perimeter based on input geometry.


---

## geo.intersection(Schema|JsonObject thisGeometry, Schema|JsonObject thatGeometry)

```intersection(GEOMETRY thisGeometry, GEOMETRY thatGeometry)```: Returns the intersection of the geometries.

**Inputs:**

- `geometryThis`: A geometry object in GeoJSON format.
- `geometryThat`: Another geometry object in GeoJSON format.

**Output:**

- Returns a geometry representing the common area of the inputs.

**Example:**

```sapl
policy "example"
permit
where
    var polygon1 = { "type": "Polygon", "coordinates": [[[0,0], [0,10], [10,10], [10,0], [0,0]]] };
    var polygon2 = { "type": "Polygon", "coordinates": [[[5,5], [5,15], [15,15], [15,5], [5,5]]] };
    geo.intersection(polygon1, polygon2) == { "type": "Polygon", "coordinates": [[[5,5], [5,10], [10,10], [10,5], [5,5]]] };
```

**Notes:**

- Computes the overlap between geometries.
- Useful for finding shared areas.


---

## geo.flattenGeometryBag(Array arrayOfGeometries)

```flattenGeometryBag(ARRAY geometriesArray)```: Flattens an array of geometries into a single geometry collection.

**Inputs:**

- `geometriesArray`: An array of geometry objects in GeoJSON format.

**Output:**

- Returns a geometry collection containing all geometries from the input array.

**Example:**

```sapl
policy "example"
permit
where
    var geometries = [
        { "type": "Point", "coordinates": [0, 0] },
        { "type": "Point", "coordinates": [1, 1] }
    ];
    geo.flattenGeometryBag(geometries) == { "type": "GeometryCollection", "geometries": [
        { "type": "Point", "coordinates": [0, 0] },
        { "type": "Point", "coordinates": [1, 1] }
    ] };
```

**Notes:**

- Useful for combining geometries from arrays into collections.


---

## geo.intersects(Schema|JsonObject thisGeometry, Schema|JsonObject thatGeometry)

```intersects(GEOMETRY thisGeometry, GEOMETRY thatGeometry)```:
Tests whether two geometries intersect, meaning they share at least one point.

**Inputs:**

- `thisGeometry`: A geometry object in GeoJSON format.
- `thatGeometry`: Another geometry object in GeoJSON format.

**Output:**

- Returns `true` if the geometries intersect at any point.
- Returns `false` otherwise.

**Example:**

```sapl
policy "example"
permit
where
    var line1 = { "type": "LineString", "coordinates": [[0,0], [10,10]] };
    var line2 = { "type": "LineString", "coordinates": [[0,10], [10,0]] };
    geo.intersects(line1, line2) == true;
```

**Notes:**

- Use this function to verify if geometries have any spatial overlap.


---

## geo.disjoint(Schema|JsonObject thisGeometry, Schema|JsonObject thatGeometry)

```disjoint(GEOMETRY thisGeometry, GEOMETRY thatGeometry)```:
Tests whether two geometries are disjoint, meaning they do not intersect.

**Inputs:**

- `thisGeometry`: A geometry object in GeoJSON format.
- `thatGeometry`: Another geometry object in GeoJSON format.

**Output:**

- Returns `true` if the geometries do not share any points.
- Returns `false` if they intersect at any point.

**Example:**

```sapl
policy "example"
permit
where
    var polygon = { "type": "Polygon", "coordinates": [[[0,0], [0,10], [10,10], [10,0], [0,0]]] };
    var point = { "type": "Point", "coordinates": [20.0, 20.0] };
    geo.disjoint(polygon, point) == true;
```

**Notes:**

- Disjoint geometries have no spatial overlap.
- Use this function to confirm spatial separation between geometries.


---

## geo.equalsExact(Schema|JsonObject thisGeometry, Schema|JsonObject thatGeometry)

```equalsExact(GEOMETRY thisGeometry, GEOMETRY thatGeometry)```:
Tests whether two geometries are exactly equal in terms of their structure and vertex values.

**Inputs:**

- `thisGeometry`: A geometry object in GeoJSON format.
- `thatGeometry`: Another geometry object in GeoJSON format.

**Output:**

- Returns `true` if the geometries have identical structures and coordinate values in the same order.
- Returns `false` otherwise.

**Example:**

```sapl
policy "example"
permit
where
    var point1 = { "type": "Point", "coordinates": [10.0, 20.0] };
    var point2 = { "type": "Point", "coordinates": [10.0, 20.0] };
    geo.equalsExact(point1, point2) == true;
```

**Notes:**

- Only exact matches are considered equal; differences in precision or coordinate order will result in `false`.
- Suitable for testing identical geometries in scenarios requiring strict equality.


---

## geo.geometryBag(Schema|JsonObject geometryValues...)

```geometryBag(GEOMETRY... geometries)```: Combines multiple geometries into a single geometry collection.

**Inputs:**

- `geometries`: A variable number of geometry objects in GeoJSON format.

**Output:**

- Returns a geometry collection containing all input geometries.

**Example:**

```sapl
policy "example"
permit
where
    var point1 = { "type": "Point", "coordinates": [0, 0] };
    var point2 = { "type": "Point", "coordinates": [1, 1] };
    geo.geometryBag(point1, point2) == { "type": "GeometryCollection", "geometries": [
        { "type": "Point", "coordinates": [0, 0] },
        { "type": "Point", "coordinates": [1, 1] }
    ] };
```

**Notes:**

- Useful for grouping geometries into collections.


---

## geo.difference(Schema|JsonObject thisGeometry, Schema|JsonObject thatGeometry)

```difference(GEOMETRY thisGeometry, GEOMETRY thatGeometry)```: Computes the difference between two geometries.

**Inputs:**

- `thisGeometry`: A geometry object in GeoJSON format.
- `thatGeometry`: Another geometry object in GeoJSON format.

**Output:**

- Returns a geometry representing the part of `thisGeometry` that does not intersect with `thatGeometry`.

**Example:**

```sapl
policy "example"
permit
where
    var polygon1 = { "type": "Polygon", "coordinates": [[[0,0], [0,10], [10,10], [10,0], [0,0]]] };
    var polygon2 = { "type": "Polygon", "coordinates": [[[5,5], [5,15], [15,15], [15,5], [5,5]]] };
    geo.difference(polygon1, polygon2) == { "type": "Polygon", "coordinates": [[[0,0], [0,10], [10,10], [10,0], [0,0]]] };
```

**Notes:**

- Computes the geometric difference by subtracting overlapping areas.
- Useful for isolating non-intersecting regions.


---

## geo.isValid(Schema|JsonObject jsonGeometry)

```isValid(GEOMETRY geometry)```:
Tests whether a geometry is valid based on topological rules.

**Inputs:**

- `geometry`: A geometry object in GeoJSON format.

**Output:**
- Returns `true` if the geometry is valid.
- Returns `false` otherwise.

**Example:**

```sapl
policy "example"
permit
where
    var polygon = { "type": "Polygon", "coordinates": [[[0,0], [0,10], [10,10], [10,0], [0,0]]] };
    geo.isValid(polygon) == true;
```

**Notes:**

- A valid geometry adheres to topological constraints such as no self-intersections.


---

## geo.touches(Schema|JsonObject thisGeometry, Schema|JsonObject thatGeometry)

```touches(GEOMETRY thisGeometry, GEOMETRY thatGeometry)```:
Tests whether two geometries touch at their boundaries but do not overlap.

**Inputs:**

- `thisGeometry`: A geometry object in GeoJSON format.
- `thatGeometry`: Another geometry object in GeoJSON format.

**Output:**

- Returns `true` if the geometries share at least one boundary point but no interior points.
- Returns `false` otherwise.

**Example:**

```sapl
policy "example"
permit
where
    var polygon1 = { "type": "Polygon", "coordinates": [[[0,0], [0,10], [10,10], [10,0], [0,0]]] };
    var polygon2 = { "type": "Polygon", "coordinates": [[[10,0], [10,10], [20,10], [20,0], [10,0]]] };
    geo.touches(polygon1, polygon2) == true;
```

**Notes:**

- Use this function to determine adjacency without overlap.


---

## geo.crosses(Schema|JsonObject thisGeometry, Schema|JsonObject thatGeometry)

```crosses(GEOMETRY thisGeometry, GEOMETRY thatGeometry)```:
Tests whether two geometries cross each other, meaning they intersect and share interior points without fully containing one another.

**Inputs:**

- `thisGeometry`: A geometry object in GeoJSON format.
- `thatGeometry`: Another geometry object in GeoJSON format.

**Output:**

- Returns `true` if the geometries intersect and cross each other at one or more points but do not contain one another.
- Returns `false` otherwise.

**Example:**

```sapl
policy "example"
permit
where
    var line1 = { "type": "LineString", "coordinates": [[0,0], [10,10]] };
    var line2 = { "type": "LineString", "coordinates": [[0,10], [10,0]] };
    geo.crosses(line1, line2) == true;
```

**Notes:**
- Suitable for checking intersections between lines or other geometries that share some interior points.
- Does not apply if one geometry fully contains the other.


---

## geo.bagSize(Schema|JsonObject jsonGeometry)

```bagSize(GEOMETRYCOLLECTION geometryCollection)```: Returns the number of geometries in a collection.

**Inputs:**

- `geometryCollection`: A geometry collection in GeoJSON format.

**Output:**

- Returns an integer representing the number of geometries in the collection.

**Example:**

```sapl
policy "example"
permit
where
    var collection = { "type": "GeometryCollection", "geometries": [
        { "type": "Point", "coordinates": [0, 0] },
        { "type": "Point", "coordinates": [1, 1] }
    ] };
    geo.bagSize(collection) == 2;
```

**Notes:**

- Useful for evaluating collection size.


---

## geo.milesToMeter(Number value)

```milesToMeter(NUMBER value)```: Converts a distance in miles to meters.

**Inputs:**

- `value`: A numeric value representing distance in miles.

**Output:**

- Returns a numeric value representing the converted distance in meters.

**Example:**

```sapl
policy "example"
permit
where
    geo.milesToMeter(1.0) == 1609.34;
```

**Notes:**

- Useful for converting mile-based measurements to meters for calculations.


---

## geo.wktToGeoJSON(Text wkt)

```wktToGeoJSON(TEXT wkt)```: Converts WKT data to GeoJSON format.

**Inputs:**

- `wkt`: A string containing Well-Known Text (WKT) geometry.

**Output:**

- Returns a GeoJSON object representing the converted WKT data.

**Example:**

```sapl
policy "example"
permit
where
    var wktData = "POINT(10 20)";
    geo.wktToGeoJSON(wktData) == { "type": "Point", "coordinates": [10, 20] };
```

**Notes:**

- Useful for converting WKT geometries into GeoJSON for processing.


---

## geo.subset(Schema|JsonObject thisGeometryCollection, Schema|JsonObject thatGeometryCollection)

```subset(GEOMETRYCOLLECTION thisGeometryCollection, GEOMETRYCOLLECTION thatGeometryCollection)```:
Checks if one geometry collection is a subset of another.

**Inputs:**

- `thisGeometryCollection`: A geometry collection in GeoJSON format.
- `thatGeometryCollection`: Another geometry collection in GeoJSON format.

**Output:**

- Returns `true` if `GEOMETRYCOLLECTION1` is entirely contained within `GEOMETRYCOLLECTION2`.
- Returns `false` otherwise.

**Example:**

```sapl
policy "example"
permit
where
    var collection1 = { "type": "GeometryCollection", "geometries": [
        { "type": "Point", "coordinates": [0, 0] }
    ] };
    var collection2 = { "type": "GeometryCollection", "geometries": [
        { "type": "Point", "coordinates": [0, 0] },
        { "type": "Point", "coordinates": [1, 1] }
    ] };
    geo.subset(collection1, collection2) == true;
```

**Notes:**

- Suitable for verifying hierarchical relationships between geometry collections.


---

## geo.geodesicDistance(Schema|JsonObject thisGeometry, Schema|JsonObject thatGeometry)

```geodesicDistance(GEOMETRY thisGeometry, GEOMETRY thatGeometry)```: Returns the shortest geodesic distance between two
geometries in meters. This method uses WGS84 as its reference coordinate system.

**Inputs:**

- `thisGeometry`: A geometry object in GeoJSON format.
- `thatGeometry`: Another geometry object in GeoJSON format.

**Output:**
- Returns a numeric value representing the geodesic distance in meters.

**Example:**

```sapl
policy "example"
permit
where
    var point1 = { "type": "Point", "coordinates": [0, 0] };
    var point2 = { "type": "Point", "coordinates": [0.001, 0.001] };
    geo.geoDistance(point1, point2) <= 157.25;
```

**Notes:**

- Uses geodesic calculations suitable for geographic coordinates.
- Ideal for large-scale or global distance computations.


---

## geo.boundary(Schema|JsonObject geometry)

```boundary(GEOMETRY geometry)```: Returns the boundary of a geometry.

**Inputs:**

- `geometry`: A geometry object in GeoJSON format.

**Output:**

- Returns a geometry representing the boundary.

**Example:**

```sapl
policy "example"
permit
where
    var polygon = { "type": "Polygon", "coordinates": [[[0,0], [0,10], [10,10], [10,0], [0,0]]] };
    geo.boundary(polygon) == { "type": "LineString", "coordinates": [[0,0], [0,10], [10,10], [10,0], [0,0]] };
```

**Notes:**

- Returns the outer boundary for polygonal geometries.
- Returns line segments or points depending on input geometry type.


---

## geo.oneAndOnly(Schema|JsonObject jsonGeometryCollection)

```oneAndOnly(GEOMETRYCOLLECTION geometryCollection)```: Returns the only geometry in a collection if it contains exactly one geometry.

**Inputs:**

- `geometryCollection`: A geometry collection in GeoJSON format.

**Output:**

- Returns the single geometry if the collection contains exactly one geometry.
- Returns an error otherwise.

**Example:**

```sapl
policy "example"
permit
where
    var collection = { "type": "GeometryCollection", "geometries": [
        { "type": "Point", "coordinates": [0, 0] }
    ] };
    geo.oneAndOnly(collection) == { "type": "Point", "coordinates": [0, 0] };
```

**Notes:**

- Ensures uniqueness of geometry within a collection.
- Returns an error if more than one geometry is present.


---

## geo.isClosed(Schema|JsonObject geometry)

```isClosed(GEOMETRY geometry)```:
Tests whether a geometry like a LineString is closed, meaning it starts and ends at the same point.

**Inputs:**

- `geometry`: A geometry object in GeoJSON format.

**Output:**

- Returns `true` if the geometry is closed.
- Returns `false` otherwise.

**Example:**

```sapl
policy "example"
permit
where
    var ring = { "type": "LineString", "coordinates": [[0,0], [0,10], [10,10], [10,0], [0,0]] };
    geo.isClosed(ring) == true;
```

**Notes:**

- Only applicable to LineStrings and other linear geometries.
- Use to ensure rings or loops are adequately closed.


---

## geo.within(Schema|JsonObject thisGeometry, Schema|JsonObject thatGeometry)

```within(GEOMETRY thisGeometry, GEOMETRY thatGeometry)```:
Tests whether one geometry is completely within another geometry.

**Inputs:**

- `thisGeometry`: A geometry object in GeoJSON format.
- `thatGeometry`: Another geometry object in GeoJSON format.

**Output:**

- Returns `true` if every point of `thisGeometry` is inside `thatGeometry`.
- Returns `false` otherwise.

**Example:**

```
policy "example"
permit
where
    var point = { "type": "Point", "coordinates": [5, 5] };
    var polygon = { "type": "Polygon", "coordinates": [[[0,0], [0,10], [10,10], [10,0], [0,0]]] };
    geo.within(point, polygon) == true;
```

**Notes:**

- Useful for containment checks where the geometry must be fully enclosed.


---

## geo.geometryIsIn(Schema|JsonObject jsonGeometry, Schema|JsonObject jsonGeometryCollection)

```geometryIsIn(GEOMETRY geometry, GEOMETRYCOLLECTION geometryCollection)```: Checks if a geometry is contained within a collection.

**Inputs:**

- `geometry`: A geometry object in GeoJSON format.
- `geometryCollection`: A geometry collection in GeoJSON format.

**Output:**

- Returns `true` if the geometry is in the collection.
- Returns `false` otherwise.

**Example:**

```sapl
policy "example"
permit
where
    var point = { "type": "Point", "coordinates": [0, 0] };
    var collection = { "type": "GeometryCollection", "geometries": [
        { "type": "Point", "coordinates": [0, 0] }
    ] };
    geo.geometryIsIn(point, collection) == true;
```

**Notes:**

- Checks for the existence of a specific geometry within a collection.


---

## geo.geoDistance(Schema|JsonObject jsonGeometryThis, Schema|JsonObject jsonGeometryThat, coordinateReferenceSystem)

```geodesicDistance(GEOMETRY thisGeometry, GEOMETRY thatGeometry, TEXT coordinateReferenceSystem)```:
Returns the shortest geodesic distance between two geometries in meters.

**Inputs:**

- `thisGeometry`: A geometry object in GeoJSON format.
- `thatGeometry`: Another geometry object in GeoJSON format.
- `coordinateReferenceSystem`: A coordinate system, such as WGS84, i.e. `"EPSG:4326"`.
  Also see: (https://epsg.io).

**Output:**

- Returns a numeric value representing the geodesic distance in meters.

**Example:**

```sapl
policy "example"
permit
where
    var point1 = { "type": "Point", "coordinates": [0, 0] };
    var point2 = { "type": "Point", "coordinates": [0.001, 0.001] };
    geo.geoDistance(point1, point2, "EPSG:4326") <= 157.25;
```

**Notes:**

- Uses geodesic calculations suitable for geographic coordinates.
- Ideal for large-scale or global distance computations.


---

## geo.contains(Schema|JsonObject thisGeometry, Schema|JsonObject thatGeometry)

```contains(GEOMETRY thisGeometry, GEOMETRY thatGeometry)```:
Tests whether one geometry completely contains another geometry.

**Inputs:**

- `thisGeometry`: A geometry object in GeoJSON format.
- `thatGeometry`: Another geometry object in GeoJSON format.

**Output:**

- Returns `true` if `thisGeometry` fully contains `thatGeometry`.
- Returns `false` otherwise.

**Example:**

```
policy "example"
permit
where
    var polygon = { "type": "Polygon", "coordinates": [[[0,0], [0,10], [10,10], [10,0], [0,0]]] };
    var point = { "type": "Point", "coordinates": [5, 5] };
    geo.contains(polygon, point) == true;
```

**Notes:**

- Suitable for verifying if a geometry encompasses another geometry entirely.


---

## geo.atLeastOneMemberOf(Schema|JsonObject thisGeometryCollection, JsonObject thatGeometryCollection)

```atLeastOneMemberOf(GEOMETRYCOLLECTION thisGeometryCollection, GEOMETRYCOLLECTION thatGeometryCollection)```: Checks if at least one geometry in the first collection is present in the second collection.

**Inputs:**

- `thisGeometryCollection`: A geometry collection in GeoJSON format.
- `thatGeometryCollection`: Another geometry collection in GeoJSON format.

**Output:**

- Returns `true` if at least one geometry from `thisGeometryCollection` exists in `thatGeometryCollection`.
- Returns `false` otherwise.

**Example:**

```sapl
policy "example"
permit
where
    var collection1 = { "type": "GeometryCollection", "geometries": [
        { "type": "Point", "coordinates": [0, 0] }
    ] };
    var collection2 = { "type": "GeometryCollection", "geometries": [
        { "type": "Point", "coordinates": [1, 1] },
        { "type": "Point", "coordinates": [0, 0] }
    ] };
    geo.atLeastOneMemberOf(collection1, collection2) == true;
```

**Notes:**

- Checks for partial membership between geometry collections.


---

## geo.convexHull(Schema|JsonObject geometry)

```convexHull(GEOMETRY geometry)```: Returns the convex hull of the geometry.

**Inputs:**

- `geometry`: A geometry object in GeoJSON format.

**Output:**

- Returns a Polygon geometry representing the convex hull.

**Example:**

```sapl
policy "example"
permit
where
    var points = { "type": "MultiPoint", "coordinates": [[0,0], [0,10], [10,10], [10,0]] };
    geo.convexHull(points) == { "type": "Polygon", "coordinates": [[[0,0], [0,10], [10,10], [10,0], [0,0]]] };
```

**Notes:**

- Computes the smallest convex polygon containing all points.
- Useful for simplifying geometries or bounding datasets.


---

## geo.distance(Schema|JsonObject thisGeometry, Schema|JsonObject thatGeometry)

```distance(GEOMETRY thisGeometry, GEOMETRY thatGeometry)```: Returns the shortest planar distance between
two geometries.

**Inputs:**

- `thisGeometry`: A geometry object in GeoJSON format.
- `thatGeometry`: Another geometry object in GeoJSON format.

**Output:**

- Returns a numeric value representing the distance.

**Example:**

```sapl
policy "example"
permit
where
    var point1 = { "type": "Point", "coordinates": [0, 0] };
    var point2 = { "type": "Point", "coordinates": [3, 4] };
    geo.distance(point1, point2) == 5.0;
```

**Notes:**

- The distance is calculated based on the coordinate units.
- Suitable for planar (non-geodesic) distance calculations.


---

## geo.union(Schema|JsonObject geometries...)

```union(GEOMETRY... geometries)```: Returns the union of an arbritrary number of geometries.

**Inputs:**

- `geometries`: A variable number of arguments of geometry objects in GeoJSON format.

**Output:**

- Returns a geometry representing the union of inputs.

**Example:**

```sapl
policy "example"
permit
where
    var polygon1 = { "type": "Polygon", "coordinates": [[[0,0], [0,10], [10,10], [10,0], [0,0]]] };
    var polygon2 = { "type": "Polygon", "coordinates": [[[5,5], [5,15], [15,15], [15,5], [5,5]]] };
    geo.union(polygon1, polygon2) == { "type": "Polygon", "coordinates": [[[0,0], [0,10], [5,10], [5,15], [15,15], [15,5], [10,5], [10,0], [0,0]]] };
```

**Notes:**

- Merges overlapping areas of geometries.
- Accepts geometry collections as input.


---

## geo.isWithinGeodesicDistance(Schema|JsonObject thisGeometry, Schema|JsonObject thatGeometry, Number distance)

```isWithinGeodesicDistance(GEOMETRY thisGeometry, GEOMETRY thatGeometry, DOUBLE distance)```:
Tests whether two geometries are within a specified geodesic (earth surface) distance.

**Inputs:**

- `thisGeometry`: A geometry object in GeoJSON format.
- `thatGeometry`: Another geometry object in GeoJSON format.
- `distance`: A numeric value specifying the geodesic distance threshold (meters).

**Output:**

- Returns `true` if the geometries are within the specified geodesic distance.
- Returns `false` otherwise.

**Example:**

```sapl
policy "example"
permit
where
    var point1 = { "type": "Point", "coordinates": [0, 0] };
    var point2 = { "type": "Point", "coordinates": [0.001, 0.001] };
    geo.isWithinGeoDistance(point1, point2, 150) == true;
```

**Notes:**

- Suitable for geodesic distance checks, especially for large-scale geographic data.


---

## geo.area(Schema|JsonObject geometry)

```area(GEOMETRY geometry)```: Returns the area of a geometry.

**Inputs:**

- `geometry`: A geometry object in GeoJSON format.

**Output:**

- Returns a numeric value representing the area.

**Example:**

```sapl
policy "example"
permit
where
    var polygon = { "type": "Polygon", "coordinates": [[[0,0], [0,10], [10,10], [10,0], [0,0]]] };
    geo.area(polygon) == 100.0;
```

**Notes:**

- Computes the area for polygonal geometries.
- Units depend on coordinate system or projection used.


---

## geo.yardToMeter(Number value)

```yardToMeter(NUMBER value)```: Converts a distance in yards to meters.

**Inputs:**

- `value`: A numeric value representing distance in yards.

**Output:**

- Returns a numeric value representing the converted distance in meters.

**Example:**

```sapl
policy "example"
permit
where
    geo.yardToMeter(1.0) == 0.9144;
```

**Notes:**

- Converts yard-based measurements to meters for compatibility in geospatial calculations.


---

## geo.degreeToMeter(Number value)

```degreeToMeter(NUMBER value)```: Converts a distance in degrees to meters.

**Inputs:**

- `value`: A numeric value representing distance in degrees.

**Output:**

- Returns a numeric value representing the converted distance in meters.

**Example:**

```sapl
policy "example"
permit
where
    geo.degreeToMeter(1.0) == 111319.9;
```

**Notes:**

- Converts degree-based distances to meters, useful for geographic coordinate transformations.


---

## geo.kmlToGeoJSON(Text kml)

```kmlToGeoJSON(TEXT kml)```: Converts KML data to GeoJSON format.

**Inputs:**

- `kml`: A string containing KML data.

**Output:**

- Returns a GeoJSON object representing the converted KML data.

**Example:**

```sapl
policy "example"
permit
where
    var kmlData = "<kml><Placemark><Point><coordinates>10,20</coordinates></Point></Placemark></kml>";
    geo.kmlToGeoJSON(kmlData) == { "type": "Point", "coordinates": [10, 20] };
```

**Notes:**

- Use this function to transform KML data into a GeoJSON format for compatibility.


---

## geo.buffer(Schema|JsonObject geometry, Number bufferWidth)

```buffer(GEOMETRY geometry, NUMBER bufferWidth)```: Adds a buffer area of BUFFER_WIDTH around GEOMETRY and returns
the new geometry.

**Inputs:**

- `geometry`: A geometry object in GeoJSON format.
- `bufferWidth`: A numeric value specifying the width of the buffer (same units as coordinates).

**Output:**

- Returns a new geometry representing the buffered area.

**Example:**

```sapl
policy "example"
permit
where
    var point = { "type": "Point", "coordinates": [0, 0] };
    geo.buffer(point, 10.0) == { "type": "Polygon", "coordinates": [[[10,0], [0,10], [-10,0], [0,-10], [10,0]]] };
```

**Notes:**

- Useful for creating buffer zones around points, lines, or polygons.


---

