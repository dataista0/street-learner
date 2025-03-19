import React, { useEffect, useState } from "react";
import MapView from "./components/MapView";
import ScoreBoard from "./components/ScoreBoard";
import { multiLineString, nearestPointOnLine, point } from "@turf/turf";

// Import local street names JSON (ensure streetNames2.json is in public/)
import allStreetNames from "../public/streetNames2.json";

// Change this constant for debugging (e.g., 3) or full game (10)
const TOTAL_ROUNDS = 5;

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
  function handleMapClick(latlng, submitted) {
    console.log("Submitted is", submitted);
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
      <div className="fixed top-0 w-full h-20 flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 shadow-xl">
        <span className="text-4xl font-extrabold text-white">
          {loadingNames
            ? "Loading street names..."
            : errorMsg
            ? `Error: ${errorMsg}`
            : loadingGeometry
            ? "Loading geometry..."
            : currentStreetName}
        </span>
      </div>

      {/* Main content: Map & ScoreBoard */}
      <div className="flex flex-1 pt-20 pb-24">
        <MapView
          streetGeometry={submitted ? streetGeometry : null}
          userClick={userClick}
          closestPoint={submitted ? closestPoint : null}
          onMapClick={handleMapClick}
          submitted={submitted}
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
      <div className="fixed bottom-0 w-full h-24 flex items-center justify-center bg-gradient-to-br from-blue-500 to-indigo-600 shadow-inner">
        {submitted ? (
          <button
            onClick={handleNext}
            className="bg-green-500 text-white px-6 py-2 rounded-full shadow-lg transition hover:bg-green-600"
          >
            Next
          </button>
        ) : userClick ? (
          <button
            onClick={handleSubmit}
            className="bg-green-700 text-white px-6 py-2 rounded-full shadow-lg transition hover:bg-green-800"
          >
            Submit
          </button>
        ) : (
          <p className="text-white text-xl font-semibold">
            Please click on the map to guess the location
          </p>
        )}
      </div>
      

      {/* Final Modal */}
      {showFinalModal && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-75"
          style={{ zIndex: 9999 }}
        >
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-8 shadow-2xl w-[40rem]">
            <h3 className="text-4xl font-extrabold text-white mb-4">Game Finished!</h3>
            <p className="text-xl text-gray-200 mb-6">
              Total score: {totalScore}km
            </p>
            <div className="text-right">
              <button
                onClick={handleRestart}
                className="bg-white text-indigo-600 font-bold px-6 py-3 rounded-full shadow-lg transition hover:bg-gray-100"
              >
                Restart Game
              </button>
            </div>
            <div className="text-right mt-4">
              <a href="https://julianpeller.com.ar/tree" target="_blank" rel="noopener noreferrer" className="text-white underline">
                julianpeller.com.ar/tree
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Intro Modal */}
      {showIntroModal && (
        <div
          className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-75"
          style={{ zIndex: 10000 }}
        >
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl p-8 shadow-2xl w-[40rem]">
            <h3 className="text-4xl font-extrabold text-white mb-4">Welcome to Buenos Aires street learner!</h3>
            <p className="text-xl text-gray-200 mb-6">
              Discover the hidden streets of the City of Buenos Aires.
              In this game, you'll be challenged to locate real streets on a map without labels.
              Place your guess and see how close you get to the actual location.
              Compete through {TOTAL_ROUNDS} rounds to achieve the best score.

            </p>
            <div className="text-right">
              <button
                onClick={() => setShowIntroModal(false)}
                className="bg-white text-indigo-600 font-bold px-6 py-3 rounded-full shadow-lg transition hover:bg-gray-100"
              >
                Start Game
              </button>
            </div>
            <div className="text-right mt-4">
              <a href="https://julianpeller.com.ar/tree" target="_blank" rel="noopener noreferrer" className="text-white underline">
                julianpeller.com.ar/tree
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
