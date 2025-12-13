
import React from 'react';
import { SocialEvent, User, MyEventsMode } from '../types';
import { EventCard } from './EventCard';
import { CalendarX2 } from 'lucide-react';

interface MyEventsViewProps {
  events: SocialEvent[];
  currentUser: User;
  activeTab: MyEventsMode;
  onEventClick: (e: SocialEvent) => void;
}

export const MyEventsView: React.FC<MyEventsViewProps> = ({ events, currentUser, activeTab, onEventClick }) => {
  // Sort events by date
  const sortedEvents = [...events].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const hosting = sortedEvents.filter(e => e.hostId === currentUser.id);
  const attending = sortedEvents.filter(e => e.attendees.includes(currentUser.id) && e.hostId !== currentUser.id);

  const displayList = activeTab === 'HOSTING' ? hosting : attending;
  const emptyMessage = activeTab === 'HOSTING' 
    ? "You aren't hosting any upcoming events." 
    : "You haven't joined any other events yet.";
  const emptySub = activeTab === 'HOSTING'
    ? "Time to plan something fun!"
    : "Check the feed to see what friends are up to.";

  return (
    <div className="max-w-6xl mx-auto pb-20 pt-2">
      <div className="animate-fade-in-up">
        {displayList.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 bg-slate-800/30 rounded-2xl border border-dashed border-slate-700">
               <CalendarX2 className="w-16 h-16 text-slate-600 mb-4" />
               <p className="text-slate-400 font-medium text-lg">{emptyMessage}</p>
               <p className="text-slate-500 mt-1">{emptySub}</p>
            </div>
        ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {displayList.map(e => (
                    <EventCard key={e.id} event={e} onClick={() => onEventClick(e)} currentUser={currentUser} />
                ))}
            </div>
        )}
      </div>
    </div>
  );
};
