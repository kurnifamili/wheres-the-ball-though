import React, { useState } from 'react';

interface DebugLogProps {
  logs: string[];
}

const DebugLog: React.FC<DebugLogProps> = ({ logs }) => {
  const [isExpanded, setIsExpanded] = useState(true);

  if (logs.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 max-w-lg w-full bg-gray-800 text-white rounded-lg shadow-2xl z-50 font-mono text-xs">
      <div 
        className="flex justify-between items-center p-2 bg-red-800 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <h3 className="font-bold">Debug Log</h3>
        <button className="text-white">
          {isExpanded ? 'Collapse' : 'Expand'}
        </button>
      </div>
      {isExpanded && (
        <div className="p-3 max-h-40 overflow-y-auto">
          <ul>
            {logs.map((log, index) => (
              <li key={index} className="py-1 border-b border-gray-700 last:border-b-0">
                {log}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default DebugLog;
