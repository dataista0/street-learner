import React, { useEffect, useState } from "react";
import MapView from "./components/MapView";
import ScoreBoard from "./components/ScoreBoard";
import { multiLineString, nearestPointOnLine, point } from "@turf/turf";

// Import your local street names JSON (ensure streetNames2.json is in public folder)
// Vite will bundle JSON imports automatically.
import allStreetNames from "../public/streetNames2.json";

export default function App() {
  // State to store 10 random street names.
  const [streetNames, setStreetNames] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [streetGeometry, setStreetGeometry] = useState(null);
  const [userClick, setUserClick] = useState(null);
  const [closestPoint, setClosestPoint] = useState(null);
  const [errorDistance, setErrorDistance] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [guessedStreets, setGuessedStreets] = useState([]);
  const [errorMsg, setErrorMsg] = useState(null);
  const [loadingNames, setLoadingNames] = useState(true);
  const [loadingGeometry, setLoadingGeometry] = useState(false);

  // On mount, pick 10 random street names.
  useEffect(() => {
    console.log("Selecting 10 random streets from local JSON...");
    if (allStreetNames && allStreetNames.length > 0) {
      const shuffled = [...allStreetNames].sort(() => 0.5 - Math.random());
      const picked = shuffled.slice(0, 10);
      setStreetNames(picked);
      console.log("Picked:", picked);
    } else {
      setErrorMsg("No street names found in local JSON.");
    }
    setLoadingNames(false);
  }, []);

  // When the current street changes, fetch its geometry from Overpass.
  useEffect(() => {
    async function fetchStreetGeometry(streetName) {
      console.log("Fetching geometry for:", streetName);
      try {
        setLoadingGeometry(true);
        setStreetGeometry(null);
        setErrorMsg(null);

        const overpassUrl = "https://overpass-api.de/api/interpreter";
        const query = `
          [out:json];
          area[name="Ciudad Autónoma de Buenos Aires"]->.searchArea;
          way(area.searchArea)["name"="${streetName}"];
          out geom;
        `;
        const response = await fetch(overpassUrl, {
          method: "POST",
          body: query,
        });
        if (!response.ok) {
          throw new Error(`Overpass returned ${response.status}`);
        }
        const data = await response.json();
        console.log("Geometry fetch result for", streetName, data);
        const ways = data.elements.filter(
          (el) => el.type === "way" && el.geometry
        );
        if (ways.length === 0) {
          throw new Error("No geometry found for " + streetName);
        }
        const multiCoords = ways.map((way) =>
          way.geometry.map((g) => [g.lon, g.lat])
        );
        const mls = multiLineString(multiCoords);
        setStreetGeometry(mls);
        console.log("Constructed MultiLineString for", streetName, mls);
      } catch (err) {
        console.error("Error fetching geometry for", streetName, err);
        setErrorMsg(err.message);
      } finally {
        setLoadingGeometry(false);
      }
    }
    // Reset guess state when moving to a new street.
    setUserClick(null);
    setClosestPoint(null);
    setErrorDistance(null);
    setSubmitted(false);
    if (streetNames.length > 0 && streetNames[currentIndex]) {
      fetchStreetGeometry(streetNames[currentIndex]);
    }
  }, [streetNames, currentIndex]);

  // Handle map click (user’s guess).
  function handleMapClick(latlng) {
    if (submitted) {
      console.log("Ignoring map click after submission");
      return;
    }
    console.log("Map clicked at", latlng);
    setUserClick(latlng);
  }

  // On submit, compute the error distance.
  function handleSubmit() {
    if (!userClick || !streetGeometry) {
      console.log("Cannot submit. userClick or streetGeometry is missing.");
      return;
    }
    console.log("Submitting guess...");
    const clickedPt = point([userClick.lng, userClick.lat]);
    const snapped = nearestPointOnLine(streetGeometry, clickedPt, {
      units: "meters",
    });
    const dist = snapped.properties.dist;
    console.log("Distance (m):", dist);
    setClosestPoint({
      lat: snapped.geometry.coordinates[1],
      lng: snapped.geometry.coordinates[0],
    });
    setErrorDistance(dist);
    const errorKm = parseFloat((dist / 1000).toFixed(1));
    const streetName = streetNames[currentIndex];
    setGuessedStreets((prev) => [...prev, { name: streetName, errorKm }]);
    setSubmitted(true);
  }

  // Move to the next round (or restart the game).
  function handleNext() {
    console.log("Next button clicked.");
    if (currentIndex < streetNames.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      const totalKm = guessedStreets
        .reduce((sum, s) => sum + s.errorKm, 0)
        .toFixed(1);
      alert(`Game over! Total error: ${totalKm}km`);
      setCurrentIndex(0);
      setGuessedStreets([]);
    }
  }

  const totalScore = guessedStreets
    .reduce((sum, s) => sum + s.errorKm, 0)
    .toFixed(1);
  const currentStreetName = streetNames[currentIndex] || "N/A";

  return (
    <div className="flex flex-col h-screen">
      {/* Top header */}
      <div className="p-4 bg-gray-200 fixed top-0 w-full h-16 flex items-center justify-center text-3xl font-bold">
        {loadingNames
          ? "Loading local JSON..."
          : errorMsg
          ? `Error: ${errorMsg}`
          : loadingGeometry
          ? "Loading geometry..."
          : currentStreetName}
      </div>
      {/* Main content: Map & Scoreboard */}
      <div className="flex flex-1 pt-16 pb-20">
        <MapView
          streetGeometry={submitted ? streetGeometry : null}
          userClick={userClick}
          closestPoint={submitted ? closestPoint : null}
          onMapClick={handleMapClick}
        />
        <ScoreBoard
          guessedStreets={guessedStreets}
          currentStreet={
            !submitted && currentStreetName
              ? { name: currentStreetName, errorKm: "?" }
              : null
          }
          totalScore={totalScore}
        />
      </div>
      {/* Bottom bar with instructions and buttons */}
      <div className="p-4 fixed bottom-0 w-full bg-white flex items-center justify-center h-20">
        {submitted ? (
          <button onClick={handleNext} className="bg-blue-500 text-white px-4 py-2 rounded">
            Next
          </button>
        ) : userClick ? (
          <button onClick={handleSubmit} className="bg-green-500 text-white px-4 py-2 rounded">
            Submit
          </button>
        ) : (
          <p>Please click on the map for the location</p>
        )}
      </div>
    </div>
  );
}
