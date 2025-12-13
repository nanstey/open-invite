
import React, { useState } from 'react';
import { Search, CalendarClock, Users, Filter, XCircle, CheckCircle2, Crown, History, Inbox, Layout, ChevronUp, Tag } from 'lucide-react';

export type TimeFilter = 'ALL' | 'TODAY' | 'TOMORROW' | 'WEEK';
export type StatusFilter = 'ALL' | 'PENDING' | 'ATTENDING' | 'HOSTING' | 'PAST' | 'DISMISSED';

interface FilterBarProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  timeFilter: TimeFilter;
  onTimeFilterChange: (filter: TimeFilter) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (filter: StatusFilter) => void;
  showOpenOnly: boolean;
  onShowOpenOnlyChange: (show: boolean) => void;
  isVisible?: boolean;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  searchTerm,
  onSearchChange,
  selectedCategory,
  onCategoryChange,
  timeFilter,
  onTimeFilterChange,
  statusFilter,
  onStatusFilterChange,
  showOpenOnly,
  onShowOpenOnlyChange,
  isVisible = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const categories = ['ALL', 'Social', 'Sport', 'Entertainment', 'Food', 'Work', 'Errand', 'Travel'];
  
  const statusTabs: { id: StatusFilter; label: string; icon: React.ReactNode }[] = [
    { id: 'ALL', label: 'All Events', icon: <Layout className="w-4 h-4" /> },
    { id: 'PENDING', label: 'Pending', icon: <Inbox className="w-4 h-4" /> },
    { id: 'ATTENDING', label: 'Going', icon: <CheckCircle2 className="w-4 h-4" /> },
    { id: 'HOSTING', label: 'Hosting', icon: <Crown className="w-4 h-4" /> },
    { id: 'PAST', label: 'Past', icon: <History className="w-4 h-4" /> },
    { id: 'DISMISSED', label: 'Hidden', icon: <XCircle className="w-4 h-4" /> },
  ];

  const hasActiveFilters = selectedCategory !== 'ALL' || timeFilter !== 'ALL' || showOpenOnly;
  const currentStatusIcon = statusTabs.find(t => t.id === statusFilter)?.icon;
  const isStatusActive = statusFilter !== 'ALL';

  return (
    <div 
        className={`
            bg-slate-900/95 backdrop-blur border-b border-slate-800 z-30 shadow-lg flex flex-col
            transition-all duration-300 ease-in-out transform
            ${isVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0 -mt-32 pointer-events-none'}
        `}
    >
       
       {/* Row 1: Status Tabs (Desktop Only - Always Visible) */}
       <div className="hidden md:block px-4 pt-3 pb-1 overflow-x-auto hide-scrollbar border-b border-slate-800/50">
          <div className="flex gap-1 min-w-max">
            {statusTabs.map(tab => {
               const isActive = statusFilter === tab.id;
               return (
                 <button
                   key={tab.id}
                   onClick={() => onStatusFilterChange(tab.id)}
                   className={`
                     flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-bold border-b-2 transition-all
                     ${isActive 
                       ? 'text-primary border-primary bg-slate-800/50' 
                       : 'text-slate-400 border-transparent hover:text-slate-200 hover:bg-slate-800/30'
                     }
                   `}
                 >
                   {tab.icon}
                   {tab.label}
                 </button>
               )
            })}
          </div>
       </div>

       {/* Row 2: Search & Filter Toggle */}
       <div className="px-4 pt-3 pb-2 relative">
          <div className="flex gap-3 items-center">
              {/* Mobile Status Dropdown (Left of Search) */}
              <div className={`md:hidden relative p-2.5 rounded-lg border transition-all shadow-sm shrink-0 ${isStatusActive ? 'bg-primary/10 border-primary text-primary' : 'bg-slate-800 border-slate-700 text-slate-400'}`}>
                <div className="pointer-events-none flex items-center justify-center">
                    {currentStatusIcon}
                </div>
                <select
                    value={statusFilter}
                    onChange={(e) => onStatusFilterChange(e.target.value as StatusFilter)}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                >
                    {statusTabs.map(tab => (
                        <option key={tab.id} value={tab.id}>{tab.label}</option>
                    ))}
                </select>
              </div>

              {/* Search Input */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search events..." 
                  value={searchTerm}
                  onChange={(e) => onSearchChange(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg pl-9 pr-3 py-2.5 focus:ring-2 focus:ring-primary focus:border-transparent outline-none placeholder:text-slate-500 transition-all shadow-sm"
                />
              </div>
              
              {/* Toggle Button */}
              <button 
                onClick={() => setIsExpanded(!isExpanded)}
                className={`
                   relative p-2.5 rounded-lg border transition-all shadow-sm shrink-0
                   ${isExpanded 
                     ? 'bg-slate-700 text-white border-slate-600' 
                     : 'bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-700 hover:text-white'
                   }
                `}
                title="Toggle Filters"
              >
                 {hasActiveFilters && !isExpanded && (
                   <span className="absolute -top-1 -right-1 w-3 h-3 bg-primary rounded-full border-2 border-slate-900"></span>
                 )}
                 {isExpanded ? <ChevronUp className="w-5 h-5" /> : <Filter className="w-5 h-5" />}
              </button>
          </div>

          {/* Expandable Filters */}
          {isExpanded && (
             <div className={`
                animate-in slide-in-from-top-2 duration-200 fade-in
                absolute left-0 right-0 top-full z-50 bg-slate-900 border-b border-slate-800 shadow-2xl p-4
                md:static md:bg-transparent md:border-none md:shadow-none md:p-0 md:pt-1 md:mt-3
             `}>
                <div className="flex flex-wrap gap-3">
                    
                    {/* Category Select */}
                    <div className="relative flex-1 md:flex-none">
                        <Tag className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                        <select 
                          value={selectedCategory}
                          onChange={(e) => onCategoryChange(e.target.value)}
                          className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg pl-9 pr-8 py-2 outline-none focus:border-primary appearance-none cursor-pointer hover:bg-slate-700 transition-colors shadow-sm min-w-[150px]"
                        >
                            {categories.map(cat => (
                              <option key={cat} value={cat}>{cat === 'ALL' ? 'All Activities' : cat}</option>
                            ))}
                        </select>
                        <div className="absolute right-3 top-3 w-2 h-2 border-r border-b border-slate-400 rotate-45 pointer-events-none"></div>
                    </div>

                    {/* Time Select - Only show if not viewing Past */}
                    {statusFilter !== 'PAST' && (
                      <div className="relative flex-1 md:flex-none">
                          <CalendarClock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" />
                          <select 
                            value={timeFilter}
                            onChange={(e) => onTimeFilterChange(e.target.value as TimeFilter)}
                            className="w-full bg-slate-800 border border-slate-700 text-white text-sm rounded-lg pl-9 pr-8 py-2 outline-none focus:border-primary appearance-none cursor-pointer hover:bg-slate-700 transition-colors shadow-sm min-w-[140px]"
                          >
                              <option value="ALL">Any Time</option>
                              <option value="TODAY">Today</option>
                              <option value="TOMORROW">Tomorrow</option>
                              <option value="WEEK">This Week</option>
                          </select>
                          <div className="absolute right-3 top-3 w-2 h-2 border-r border-b border-slate-400 rotate-45 pointer-events-none"></div>
                      </div>
                    )}

                    {/* Open Seats Toggle - Only relevant for All/Pending */}
                    {(statusFilter === 'ALL' || statusFilter === 'PENDING') && (
                      <button 
                          onClick={() => onShowOpenOnlyChange(!showOpenOnly)}
                          className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm border transition-all whitespace-nowrap font-medium shadow-sm flex-1 md:flex-none ${
                              showOpenOnly 
                              ? 'bg-secondary/10 border-secondary text-secondary shadow-[0_0_10px_rgba(236,72,153,0.2)]' 
                              : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-slate-200 hover:border-slate-500'
                          }`}
                      >
                          <Users className="w-4 h-4" />
                          <span>Open Seats</span>
                      </button>
                    )}
                </div>
             </div>
          )}
       </div>
    </div>
  );
};
