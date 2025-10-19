
import React from 'react';
import type { Player } from '../types';

interface LeaderboardProps {
  players: Player[];
}

const Leaderboard: React.FC<LeaderboardProps> = ({ players }) => {
  const sortedPlayers = React.useMemo(() => {
    return [...players].sort((a, b) => b.score - a.score);
  }, [players]);

  return (
    <aside id="leaderboard" className="bg-white p-4 lg:p-6 rounded-lg shadow-lg w-full">
      <h2 className="text-2xl font-black text-center mb-4 uppercase tracking-wider">Leaderboard</h2>
      <ul id="leaderboard-list" className="space-y-3">
        {sortedPlayers.length > 0 ? (
          sortedPlayers.map((player, index) => (
            <li
              key={player.name}
              className={`flex justify-between items-center p-3 rounded-lg transition-all duration-300 ${
                index === 0
                  ? 'bg-[#ed2939] text-white shadow-md scale-105'
                  : 'bg-gray-100'
              }`}
            >
              <span className="font-bold text-lg">{`${index + 1}. ${player.name}`}</span>
              <span className="font-black text-xl">{player.score}</span>
            </li>
          ))
        ) : (
          <p className="text-center text-gray-500">No players yet...</p>
        )}
      </ul>
    </aside>
  );
};

export default Leaderboard;
