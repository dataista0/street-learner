import React, { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export default function MapView({ streetGeometry, userClick, closestPoint, onMapClick }) {
  const mapRef = useRef(null);
  const streetLayerRef = useRef(null);
  const markerRef = useRef(null);
  const lineLayerRef = useRef(null);

  // Initialize the map only once.
  useEffect(() => {
    if (!mapRef.current) {
      mapRef.current = L.map("map", {
        center: [-34.6037, -58.3816],
        zoom: 13,
      });
      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap &copy; CARTO",
      }).addTo(mapRef.current);
      mapRef.current.on("click", (e) => {
        onMapClick(e.latlng);
      });
    }
  }, [onMapClick]);

  // Draw the street geometry (red lines) after submission.
  useEffect(() => {
    if (!mapRef.current) return;
    if (streetLayerRef.current) {
      mapRef.current.removeLayer(streetLayerRef.current);
      streetLayerRef.current = null;
    }
    if (!streetGeometry) {
      console.log("No street geometry to render yet.");
      return;
    }
    // Unwrap Feature if needed.
    let geom = streetGeometry;
    if (geom.type === "Feature") {
      geom = geom.geometry;
    }
    let lines = [];
    if (geom.type === "LineString") {
      lines = [geom.coordinates];
    } else if (geom.type === "MultiLineString") {
      lines = geom.coordinates;
    } else {
      console.log("Unsupported geometry type:", geom.type);
      return;
    }
    const polylines = lines.map((segment) =>
      segment.map(([lon, lat]) => [lat, lon])
    );
    streetLayerRef.current = L.featureGroup(
      polylines.map((coords) => L.polyline(coords, { color: "red" }))
    ).addTo(mapRef.current);
  }, [streetGeometry]);

  // Draw user marker and dashed line.
  useEffect(() => {
    if (!mapRef.current) return;
    if (markerRef.current) {
      mapRef.current.removeLayer(markerRef.current);
      markerRef.current = null;
    }
    if (lineLayerRef.current) {
      mapRef.current.removeLayer(lineLayerRef.current);
      lineLayerRef.current = null;
    }
    if (userClick) {
      markerRef.current = L.marker(userClick).addTo(mapRef.current);
    }
    if (userClick && closestPoint) {
      lineLayerRef.current = L.polyline([userClick, closestPoint], {
        color: "blue",
        dashArray: "5,5",
      }).addTo(mapRef.current);
    }
  }, [userClick, closestPoint]);

  return <div id="map" className="flex-1"></div>;
}
