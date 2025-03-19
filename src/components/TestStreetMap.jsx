import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fetch geometry for a given street name.
async function getStreetGeometry(streetName) {
  console.log(`Fetching geometry for: ${streetName}`);
  const overpassUrl = "https://overpass-api.de/api/interpreter";
  const query = `
    [out:json];
    area[name="Ciudad Autónoma de Buenos Aires"]->.searchArea;
    way(area.searchArea)["name"="${streetName}"];
    out geom;
  `;
  const res = await fetch(overpassUrl, {
    method: "POST",
    body: query,
  });
  if (!res.ok) {
    throw new Error(`Overpass responded with HTTP ${res.status}`);
  }
  const data = await res.json();
  console.log("Overpass response:", data);

  const ways = data.elements.filter(el => el.type === "way" && el.geometry);
  if (!ways.length) {
    throw new Error(`No geometry found for street: ${streetName}`);
  }
  const multiCoords = ways.map(way =>
    way.geometry.map(pt => [pt.lon, pt.lat])
  );
  return { type: "MultiLineString", coordinates: multiCoords };
}

// Convert geometry to Leaflet lat-lng arrays.
function convertMultiLineToLatLng(geometry) {
  if (!geometry) return [];
  if (geometry.type === "LineString") {
    return [geometry.coordinates.map(([lon, lat]) => [lat, lon])];
  }
  if (geometry.type === "MultiLineString") {
    return geometry.coordinates.map(line =>
      line.map(([lon, lat]) => [lat, lon])
    );
  }
  return [];
}

export default function TestStreetMap() {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);

  // Keep a ref to our "street lines" layer group so we can remove it if needed.
  const linesLayerRef = useRef(null);

  const [streetName, setStreetName] = useState('');
  const [geometry, setGeometry] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  // 1) Create the Leaflet map only once
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    console.log("Creating Leaflet map...");
    const map = L.map(mapContainerRef.current).setView([-34.6037, -58.3816], 13);
    L.tileLayer("https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}.png", {
      attribution: '&copy; OpenStreetMap &copy; CARTO'
    }).addTo(map);

    mapInstanceRef.current = map;

    // Cleanup if unmounts
    return () => {
      console.log("Removing Leaflet map on unmount...");
      map.remove();
      mapInstanceRef.current = null;
    };
  }, []);

  // 2) Load streetNames2.json, pick a random street, fetch geometry
  useEffect(() => {
    async function loadAndFetch() {
      try {
        const res = await fetch('/streetNames2.json');
        const names = await res.json();
        if (!names.length) {
          setErrorMsg("No street names found in streetNames2.json");
          return;
        }
        const randomIndex = Math.floor(Math.random() * names.length);
        const selected = names[randomIndex];
        setStreetName(selected);
        console.log("Selected street:", selected);

        const geom = await getStreetGeometry(selected);
        setGeometry(geom);
      } catch (error) {
        console.error("Error loading street name or geometry:", error);
        setErrorMsg(error.message);
      }
    }
    loadAndFetch();
  }, []);

  // 3) Draw geometry on the map, removing old lines first
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map || !geometry) return;

    console.log("Drawing geometry on the map...");

    // Remove previous layer group if it exists
    if (linesLayerRef.current) {
      linesLayerRef.current.remove();
      linesLayerRef.current = null;
    }

    const lines = convertMultiLineToLatLng(geometry);
    const layerGroup = L.layerGroup();

    lines.forEach(lineCoords => {
      L.polyline(lineCoords, { color: 'red' }).addTo(layerGroup);
    });

    layerGroup.addTo(map);
    linesLayerRef.current = layerGroup;

    // Fit map to the line(s)
    const allPoints = lines.flat();
    if (allPoints.length) {
      const bounds = L.latLngBounds(allPoints);
      map.fitBounds(bounds);
    }
  }, [geometry]);

  return (
    <div style={{ position: 'relative', height: '100vh', width: '100%' }}>
      <h2 style={{ position: 'absolute', top: 10, left: 10, zIndex: 1000 }}>
        {streetName ? `Random Street: ${streetName}` : 'Loading street name...'}
      </h2>
      {errorMsg && (
        <div style={{ position: 'absolute', top: 40, left: 10, zIndex: 1000, color: 'red' }}>
          {errorMsg}
        </div>
      )}
      <div ref={mapContainerRef} style={{ height: '100%', width: '100%' }} />
    </div>
  );
}
