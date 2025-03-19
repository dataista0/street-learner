import React, { useEffect, useState } from "react";
import MapView from "./components/MapView";
import ScoreBoard from "./components/ScoreBoard";
import { multiLineString, nearestPointOnLine, point } from "@turf/turf";

// Import your local street names JSON (placed in public folder)
import allStreetNames from "../public/streetNames2.json";

// Change this constant to 3 for debugging (or 10 for full game)
const TOTAL_ROUNDS = 10;

export default function App() {
  // Game state
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
  const [showFinalModal, setShowFinalModal] = useState(false);
  const [showIntroModal, setShowIntroModal] = useState(true);

  // On mount, pick TOTAL_ROUNDS random street names.
  useEffect(() => {
    console.log("Selecting random streets from local JSON...");
    if (allStreetNames && allStreetNames.length > 0) {
      const shuffled = [...allStreetNames].sort(() => 0.5 - Math.random());
      const picked = shuffled.slice(0, TOTAL_ROUNDS);
      setStreetNames(picked);
      console.log("Picked:", picked);
    } else {
      setErrorMsg("No street names found in local JSON.");
    }
    setLoadingNames(false);
  }, []);

  // Whenever currentIndex or streetNames changes, load geometry.
  useEffect(() => {
    async function fetchStreetGeometry(streetName) {
      console.log("Fetching geometry from Overpass for:", streetName);
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

    async function getPrecomputedGeometry(streetName) {
      try {
        const res = await fetch("/streetGeometries.json");
        if (!res.ok) {
          throw new Error("Failed to load precomputed geometries.");
        }
        const precomputed = await res.json();
        return precomputed[streetName] || null;
      } catch (error) {
        console.error("Error loading precomputed geometries:", error);
        return null;
      }
    }

    // Reset guess state for new round.
    setUserClick(null);
    setClosestPoint(null);
    setErrorDistance(null);
    setSubmitted(false);

    if (streetNames.length > 0 && streetNames[currentIndex]) {
      // Try to get precomputed geometry first.
      getPrecomputedGeometry(streetNames[currentIndex]).then((preGeom) => {
        if (preGeom) {
          console.log("Using precomputed geometry for", streetNames[currentIndex]);
          setStreetGeometry(preGeom);
          setLoadingGeometry(false);
        } else {
          fetchStreetGeometry(streetNames[currentIndex]);
        }
      });
    }
  }, [streetNames, currentIndex]);

  // Handle map click (user's guess).
  function handleMapClick(latlng) {
    if (submitted) {
      console.log("Ignoring map click after submission");
      return;
    }
    console.log("Map clicked at", latlng);
    setUserClick(latlng);
  }

  // On submit, compute error distance.
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

  // Handle "Next" button click.
  function handleNext() {
    console.log("Next button clicked.");
    if (currentIndex < TOTAL_ROUNDS - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      // Show final modal.
      setShowFinalModal(true);
    }
  }

  function handleRestart() {
    setCurrentIndex(0);
    setGuessedStreets([]);
    setShowFinalModal(false);
  }

  const totalScore = guessedStreets
    .reduce((sum, s) => sum + s.errorKm, 0)
    .toFixed(1);
  const currentStreetName = streetNames[currentIndex] || "N/A";

  return (
    <div className="flex flex-col h-screen">
      {/* Top panel */}
      <div className="p-4 bg-blue-200 fixed top-0 w-full h-20 flex items-center justify-center text-4xl font-extrabold shadow-md">
        {loadingNames
          ? "Loading street names..."
          : errorMsg
          ? `Error: ${errorMsg}`
          : loadingGeometry
          ? "Loading geometry..."
          : currentStreetName}
      </div>

      {/* Main content: Map & ScoreBoard */}
      <div className="flex flex-1 pt-20 pb-24">
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

      {/* Bottom panel */}
      <div className="p-4 fixed bottom-0 w-full h-24 bg-blue-200 flex items-center justify-center text-xl font-semibold shadow-inner">
        {submitted ? (
          <button
            onClick={handleNext}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg shadow-md"
          >
            Next
          </button>
        ) : userClick ? (
          <button
            onClick={handleSubmit}
            className="bg-green-600 text-white px-6 py-2 rounded-lg shadow-md"
          >
            Submit
          </button>
        ) : (
          <p>Please click on the map to guess the location</p>
        )}
      </div>

      {/* Final Modal */}
      {showFinalModal && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50"
          style={{ zIndex: 9999 }}
        >
          <div className="bg-white rounded-lg p-6 w-80 text-center shadow-xl">
            <h3 className="text-2xl font-bold mb-4">Game Over!</h3>
            <p className="mb-4">Total error: {totalScore}km</p>
            <button
              onClick={handleRestart}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md"
            >
              Restart Game
            </button>
          </div>
        </div>
      )}

      {/* Intro Modal */}
      {showIntroModal && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50"
          style={{ zIndex: 10000 }}
        >
          <div className="bg-white rounded-lg p-6 w-[40rem] text-center shadow-xl">
            <h3 className="text-2xl font-bold mb-4">Welcome to Streets of Buenos Aires!</h3>
            <p className="text-left mb-4">
              <ul>
              <li>In this game, you'll be given street names from the City of Buenos Aires.</li><br/>
              <li>You will have to guess its location by clicking on the map and pits location, then press "Submit" to see the actual street, a dashed blue line showing your error, and your score.</li><br/>
              <li> The game consists of {TOTAL_ROUNDS} rounds.</li><br/>
              </ul>
              Good luck!
            </p>
            <button
              onClick={() => setShowIntroModal(false)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg shadow-md"
            >
              Start Game
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
