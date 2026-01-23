
import React, { useRef, useState, useEffect } from 'react';
import type { Group, User } from '../../../../lib/types';
import type { ItineraryItem, SocialEvent } from '../../types';
import { EventVisibility } from '../../types';
import { getTheme } from '../../../../lib/constants';
import { ArrowLeft, Calendar, Info, Link, MapPin, Map as MapIcon, MessageSquare, Save, Send, Users, X, CheckCircle2, EyeOff, Image as ImageIcon, ChevronDown, ChevronUp, MoreVertical, Trash2 } from 'lucide-react';
import { TabGroup, type TabOption } from '../../../../lib/ui/components/TabGroup';
import { useRouterState } from '@tanstack/react-router';
import { FormSelect } from '../../../../lib/ui/components/FormControls';
import { LocationAutocomplete } from '../../../../lib/ui/components/LocationAutocomplete'
import { HeaderImageModal } from './images/HeaderImageModal'
import { ComingSoonPopover, useComingSoonPopover } from '../../../../lib/ui/components/ComingSoonPopover'
import { FullScreenMapModal } from './maps/FullScreenMapModal'
import { copyToClipboard } from '../../../../lib/ui/utils/clipboard'
import { splitLocalDateTime, toLocalDateTimeInputValue, formatDateLongEnUS, formatTime12h, buildQuarterHourTimeOptions } from '../../../../lib/ui/utils/datetime'
import { buildGoogleMapsLatLngUrl, buildGoogleMapsSearchUrl } from './maps/maps'
import { parseEventTab, type EventTab } from './route/routing'
import { deriveRangeFromItinerary, extractUniqueLocations, sortByStartTime } from './itineraries/itinerary'
import { useEventPeople } from '../../hooks/useEventPeople'
import { useFriendsForGuests } from '../../hooks/useFriendsForGuests'
import { useItineraryGeocoding } from '../../hooks/useItineraryGeocoding'
import { ChatTab } from './chat/ChatTab'
import { GuestsTab } from './guests/GuestsTab'
import { LeafletMiniMapPreview } from './maps/LeafletMiniMapPreview'
import { ItineraryEditor } from './itineraries/ItineraryEditor'
import { ItinerarySection } from './itineraries/ItinerarySection'

interface EventDetailProps {
  event: SocialEvent;
  currentUser?: User | null;
  onClose?: () => void;
  onUpdateEvent: (updated: SocialEvent) => void;
  onPostComment?: (eventId: string, text: string) => Promise<void> | void;
  onJoin?: (eventId: string) => Promise<void> | void;
  onLeave?: (eventId: string) => Promise<void> | void;
  activeTab?: EventTab;
  onTabChange?: (tab: EventTab) => void;
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
    itinerary?: {
      items: ItineraryItem[];
      onAdd: (input: {
        title: string
        startTime: string
        durationMinutes: number
        location?: string
        description?: string
      }) => Promise<string> | string
      onUpdate: (
        id: string,
        patch: Partial<{
          title: string
          startTime: string
          durationMinutes: number
          location?: string
          description?: string
        }>,
      ) => Promise<void> | void
      onDelete: (id: string) => Promise<void> | void
    }
    onSave: () => void;
    onCancel: () => void;
  };
}

function formatItineraryLocationForDisplay(location: string | undefined): { full: string; label: string; isReal: boolean } {
  const full = String(location ?? '').trim()
  if (!full) return { full: '', label: '', isReal: false }
  // Heuristic: locations selected from autocomplete tend to include a comma-separated full address.
  const isReal = full.includes(',')
  const label = isReal ? full.split(',')[0]?.trim() || full : full
  return { full, label, isReal }
}

export type { EventTab } from './route/routing'

export const EventDetail: React.FC<EventDetailProps> = ({
  event,
  currentUser,
  onClose,
  onUpdateEvent,
  onPostComment,
  onJoin,
  onLeave,
  activeTab: activeTabProp,
  onTabChange,
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

  const [isTogglingAttendance, setIsTogglingAttendance] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const inviteCopiedTimeoutRef = useRef<number | null>(null);
  const [uncontrolledActiveTab, setUncontrolledActiveTab] = useState<EventTab>('details')
  const [showHeaderImageModal, setShowHeaderImageModal] = useState(false)
  const [showMapModal, setShowMapModal] = useState(false)
  const comingSoon = useComingSoonPopover()
  const theme = getTheme(event.activityType);
  const currentUserId = currentUser?.id;
  const isGuest = !currentUserId;
  const requestedTab = activeTabProp ?? uncontrolledActiveTab
  const activeTab: EventTab = isGuest ? 'details' : requestedTab
  const { host, attendeesList, commentUsers } = useEventPeople({ event, currentUserId: currentUserId ?? undefined })
  const [removedAttendeeIds, setRemovedAttendeeIds] = useState<Set<string>>(new Set())
  const visibleAttendeesList = React.useMemo(() => {
    if (!isEditMode) return attendeesList
    if (removedAttendeeIds.size === 0) return attendeesList
    return attendeesList.filter((u) => !removedAttendeeIds.has(u.id))
  }, [attendeesList, isEditMode, removedAttendeeIds])

  const [draftDate, setDraftDate] = useState<string>('')
  const [draftTime, setDraftTime] = useState<string>('')
  const [showCreateItinerary, setShowCreateItinerary] = useState(false)
  const [expandedItineraryItemId, setExpandedItineraryItemId] = useState<string | null>(null)
  const [openItineraryMenuItemId, setOpenItineraryMenuItemId] = useState<string | null>(null)

  useEffect(() => {
    if (!isEditMode) return
    const { date, time } = splitLocalDateTime(edit?.startDateTimeLocal)
    setDraftDate(date)
    setDraftTime(time)
  }, [edit?.startDateTimeLocal, isEditMode])
  
  useEffect(() => {
    if (!openItineraryMenuItemId) return
    const onDocClick = () => setOpenItineraryMenuItemId(null)
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [openItineraryMenuItemId])

  useEffect(() => {
    return () => {
      if (inviteCopiedTimeoutRef.current) {
        window.clearTimeout(inviteCopiedTimeoutRef.current);
        inviteCopiedTimeoutRef.current = null;
      }
    };
  }, []);

  const isHost = !!currentUserId && event.hostId === currentUserId;
  const isAttending = !!currentUserId && event.attendees.includes(currentUserId);
  const isInvolved = isHost || isAttending;
  const hasSeatLimit = typeof event.maxSeats === 'number' && event.maxSeats > 0
  const isFull = hasSeatLimit && event.attendees.length >= event.maxSeats
  const isJoinDisabled = isTogglingAttendance || (!isAttending && isFull)
  const headerImageSrc = event.headerImageUrl || `https://picsum.photos/seed/${event.id}/1200/800`
  const formatDateLong = formatDateLongEnUS
  const formatTime = formatTime12h

  const itineraryItems: ItineraryItem[] =
    (isEditMode ? edit?.itinerary?.items : event.itineraryItems) ?? []
  const hasItinerary = itineraryItems.length > 0

  const orderedItineraryItems = React.useMemo(() => sortByStartTime(itineraryItems), [itineraryItems])

  const itineraryLocationList = React.useMemo(() => {
    // Only include explicit itinerary item locations; if an item has no location, skip it.
    return orderedItineraryItems
      .map((item) => String(item.location ?? '').trim())
      .filter(Boolean)
  }, [orderedItineraryItems])

  const uniqueItineraryLocations = React.useMemo(() => extractUniqueLocations(orderedItineraryItems), [orderedItineraryItems])

  const derivedRange = hasItinerary ? deriveRangeFromItinerary(itineraryItems) : null
  const startDate = derivedRange?.start ?? new Date(event.startTime)
  const endDate = derivedRange?.end ?? (event.endTime ? new Date(event.endTime) : null)
  const durationMs = endDate ? endDate.getTime() - startDate.getTime() : null
  // Display rule:
  // - If duration < 24h: show single date line + time range (even if it crosses midnight)
  // - If duration >= 24h: show multi-day (start date+time, end date+time)
  const showMultiDay = !!endDate && typeof durationMs === 'number' && durationMs >= 24 * 60 * 60 * 1000
  const showItineraryTimesOnly = !!endDate && typeof durationMs === 'number' && durationMs <= 24 * 60 * 60 * 1000

  const startDateText = formatDateLong(startDate)
  const startTimeText = formatTime(startDate)
  const endDateText = endDate ? formatDateLong(endDate) : null
  const endTimeText = endDate ? formatTime(endDate) : null
  const timeRangeText = endTimeText ? `${startTimeText} - ${endTimeText}` : startTimeText
  const attendeeCount = attendeesList.length;
  const goingLabel = event.maxSeats ? `${attendeeCount}/${event.maxSeats}` : `${attendeeCount}`;
  const spotsLeft = event.maxSeats ? Math.max(event.maxSeats - attendeesList.length, 0) : null;

  const timeOptions = React.useMemo(() => buildQuarterHourTimeOptions(), [])

  const tabs: TabOption[] = [
    { id: 'details', label: 'Details', icon: <Info className="w-4 h-4" /> },
    { id: 'guests', label: 'Guests', icon: <Users className="w-4 h-4" /> },
    { id: 'chat', label: 'Chat', icon: <MessageSquare className="w-4 h-4" /> },
  ];

  const openInMaps = () => {
    const lat = event.coordinates?.lat;
    const lng = event.coordinates?.lng;
    if (typeof lat !== 'number' || typeof lng !== 'number') return;

    const url = buildGoogleMapsLatLngUrl(lat, lng);
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const hasCoordinates = typeof event.coordinates?.lat === 'number' && typeof event.coordinates?.lng === 'number'
  const showItineraryBuilder = isEditMode && edit?.itinerary && (hasItinerary || showCreateItinerary)

  const primaryGoogleMapsUrl = React.useMemo(() => {
    if (hasItinerary) {
      const q = uniqueItineraryLocations[0]
      if (q) return buildGoogleMapsSearchUrl(q)
      return null
    }

    const lat = event.coordinates?.lat
    const lng = event.coordinates?.lng
    if (typeof lat === 'number' && typeof lng === 'number') return buildGoogleMapsLatLngUrl(lat, lng)
    return null
  }, [hasItinerary, uniqueItineraryLocations, event.coordinates?.lat, event.coordinates?.lng])

  const { geoByLocation: itineraryGeo, loading: itineraryGeoLoading } = useItineraryGeocoding({
    enabled: hasItinerary,
    uniqueLocations: uniqueItineraryLocations,
    eventLocation: event.location,
    eventCoordinates: event.coordinates,
  })

  const miniMapPoints = React.useMemo(() => {
    if (hasItinerary) {
      const pts: Array<[number, number]> = []
      for (const loc of itineraryLocationList) {
        const q = String(loc ?? '').trim()
        if (!q) continue
        const p = itineraryGeo[q]
        if (!p) continue
        pts.push([p.lat, p.lng])
      }
      return pts
    }

    const lat = event.coordinates?.lat
    const lng = event.coordinates?.lng
    if (typeof lat === 'number' && typeof lng === 'number') return [[lat, lng] as [number, number]]
    return []
  }, [hasItinerary, itineraryLocationList, itineraryGeo, event.coordinates?.lat, event.coordinates?.lng])

  const hasMiniMapPoints = miniMapPoints.length > 0

  const openPrimaryLocationInMaps = React.useCallback(() => {
    if (!hasMiniMapPoints) return
    setShowMapModal(true)
  }, [hasMiniMapPoints])

  useEffect(() => {
    if (!isEditMode) return
    if (itineraryItems.length !== 0) return
    setShowCreateItinerary(false)
    setExpandedItineraryItemId(null)
    setOpenItineraryMenuItemId(null)
  }, [isEditMode, itineraryItems.length])

  const { friendIds } = useFriendsForGuests({ enabled: !isGuest && !isEditMode && activeTab === 'guests' })

  const handleRemoveAttendee = (attendeeId: string) => {
    if (!isEditMode) return
    if (!attendeeId) return
    if (attendeeId === event.hostId) return

    const nextAttendees = event.attendees.filter((id) => id !== attendeeId)
    edit?.onChange({ attendees: nextAttendees })
    setRemovedAttendeeIds((prev) => {
      const next = new Set(prev)
      next.add(attendeeId)
      return next
    })
  }

  const openItineraryLocationInMaps = (locationFull: string) => {
    const q = String(locationFull ?? '').trim()
    if (!q) return
    const url = buildGoogleMapsSearchUrl(q)
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleTabChange = (id: any) => {
    const tabId = parseEventTab(id) ?? 'details'
    if (isGuest && tabId !== 'details') {
      onRequireAuth?.();
      return;
    }
    if (tabId === activeTab) return
    if (onTabChange) {
      onTabChange(tabId)
      return
    }
    setUncontrolledActiveTab(tabId)
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

  function formatRawLocationForDisplay(raw: string): { primary: string; secondary?: string } {
    const value = String(raw ?? '').trim()
    if (!value) return { primary: '' }

    const parts = value.split(',').map((p) => p.trim()).filter(Boolean)
    if (parts.length <= 1) return { primary: value }

    const primary = parts[0] ?? value
    const secondaryParts = parts.slice(1, 3)
    const secondary = secondaryParts.length ? secondaryParts.join(', ') : undefined
    return { primary, secondary }
  }

  // Leaflet mini-map is now encapsulated in `LeafletMiniMapPreview`.

  const handleJoin = async () => {
    if (isEditMode) return;
    if (isHost) return;
    if (isGuest) {
      onRequireAuth?.();
      return;
    }

    // If the parent provided join/leave handlers, use those (persist to DB).
    if (onJoin && onLeave) {
      if (isTogglingAttendance) return;
      if (!isAttending && event.maxSeats && event.attendees.length >= event.maxSeats) return; // Full

      setIsTogglingAttendance(true);
      try {
        if (isAttending) {
          await onLeave(event.id);
        } else {
          await onJoin(event.id);
        }
      } finally {
        setIsTogglingAttendance(false);
      }
      return;
    }

    // Fallback: local-only toggle (used in previews/public shells)
    let newAttendees: string[];
    if (isAttending) {
      newAttendees = event.attendees.filter(id => id !== currentUserId);
    } else {
      if (event.maxSeats && event.attendees.length >= event.maxSeats) return; // Full
      newAttendees = [...event.attendees, currentUserId!];
    }
    onUpdateEvent({ ...event, attendees: newAttendees });
  };

  const buildInviteUrl = () => {
    const origin = typeof window !== 'undefined' && window.location?.origin ? window.location.origin : '';
    const slugOrId = event.slug || event.id;
    const path = `/e/${encodeURIComponent(slugOrId)}`;
    return origin ? `${origin}${path}` : path;
  };

  const pulseInviteCopied = () => {
    setInviteCopied(true);
    if (inviteCopiedTimeoutRef.current) window.clearTimeout(inviteCopiedTimeoutRef.current);
    inviteCopiedTimeoutRef.current = window.setTimeout(() => {
      setInviteCopied(false);
      inviteCopiedTimeoutRef.current = null;
    }, 2000);
  };

  const handleShareInvite = async () => {
    const inviteUrl = buildInviteUrl();
    const isCoarsePointer =
      typeof window !== 'undefined' && typeof window.matchMedia === 'function' && window.matchMedia('(pointer: coarse)').matches;

    if (isCoarsePointer && typeof navigator !== 'undefined' && typeof (navigator as any).share === 'function') {
      try {
        await (navigator as any).share({
          title: event.title,
          text: `Open Invite to ${event.title}`,
          url: inviteUrl,
        });
        return;
      } catch {
        // User cancelled or share failed; fall back to copy.
      }
    }

    const copied = await copyToClipboard(inviteUrl);
    if (copied) pulseInviteCopied();
  };

  return (
    <div
      className={`flex-1 overflow-y-auto custom-scrollbar bg-background text-slate-100 ${
        layout === 'shell' && reserveBottomNavSpace ? 'pb-44' : 'pb-28'
      } md:pb-10`}
      style={{ WebkitOverflowScrolling: 'touch' }}
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
            <div className="flex items-end justify-between gap-4 mt-2 mb-4 h-12">
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
                {/* Seats are editable in the "Attendance & visibility" panel; keep the overview read-only even in edit mode. */}
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
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Hosted by / actions (squishy desktop: md -> <lg) */}
      <div className="hidden md:block lg:hidden max-w-6xl mx-auto px-4 md:px-6 py-4">
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
                <button
                  onClick={handleShareInvite}
                  className="py-3 px-4 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all border border-slate-700"
                  type="button"
                >
                  {inviteCopied ? <Link className="w-5 h-5" /> : <Send className="w-5 h-5" />}{' '}
                  {inviteCopied ? 'URL Copied!' : 'Share Invite'}
                </button>

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
                    disabled={isJoinDisabled}
                    aria-disabled={isJoinDisabled}
                    className={`flex-1 py-3 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all shadow-lg ${
                      isAttending
                        ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/50'
                        : isFull
                          ? 'bg-slate-700/60 text-slate-300 border border-slate-600'
                          : 'bg-primary hover:bg-primary/90 text-white shadow-primary/25'
                    } disabled:opacity-60 disabled:cursor-not-allowed`}
                    type="button"
                  >
                    {isAttending ? (
                      <>
                        <X className="w-5 h-5" /> Leave Event
                      </>
                    ) : isFull ? (
                      <>No Spots Left</>
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

      {/* Body */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-6 grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-6">
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
                  hasItinerary ? (
                    <div className="text-sm text-slate-400 bg-slate-900/40 border border-slate-800 rounded-xl p-4">
                      Event time is derived from itinerary items. Edit the itinerary below to change the overall time.
                    </div>
                  ) : (
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
                  )
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

              {isEditMode || hasItinerary ? (
                <div className="bg-surface border border-slate-700 rounded-2xl p-5">
                  <h2 className="text-lg font-bold text-white mb-3">Itinerary</h2>

                  {isEditMode ? (
                    edit?.itinerary ? (
                      <ItineraryEditor
                        event={event}
                        itineraryItems={itineraryItems}
                        timeOptions={timeOptions}
                        showItineraryTimesOnly={showItineraryTimesOnly}
                        hasItinerary={hasItinerary}
                        showCreateItinerary={showCreateItinerary}
                        setShowCreateItinerary={setShowCreateItinerary}
                        expandedItineraryItemId={expandedItineraryItemId}
                        setExpandedItineraryItemId={setExpandedItineraryItemId}
                        openItineraryMenuItemId={openItineraryMenuItemId}
                        setOpenItineraryMenuItemId={setOpenItineraryMenuItemId}
                        draftDate={draftDate}
                        draftTime={draftTime}
                        durationHours={edit?.durationHours}
                        formatItineraryLocationForDisplay={formatItineraryLocationForDisplay}
                        openItineraryLocationInMaps={openItineraryLocationInMaps}
                        itineraryApi={edit.itinerary}
                      />
                    ) : (
                      <div className="text-sm text-slate-500 italic">Itinerary editing is unavailable.</div>
                    )
                  ) : (
                    <ItinerarySection
                      items={itineraryItems}
                      showItineraryTimesOnly={showItineraryTimesOnly}
                      formatItineraryLocationForDisplay={formatItineraryLocationForDisplay}
                      openItineraryLocationInMaps={openItineraryLocationInMaps}
                    />
                  )}
                </div>
              ) : null}

              <div className="bg-surface border border-slate-700 rounded-2xl p-5">
                <h2 className="text-lg font-bold text-white mb-3">Location</h2>
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-slate-800 rounded-lg shrink-0">
                    <MapPin className="w-5 h-5 text-accent" />
                  </div>
                  <div className="min-w-0 flex-1">
                    {hasItinerary ? (
                      itineraryLocationList.length > 0 ? (
                        <ol className="space-y-2">
                          {itineraryLocationList.map((raw, idx) => {
                            const { primary, secondary } = formatRawLocationForDisplay(raw)
                            const loc = formatItineraryLocationForDisplay(raw)

                            return (
                              <li key={`${idx}-${raw}`} className="min-w-0">
                                <button
                                  type="button"
                                  onClick={() => openItineraryLocationInMaps(loc.full)}
                                  className="w-full text-left min-w-0 group"
                                  aria-label="Open location in maps"
                                >
                                  <div className="flex items-start gap-2 min-w-0">
                                    <div className="text-xs font-bold text-slate-500 mt-[2px] shrink-0">{idx + 1}</div>
                                    <div className="min-w-0">
                                      <div className="font-bold text-white truncate group-hover:underline decoration-slate-600 decoration-dashed">
                                        {primary}
                                      </div>
                                      {secondary ? (
                                        <div className="text-sm text-slate-400 truncate">{secondary}</div>
                                      ) : null}
                                    </div>
                                  </div>
                                </button>
                              </li>
                            )
                          })}
                        </ol>
                      ) : (
                        <div className="text-sm text-slate-500 italic">No itinerary locations yet.</div>
                      )
                    ) : isEditMode ? (
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
                    {!hasItinerary && isEditMode && edit?.errors?.location ? (
                      <div className="text-xs text-red-400 mt-1">{edit.errors.location}</div>
                    ) : null}
                    {!hasItinerary && hasMiniMapPoints ? (
                      <button
                        className="text-sm text-slate-500 underline decoration-slate-600 decoration-dashed hover:text-slate-300 transition-colors"
                        type="button"
                        onClick={openPrimaryLocationInMaps}
                      >
                        Open map
                      </button>
                    ) : null}
                  </div>
                </div>

                <LeafletMiniMapPreview
                  points={miniMapPoints}
                  themeHex={theme.hex}
                  hasItinerary={hasItinerary}
                  itineraryGeoLoading={itineraryGeoLoading}
                  onOpen={openPrimaryLocationInMaps}
                />
              </div>
            </div>
          ) : null}

          {activeTab === 'guests' ? (
            <GuestsTab
              event={event}
              attendeesList={visibleAttendeesList}
              friendIds={friendIds}
              currentUserId={currentUserId ?? undefined}
              isEditMode={isEditMode}
              comingSoon={comingSoon}
              onRemoveAttendee={handleRemoveAttendee}
              onChangeMaxSeats={(next) => edit?.onChange({ maxSeats: next })}
            />
          ) : null}

          {activeTab === 'chat' ? (
            <ChatTab
              event={event}
              commentUsers={commentUsers}
              currentUserId={currentUserId ?? undefined}
              isEditMode={isEditMode}
              isGuest={isGuest}
              onRequireAuth={onRequireAuth}
              onPostComment={onPostComment}
              onUpdateEvent={onUpdateEvent}
            />
          ) : null}
        </div>

        {/* Right: sticky action card (desktop) */}
        <aside className="hidden lg:block">
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

                {!isEditMode ? (
                  <button
                    onClick={handleShareInvite}
                    className="w-full py-3 rounded-2xl font-bold text-sm flex items-center justify-center gap-2 bg-slate-800 text-slate-300 hover:bg-slate-700 transition-all border border-slate-700"
                    type="button"
                  >
                    {inviteCopied ? <Link className="w-5 h-5" /> : <Send className="w-5 h-5" />}{' '}
                    {inviteCopied ? 'URL Copied!' : 'Share Invite'}
                  </button>
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
                      disabled={isJoinDisabled}
                      aria-disabled={isJoinDisabled}
                      className={`w-full py-3 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all shadow-lg ${
                        isAttending
                          ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/50'
                          : isFull
                            ? 'bg-slate-700/60 text-slate-300 border border-slate-600'
                            : 'bg-primary hover:bg-primary/90 text-white shadow-primary/25'
                      } disabled:opacity-60 disabled:cursor-not-allowed`}
                      type="button"
                    >
                      {isAttending ? (
                        <>
                          <X className="w-5 h-5" /> Leave Event
                        </>
                      ) : isFull ? (
                        <>No Spots Left</>
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

          {!isEditMode ? (
            <button
              onClick={handleShareInvite}
              className="w-1/3 py-3.5 rounded-2xl font-bold text-base flex items-center justify-center gap-2 bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200 transition-all border border-slate-700 hover:border-slate-600"
              type="button"
            >
              <Send className="w-5 h-5" /> {inviteCopied ? 'URL Copied!' : 'Share Invite'}
            </button>
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
                disabled={isJoinDisabled}
                aria-disabled={isJoinDisabled}
                className={`flex-1 py-3.5 rounded-2xl font-bold text-base flex items-center justify-center gap-2 transition-all shadow-lg ${
                  isAttending
                    ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/50'
                    : isFull
                      ? 'bg-slate-700/60 text-slate-300 border border-slate-600'
                      : 'bg-primary hover:bg-primary/90 text-white shadow-primary/25'
                } disabled:opacity-60 disabled:cursor-not-allowed`}
                type="button"
              >
                {isAttending ? (
                  <>
                    <X className="w-5 h-5" /> Leave Event
                  </>
                ) : isFull ? (
                  <>No Spots Left</>
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

      {showMapModal ? (
        <FullScreenMapModal
          points={miniMapPoints}
          themeHex={theme.hex}
          title={event.title || 'Map'}
          onClose={() => setShowMapModal(false)}
        />
      ) : null}

      <ComingSoonPopover state={comingSoon.state} />
    </div>
  );
};
