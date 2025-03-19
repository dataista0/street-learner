/**
 * fetchStreetNames.js
 *
 * Node script to fetch unique street names for the City of Buenos Aires from Overpass,
 * then store them locally in a JSON file: `streetNames.json`.
 *
 * Usage:
 *    1) Install node-fetch:  npm install node-fetch
 *    2) Run script:          node fetchStreetNames.js
 */

import fetch from 'node-fetch';
import fs from 'fs';

async function fetchStreetNames() {
  try {
    console.log("Fetching street names from Overpass for Ciudad Autónoma de Buenos Aires...");

    // Overpass query: find ways with highway + name in the specified area
    const query = `
      [out:json];
      area[name="Ciudad Autónoma de Buenos Aires"]->.searchArea;
      way(area.searchArea)[highway][name];
      out tags;
    `;

    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      body: query,
    });
    if (!res.ok) {
      throw new Error(`Overpass responded with HTTP ${res.status} - ${res.statusText}`);
    }

    const data = await res.json();
    console.log("Received data from Overpass. Processing...");

    // Gather unique street names of length >= 10 chars
    const nameSet = new Set();
    data.elements.forEach((el) => {
      if (el.tags && el.tags.name && el.tags.name.length >= 10) {
        nameSet.add(el.tags.name);
      }
    });

    const allNames = Array.from(nameSet);
    console.log(`Found ${allNames.length} unique street names (≥ 10 chars).`);

    // Write them to local file
    fs.writeFileSync("streetNames.json", JSON.stringify(allNames, null, 2));
    console.log("Wrote streetNames.json with", allNames.length, "names.");
  } catch (err) {
    console.error("Error fetching street names:", err);
  }
}

fetchStreetNames();
