
import React from 'react';

export interface TabOption {
  id: string;
  label: string;
  icon?: React.ReactNode;
}

interface TabGroupProps {
  tabs: TabOption[];
  activeTab: string;
  onChange: (id: any) => void;
  className?: string;
  hideLabel?: boolean;
}

export const TabGroup: React.FC<TabGroupProps> = ({ tabs, activeTab, onChange, className = '', hideLabel = false }) => {
  return (
    <div className={`flex bg-slate-800 p-1 rounded-xl border border-slate-700 ${className}`}>
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`
              flex-1 ${hideLabel ? 'px-3' : 'px-4'} py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all
              ${isActive 
                ? 'bg-primary text-white shadow-md shadow-primary/20' 
                : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
              }
            `}
            title={tab.label}
          >
            {tab.icon && <span className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'}>{tab.icon}</span>}
            {!hideLabel && <span className="whitespace-nowrap">{tab.label}</span>}
          </button>
        );
      })}
    </div>
  );
};
