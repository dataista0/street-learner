import React from "react";

// Helper: shorten street name: replace "Avenida" with "Av."
function shortenName(name) {
  return name.replace(/\bAvenida\b/g, "Av.");
}

export default function ScoreBoard({ guessedStreets, currentStreet, totalScore }) {
  // Build rounds array from guessed streets.
  const rounds = guessedStreets.map((entry, index) => ({
    index: index + 1,
    name: shortenName(entry.name),
    error: `${entry.errorKm}km`,
  }));
  // Show current round (not yet submitted) if exists.
  if (currentStreet) {
    rounds.push({
      index: rounds.length + 1,
      name: shortenName(currentStreet.name),
      error: currentStreet.errorKm,
    });
  }

  return (
    <div className="w-80 bg-gray-100 h-full border-l border-gray-300 p-4 box-border shadow-md">
      <div className="mb-4 h-12 flex items-center justify-center font-bold text-xl">
        Total Score: {totalScore}km
      </div>
      <div className="overflow-y-auto" style={{ height: "calc(100% - 48px)" }}>
        <ul>
          {rounds.map((r) => (
            <li key={r.index} className="h-10 flex items-center border-b border-gray-200 px-2">
              <span className="mr-2 font-semibold">{r.index})</span>
              <span className="flex-1">{r.name}</span>
              <span className="font-semibold">{r.error}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
