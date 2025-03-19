import React, { useState } from 'react';
import MapView from './components/MapView';
import ScoreBoard from './components/ScoreBoard';
import { point, lineString, nearestPointOnLine } from '@turf/turf';

// Dummy data for 10 streets in Buenos Aires (coordinates are [lat, lng])
const streets = [
  { name: "Avenida de Mayo",         coordinates: [[-34.606, -58.381], [-34.603, -58.376]] },
  { name: "Calle Florida",           coordinates: [[-34.605, -58.380], [-34.603, -58.378]] },
  { name: "Avenida 9 de Julio",      coordinates: [[-34.609, -58.384], [-34.603, -58.371]] },
  { name: "Calle Corrientes",        coordinates: [[-34.603, -58.381], [-34.603, -58.375]] },
  { name: "Avenida Libertador",      coordinates: [[-34.587, -58.416], [-34.603, -58.383]] },
  { name: "Calle San Martín",        coordinates: [[-34.605, -58.389], [-34.603, -58.382]] },
  { name: "Calle Rivadavia",         coordinates: [[-34.609, -58.389], [-34.600, -58.377]] },
  { name: "Calle Alsina",            coordinates: [[-34.605, -58.382], [-34.603, -58.379]] },
  { name: "Avenida Callao",          coordinates: [[-34.608, -58.383], [-34.605, -58.377]] },
  { name: "Avenida del Libertador",  coordinates: [[-34.591, -58.400], [-34.603, -58.383]] }
];

function App() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const currentStreet = streets[currentIndex];
  const [userClick, setUserClick] = useState(null);
  const [closestPoint, setClosestPoint] = useState(null);
  const [errorDistance, setErrorDistance] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [guessedStreets, setGuessedStreets] = useState([]);

  // Allow multiple clicks until submission; disable further clicks after submission
  function handleMapClick(latlng) {
    if (submitted) return;
    setUserClick(latlng);
  }

  function handleSubmit() {
    if (!userClick) return;
    const clickedPoint = point([userClick.lng, userClick.lat]);
    const line = lineString(currentStreet.coordinates.map(coord => [coord[1], coord[0]]));
    const snapped = nearestPointOnLine(line, clickedPoint, { units: 'meters' });
    setClosestPoint({ lat: snapped.geometry.coordinates[1], lng: snapped.geometry.coordinates[0] });
    const dist = snapped.properties.dist;
    setErrorDistance(dist);
    // Convert error to kilometers with one decimal place
    const errorKm = parseFloat((dist / 1000).toFixed(1));
    // Record the guessed street result
    setGuessedStreets(prev => [...prev, { name: currentStreet.name, errorKm }]);
    setSubmitted(true);
  }

  function handleNext() {
    setUserClick(null);
    setClosestPoint(null);
    setErrorDistance(null);
    setSubmitted(false);
    if (currentIndex < streets.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      alert("Game over! Your total error is " + 
            guessedStreets.reduce((sum, entry) => sum + entry.errorKm, 0).toFixed(1) + "km");
      setCurrentIndex(0);
      setGuessedStreets([]);
    }
  }

  // Compute total score as the sum of errors (in km)
  const totalScore = guessedStreets.reduce((sum, entry) => sum + entry.errorKm, 0).toFixed(1);

  return (
    <div className="flex flex-col h-screen">
      {/* Top header with current street name */}
      <div className="p-4 bg-gray-200 fixed top-0 w-full h-16 flex items-center justify-center text-3xl font-bold">
        {currentStreet.name}
      </div>
      
      {/* Main content area: Map and ScoreBoard side panel */}
      <div className="flex flex-1 pt-16 pb-20">
        <MapView 
          currentStreet={currentStreet} 
          userClick={userClick} 
          closestPoint={submitted ? closestPoint : null}
          onMapClick={handleMapClick}
          submitted={submitted}
          className="flex-1"
        />
        <ScoreBoard 
          guessedStreets={guessedStreets} 
          currentStreet={currentStreet} 
          submitted={submitted} 
          totalScore={totalScore}
        />
      </div>
      
      {/* Bottom fixed instruction bar */}
      <div className="p-4 fixed bottom-0 w-full bg-white flex items-center justify-center h-20">
        {userClick && !submitted ? (
          <button onClick={handleSubmit} className="bg-green-500 text-white px-4 py-2 rounded">
            Submit
          </button>
        ) : submitted ? (
          <button onClick={handleNext} className="bg-blue-500 text-white px-4 py-2 rounded">
            Next
          </button>
        ) : (
          <p>Please click on the map for the location</p>
        )}
      </div>
    </div>
  );
}

export default App;
