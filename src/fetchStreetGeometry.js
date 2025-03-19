/**
 * fetchStreetGeometry.js
 *
 * Exports a function `getStreetGeometry(streetName)` that queries Overpass for ways
 * matching the given street name within "Ciudad Autónoma de Buenos Aires" and returns
 * a Turf MultiLineString of its geometry.
 *
 * Usage:
 *    import { getStreetGeometry } from './fetchStreetGeometry.js';
 *    const multiLine = await getStreetGeometry("Avenida de Mayo");
 */

import fetch from 'node-fetch';
import { multiLineString } from '@turf/turf';

export async function getStreetGeometry(streetName) {
  try {
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

    // Filter to ways that have a geometry property
    const ways = data.elements.filter(el => el.type === "way" && el.geometry);
    if (!ways.length) {
      throw new Error(`No geometry found for street: ${streetName}`);
    }
    // Build an array of arrays: each way is represented as an array of [lon, lat] pairs.
    const multiCoords = ways.map(way =>
      way.geometry.map(pt => [pt.lon, pt.lat])
    );
    // Create a MultiLineString using Turf
    const multiLine = multiLineString(multiCoords);
    return multiLine;
  } catch (error) {
    console.error("Error in getStreetGeometry:", error);
    throw error;
  }
}
