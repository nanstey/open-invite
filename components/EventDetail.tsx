
import React, { useState } from 'react';
import { SocialEvent, User, Comment } from '../types';
import { USERS, getTheme } from '../constants';
import { X, Calendar, MapPin, Users, Send, CheckCircle2, EyeOff } from 'lucide-react';

interface EventDetailProps {
  event: SocialEvent;
  currentUser: User;
  onClose: () => void;
  onUpdateEvent: (updated: SocialEvent) => void;
  onDismiss?: () => void;
}

export const EventDetail: React.FC<EventDetailProps> = ({ event, currentUser, onClose, onUpdateEvent, onDismiss }) => {
  const [commentText, setCommentText] = useState('');
  const theme = getTheme(event.activityType);
  
  const host = USERS.find(u => u.id === event.hostId) || USERS[0];
  const isHost = event.hostId === currentUser.id;
  const isAttending = event.attendees.includes(currentUser.id);
  const isInvolved = isHost || isAttending;
  const attendeesList = USERS.filter(u => event.attendees.includes(u.id));

  const handleJoin = () => {
    let newAttendees;
    if (isAttending) {
      newAttendees = event.attendees.filter(id => id !== currentUser.id);
    } else {
      if (event.maxSeats && event.attendees.length >= event.maxSeats) return; // Full
      newAttendees = [...event.attendees, currentUser.id];
    }
    onUpdateEvent({ ...event, attendees: newAttendees });
  };

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!commentText.trim()) return;

    const newComment: Comment = {
      id: Date.now().toString(),
      userId: currentUser.id,
      text: commentText,
      timestamp: new Date().toISOString()
    };

    onUpdateEvent({ ...event, comments: [...event.comments, newComment] });
    setCommentText('');
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex justify-end">
      <div className="w-full md:max-w-md bg-surface h-full md:border-l border-slate-700 shadow-2xl flex flex-col animate-slide-in-right relative">
        
        {/* Fixed Close Button - Stays visible while scrolling */}
        <button 
            onClick={onClose} 
            className="absolute top-4 right-4 z-50 bg-black/40 hover:bg-black/60 p-2 rounded-full text-white backdrop-blur transition-all"
        >
            <X className="w-5 h-5" />
        </button>

        {/* Scrollable Content Area */}
        <div className="flex-1 overflow-y-auto custom-scrollbar relative bg-surface">
            
            {/* Header Image Area (Now part of scroll) */}
            <div className="relative h-64 md:h-56 bg-slate-800 shrink-0">
                <img 
                    src={`https://picsum.photos/seed/${event.id}/800/800`} 
                    className="w-full h-full object-cover opacity-70" 
                    alt="cover" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-surface via-surface/20 to-transparent" />
                
                <div className="absolute bottom-0 left-0 right-0 p-6 pt-12 bg-gradient-to-t from-surface to-transparent">
                    <div className={`inline-block px-2 py-0.5 rounded text-xs font-bold mb-2 text-white ${theme.bg}`}>
                    {event.activityType}
                    </div>
                    <h2 className="text-3xl font-bold text-white leading-tight shadow-black drop-shadow-md">{event.title}</h2>
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* Main Info */}
                <div className="space-y-4">
                    <div className="flex items-start gap-4">
                        <div className="p-2 bg-slate-800 rounded-lg shrink-0">
                            <Calendar className="w-6 h-6 text-secondary" />
                        </div>
                        <div>
                        <div className="font-bold text-lg text-white">
                            {new Date(event.startTime).toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })}
                        </div>
                        <div className="text-slate-400 font-medium">
                            {new Date(event.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            {event.isFlexibleStart && ' (Flexible)'}
                        </div>
                        </div>
                    </div>

                    <div className="flex items-start gap-4">
                        <div className="p-2 bg-slate-800 rounded-lg shrink-0">
                             <MapPin className="w-6 h-6 text-accent" />
                        </div>
                        <div>
                             <div className="font-bold text-lg text-white">{event.location}</div>
                             <div className="text-sm text-slate-500 underline decoration-slate-600 decoration-dashed cursor-pointer">View on map</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 pt-2 pb-4 border-b border-slate-800">
                        <img src={host.avatar} className="w-12 h-12 rounded-full border-2 border-slate-700" alt={host.name} />
                        <div>
                            <div className="text-sm text-slate-400">Hosted by</div>
                            <div className="font-bold text-white text-lg">{host.name}</div>
                        </div>
                    </div>
                </div>

                {/* Description */}
                <div className="text-slate-300 leading-relaxed text-base">
                    {event.description}
                </div>

                {/* Attendees */}
                <div>
                    <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-white flex items-center gap-2 text-lg">
                        <Users className="w-5 h-5 text-slate-400" /> Going ({attendeesList.length}/{event.maxSeats || '∞'})
                    </h3>
                    </div>
                    <div className="flex flex-wrap gap-3">
                    {attendeesList.map(u => (
                        <div key={u.id} className="relative group cursor-pointer" title={u.name}>
                        <img src={u.avatar} className="w-12 h-12 rounded-full border-2 border-surface" alt={u.name} />
                        {u.id === host.id && (
                            <div className="absolute -top-1 -right-1 bg-yellow-500 text-black text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold border border-surface">★</div>
                        )}
                        </div>
                    ))}
                    {event.maxSeats && attendeesList.length < event.maxSeats && (
                        <div className="w-12 h-12 rounded-full border-2 border-dashed border-slate-700 flex items-center justify-center text-slate-500 bg-slate-800/50">
                        <div className="text-xs font-medium">+{(event.maxSeats - attendeesList.length)}</div>
                        </div>
                    )}
                    </div>
                </div>

                {/* Chat / Comments */}
                <div className="pt-6 border-t border-slate-800">
                    <h3 className="font-bold text-white mb-6 text-lg">Discussion</h3>
                    <div className="space-y-6 mb-6">
                        {event.comments.length === 0 && (
                        <div className="text-center py-8 bg-slate-800/30 rounded-xl border border-dashed border-slate-800">
                            <p className="text-slate-500 italic">No comments yet.</p>
                        </div>
                        )}
                        {event.comments.map(c => {
                        const u = USERS.find(user => user.id === c.userId);
                        return (
                            <div key={c.id} className="flex gap-4">
                                <img src={u?.avatar} className="w-10 h-10 rounded-full" alt="avatar" />
                                <div className="bg-slate-800 rounded-2xl rounded-tl-none p-4 flex-1">
                                    <div className="flex justify-between items-baseline mb-1">
                                        <span className="text-sm font-bold text-slate-200">{u?.name}</span>
                                        <span className="text-[10px] text-slate-500">{new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                    </div>
                                    <p className="text-slate-300 leading-normal">{c.text}</p>
                                </div>
                            </div>
                        );
                        })}
                    </div>
                    
                    <form onSubmit={handlePostComment} className="relative mt-4">
                        <input 
                        value={commentText}
                        onChange={e => setCommentText(e.target.value)}
                        placeholder="Ask a question or say hi..." 
                        className="w-full bg-slate-900 border border-slate-700 rounded-full py-3.5 pl-5 pr-14 text-white focus:border-primary outline-none transition-colors"
                        />
                        <button type="submit" disabled={!commentText.trim()} className="absolute right-2 top-2 p-1.5 bg-primary text-white rounded-full hover:bg-primary/90 disabled:opacity-50 disabled:bg-slate-700 transition-colors">
                        <Send className="w-5 h-5" />
                        </button>
                    </form>
                </div>
                
                {/* Spacer for bottom bar */}
                <div className="h-20"></div>
            </div>
        </div>

        {/* Bottom Action Bar (Fixed) */}
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-800 bg-surface/95 backdrop-blur flex gap-3 z-40 pb-safe-area">
           {onDismiss && !isInvolved && (
             <button
               onClick={onDismiss}
               className="w-1/3 py-3.5 rounded-2xl font-bold text-base flex items-center justify-center gap-2 bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-all border border-slate-700 hover:border-slate-600"
             >
               <EyeOff className="w-5 h-5" /> Hide
             </button>
           )}

           <button 
             onClick={handleJoin}
             className={`flex-1 py-3.5 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all shadow-lg ${
               isAttending 
                 ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/50' 
                 : 'bg-primary hover:bg-primary/90 text-white shadow-primary/25'
             }`}
           >
              {isAttending ? (
                <>
                  <X className="w-5 h-5" /> Leave Event
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-5 h-5" /> I'm In!
                </>
              )}
           </button>
        </div>

      </div>
    </div>
  );
};
