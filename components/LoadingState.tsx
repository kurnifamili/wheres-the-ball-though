import React, { useState, useEffect } from 'react';

interface LoadingStateProps {
  quote: string;
}

const LoadingState: React.FC<LoadingStateProps> = ({ quote }) => {
  const [displayedQuote, setDisplayedQuote] = useState(quote);
  const [isFading, setIsFading] = useState(false);

  useEffect(() => {
    if (quote !== displayedQuote) {
      setIsFading(true);
      const timer = setTimeout(() => {
        setDisplayedQuote(quote);
        setIsFading(false);
      }, 300); // This should match the transition-out duration
      return () => clearTimeout(timer);
    }
  }, [quote, displayedQuote]);

  return (
    <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center text-white z-10 p-4">
      <svg className="animate-spin h-12 w-12 text-white mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <p 
        className={`text-xl font-semibold text-center max-w-md italic transition-opacity duration-300 min-h-[3.5rem] flex items-center justify-center ${isFading ? 'opacity-0' : 'opacity-100'}`}
      >
        "{displayedQuote}"
      </p>
    </div>
  );
};

export default LoadingState;