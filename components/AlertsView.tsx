
import React from 'react';
import { MOCK_NOTIFICATIONS, USERS } from '../constants';
import { MessageCircle, Bell, Calendar, Zap, Inbox, Check } from 'lucide-react';

export const AlertsView: React.FC = () => {
  const notifications = MOCK_NOTIFICATIONS.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  const getIcon = (type: string) => {
    switch (type) {
        case 'INVITE': return <Inbox className="w-5 h-5 text-primary" />;
        case 'COMMENT': return <MessageCircle className="w-5 h-5 text-blue-400" />;
        case 'REACTION': return <Zap className="w-5 h-5 text-yellow-400" />;
        case 'REMINDER': return <Calendar className="w-5 h-5 text-green-400" />;
        case 'SYSTEM': return <Bell className="w-5 h-5 text-slate-400" />;
        default: return <Bell className="w-5 h-5 text-slate-400" />;
    }
  };

  return (
    <div className="max-w-3xl mx-auto pb-20 pt-4 px-4 space-y-4 animate-fade-in">
        <div className="flex justify-end mb-2">
            <button className="text-xs font-bold text-primary flex items-center gap-1 hover:text-white transition-colors">
                <Check className="w-4 h-4" /> Mark all as read
            </button>
        </div>

        {notifications.map(n => {
            const actor = n.actorId ? USERS.find(u => u.id === n.actorId) : null;
            
            return (
                <div key={n.id} className={`p-4 rounded-xl border flex gap-4 transition-all hover:bg-slate-800/50 ${n.isRead ? 'bg-transparent border-slate-800 opacity-70' : 'bg-surface border-slate-700 shadow-md'}`}>
                    <div className="relative shrink-0">
                        {actor ? (
                            <div className="relative">
                                <img src={actor.avatar} alt={actor.name} className="w-12 h-12 rounded-full border border-slate-600" />
                                <div className="absolute -bottom-1 -right-1 bg-slate-900 rounded-full p-1 border border-slate-700">
                                    {getIcon(n.type)}
                                </div>
                            </div>
                        ) : (
                            <div className="w-12 h-12 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                                {getIcon(n.type)}
                            </div>
                        )}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-start mb-0.5">
                            <h4 className={`text-sm font-bold truncate pr-2 ${n.isRead ? 'text-slate-400' : 'text-white'}`}>
                                {n.title}
                            </h4>
                            <span className="text-[10px] text-slate-500 whitespace-nowrap">
                                {new Date(n.timestamp).toLocaleTimeString([], {hour:'numeric', minute:'2-digit'})}
                            </span>
                        </div>
                        <p className={`text-sm leading-snug ${n.isRead ? 'text-slate-500' : 'text-slate-300'}`}>
                            {n.message}
                        </p>
                    </div>
                    
                    {!n.isRead && (
                        <div className="self-center">
                            <div className="w-2 h-2 rounded-full bg-primary"></div>
                        </div>
                    )}
                </div>
            );
        })}
    </div>
  );
};
