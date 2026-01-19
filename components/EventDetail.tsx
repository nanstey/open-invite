
import React, { useRef, useState, useEffect } from 'react';
import { Comment, EventVisibility, Group, SocialEvent, User } from '../lib/types';
import { getTheme } from '../lib/constants';
import { ArrowLeft, Calendar, Info, MapPin, MessageSquare, Save, Send, Users, X, CheckCircle2, EyeOff, Image as ImageIcon } from 'lucide-react';
import { fetchUser, fetchUsers } from '../services/userService';
import { TabGroup, type TabOption } from './TabGroup';
import { useRouterState } from '@tanstack/react-router';
import { FormSelect } from './FormControls';
import { LocationAutocomplete } from './LocationAutocomplete'
import { HeaderImageModal } from './HeaderImageModal'

interface EventDetailProps {
  event: SocialEvent;
  currentUser?: User | null;
  onClose?: () => void;
  onUpdateEvent: (updated: SocialEvent) => void;
  onDismiss?: () => void;
  onRequireAuth?: () => void;
  onEditRequested?: () => void;
  showBackButton?: boolean;
  layout?: 'shell' | 'public';
  mode?: 'view' | 'edit';
  edit?: {
    canEdit: boolean;
    isSaving?: boolean;
    primaryLabel?: string;
    groups?: Group[];
    groupsLoading?: boolean;
    errors?: Partial<Record<'title' | 'description' | 'startTime' | 'location' | 'activityType' | 'durationHours', string>>;
    startDateTimeLocal?: string;
    onChangeStartDateTimeLocal?: (value: string) => void;
    durationHours?: number | '';
    onChangeDurationHours?: (value: number | '') => void;
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

function splitLocalDateTime(value: string | undefined): { date: string; time: string } {
  if (!value) return { date: '', time: '' }
  const [date, time] = value.split('T')
  return { date: date ?? '', time: time ?? '' }
}

export const EventDetail: React.FC<EventDetailProps> = ({
  event,
  currentUser,
  onClose,
  onUpdateEvent,
  onDismiss,
  onRequireAuth,
  onEditRequested,
  showBackButton = true,
  layout = 'shell',
  mode = 'view',
  edit,
}) => {
  const { pathname } = useRouterState({ select: (s) => ({ pathname: s.location.pathname }) });
  const reserveBottomNavSpace = layout === 'shell' && !pathname.startsWith('/events/');
  const isEditMode = mode === 'edit' && !!edit;
  const canSave = !!edit?.canEdit;

  const [commentText, setCommentText] = useState('');
  const [host, setHost] = useState<User | null>(null);
  const [attendeesList, setAttendeesList] = useState<User[]>([]);
  const [commentUsers, setCommentUsers] = useState<Map<string, User>>(new Map());
  const [activeTab, setActiveTab] = useState<'details' | 'going' | 'discussion'>('details');
  const [showHeaderImageModal, setShowHeaderImageModal] = useState(false)
  const miniMapContainerRef = useRef<HTMLDivElement>(null);
  const miniMapInstanceRef = useRef<any>(null);
  const miniMapMarkerRef = useRef<any>(null);
  const theme = getTheme(event.activityType);
  const currentUserId = currentUser?.id;
  const isGuest = !currentUserId;

  const [draftDate, setDraftDate] = useState<string>('')
  const [draftTime, setDraftTime] = useState<string>('')

  useEffect(() => {
    if (!isEditMode) return
    const { date, time } = splitLocalDateTime(edit?.startDateTimeLocal)
    setDraftDate(date)
    setDraftTime(time)
  }, [edit?.startDateTimeLocal, isEditMode])
  
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
  const headerImageSrc = event.headerImageUrl || `https://picsum.photos/seed/${event.id}/1200/800`
  const formatDateLong = (date: Date) => {
    // Format exactly like: "Fri Jan 16, 2026"
    // (no comma after weekday; comma between day and year)
    const parts = new Intl.DateTimeFormat('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).formatToParts(date)

    const get = (type: Intl.DateTimeFormatPartTypes) =>
      parts.find((p) => p.type === type)?.value ?? ''

    const weekday = get('weekday')
    const month = get('month')
    const day = get('day')
    const year = get('year')

    return `${weekday} ${month} ${day}, ${year}`.trim()
  }

  const formatTime = (date: Date) =>
    new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).format(date)

  const startDate = new Date(event.startTime);
  const endDate = event.endTime ? new Date(event.endTime) : null
  const durationMs = endDate ? endDate.getTime() - startDate.getTime() : null
  // Display rule:
  // - If duration < 24h: show single date line + time range (even if it crosses midnight)
  // - If duration >= 24h: show multi-day (start date+time, end date+time)
  const showMultiDay = !!endDate && typeof durationMs === 'number' && durationMs >= 24 * 60 * 60 * 1000

  const startDateText = formatDateLong(startDate)
  const startTimeText = formatTime(startDate)
  const endDateText = endDate ? formatDateLong(endDate) : null
  const endTimeText = endDate ? formatTime(endDate) : null
  const timeRangeText = endTimeText ? `${startTimeText} - ${endTimeText}` : startTimeText
  const attendeeCount = attendeesList.length;
  const goingLabel = event.maxSeats ? `${attendeeCount}/${event.maxSeats}` : `${attendeeCount}`;
  const spotsLeft = event.maxSeats ? Math.max(event.maxSeats - attendeesList.length, 0) : null;

  const timeOptions = React.useMemo(() => {
    const opts: { value: string; label: string }[] = []
    for (let m = 0; m < 24 * 60; m += 15) {
      const hh = Math.floor(m / 60)
      const mm = m % 60
      const value = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`
      const hour12 = hh % 12 === 0 ? 12 : hh % 12
      const ampm = hh < 12 ? 'AM' : 'PM'
      const label = `${hour12}:${String(mm).padStart(2, '0')} ${ampm}`
      opts.push({ value, label })
    }
    return opts
  }, [])

  const tabs: TabOption[] = [
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

  const hasCoordinates = typeof event.coordinates?.lat === 'number' && typeof event.coordinates?.lng === 'number'

  const handleTabChange = (id: any) => {
    const tabId = String(id) as 'details' | 'going' | 'discussion';
    if (isGuest && (tabId === 'going' || tabId === 'discussion')) {
      onRequireAuth?.();
      return;
    }
    setActiveTab(tabId);
  };

  function formatLocationForDisplay(raw: string): { primary: string; secondary?: string } {
    const data = event.locationData
    if (data?.display?.placeName) {
      const primary = data.display.placeName
      const secondary = [data.display.addressLine, data.display.localityLine].filter(Boolean).join(', ') || undefined
      return { primary, secondary }
    }

    const value = String(raw ?? '').trim()
    if (!value) return { primary: '' }

    // Best-effort formatting for comma-separated address strings like:
    // "Place Name, 123 Main St, City, State, Postal, Country"
    const parts = value.split(',').map((p) => p.trim()).filter(Boolean)
    if (parts.length <= 1) return { primary: value }

    const primary = parts[0] ?? value
    const secondaryParts = parts.slice(1, 3)
    const secondary = secondaryParts.length ? secondaryParts.join(', ') : undefined
    return { primary, secondary }
  }

  const destroyMiniMap = React.useCallback(() => {
    if (miniMapInstanceRef.current) {
      miniMapInstanceRef.current.remove();
      miniMapInstanceRef.current = null;
    }
    miniMapMarkerRef.current = null;

    // Leaflet can leave bookkeeping on the container element; clear it so re-init is reliable.
    const el = miniMapContainerRef.current as any;
    if (el) {
      try {
        delete el._leaflet_id;
      } catch {
        // ignore
      }
      // Ensure leftover panes/tiles don't linger.
      if (typeof el.innerHTML === 'string') el.innerHTML = '';
    }
  }, []);

  useEffect(() => {
    if (activeTab !== 'details') return;
    if (!miniMapContainerRef.current) return;

    const L = (window as any)?.L;
    if (!L) return;

    const lat = event.coordinates?.lat;
    const lng = event.coordinates?.lng;
    if (typeof lat !== 'number' || typeof lng !== 'number') {
      // If the mini map container is mounted but we no longer have coordinates,
      // tear down any existing Leaflet instance so we don't keep a map bound to a dead element.
      destroyMiniMap();
      return;
    }

    // Create once; update position on changes.
    if (!miniMapInstanceRef.current) {
      // If a previous map was removed, Leaflet may still think this container is initialized.
      const el = miniMapContainerRef.current as any;
      if (el) {
        try {
          delete el._leaflet_id;
        } catch {
          // ignore
        }
        if (typeof el.innerHTML === 'string') el.innerHTML = '';
      }

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

    // Leaflet sometimes needs a size invalidation when a map is created/updated as a result
    // of dynamic UI changes (like selecting an autocomplete option).
    const map = miniMapInstanceRef.current;
    if (map?.invalidateSize) {
      requestAnimationFrame(() => {
        try {
          map.invalidateSize(true);
        } catch {
          // ignore
        }
      });
    }

    return () => {
      // Keep the map instance while tabbing around; cleanup happens on unmount below.
    };
  }, [activeTab, destroyMiniMap, event.coordinates?.lat, event.coordinates?.lng, theme.hex]);

  // If the Details tab unmounts its DOM (tab switch), Leaflet stays bound to a dead element.
  // Tear down the map when leaving Details so it can be recreated cleanly when returning.
  useEffect(() => {
    if (activeTab === 'details') return;
    destroyMiniMap();
  }, [activeTab]);

  useEffect(() => {
    return () => {
      destroyMiniMap();
    };
  }, []);

  const handleJoin = () => {
    if (isEditMode) return;
    if (isHost) return;
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
          src={headerImageSrc}
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
            <div className={`inline-block px-2 py-0.5 rounded text-xs font-bold text-white ${theme.bg}`}>
              {event.activityType}
            </div>
            <div className="flex items-end justify-between gap-4 mt-2 mb-4">
              <h1 className="text-3xl md:text-4xl font-bold text-white leading-tight min-w-0">
                {event.title || 'Untitled invite'}
              </h1>
              {isEditMode && isHost ? (
                <button
                  type="button"
                  onClick={() => setShowHeaderImageModal(true)}
                  className="shrink-0 bg-black/30 hover:bg-black/50 p-3 rounded-xl text-white backdrop-blur transition-all border border-white/10"
                  aria-label="Choose header image"
                  title="Choose header image"
                >
                  <ImageIcon className="w-6 h-6 md:w-5 md:h-5" />
                </button>
              ) : null}
            </div>
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
              {showMultiDay ? (
                <>
                  <div className="leading-tight text-white">
                    <span className="font-bold">{startDateText}</span>{' '}
                    <span className="font-normal text-slate-400">{startTimeText} -</span>
                  </div>
                  {endDateText && endTimeText && (
                    <div className="leading-tight text-white">
                      <span className="font-bold">{endDateText}</span>{' '}
                      <span className="font-normal text-slate-400">{endTimeText}</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="font-bold text-white leading-tight">{startDateText}</div>
                  <div className="text-sm text-slate-400 leading-tight">
                    {timeRangeText}
                    {event.isFlexibleStart && <span className="italic"> (Flexible)</span>}
                  </div>
                </>
              )}
              {showMultiDay && event.isFlexibleStart && (
                <div className="text-sm text-slate-400 leading-tight italic">(Flexible)</div>
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
                {showMultiDay ? (
                  <>
                    <div className="text-white leading-tight">
                      <span className="font-bold">{startDateText}</span>{' '}
                      <span className="font-normal text-slate-400">{startTimeText} -</span>
                    </div>
                    {endDateText && endTimeText && (
                      <div className="text-white leading-tight">
                        <span className="font-bold">{endDateText}</span>{' '}
                        <span className="font-normal text-slate-400">{endTimeText}</span>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    <div className="font-bold text-white">{startDateText}</div>
                    <div className="text-sm text-slate-400">
                      {timeRangeText}
                      {event.isFlexibleStart && <span className="italic"> (Flexible)</span>}
                    </div>
                  </>
                )}
                {showMultiDay && event.isFlexibleStart && (
                  <div className="text-sm text-slate-400 italic">(Flexible)</div>
                )}
              </div>
            </div>

            <div className="hidden md:flex items-start gap-3 p-3 rounded-xl bg-slate-900/40 border border-slate-800">
              <div className="p-2 bg-slate-800 rounded-lg shrink-0">
                <MapPin className="w-5 h-5 text-accent" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Where</div>
                <div className="font-bold text-white truncate">{formatLocationForDisplay(event.location).primary}</div>
                {hasCoordinates ? (
                  <button
                    className="text-sm text-slate-500 underline decoration-slate-600 decoration-dashed hover:text-slate-300 transition-colors"
                    type="button"
                    onClick={openInMaps}
                  >
                    Open in maps
                  </button>
                ) : null}
              </div>
            </div>

            <div className="hidden md:flex items-start gap-3 p-3 rounded-xl bg-slate-900/40 border border-slate-800">
              <div className="p-2 bg-slate-800 rounded-lg shrink-0">
                <Users className="w-5 h-5 text-slate-300" />
              </div>
              <div className="min-w-0">
                <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Seats</div>
                {isEditMode ? (
                  <div className="mt-1">
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={event.maxSeats ?? ''}
                      onChange={(e) => {
                        const raw = e.target.value
                        const n = raw === '' ? undefined : Number(raw)
                        edit?.onChange({ maxSeats: n && n > 0 ? n : undefined })
                      }}
                      placeholder="Unlimited"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-white focus:border-primary outline-none"
                    />
                    <div className="text-xs text-slate-500 mt-1">Leave blank for unlimited.</div>
                  </div>
                ) : (
                  <>
                    <div className="font-bold text-white truncate">
                      {event.maxSeats ? `${goingLabel} going` : `${attendeeCount} going`}
                    </div>
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

      {/* Hosted by / actions (squishy desktop: lg -> <xl) */}
      {layout === 'shell' ? (
        <div className="hidden md:block xl:hidden max-w-6xl mx-auto px-4 md:px-6 py-4">
          <div className="bg-surface border border-slate-700 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                {host ? (
                  <img src={host.avatar} className="w-12 h-12 rounded-full border-2 border-slate-700" alt={host.name} />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-slate-700 animate-pulse border-2 border-slate-700" />
                )}
                <div className="min-w-0">
                  <div className="text-xs text-slate-400">{isEditMode ? 'Editing as' : 'Hosted by'}</div>
                  <div className="font-bold text-white text-lg truncate">{host?.name || 'Loading...'}</div>
                </div>
              </div>

              <div className="text-right shrink-0">
                <div className="text-xs text-slate-400">Going</div>
                <div className="font-bold text-white">{goingLabel}</div>
                {spotsLeft !== null ? (
                  <div className="text-xs text-slate-500">{spotsLeft} left</div>
                ) : (
                  <div className="text-xs text-slate-600">No limit</div>
                )}
              </div>
            </div>

            <div className="mt-5 flex gap-3">
              {isEditMode ? (
                <>
                  <button
                    onClick={() => edit?.onCancel()}
                    className="w-1/3 py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all border border-slate-700"
                    type="button"
                  >
                    <X className="w-5 h-5" /> Cancel
                  </button>
                  <button
                    onClick={() => edit?.onSave()}
                    disabled={!!edit?.isSaving}
                    aria-disabled={!canSave}
                    className={`flex-1 py-3 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all shadow-lg ${
                      canSave ? 'bg-primary hover:bg-primary/90 text-white shadow-primary/25' : 'bg-slate-700 text-slate-300'
                    } disabled:opacity-60`}
                    type="button"
                  >
                    <Save className="w-5 h-5" /> {edit?.isSaving ? 'Saving…' : edit?.primaryLabel || 'Save'}
                  </button>
                </>
              ) : (
                <>
                  {onDismiss && !isInvolved ? (
                    <button
                      onClick={onDismiss}
                      className="py-3 px-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all border border-slate-700"
                      type="button"
                    >
                      <EyeOff className="w-5 h-5" /> Hide
                    </button>
                  ) : null}

                  {isHost ? (
                    <button
                      onClick={() => onEditRequested?.()}
                      className="flex-1 py-3 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all shadow-lg bg-primary hover:bg-primary/90 text-white shadow-primary/25"
                      type="button"
                    >
                      <Save className="w-5 h-5" /> Edit Event
                    </button>
                  ) : (
                    <button
                      onClick={handleJoin}
                      className={`flex-1 py-3 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all shadow-lg ${
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
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Body */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-6">
        {/* Left: tabbed content */}
        <div className="space-y-4 min-w-0">
          <TabGroup tabs={tabs} activeTab={activeTab} onChange={handleTabChange} />

          {activeTab === 'details' ? (
            <div className="space-y-4">
              {isEditMode ? (
                <div className="bg-surface border border-slate-700 rounded-2xl p-5">
                  <h2 className="text-lg font-bold text-white mb-3">Title</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    <div className="md:col-span-2">
                      <input
                        value={event.title}
                        onChange={(e) => edit?.onChange({ title: e.target.value })}
                        placeholder="Invite title"
                        required
                        className={`w-full bg-slate-900 border rounded-lg py-3 px-4 text-white outline-none ${
                          edit?.errors?.title ? 'border-red-500 focus:border-red-500' : 'border-slate-700 focus:border-primary'
                        }`}
                      />
                      {edit?.errors?.title ? (
                        <div className="text-xs text-red-400 mt-1">{edit.errors.title}</div>
                      ) : null}
                    </div>
                    <div className="md:col-span-1">
                      <FormSelect
                        value={event.activityType}
                        onChange={(e) => edit?.onChange({ activityType: e.target.value })}
                        required
                        size="lg"
                        variant="surface"
                        className={edit?.errors?.activityType ? 'border-red-500 focus:border-red-500' : ''}
                      >
                        <option value="Social">Social</option>
                        <option value="Sport">Sport</option>
                        <option value="Entertainment">Entertainment</option>
                        <option value="Food">Food</option>
                        <option value="Work">Work</option>
                        <option value="Travel">Travel</option>
                      </FormSelect>
                      {edit?.errors?.activityType ? (
                        <div className="text-xs text-red-400 mt-1">{edit.errors.activityType}</div>
                      ) : null}
                    </div>
                  </div>
                </div>
              ) : null}

              <div className="bg-surface border border-slate-700 rounded-2xl p-5">
                <h2 className="text-lg font-bold text-white mb-3">About</h2>
                {isEditMode ? (
                  <textarea
                    value={event.description}
                    onChange={(e) => edit?.onChange({ description: e.target.value })}
                    placeholder="What’s the vibe?"
                    required
                    className={`w-full bg-slate-900 border rounded-lg py-3 px-4 text-white outline-none h-32 resize-none ${
                      edit?.errors?.description
                        ? 'border-red-500 focus:border-red-500'
                        : 'border-slate-700 focus:border-primary'
                    }`}
                  />
                ) : (
                  <div className="text-slate-300 leading-relaxed text-base whitespace-pre-wrap">{event.description}</div>
                )}
                {isEditMode && edit?.errors?.description ? (
                  <div className="text-xs text-red-400 mt-2">{edit.errors.description}</div>
                ) : null}
              </div>

              <div className="bg-surface border border-slate-700 rounded-2xl p-5">
                <h2 className="text-lg font-bold text-white mb-3">Date &amp; Time</h2>
                {isEditMode ? (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-1">
                      <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Date</div>
                      <input
                        type="date"
                        value={draftDate}
                        onChange={(e) => {
                          const nextDate = e.target.value
                          setDraftDate(nextDate)
                          const nextLocal = nextDate && draftTime ? `${nextDate}T${draftTime}` : ''
                          edit?.onChangeStartDateTimeLocal?.(nextLocal)
                        }}
                        required
                        className={`w-full bg-slate-900 border rounded-lg py-3 px-4 text-white outline-none [color-scheme:dark] ${
                          edit?.errors?.startTime
                            ? 'border-red-500 focus:border-red-500'
                            : 'border-slate-700 focus:border-primary'
                        }`}
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Time</div>
                      <FormSelect
                        value={draftTime}
                        onChange={(e) => {
                          const nextTime = e.target.value
                          setDraftTime(nextTime)
                          const nextLocal = draftDate && nextTime ? `${draftDate}T${nextTime}` : ''
                          edit?.onChangeStartDateTimeLocal?.(nextLocal)
                        }}
                        required
                        size="lg"
                        variant="surface"
                        className={edit?.errors?.startTime ? 'border-red-500 focus:border-red-500' : ''}
                      >
                        <option value="">Select time</option>
                        {timeOptions.map((t) => (
                          <option key={t.value} value={t.value}>
                            {t.label}
                          </option>
                        ))}
                      </FormSelect>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Duration (hours)</div>
                      <input
                        type="number"
                        min={0}
                        step={0.25}
                        value={edit?.durationHours ?? ''}
                        onChange={(e) => {
                          const raw = e.target.value
                          const next = raw === '' ? '' : Number(raw)
                          edit?.onChangeDurationHours?.(next === '' ? '' : next)
                        }}
                        placeholder="e.g. 2"
                        required
                        className={`w-full bg-slate-900 border rounded-lg py-3 px-4 text-white outline-none ${
                          edit?.errors?.durationHours
                            ? 'border-red-500 focus:border-red-500'
                            : 'border-slate-700 focus:border-primary'
                        }`}
                      />
                      {edit?.errors?.durationHours ? (
                        <div className="text-xs text-red-400 mt-1">{edit.errors.durationHours}</div>
                      ) : null}
                    </div>
                  </div>
                ) : (
                  <div className="text-slate-300">
                    {showMultiDay ? (
                      <>
                        <div className="leading-tight text-white">
                          <span className="font-bold">{startDateText}</span>{' '}
                          <span className="font-normal text-slate-400">{startTimeText} -</span>
                        </div>
                        {endDateText && endTimeText && (
                          <div className="leading-tight text-white">
                            <span className="font-bold">{endDateText}</span>{' '}
                            <span className="font-normal text-slate-400">{endTimeText}</span>
                          </div>
                        )}
                      </>
                    ) : (
                      <>
                        <div className="font-bold text-white">{startDateText}</div>
                        <div className="text-sm text-slate-400">
                          {timeRangeText}
                          {event.isFlexibleStart && <span className="italic"> (Flexible)</span>}
                        </div>
                      </>
                    )}
                  </div>
                )}
                {isEditMode && edit?.errors?.startTime ? (
                  <div className="text-xs text-red-400 mt-2">{edit.errors.startTime}</div>
                ) : null}
              </div>

              <div className="bg-surface border border-slate-700 rounded-2xl p-5">
                <h2 className="text-lg font-bold text-white mb-3">Location</h2>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-slate-800 rounded-lg shrink-0">
                    <MapPin className="w-5 h-5 text-accent" />
                  </div>
                  <div className="min-w-0 flex-1">
                    {isEditMode ? (
                      <LocationAutocomplete
                        value={event.location}
                        onChangeText={(text) =>
                          edit?.onChange({ location: text, coordinates: undefined, locationData: undefined })
                        }
                        onSelect={(selection) =>
                          edit?.onChange({
                            location: selection.locationData.display.full,
                            coordinates: {
                              lat: selection.locationData.geo.lat,
                              lng: selection.locationData.geo.lng,
                            },
                            locationData: selection.locationData,
                          })
                        }
                        placeholder="Location"
                        required
                        className={`w-full bg-slate-900 border rounded-lg py-2 px-3 text-white outline-none ${
                          edit?.errors?.location
                            ? 'border-red-500 focus:border-red-500'
                            : 'border-slate-700 focus:border-primary'
                        }`}
                      />
                    ) : (
                      (() => {
                        const { primary, secondary } = formatLocationForDisplay(event.location)
                        if (!secondary) {
                          return <div className="font-bold text-white">{primary}</div>
                        }
                        return (
                          <div className="min-w-0">
                            <div className="font-bold text-white truncate">{primary}</div>
                            <div className="text-sm text-slate-400 truncate">{secondary}</div>
                          </div>
                        )
                      })()
                    )}
                    {isEditMode && edit?.errors?.location ? (
                      <div className="text-xs text-red-400 mt-1">{edit.errors.location}</div>
                    ) : null}
                    {hasCoordinates ? (
                      <button
                        className="text-sm text-slate-500 underline decoration-slate-600 decoration-dashed hover:text-slate-300 transition-colors"
                        type="button"
                        onClick={openInMaps}
                      >
                        Open in maps
                      </button>
                    ) : null}
                  </div>
                </div>

                {/* Mini map preview (kept mounted to avoid page layout jumps) */}
                <div className="mt-4 relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-900">
                  <div ref={miniMapContainerRef} className="w-full h-44 md:h-56" />

                  {/* Placeholder overlay (shown until a place is selected) */}
                  {!hasCoordinates ? (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="text-center px-4">
                        <div className="text-sm font-semibold text-slate-300">Pick a place to preview the map</div>
                        <div className="text-xs text-slate-500 mt-1">Type a location, then select a suggestion.</div>
                      </div>
                    </div>
                  ) : null}

                  {/* Click-to-open overlay */}
                  {hasCoordinates ? (
                    <div
                      className="absolute inset-0 z-10 cursor-pointer"
                      role="button"
                      tabIndex={0}
                      aria-label="Open in maps"
                      onClick={openInMaps}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          openInMaps()
                        }
                      }}
                    />
                  ) : null}

                  <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/25 via-transparent to-transparent" />
                  {hasCoordinates ? (
                    <div className="absolute bottom-3 right-3 pointer-events-auto z-20">
                      <button
                        onClick={openInMaps}
                        className="text-xs font-bold px-3 py-2 rounded-xl bg-slate-900/80 backdrop-blur border border-slate-700 text-white hover:bg-slate-800 transition-colors"
                        type="button"
                      >
                        Open
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          {activeTab === 'going' ? (
            <div className="space-y-4">
              {isEditMode ? (
                <div className="bg-surface border border-slate-700 rounded-2xl p-5 space-y-4">
                  <h2 className="text-lg font-bold text-white">Attendance & visibility</h2>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Seats</div>
                      <input
                        type="number"
                        min={0}
                        step={1}
                        value={event.maxSeats ?? ''}
                        onChange={(e) => {
                          const raw = e.target.value
                          const n = raw === '' ? undefined : Number(raw)
                          edit?.onChange({ maxSeats: n && n > 0 ? n : undefined })
                        }}
                        placeholder="Unlimited"
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-white focus:border-primary outline-none"
                      />
                      <div className="text-xs text-slate-500 mt-1">Leave blank for unlimited.</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Visibility</div>
                      <FormSelect
                        value={event.visibilityType}
                        onChange={(e) => {
                          const next = e.target.value as EventVisibility;
                          edit?.onChange({
                            visibilityType: next,
                            groupIds: next === EventVisibility.GROUPS ? event.groupIds : [],
                            allowFriendInvites: next === EventVisibility.INVITE_ONLY ? event.allowFriendInvites : false,
                          });
                        }}
                        size="md"
                        variant="surface"
                      >
                        <option value={EventVisibility.ALL_FRIENDS}>All friends</option>
                        <option value={EventVisibility.GROUPS}>Groups</option>
                        <option value={EventVisibility.INVITE_ONLY}>Invite only</option>
                      </FormSelect>
                    </div>
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
                  ) : null}

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
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-slate-400" /> Going
                  </h2>
                  <div className="text-sm text-slate-400 font-medium">{event.maxSeats ? goingLabel : `${attendeeCount}`}</div>
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

              {isEditMode ? (
                <div className="mt-4 text-sm text-slate-400 bg-slate-900/40 border border-slate-800 rounded-xl p-4">
                  Discussion is read-only while editing. Save your changes to return to normal interaction.
                </div>
              ) : (
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
              )}
            </div>
          ) : null}
        </div>

        {/* Right: sticky action card (desktop) */}
        <aside className="hidden xl:block">
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
                      disabled={!!edit?.isSaving}
                      aria-disabled={!canSave}
                      className={`w-full py-3 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all shadow-lg ${
                        canSave ? 'bg-primary hover:bg-primary/90 text-white shadow-primary/25' : 'bg-slate-700 text-slate-300'
                      } disabled:opacity-60`}
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
                  isHost ? (
                    <button
                      onClick={() => onEditRequested?.()}
                      className="w-full py-3 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all shadow-lg bg-primary hover:bg-primary/90 text-white shadow-primary/25"
                      type="button"
                    >
                      <Save className="w-5 h-5" /> Edit Event
                    </button>
                  ) : (
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
                  )
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
                disabled={!!edit?.isSaving}
                aria-disabled={!canSave}
                className={`flex-1 py-3.5 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all shadow-lg ${
                  canSave ? 'bg-primary hover:bg-primary/90 text-white shadow-primary/25' : 'bg-slate-700 text-slate-300'
                } disabled:opacity-60`}
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
            isHost ? (
              <button
                onClick={() => onEditRequested?.()}
                className="flex-1 py-3.5 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all shadow-lg bg-primary hover:bg-primary/90 text-white shadow-primary/25"
                type="button"
              >
                <Save className="w-5 h-5" /> Edit Event
              </button>
            ) : (
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
            )
          ) : null}
        </div>
      </div>

      {showHeaderImageModal ? (
        <HeaderImageModal
          defaultQuery={event.title || ''}
          initialSelectedUrl={event.headerImageUrl}
          onClose={() => setShowHeaderImageModal(false)}
          onUpdate={(imageUrl) => {
            if (isEditMode) {
              edit?.onChange({ headerImageUrl: imageUrl })
              return
            }
            onUpdateEvent({ ...event, headerImageUrl: imageUrl })
          }}
        />
      ) : null}
    </div>
  );
};
