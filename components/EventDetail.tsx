
import React, { useRef, useState, useEffect } from 'react';
import { Comment, EventVisibility, Group, SocialEvent, User } from '../lib/types';
import { getTheme } from '../lib/constants';
import { ArrowLeft, Calendar, Info, MapPin, MessageSquare, Save, Send, Users, X, CheckCircle2, EyeOff } from 'lucide-react';
import { fetchUser, fetchUsers } from '../services/userService';
import { TabGroup, type TabOption } from './TabGroup';
import { useRouterState } from '@tanstack/react-router';

interface EventDetailProps {
  event: SocialEvent;
  currentUser?: User | null;
  onClose?: () => void;
  onUpdateEvent: (updated: SocialEvent) => void;
  onDismiss?: () => void;
  onRequireAuth?: () => void;
  showBackButton?: boolean;
  layout?: 'shell' | 'public';
  mode?: 'view' | 'edit';
  edit?: {
    canEdit: boolean;
    isSaving?: boolean;
    primaryLabel?: string;
    groups?: Group[];
    groupsLoading?: boolean;
    onChange: (patch: Partial<SocialEvent>) => void;
    onSave: () => void;
    onCancel: () => void;
  };
}

function toLocalDateTimeInputValue(iso: string | undefined): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
}

export const EventDetail: React.FC<EventDetailProps> = ({
  event,
  currentUser,
  onClose,
  onUpdateEvent,
  onDismiss,
  onRequireAuth,
  showBackButton = true,
  layout = 'shell',
  mode = 'view',
  edit,
}) => {
  const { pathname } = useRouterState({ select: (s) => ({ pathname: s.location.pathname }) });
  const reserveBottomNavSpace = layout === 'shell' && !pathname.startsWith('/events/');
  const isEditMode = mode === 'edit' && !!edit;
  const canEdit = !!edit?.canEdit;

  const [commentText, setCommentText] = useState('');
  const [host, setHost] = useState<User | null>(null);
  const [attendeesList, setAttendeesList] = useState<User[]>([]);
  const [commentUsers, setCommentUsers] = useState<Map<string, User>>(new Map());
  const [activeTab, setActiveTab] = useState<'details' | 'going' | 'discussion'>('details');
  const miniMapContainerRef = useRef<HTMLDivElement>(null);
  const miniMapInstanceRef = useRef<any>(null);
  const miniMapMarkerRef = useRef<any>(null);
  const theme = getTheme(event.activityType);
  const currentUserId = currentUser?.id;
  const isGuest = !currentUserId;
  
  useEffect(() => {
    const loadUsers = async () => {
      // Fetch host
      const fetchedHost = await fetchUser(event.hostId, currentUserId);
      if (fetchedHost) {
        setHost(fetchedHost);
      }

      // Fetch attendees
      if (event.attendees.length > 0) {
        const fetchedAttendees = await fetchUsers(event.attendees, currentUserId);
        setAttendeesList(fetchedAttendees);
      }

      // Fetch comment authors
      const commentUserIds: string[] = event.comments.map(c => c.userId);
      if (commentUserIds.length > 0) {
        const uniqueCommentUserIds: string[] = [...new Set(commentUserIds)];
        const fetchedCommentUsers = await fetchUsers(uniqueCommentUserIds, currentUserId);
        const usersMap = new Map(fetchedCommentUsers.map(u => [u.id, u]));
        setCommentUsers(usersMap);
      }
    };
    loadUsers();
  }, [event.hostId, event.attendees, event.comments, currentUserId]);

  const isHost = !!currentUserId && event.hostId === currentUserId;
  const isAttending = !!currentUserId && event.attendees.includes(currentUserId);
  const isInvolved = isHost || isAttending;
  const startDate = new Date(event.startTime);
  const dateLabel = startDate
    .toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
    .replace(',', '');
  const timeLabel = startDate.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });
  const goingLabel = `${attendeesList.length}/${event.maxSeats || '∞'}`;
  const spotsLeft = event.maxSeats ? Math.max(event.maxSeats - attendeesList.length, 0) : null;

  const tabs: TabOption[] = isEditMode
    ? [{ id: 'details', label: 'Details', icon: <Info className="w-4 h-4" /> }]
    : [
        { id: 'details', label: 'Details', icon: <Info className="w-4 h-4" /> },
        { id: 'going', label: `Going (${goingLabel})`, icon: <Users className="w-4 h-4" /> },
        { id: 'discussion', label: `Discussion (${event.comments.length})`, icon: <MessageSquare className="w-4 h-4" /> },
      ];

  const openInMaps = () => {
    const lat = event.coordinates?.lat;
    const lng = event.coordinates?.lng;
    if (typeof lat !== 'number' || typeof lng !== 'number') return;

    const url = `https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleTabChange = (id: any) => {
    const tabId = String(id) as 'details' | 'going' | 'discussion';
    if (isEditMode) {
      setActiveTab('details');
      return;
    }
    if (isGuest && (tabId === 'going' || tabId === 'discussion')) {
      onRequireAuth?.();
      return;
    }
    setActiveTab(tabId);
  };

  useEffect(() => {
    if (activeTab !== 'details') return;
    if (!miniMapContainerRef.current) return;

    const L = (window as any)?.L;
    if (!L) return;

    const lat = event.coordinates?.lat;
    const lng = event.coordinates?.lng;
    if (typeof lat !== 'number' || typeof lng !== 'number') return;

    // Create once; update position on changes.
    if (!miniMapInstanceRef.current) {
      const map = L.map(miniMapContainerRef.current, {
        zoomControl: false,
        attributionControl: false,
        dragging: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        tap: false,
        touchZoom: false,
      }).setView([lat, lng], 15);

      // Use a lighter basemap for clarity (CartoDB Voyager)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxZoom: 20,
        opacity: 0.95,
      }).addTo(map);

      miniMapInstanceRef.current = map;
    } else {
      miniMapInstanceRef.current.setView([lat, lng], 15);
    }

    // Marker (recreate on changes)
    if (miniMapMarkerRef.current) {
      miniMapMarkerRef.current.remove();
      miniMapMarkerRef.current = null;
    }

    miniMapMarkerRef.current = L.circleMarker([lat, lng], {
      radius: 8,
      weight: 2,
      color: '#ffffff',
      fillColor: theme.hex,
      fillOpacity: 0.9,
    }).addTo(miniMapInstanceRef.current);

    return () => {
      // Keep the map instance while tabbing around; cleanup happens on unmount below.
    };
  }, [activeTab, event.coordinates?.lat, event.coordinates?.lng, theme.hex]);

  // If the Details tab unmounts its DOM (tab switch), Leaflet stays bound to a dead element.
  // Tear down the map when leaving Details so it can be recreated cleanly when returning.
  useEffect(() => {
    if (activeTab === 'details') return;
    if (miniMapInstanceRef.current) {
      miniMapInstanceRef.current.remove();
      miniMapInstanceRef.current = null;
    }
    miniMapMarkerRef.current = null;
  }, [activeTab]);

  useEffect(() => {
    return () => {
      if (miniMapInstanceRef.current) {
        miniMapInstanceRef.current.remove();
        miniMapInstanceRef.current = null;
      }
      miniMapMarkerRef.current = null;
    };
  }, []);

  const handleJoin = () => {
    if (isEditMode) return;
    if (isGuest) {
      onRequireAuth?.();
      return;
    }
    let newAttendees;
    if (isAttending) {
      newAttendees = event.attendees.filter(id => id !== currentUserId);
    } else {
      if (event.maxSeats && event.attendees.length >= event.maxSeats) return; // Full
      newAttendees = [...event.attendees, currentUserId!];
    }
    onUpdateEvent({ ...event, attendees: newAttendees });
  };

  const handlePostComment = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditMode) return;
    if (isGuest) {
      onRequireAuth?.();
      return;
    }
    if (!commentText.trim()) return;

    const newComment: Comment = {
      id: Date.now().toString(),
      userId: currentUserId!,
      text: commentText,
      timestamp: new Date().toISOString()
    };

    onUpdateEvent({ ...event, comments: [...event.comments, newComment] });
    setCommentText('');
  };

  return (
    <div
      className={`flex-1 overflow-y-auto custom-scrollbar bg-background text-slate-100 ${
        layout === 'shell' && reserveBottomNavSpace ? 'pb-44' : 'pb-28'
      } md:pb-10`}
    >
      {/* Hero / Header */}
      <div className="relative w-full h-56 md:h-72 bg-slate-800">
        <img
          src={`https://picsum.photos/seed/${event.id}/1200/800`}
          className="w-full h-full object-cover"
          alt="cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/45 to-transparent" />

        {showBackButton && onClose ? (
          <div className="absolute top-4 left-4">
            <button
              onClick={onClose}
              className="bg-black/40 hover:bg-black/60 p-2 rounded-full text-white backdrop-blur transition-all border border-white/10"
              type="button"
              aria-label="Back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>
        ) : null}

        <div className="absolute bottom-0 left-0 right-0">
          <div className="max-w-6xl mx-auto px-4 md:px-6 pb-5">
            {isEditMode && canEdit ? (
              <div className="flex flex-col md:flex-row md:items-center gap-3">
                <select
                  value={event.activityType}
                  onChange={(e) => edit?.onChange({ activityType: e.target.value })}
                  className="w-full md:w-auto bg-black/40 border border-white/10 rounded-xl py-2 px-3 text-white focus:border-primary outline-none"
                >
                  <option value="Social">Social</option>
                  <option value="Sport">Sport</option>
                  <option value="Entertainment">Entertainment</option>
                  <option value="Food">Food</option>
                  <option value="Work">Work</option>
                  <option value="Travel">Travel</option>
                </select>
                <div className="text-xs text-slate-300">Editing</div>
              </div>
            ) : (
              <div className={`inline-block px-2 py-0.5 rounded text-xs font-bold text-white ${theme.bg}`}>
                {event.activityType}
              </div>
            )}

            {isEditMode && canEdit ? (
              <input
                value={event.title}
                onChange={(e) => edit?.onChange({ title: e.target.value })}
                placeholder="Invite title"
                className="mt-2 mb-4 w-full text-3xl md:text-4xl font-bold text-white leading-tight bg-transparent border-b border-white/20 focus:border-primary outline-none"
              />
            ) : (
              <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight mt-2 mb-4">{event.title}</h1>
            )}
          </div>
        </div>
      </div>

      {/* Key facts */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 -mt-6 relative z-10">
        <div className="bg-surface/95 backdrop-blur border border-slate-800 rounded-2xl p-4 md:p-5 shadow-lg">
          {/* Mobile: host (left) + datetime (right) */}
          <div className="md:hidden flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              {host ? (
                <img
                  src={host.avatar}
                  className="w-10 h-10 rounded-full border-2 border-slate-700 shrink-0"
                  alt={host.name}
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-slate-700 animate-pulse border-2 border-slate-700 shrink-0" />
              )}
              <div className="min-w-0">
                <div className="text-xs text-slate-400">Hosted by</div>
                <div className="font-bold text-white truncate">{host?.name || 'Loading...'}</div>
              </div>
            </div>

            <div className="text-right shrink-0">
              {isEditMode && canEdit ? (
                <input
                  type="datetime-local"
                  value={toLocalDateTimeInputValue(event.startTime)}
                  onChange={(e) =>
                    edit?.onChange({
                      startTime: e.target.value ? new Date(e.target.value).toISOString() : event.startTime,
                    })
                  }
                  className="bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-white focus:border-primary outline-none [color-scheme:dark]"
                />
              ) : (
                <>
                  <div className="font-bold text-white leading-tight">{dateLabel}</div>
                  <div className="text-sm text-slate-400 leading-tight">
                    {timeLabel}
                    {event.isFlexibleStart && <span className="italic"> (Flexible)</span>}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:mt-0 mt-3">
            <div className="hidden md:flex items-start gap-3 p-3 rounded-xl bg-slate-900/40 border border-slate-800">
              <div className="p-2 bg-slate-800 rounded-lg shrink-0">
                <Calendar className="w-5 h-5 text-secondary" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">When</div>
                {isEditMode && canEdit ? (
                  <input
                    type="datetime-local"
                    value={toLocalDateTimeInputValue(event.startTime)}
                    onChange={(e) =>
                      edit?.onChange({
                        startTime: e.target.value ? new Date(e.target.value).toISOString() : event.startTime,
                      })
                    }
                    className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-white focus:border-primary outline-none [color-scheme:dark]"
                  />
                ) : (
                  <>
                    <div className="font-bold text-white truncate">{dateLabel}</div>
                    <div className="text-sm text-slate-400">
                      {timeLabel}
                      {event.isFlexibleStart && <span className="italic"> (Flexible)</span>}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="hidden md:flex items-start gap-3 p-3 rounded-xl bg-slate-900/40 border border-slate-800">
              <div className="p-2 bg-slate-800 rounded-lg shrink-0">
                <MapPin className="w-5 h-5 text-accent" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Where</div>
                {isEditMode && canEdit ? (
                  <input
                    value={event.location}
                    onChange={(e) => edit?.onChange({ location: e.target.value })}
                    placeholder="Location"
                    className="mt-1 w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-white focus:border-primary outline-none"
                  />
                ) : (
                  <div className="font-bold text-white truncate">{event.location}</div>
                )}
                <button
                  className="text-sm text-slate-500 underline decoration-slate-600 decoration-dashed hover:text-slate-300 transition-colors"
                  type="button"
                  onClick={openInMaps}
                >
                  View on map
                </button>
              </div>
            </div>

            <div className="hidden md:flex items-start gap-3 p-3 rounded-xl bg-slate-900/40 border border-slate-800">
              <div className="p-2 bg-slate-800 rounded-lg shrink-0">
                <Users className="w-5 h-5 text-slate-300" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Seats</div>
                {isEditMode && canEdit ? (
                  <div className="mt-1">
                    <input
                      type="number"
                      min={1}
                      value={event.maxSeats ?? ''}
                      onChange={(e) => edit?.onChange({ maxSeats: e.target.value === '' ? undefined : Number(e.target.value) })}
                      placeholder="Unlimited"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-white focus:border-primary outline-none"
                    />
                    <div className="text-xs text-slate-500 mt-1">Leave blank for unlimited.</div>
                  </div>
                ) : (
                  <>
                    <div className="font-bold text-white truncate">{goingLabel} going</div>
                    {spotsLeft !== null ? (
                      <div className="text-sm text-slate-400">{spotsLeft} spots left</div>
                    ) : (
                      <div className="text-sm text-slate-500">No limit</div>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Body */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 grid grid-cols-1 md:grid-cols-[1fr_320px] lg:grid-cols-[1fr_360px] gap-6">
        {/* Left: tabbed content */}
        <div className="space-y-4 min-w-0">
          <TabGroup tabs={tabs} activeTab={activeTab} onChange={handleTabChange} />

          {activeTab === 'details' ? (
            <div className="space-y-4">
              <div className="bg-surface border border-slate-700 rounded-2xl p-5">
                <h2 className="text-lg font-bold text-white mb-3">About</h2>
                {isEditMode && canEdit ? (
                  <textarea
                    value={event.description}
                    onChange={(e) => edit?.onChange({ description: e.target.value })}
                    placeholder="What’s the vibe?"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg py-3 px-4 text-white focus:border-primary outline-none h-32 resize-none"
                  />
                ) : (
                  <div className="text-slate-300 leading-relaxed text-base whitespace-pre-wrap">{event.description}</div>
                )}
              </div>

              {isEditMode && canEdit ? (
                <div className="bg-surface border border-slate-700 rounded-2xl p-5 space-y-4">
                  <h2 className="text-lg font-bold text-white">Settings</h2>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer bg-slate-800/40 p-3 rounded-xl border border-slate-800">
                      <input
                        type="checkbox"
                        checked={event.isFlexibleStart}
                        onChange={(e) => edit?.onChange({ isFlexibleStart: e.target.checked })}
                        className="rounded bg-slate-800 border-slate-600 text-primary focus:ring-offset-slate-900"
                      />
                      Flexible start
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer bg-slate-800/40 p-3 rounded-xl border border-slate-800">
                      <input
                        type="checkbox"
                        checked={event.isFlexibleEnd}
                        onChange={(e) => edit?.onChange({ isFlexibleEnd: e.target.checked })}
                        className="rounded bg-slate-800 border-slate-600 text-primary focus:ring-offset-slate-900"
                      />
                      Flexible end
                    </label>
                    <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer bg-slate-800/40 p-3 rounded-xl border border-slate-800">
                      <input
                        type="checkbox"
                        checked={event.noPhones}
                        onChange={(e) => edit?.onChange({ noPhones: e.target.checked })}
                        className="rounded bg-slate-800 border-slate-600 text-primary focus:ring-offset-slate-900"
                      />
                      No phones
                    </label>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Visibility</div>
                      <select
                        value={event.visibilityType}
                        onChange={(e) => {
                          const next = e.target.value as EventVisibility;
                          edit?.onChange({
                            visibilityType: next,
                            groupIds: next === EventVisibility.GROUPS ? event.groupIds : [],
                            allowFriendInvites: next === EventVisibility.INVITE_ONLY ? event.allowFriendInvites : false,
                          });
                        }}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-white focus:border-primary outline-none"
                      >
                        <option value={EventVisibility.ALL_FRIENDS}>All friends</option>
                        <option value={EventVisibility.GROUPS}>Groups</option>
                        <option value={EventVisibility.INVITE_ONLY}>Invite only</option>
                      </select>
                    </div>

                    {event.visibilityType === EventVisibility.INVITE_ONLY ? (
                      <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer bg-slate-800/40 p-3 rounded-xl border border-slate-800">
                        <input
                          type="checkbox"
                          checked={event.allowFriendInvites}
                          onChange={(e) => edit?.onChange({ allowFriendInvites: e.target.checked })}
                          className="rounded bg-slate-800 border-slate-600 text-primary focus:ring-offset-slate-900"
                        />
                        Allow friends to invite others
                      </label>
                    ) : (
                      <div className="text-sm text-slate-500 flex items-center"> </div>
                    )}
                  </div>

                  {event.visibilityType === EventVisibility.GROUPS ? (
                    <div className="space-y-2">
                      <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Groups</div>
                      <div className="bg-slate-900 border border-slate-700 rounded-xl p-2 max-h-44 overflow-y-auto custom-scrollbar space-y-1">
                        {edit?.groupsLoading ? (
                          <div className="text-sm text-slate-500 p-2">Loading groups…</div>
                        ) : (edit?.groups?.length ?? 0) === 0 ? (
                          <div className="text-sm text-slate-500 p-2">No groups found.</div>
                        ) : (
                          (edit?.groups ?? []).map((g) => {
                            const checked = event.groupIds.includes(g.id);
                            return (
                              <label
                                key={g.id}
                                className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer p-2 hover:bg-slate-800 rounded"
                              >
                                <input
                                  type="checkbox"
                                  checked={checked}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      edit?.onChange({ groupIds: [...event.groupIds, g.id] });
                                    } else {
                                      edit?.onChange({ groupIds: event.groupIds.filter((id) => id !== g.id) });
                                    }
                                  }}
                                  className="rounded bg-slate-800 border-slate-600 text-primary focus:ring-offset-slate-900"
                                />
                                <span>{g.name}</span>
                              </label>
                            );
                          })
                        )}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="bg-surface border border-slate-700 rounded-2xl p-5">
                <h2 className="text-lg font-bold text-white mb-3">Location</h2>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-slate-800 rounded-lg shrink-0">
                    <MapPin className="w-5 h-5 text-accent" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-white">{event.location}</div>
                    <button
                      className="text-sm text-slate-500 underline decoration-slate-600 decoration-dashed hover:text-slate-300 transition-colors"
                      type="button"
                      onClick={openInMaps}
                    >
                      Open in maps
                    </button>
                  </div>
                </div>

                {/* Mini map preview */}
                <div className="mt-4 relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-900">
                  <div ref={miniMapContainerRef} className="w-full h-44 md:h-56" />
                  <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/25 via-transparent to-transparent" />
                  <div className="absolute bottom-3 right-3 pointer-events-auto">
                    <button
                      onClick={openInMaps}
                      className="text-xs font-bold px-3 py-2 rounded-xl bg-slate-900/80 backdrop-blur border border-slate-700 text-white hover:bg-slate-800 transition-colors"
                      type="button"
                    >
                      Open
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === 'going' ? (
            <div className="bg-surface border border-slate-700 rounded-2xl p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-slate-400" /> Going
                </h2>
                <div className="text-sm text-slate-400 font-medium">{goingLabel}</div>
              </div>

              <div className="flex flex-wrap gap-3">
                {attendeesList.map((u) => (
                  <div key={u.id} className="relative group cursor-pointer" title={u.name}>
                    <img src={u.avatar} className="w-12 h-12 rounded-full border-2 border-surface" alt={u.name} />
                    {host && u.id === host.id && (
                      <div className="absolute -top-1 -right-1 bg-yellow-500 text-black text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold border border-surface">
                        ★
                      </div>
                    )}
                  </div>
                ))}
                {event.maxSeats && attendeesList.length < event.maxSeats && (
                  <div className="w-12 h-12 rounded-full border-2 border-dashed border-slate-700 flex items-center justify-center text-slate-500 bg-slate-800/50">
                    <div className="text-xs font-medium">+{event.maxSeats - attendeesList.length}</div>
                  </div>
                )}
              </div>
            </div>
          ) : null}

          {activeTab === 'discussion' ? (
            <div className="bg-surface border border-slate-700 rounded-2xl p-5">
              <h2 className="text-lg font-bold text-white mb-4">Discussion</h2>

              <div className="space-y-6 mb-6">
                {event.comments.length === 0 && (
                  <div className="text-center py-8 bg-slate-800/30 rounded-xl border border-dashed border-slate-800">
                    <p className="text-slate-500 italic">No comments yet.</p>
                  </div>
                )}

                {event.comments.map((c) => {
                  const u = commentUsers.get(c.userId);
                  return (
                    <div key={c.id} className="flex gap-4">
                      {u ? (
                        <img src={u.avatar} className="w-10 h-10 rounded-full" alt={u.name} />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-slate-700 animate-pulse" />
                      )}
                      <div className="bg-slate-800 rounded-2xl rounded-tl-none p-4 flex-1">
                        <div className="flex justify-between items-baseline mb-1">
                          <span className="text-sm font-bold text-slate-200">{u?.name || 'Loading...'}</span>
                          <span className="text-[10px] text-slate-500">
                            {new Date(c.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-slate-300 leading-normal">{c.text}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              <form onSubmit={handlePostComment} className="relative">
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Ask a question or say hi..."
                  className="w-full bg-slate-900 border border-slate-700 rounded-full py-3.5 pl-5 pr-14 text-white focus:border-primary outline-none transition-colors"
                />
                <button
                  type="submit"
                  disabled={!commentText.trim()}
                  className="absolute right-2 top-2 p-1.5 bg-primary text-white rounded-full hover:bg-primary/90 disabled:opacity-50 disabled:bg-slate-700 transition-colors"
                >
                  <Send className="w-5 h-5" />
                </button>
              </form>
            </div>
          ) : null}
        </div>

        {/* Right: sticky action card (desktop) */}
        <aside className="hidden md:block">
          <div className="sticky top-6 space-y-4">
            <div className="bg-surface border border-slate-700 rounded-2xl p-5 shadow-sm">
              <div className="flex items-center gap-4">
                {host ? (
                  <img src={host.avatar} className="w-12 h-12 rounded-full border-2 border-slate-700" alt={host.name} />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-slate-700 animate-pulse border-2 border-slate-700" />
                )}
                <div className="min-w-0">
                  <div className="text-xs text-slate-400">Hosted by</div>
                  <div className="font-bold text-white text-lg truncate">{host?.name || 'Loading...'}</div>
                </div>
              </div>

              <div className="mt-4 pt-4 border-t border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-slate-400">Going</span>
                  <span className="font-bold text-white">{goingLabel}</span>
                </div>
                {spotsLeft !== null ? (
                  <div className="text-xs text-slate-500">{spotsLeft} spots left</div>
                ) : (
                  <div className="text-xs text-slate-600">No limit</div>
                )}
              </div>

              <div className="mt-5 space-y-3">
                {isEditMode ? (
                  <div className="space-y-3">
                    <button
                      onClick={() => edit?.onSave()}
                      disabled={!canEdit || !!edit?.isSaving}
                      className="w-full py-3 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all shadow-lg bg-primary hover:bg-primary/90 text-white shadow-primary/25 disabled:opacity-60"
                      type="button"
                    >
                      <Save className="w-5 h-5" /> {edit?.isSaving ? 'Saving…' : edit?.primaryLabel || 'Save'}
                    </button>
                    <button
                      onClick={() => edit?.onCancel()}
                      className="w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all border border-slate-700"
                      type="button"
                    >
                      <X className="w-5 h-5" /> Cancel
                    </button>
                  </div>
                ) : null}

                {onDismiss && !isInvolved && !isEditMode && (
                  <button
                    onClick={onDismiss}
                    className="w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all border border-slate-700"
                    type="button"
                  >
                    <EyeOff className="w-5 h-5" /> Hide
                  </button>
                )}

                {!isEditMode ? (
                  <button
                    onClick={handleJoin}
                    className={`w-full py-3 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all shadow-lg ${
                      isAttending
                        ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/50'
                        : 'bg-primary hover:bg-primary/90 text-white shadow-primary/25'
                    }`}
                    type="button"
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
                ) : null}
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Mobile action bar (fixed, above bottom nav) */}
      <div
        className={`md:hidden fixed left-0 right-0 ${
          reserveBottomNavSpace ? 'bottom-16' : 'bottom-0'
        } p-4 border-t border-slate-800 bg-surface/95 backdrop-blur z-[1200] pb-safe-area`}
      >
        <div className="max-w-6xl mx-auto flex gap-3">
          {isEditMode ? (
            <>
              <button
                onClick={() => edit?.onCancel()}
                className="w-1/3 py-3.5 rounded-2xl font-bold text-base flex items-center justify-center gap-2 bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all border border-slate-700"
                type="button"
              >
                <X className="w-5 h-5" /> Cancel
              </button>
              <button
                onClick={() => edit?.onSave()}
                disabled={!canEdit || !!edit?.isSaving}
                className="flex-1 py-3.5 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all shadow-lg bg-primary hover:bg-primary/90 text-white shadow-primary/25 disabled:opacity-60"
                type="button"
              >
                <Save className="w-5 h-5" /> {edit?.isSaving ? 'Saving…' : edit?.primaryLabel || 'Save'}
              </button>
            </>
          ) : null}

          {onDismiss && !isInvolved && !isEditMode && (
            <button
              onClick={onDismiss}
              className="w-1/3 py-3.5 rounded-2xl font-bold text-base flex items-center justify-center gap-2 bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-all border border-slate-700 hover:border-slate-600"
              type="button"
            >
              <EyeOff className="w-5 h-5" /> Hide
            </button>
          )}

          {!isEditMode ? (
            <button
              onClick={handleJoin}
              className={`flex-1 py-3.5 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all shadow-lg ${
                isAttending
                  ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/50'
                  : 'bg-primary hover:bg-primary/90 text-white shadow-primary/25'
              }`}
              type="button"
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
          ) : null}
        </div>
      </div>
    </div>
  );
};
