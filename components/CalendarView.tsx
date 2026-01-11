
import React, { useState, useRef } from 'react';
import { SocialEvent, User } from '../lib/types';
import { getTheme } from '../lib/constants';
import { ChevronLeft, ChevronRight, Clock, Crown, CheckCircle2 } from 'lucide-react';

interface CalendarViewProps {
  events: SocialEvent[];
  onEventClick: (e: SocialEvent) => void;
  currentUser: User;
}

type ViewMode = 'DAY' | '3DAY' | 'WEEK' | 'MONTH';

export const CalendarView: React.FC<CalendarViewProps> = ({ events, onEventClick, currentUser }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  // Default to DAY on mobile, WEEK on desktop
  const [mode, setMode] = useState<ViewMode>(() => {
    if (typeof window !== 'undefined') {
       return window.innerWidth < 768 ? 'DAY' : 'WEEK';
    }
    return 'WEEK';
  });

  // --- Touch / Swipe Logic ---
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
    touchStartY.current = e.targetTouches[0].clientY;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return;
    
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    
    const deltaX = touchStartX.current - touchEndX;
    const deltaY = touchStartY.current - touchEndY;

    // Minimum swipe distance (px)
    const minSwipeDistance = 50;

    // Check if swipe is horizontal and long enough
    if (Math.abs(deltaX) > minSwipeDistance && Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaX > 0) {
        // Swiped Left -> Go Next
        handleNext();
      } else {
        // Swiped Right -> Go Prev
        handlePrev();
      }
    }
    
    // Reset
    touchStartX.current = null;
    touchStartY.current = null;
  };

  // --- Date Helpers ---
  const getStartOfWeek = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day; // Adjust so Sunday is first
    return new Date(d.setDate(diff));
  };

  const addDays = (date: Date, days: number) => {
    const result = new Date(date);
    result.setDate(result.getDate() + days);
    return result;
  };

  // --- Navigation Logic ---
  const handlePrev = () => {
    const newDate = new Date(currentDate);
    if (mode === 'MONTH') newDate.setMonth(newDate.getMonth() - 1);
    else if (mode === 'WEEK') newDate.setDate(newDate.getDate() - 7);
    else if (mode === '3DAY') newDate.setDate(newDate.getDate() - 3);
    else newDate.setDate(newDate.getDate() - 1);
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (mode === 'MONTH') newDate.setMonth(newDate.getMonth() + 1);
    else if (mode === 'WEEK') newDate.setDate(newDate.getDate() + 7);
    else if (mode === '3DAY') newDate.setDate(newDate.getDate() + 3);
    else newDate.setDate(newDate.getDate() + 1);
    setCurrentDate(newDate);
  };

  const handleToday = () => setCurrentDate(new Date());

  // --- Filtering Events ---
  const getEventsForDay = (date: Date) => {
    return events.filter(e => {
      const eDate = new Date(e.startTime);
      return eDate.getDate() === date.getDate() &&
             eDate.getMonth() === date.getMonth() &&
             eDate.getFullYear() === date.getFullYear();
    });
  };

  // --- Styles Helper ---
  const getEventStyles = (event: SocialEvent) => {
    const isHost = event.hostId === currentUser.id;
    const isAttending = event.attendees.includes(currentUser.id);
    const isInvolved = isHost || isAttending;
    const theme = getTheme(event.activityType);

    // Icons
    let icon = null;
    if (isHost) icon = <Crown className="w-3 h-3 shrink-0" />;
    else if (isAttending) icon = <CheckCircle2 className="w-3 h-3 shrink-0" />;

    // Base Style
    let classes = "";
    if (isInvolved) {
        // Solid Category Color
        classes = `${theme.bg} text-white border-transparent shadow-sm`;
    } else {
        // Outline Category Color, Dark BG
        classes = `bg-slate-800 ${theme.border} ${theme.text} border hover:bg-slate-700`;
    }

    return { classes, icon, isInvolved, theme };
  };

  // --- Renderers ---

  const renderHeader = () => {
    const dateFormat = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' });
    
    let title = "";
    if (mode === 'MONTH') {
      title = dateFormat.format(currentDate);
    } else if (mode === 'WEEK') {
      const weekStart = getStartOfWeek(currentDate);
      const weekEnd = addDays(weekStart, 6);
      const startStr = weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const endStr = weekEnd.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      title = `${startStr} - ${endStr}`;
    } else if (mode === '3DAY') {
      const end = addDays(currentDate, 2);
      const startStr = currentDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      title = `${startStr} - ${endStr}`;
    } else {
      title = currentDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    }

    const viewOptions: { id: ViewMode; label: string }[] = [
        { id: 'DAY', label: 'Day' },
        { id: '3DAY', label: '3 Day' },
        { id: 'WEEK', label: 'Week' },
        { id: 'MONTH', label: 'Month' },
    ];

    return (
      <div className="flex items-center justify-between p-2 md:p-4 bg-slate-800 border-b border-slate-700 shrink-0 z-10 gap-2">
        <div className="flex items-center gap-2 md:gap-4 overflow-hidden">
          {/* Title */}
          <h2 className="text-base md:text-xl font-bold text-white truncate whitespace-nowrap">{title}</h2>
          
          {/* Desktop Nav Controls (Hidden on Mobile) */}
          <div className="hidden md:flex items-center gap-2">
            <div className="flex bg-slate-900 rounded-lg p-0.5 border border-slate-700">
                <button onClick={handlePrev} className="p-1 md:p-1.5 hover:bg-slate-700 rounded-md text-slate-400 hover:text-white">
                <ChevronLeft className="w-5 h-5" />
                </button>
                <button onClick={handleNext} className="p-1 md:p-1.5 hover:bg-slate-700 rounded-md text-slate-400 hover:text-white">
                <ChevronRight className="w-5 h-5" />
                </button>
            </div>
            <button onClick={handleToday} className="text-xs md:text-sm px-2 md:px-3 py-1.5 rounded-md bg-slate-700 text-slate-300 hover:text-white hover:bg-slate-600 transition-colors">
                Today
            </button>
          </div>
        </div>

        {/* View Options */}
        <div className="flex bg-slate-900 rounded-lg p-0.5 md:p-1 border border-slate-700 shrink-0">
          {viewOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setMode(opt.id)}
              className={`px-3 py-1.5 text-[10px] md:text-xs font-bold rounded-md transition-all whitespace-nowrap ${
                mode === opt.id 
                  ? 'bg-primary text-white shadow-sm' 
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderMonthView = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = new Date(year, month, 1).getDay();
    const today = new Date();

    return (
      <div className="flex flex-col h-full bg-slate-800 select-none">
        {/* Days Header */}
        <div className="grid grid-cols-7 border-b border-slate-700 bg-slate-800/80 backdrop-blur shrink-0">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
            <div key={day} className="py-2 text-center text-[10px] md:text-xs font-bold text-slate-500 uppercase">
              {day}
            </div>
          ))}
        </div>
        
        {/* Grid */}
        <div className="grid grid-cols-7 flex-1 auto-rows-fr bg-slate-700 gap-[1px] border-b border-l border-slate-700 overflow-y-auto">
           {/* Padding Days */}
           {Array.from({ length: firstDayOfMonth }).map((_, i) => (
             <div key={`empty-${i}`} className="bg-slate-900/30 min-h-[60px] md:min-h-[80px]" />
           ))}
           
           {/* Actual Days */}
           {Array.from({ length: daysInMonth }).map((_, i) => {
             const day = i + 1;
             const date = new Date(year, month, day);
             const dayEvents = getEventsForDay(date);
             const isToday = today.getDate() === day && today.getMonth() === month && today.getFullYear() === year;

             return (
               <div key={day} className="bg-slate-900 p-1 md:p-2 min-h-[60px] md:min-h-[80px] hover:bg-slate-800 transition-colors group relative flex flex-col gap-1">
                 <div className={`text-[10px] md:text-xs font-bold w-5 h-5 md:w-6 md:h-6 flex items-center justify-center rounded-full mb-0.5 md:mb-1 ${isToday ? 'bg-primary text-white' : 'text-slate-400'}`}>
                   {day}
                 </div>
                 <div className="flex-1 space-y-1 overflow-y-auto custom-scrollbar">
                   {dayEvents.map(event => {
                     const { classes, icon } = getEventStyles(event);
                     return (
                       <div 
                         key={event.id}
                         onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                         className={`
                           flex items-center gap-1 text-[9px] md:text-[10px] px-1 py-0.5 md:px-1.5 md:py-1 rounded 
                           truncate cursor-pointer transition-colors ${classes}
                         `}
                       >
                         {icon}
                         <span className="truncate hidden md:inline">
                           {new Date(event.startTime).toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'}).toLowerCase()} {event.title}
                         </span>
                         <span className="truncate md:hidden">
                            {event.title}
                         </span>
                       </div>
                     )
                   })}
                 </div>
               </div>
             );
           })}
           {/* End Padding */}
           {Array.from({ length: (7 - (firstDayOfMonth + daysInMonth) % 7) % 7 }).map((_, i) => (
              <div key={`end-empty-${i}`} className="bg-slate-900/30" />
           ))}
        </div>
      </div>
    );
  };

  const renderTimeGrid = (days: Date[]) => {
    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
      <div className="flex flex-col h-full bg-slate-900 overflow-hidden select-none">
        {/* Header Row */}
        <div className="flex border-b border-slate-700 bg-slate-800 shrink-0 pl-10 md:pl-16">
          {days.map((date, i) => {
             const isToday = new Date().toDateString() === date.toDateString();
             return (
              <div key={i} className={`flex-1 py-2 md:py-3 text-center border-r border-slate-700 last:border-r-0 ${isToday ? 'bg-primary/5' : ''}`}>
                <div className={`text-[10px] md:text-xs uppercase font-bold ${isToday ? 'text-primary' : 'text-slate-500'}`}>
                  {date.toLocaleDateString('en-US', { weekday: 'short' })}
                </div>
                <div className={`text-sm md:text-lg font-bold ${isToday ? 'text-primary' : 'text-white'}`}>
                  {date.getDate()}
                </div>
              </div>
             );
          })}
        </div>

        {/* Scrollable Grid */}
        <div className="flex-1 overflow-y-auto custom-scrollbar relative">
           <div className="flex relative min-h-[1440px]"> {/* 24h * 60px */}
              
              {/* Time Axis */}
              <div className="w-10 md:w-16 shrink-0 border-r border-slate-700 bg-slate-900 sticky left-0 z-20 text-[10px] md:text-xs text-slate-500 font-medium">
                 {hours.map(h => (
                   <div key={h} className="h-[60px] border-b border-slate-800 relative">
                     <span className="absolute -top-2.5 right-1 md:right-2 bg-slate-900 px-1">
                       {h === 0 ? '12a' : h < 12 ? `${h}a` : h === 12 ? '12p' : `${h-12}p`}
                     </span>
                   </div>
                 ))}
              </div>

              {/* Day Columns */}
              {days.map((date, i) => {
                const dayEvents = getEventsForDay(date);
                const isToday = new Date().toDateString() === date.toDateString();

                return (
                  <div key={i} className={`flex-1 border-r border-slate-800 relative last:border-r-0 ${isToday ? 'bg-slate-800/20' : ''}`}>
                     {/* Hour lines */}
                     {hours.map(h => (
                       <div key={h} className="h-[60px] border-b border-slate-800/50"></div>
                     ))}
                     
                     {/* Current Time Indicator Line (if today) */}
                     {isToday && (
                       <div 
                         className="absolute w-full h-[2px] bg-red-500 z-20 pointer-events-none flex items-center"
                         style={{ top: `${(new Date().getHours() * 60 + new Date().getMinutes())}px` }}
                       >
                         <div className="w-2 h-2 rounded-full bg-red-500 -ml-1"></div>
                       </div>
                     )}

                     {/* Events */}
                     {dayEvents.map(event => {
                       const start = new Date(event.startTime);
                       const startMinutes = start.getHours() * 60 + start.getMinutes();
                       const duration = 60; // simplified for this demo
                       const { classes, icon, isInvolved, theme } = getEventStyles(event);

                       return (
                         <div
                           key={event.id}
                           onClick={(e) => { e.stopPropagation(); onEventClick(event); }}
                           className={`
                             absolute left-0.5 right-0.5 md:left-1 md:right-1 rounded md:rounded-md p-1 md:p-2 cursor-pointer overflow-hidden transition-all text-xs z-10 group 
                             ${classes}
                           `}
                           style={{
                             top: `${startMinutes}px`,
                             height: `${duration}px`,
                             minHeight: '40px'
                           }}
                         >
                            <div className="flex items-center gap-1 mb-0.5">
                               {icon}
                               <div className={`font-bold truncate text-[10px] md:text-xs ${isInvolved ? 'text-white' : theme.text}`}>
                                 {event.title}
                               </div>
                            </div>
                            <div className={`truncate flex items-center gap-1 text-[10px] ${isInvolved ? 'text-white/80' : 'text-slate-400'}`}>
                               <Clock className="w-3 h-3 hidden md:block" />
                               {start.toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'})}
                            </div>
                         </div>
                       );
                     })}
                  </div>
                );
              })}
           </div>
        </div>
      </div>
    );
  };

  return (
    <div 
      className="flex flex-col h-full bg-slate-900/50 md:rounded-2xl md:border border-slate-700 overflow-hidden shadow-xl touch-pan-y"
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {renderHeader()}
      <div className="flex-1 overflow-hidden">
        {mode === 'MONTH' && renderMonthView()}
        {mode === 'WEEK' && renderTimeGrid(Array.from({ length: 7 }, (_, i) => addDays(getStartOfWeek(currentDate), i)))}
        {mode === '3DAY' && renderTimeGrid(Array.from({ length: 3 }, (_, i) => addDays(currentDate, i)))}
        {mode === 'DAY' && renderTimeGrid([currentDate])}
      </div>
    </div>
  );
};
