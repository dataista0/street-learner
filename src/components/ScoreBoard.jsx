import React from "react";

export default function ScoreBoard({ guessedStreets, currentStreet, totalScore }) {
  // Build rounds from guessed streets.
  const rounds = guessedStreets.map((entry, index) => ({
    index: index + 1,
    name: entry.name,
    error: `${entry.errorKm}km`,
  }));
  // Show current round if not yet submitted.
  if (currentStreet) {
    rounds.push({
      index: rounds.length + 1,
      name: currentStreet.name,
      error: currentStreet.errorKm,
    });
  }
  return (
    <div className="w-64 bg-gray-100 h-full border-l border-gray-300 p-4 box-border">
      <div className="mb-4 h-10 flex items-center justify-center font-bold text-lg">
        Total Score: {totalScore}km
      </div>
      <div className="overflow-y-auto" style={{ height: "calc(100% - 40px)" }}>
        <ul>
          {rounds.map((r) => (
            <li key={r.index} className="h-8 flex items-center border-b border-gray-200">
              <span className="mr-2">{r.index})</span>
              <span className="flex-1">{r.name}</span>
              <span>{r.error}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
