import { Bell, Calendar, Check, Inbox, MessageCircle, Zap } from 'lucide-react';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import type { User } from '../../lib/types';
import { fetchUsers } from '../../services/userService';
import { useNotifications } from './NotificationsProvider';

export const AlertsView: React.FC = () => {
  const { notifications, loading, markAllAsRead } = useNotifications();
  const [users, setUsers] = useState<Map<string, User>>(new Map());
  // Actor ids we've already tried to fetch. Tracking *attempts* (not just resolved
  // users) means an actor the lookup can't return — e.g. a deleted account — is
  // requested once, not re-fetched on every subsequent stream change.
  const requestedActorIds = useRef<Set<string>>(new Set());

  // Resolve avatars for any actors we haven't fetched yet. Runs whenever the
  // notification stream changes (including realtime inserts), fetching only the gaps.
  useEffect(() => {
    const missingActorIds = [
      ...new Set(notifications.map(n => n.actorId).filter((id): id is string => id !== undefined)),
    ].filter(id => !requestedActorIds.current.has(id));

    if (missingActorIds.length === 0) {
      return;
    }

    for (const id of missingActorIds) {
      requestedActorIds.current.add(id);
    }

    let cancelled = false;
    fetchUsers(missingActorIds)
      .then(fetchedUsers => {
        if (cancelled || fetchedUsers.length === 0) {
          return;
        }
        setUsers(prev => {
          const next = new Map(prev);
          for (const u of fetchedUsers) {
            next.set(u.id, u);
          }
          return next;
        });
      })
      .catch(error => {
        // The request itself failed (network/etc.), so allow a retry on the next
        // change rather than marking these ids permanently attempted.
        for (const id of missingActorIds) {
          requestedActorIds.current.delete(id);
        }
        console.error('Error loading notification actors:', error);
      });

    return () => {
      cancelled = true;
    };
  }, [notifications]);

  const handleMarkAllAsRead = async () => {
    await markAllAsRead();
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'INVITE':
        return <Inbox className="w-5 h-5 text-primary" />;
      case 'COMMENT':
        return <MessageCircle className="w-5 h-5 text-blue-400" />;
      case 'REACTION':
        return <Zap className="w-5 h-5 text-yellow-400" />;
      case 'REMINDER':
        return <Calendar className="w-5 h-5 text-green-400" />;
      case 'SYSTEM':
        return <Bell className="w-5 h-5 text-slate-400" />;
      default:
        return <Bell className="w-5 h-5 text-slate-400" />;
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
          type="button"
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
            <div
              key={n.id}
              className={`p-4 rounded-xl border flex gap-4 transition-all hover:bg-slate-800/50 ${n.isRead ? 'bg-transparent border-slate-800 opacity-70' : 'bg-surface border-slate-700 shadow-md'}`}
            >
              <div className="relative shrink-0">
                {actor ? (
                  <div className="relative">
                    <img
                      src={actor.avatar}
                      alt={actor.name}
                      className="w-12 h-12 rounded-full border border-slate-600"
                    />
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
                  <h4
                    className={`text-sm font-bold truncate pr-2 ${n.isRead ? 'text-slate-400' : 'text-white'}`}
                  >
                    {n.title}
                  </h4>
                  <span className="text-[10px] text-slate-500 whitespace-nowrap">
                    {new Date(n.timestamp).toLocaleTimeString([], {
                      hour: 'numeric',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
                <p
                  className={`text-sm leading-snug ${n.isRead ? 'text-slate-500' : 'text-slate-300'}`}
                >
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
