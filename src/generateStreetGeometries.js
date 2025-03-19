/**
 * generateStreetGeometries.js
 *
 * This script reads a JSON file (relative to the public/ folder) containing street names,
 * then for each street that does not have computed geometry in the output JSON,
 * it fetches the geometry from Overpass API and updates the output JSON file.
 *
 * Usage:
 *   node src/generateStreetGeometries.js streetNames2.json streetGeometries.json
 *
 * Both parameters are relative to the public/ folder.
 */

import fetch from 'node-fetch';
import { readFile, writeFile } from 'fs/promises';
import fs from 'fs';
import path from 'path';

// Helper function to fetch geometry for a given street name.
async function fetchGeometry(streetName) {
  console.log(`Fetching geometry for: ${streetName}`);
  const overpassUrl = 'https://overpass-api.de/api/interpreter';
  const query = `
    [out:json];
    area[name="Ciudad Autónoma de Buenos Aires"]->.searchArea;
    way(area.searchArea)["name"="${streetName}"];
    out geom;
  `;
  const response = await fetch(overpassUrl, { method: 'POST', body: query });
  if (!response.ok) {
    throw new Error(`Overpass returned ${response.status}`);
  }
  const data = await response.json();
  // Filter for ways with geometry.
  const ways = data.elements.filter(el => el.type === 'way' && el.geometry);
  if (!ways.length) {
    throw new Error(`No geometry found for ${streetName}`);
  }
  // Build an array of arrays: each way as an array of [lon, lat] pairs.
  const multiCoords = ways.map(way =>
    way.geometry.map(pt => [pt.lon, pt.lat])
  );
  // Return a GeoJSON Feature with a MultiLineString geometry.
  return {
    type: "Feature",
    properties: { name: streetName },
    geometry: {
      type: "MultiLineString",
      coordinates: multiCoords
    }
  };
}

async function main() {
  try {
    // Read command-line parameters (or use defaults)
    const args = process.argv.slice(2);
    const inputFilename = args[0] || 'streetNames2.json';
    const outputFilename = args[1] || 'streetGeometries.json';

    // Paths relative to the public folder.
    const publicDir = path.resolve('public');
    const inputPath = path.join(publicDir, inputFilename);
    const outputPath = path.join(publicDir, outputFilename);

    // Read input JSON.
    console.log(`Reading street names from ${inputPath}...`);
    const inputData = await readFile(inputPath, 'utf8');
    const streetNames = JSON.parse(inputData); // expect an array
    console.log(`Found ${streetNames.length} street names.`);

    // Read existing output file if available.
    let geometryData = {};
    if (fs.existsSync(outputPath)) {
      console.log(`Reading existing geometries from ${outputPath}...`);
      const outputData = await readFile(outputPath, 'utf8');
      geometryData = JSON.parse(outputData);
    } else {
      console.log("No existing geometry file; starting fresh.");
    }

    // For each street, if not already computed, fetch and add geometry.
    for (const street of streetNames) {
      if (geometryData[street]) {
        console.log(`Skipping "${street}" (already computed).`);
        continue;
      }
      try {
        const geometry = await fetchGeometry(street);
        geometryData[street] = geometry;
        console.log(`Fetched geometry for "${street}".`);
        // Write updates to disk after each successful fetch.
        await writeFile(outputPath, JSON.stringify(geometryData, null, 2), 'utf8');
        console.log(`Updated ${outputFilename}.`);
      } catch (error) {
        console.error(`Error fetching geometry for "${street}":`, error.message);
      }
    }

    console.log("Done updating geometries.");
  } catch (err) {
    console.error("Error in generateStreetGeometries:", err);
  }
}

main();
