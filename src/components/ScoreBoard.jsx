import React from "react";

// Helper: shorten street name (replace "Avenida" with "Av.")
function shortenName(name) {
  return name.replace(/\bAvenida\b/g, "Av.");
}

export default function ScoreBoard({ guessedStreets, currentStreet, totalScore }) {
  const rounds = guessedStreets.map((entry, index) => ({
    index: index + 1,
    name: shortenName(entry.name),
    error: `${entry.errorKm}km`,
  }));
  if (currentStreet) {
    rounds.push({
      index: rounds.length + 1,
      name: shortenName(currentStreet.name),
      error: currentStreet.errorKm,
    });
  }
  return (
    <div className="w-80 bg-gray-800 h-full border-l border-gray-700 p-4 rounded-xl shadow-lg">
      <div className="mb-4 h-12 flex items-center justify-center font-bold text-2xl text-white">
        Total Score: {totalScore}km
      </div>
      <div className="overflow-y-auto" style={{ height: "calc(100% - 48px)" }}>
        <ul>
          {rounds.map((r) => (
            <li key={r.index} className="h-12 flex items-center border-b border-gray-700 px-4">
              <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center font-bold text-white mr-4">
                {r.index}
              </div>
              <div className="flex-1 text-lg text-gray-100">{r.name}</div>
              <div className="text-lg font-bold text-gray-200">{r.error}</div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
