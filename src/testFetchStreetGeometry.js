/**
 * testFetchStreetGeometry.js
 *
 * A simple test script that loads street names from the local `streetNames.json` file,
 * picks one (here, the first one), fetches its geometry using `getStreetGeometry`, and prints
 * the resulting MultiLineString.
 *
 * Usage:
 *    node testFetchStreetGeometry.js
 */

import fs from 'fs';
import { getStreetGeometry } from './fetchStreetGeometry.js';

async function test() {
  try {
    // Load street names from local JSON file (created by fetchStreetNames.js)
    const data = fs.readFileSync("streetNames2.json", "utf-8");
    const streetNames = JSON.parse(data);
    if (!streetNames.length) {
      throw new Error("No street names found in streetNames.json");
    }
    // Pick a street (e.g., the first one or random)
    const streetName = streetNames[Math.floor(Math.random() * streetNames.length)];
    console.log("Testing street:", streetName);
    
    // Fetch the multiline geometry for the chosen street
    const multiLine = await getStreetGeometry(streetName);
    console.log("Resulting MultiLineString geometry:");
    console.log(JSON.stringify(multiLine, null, 2));
  } catch (error) {
    console.error("Error in test:", error);
  }
}

test();
