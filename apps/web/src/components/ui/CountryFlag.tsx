import React from 'react';
import * as Flags from 'country-flag-icons/react/3x2';

interface CountryFlagProps {
  countryCode?: string;
  className?: string;
  title?: string;
}

export const CountryFlag: React.FC<CountryFlagProps> = ({
  countryCode,
  className = 'w-6 h-4 rounded-sm shadow-sm inline-block object-cover',
  title,
}) => {
  if (!countryCode) {
    return (
      <span
        className={`bg-slate-200 dark:bg-slate-800 text-slate-400 text-[10px] font-bold flex items-center justify-center ${className}`}
        title="Unknown Country"
      >
        🏳️
      </span>
    );
  }

  const codeUpper = countryCode.toUpperCase();
  const FlagComponent = (Flags as any)[codeUpper];

  if (!FlagComponent) {
    return (
      <span
        className={`bg-slate-200 dark:bg-slate-800 text-slate-500 text-[10px] font-bold flex items-center justify-center ${className}`}
        title={title || codeUpper}
      >
        {codeUpper}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center justify-center overflow-hidden shrink-0 ${className}`}>
      <FlagComponent title={title || codeUpper} className="w-full h-full object-cover" />
    </span>
  );
};
