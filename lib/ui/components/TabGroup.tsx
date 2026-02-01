
import React from 'react';
import { Tabs, TabsList, TabsTrigger } from '../9ui/tabs';

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
    <Tabs value={activeTab} onValueChange={onChange}>
      <TabsList className={`flex w-full bg-slate-800 p-1 rounded-xl border border-slate-700 ${className}`}>
        {tabs.map((tab) => (
          <TabsTrigger
            key={tab.id}
            value={tab.id}
            className={`flex-1 ${hideLabel ? 'px-3' : 'px-4'} py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-2`}
            title={tab.label}
          >
            {tab.icon && <span className="text-current">{tab.icon}</span>}
            {!hideLabel && <span className="whitespace-nowrap">{tab.label}</span>}
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
};
