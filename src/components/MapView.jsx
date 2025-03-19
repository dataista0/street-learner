import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

function MapView({ currentStreet, userClick, closestPoint, onMapClick, submitted }) {
  const mapRef = useRef(null);
  const streetLayerRef = useRef(null);
  const markerRef = useRef(null);
  const lineLayerRef = useRef(null);

  // Initialize the map only once
  useEffect(() => {
    if (!mapRef.current) {
      mapRef.current = L.map('map', {
        center: [-34.6037, -58.3816],
        zoom: 13,
      });

      // Use label-free tile layer
      L.tileLayer('https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
      }).addTo(mapRef.current);

      mapRef.current.on('click', function(e) {
        onMapClick(e.latlng);
      });
    }
  }, [onMapClick]);

  // Draw the street (red line) only after submission
  useEffect(() => {
    if (!mapRef.current) return;
    if (streetLayerRef.current) {
      mapRef.current.removeLayer(streetLayerRef.current);
      streetLayerRef.current = null;
    }
    if (submitted && currentStreet && currentStreet.coordinates) {
      streetLayerRef.current = L.polyline(currentStreet.coordinates, { color: 'red' }).addTo(mapRef.current);
    }
  }, [currentStreet, submitted]);

  // Update user marker and draw blue line after submission
  useEffect(() => {
    if (!mapRef.current) return;
    if (markerRef.current) {
      mapRef.current.removeLayer(markerRef.current);
    }
    if (userClick) {
      markerRef.current = L.marker(userClick).addTo(mapRef.current);
    }
    if (lineLayerRef.current) {
      mapRef.current.removeLayer(lineLayerRef.current);
      lineLayerRef.current = null;
    }
    if (submitted && userClick && closestPoint) {
      lineLayerRef.current = L.polyline([userClick, closestPoint], { color: 'blue', dashArray: '5,5' }).addTo(mapRef.current);
    }
  }, [userClick, closestPoint, submitted]);

  return (
    <div id="map" className="flex-1"></div>
  );
}

export default MapView;
