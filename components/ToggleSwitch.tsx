import React from 'react';

interface ToggleSwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ checked, onChange, label }) => {
  return (
    <label htmlFor="toggle" className="flex items-center cursor-pointer">
      <div className="relative">
        <input 
          id="toggle" 
          type="checkbox" 
          className="sr-only" 
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
        />
        <div className="block bg-gray-300 w-14 h-8 rounded-full"></div>
        <div className={`dot absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform ${checked ? 'translate-x-6 bg-[#ed2939]' : ''}`}></div>
      </div>
      <div className="ml-3 text-gray-700 font-medium">
        {label}
      </div>
    </label>
  );
};

export default ToggleSwitch;
