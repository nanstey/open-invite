
import React, { useState, useEffect } from 'react';
import { Notification, User } from '../lib/types';
import { MessageCircle, Bell, Calendar, Zap, Inbox, Check } from 'lucide-react';
import { fetchNotifications, markAllNotificationsAsRead } from '../services/notificationService';
import { fetchUsers } from '../services/userService';

export const AlertsView: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [users, setUsers] = useState<Map<string, User>>(new Map());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadNotifications = async () => {
      setLoading(true);
      try {
        const fetchedNotifications = await fetchNotifications();
        setNotifications(fetchedNotifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
        
        // Fetch all unique actor IDs
        const actorIds = fetchedNotifications
          .map(n => n.actorId)
          .filter((id): id is string => id !== undefined);
        
        if (actorIds.length > 0) {
          const uniqueActorIds = [...new Set(actorIds)];
          const fetchedUsers = await fetchUsers(uniqueActorIds);
          const usersMap = new Map(fetchedUsers.map(u => [u.id, u]));
          setUsers(usersMap);
        }
      } catch (error) {
        console.error('Error loading notifications:', error);
        setNotifications([]);
      } finally {
        setLoading(false);
      }
    };

    loadNotifications();
  }, []);

  const handleMarkAllAsRead = async () => {
    try {
      await markAllNotificationsAsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

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

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto pb-20 pt-4 px-4 flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-400">Loading notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto pb-20 pt-4 px-4 space-y-4 animate-fade-in">
        <div className="flex justify-end mb-2">
            <button 
              onClick={handleMarkAllAsRead}
              className="text-xs font-bold text-primary flex items-center gap-1 hover:text-white transition-colors"
            >
                <Check className="w-4 h-4" /> Mark all as read
            </button>
        </div>

        {notifications.length === 0 ? (
          <div className="text-center py-12 text-slate-400">
            <Bell className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>No notifications yet.</p>
          </div>
        ) : (
          notifications.map(n => {
            const actor = n.actorId ? users.get(n.actorId) : null;
            
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
          })
        )}
    </div>
  );
};
