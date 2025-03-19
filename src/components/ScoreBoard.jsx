import React from 'react';

function ScoreBoard({ guessedStreets, currentStreet, submitted, totalScore }) {
  // 1) Map over all guessed (submitted) streets
  const rounds = guessedStreets.map((entry, index) => ({
    index: index + 1,
    name: entry.name,
    error: entry.errorKm + 'km',
  }));

  // 2) If we have not submitted the current guess yet, show the current street with '?'
  if (!submitted) {
    rounds.push({
      index: rounds.length + 1,
      name: currentStreet.name,
      error: '?',
    });
  }

  return (
    <div className="w-64 bg-gray-100 h-full border-l border-gray-300 p-4 box-border">
      <div className="mb-4 h-10 flex items-center justify-center font-bold text-lg">
        Total Score: {totalScore}km
      </div>
      <div className="overflow-y-auto" style={{ height: "calc(100% - 40px)" }}>
        <ul>
          {rounds.map(round => (
            <li key={round.index} className="h-8 flex items-center border-b border-gray-200">
              <span className="mr-2">{round.index})</span>
              <span className="flex-1">{round.name}</span>
              <span>{round.error}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default ScoreBoard;
