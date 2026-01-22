
import React, { useRef, useState, useEffect } from 'react';
import { Comment, EventVisibility, Group, ItineraryItem, SocialEvent, User } from '../lib/types';
import { getTheme } from '../lib/constants';
import { ArrowLeft, Calendar, Info, Link, MapPin, Map as MapIcon, MessageSquare, Save, Send, Users, X, CheckCircle2, EyeOff, Image as ImageIcon, ChevronDown, ChevronUp, MoreVertical, Trash2 } from 'lucide-react';
import { fetchUser, fetchUsers } from '../services/userService';
import { fetchFriends } from '../services/friendService'
import { TabGroup, type TabOption } from './TabGroup';
import { useRouterState } from '@tanstack/react-router';
import { FormSelect } from './FormControls';
import { LocationAutocomplete } from './LocationAutocomplete'
import { HeaderImageModal } from './HeaderImageModal'
import { ComingSoonPopover, useComingSoonPopover } from './ComingSoonPopover'

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

function splitLocalDateTime(value: string | undefined): { date: string; time: string } {
  if (!value) return { date: '', time: '' }
  const [date, time] = value.split('T')
  return { date: date ?? '', time: time ?? '' }
}

function toLocalDateTimeInputValue(iso: string | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  const yyyy = d.getFullYear()
  const mm = pad(d.getMonth() + 1)
  const dd = pad(d.getDate())
  const hh = pad(d.getHours())
  const min = pad(d.getMinutes())
  return `${yyyy}-${mm}-${dd}T${hh}:${min}`
}

function formatItineraryLocationForDisplay(location: string | undefined): { full: string; label: string; isReal: boolean } {
  const full = String(location ?? '').trim()
  if (!full) return { full: '', label: '', isReal: false }
  // Heuristic: locations selected from autocomplete tend to include a comma-separated full address.
  const isReal = full.includes(',')
  const label = isReal ? full.split(',')[0]?.trim() || full : full
  return { full, label, isReal }
}

export type EventTab = 'details' | 'guests' | 'chat'

function parseEventTab(value: unknown): EventTab {
  if (typeof value !== 'string') return 'details'
  const tab = value.toLowerCase()
  if (tab === 'details' || tab === 'guests' || tab === 'chat') return tab
  return 'details'
}

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

  const [commentText, setCommentText] = useState('');
  const [isTogglingAttendance, setIsTogglingAttendance] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const inviteCopiedTimeoutRef = useRef<number | null>(null);
  const [host, setHost] = useState<User | null>(null);
  const [attendeesList, setAttendeesList] = useState<User[]>([]);
  const [commentUsers, setCommentUsers] = useState<Map<string, User>>(new Map());
  const [uncontrolledActiveTab, setUncontrolledActiveTab] = useState<EventTab>('details')
  const [showHeaderImageModal, setShowHeaderImageModal] = useState(false)
  const [friendIds, setFriendIds] = useState<Set<string>>(new Set())
  const miniMapContainerRef = useRef<HTMLDivElement>(null);
  const miniMapInstanceRef = useRef<any>(null);
  const miniMapMarkerRef = useRef<any>(null);
  const miniMapMarkerLayerRef = useRef<any>(null);
  const miniMapPolylineRef = useRef<any>(null);
  const [itineraryGeo, setItineraryGeo] = useState<Record<string, { lat: number; lng: number }>>({})
  const [itineraryGeoLoading, setItineraryGeoLoading] = useState(false)
  const comingSoon = useComingSoonPopover()
  const theme = getTheme(event.activityType);
  const currentUserId = currentUser?.id;
  const isGuest = !currentUserId;
  const requestedTab = activeTabProp ?? uncontrolledActiveTab
  const activeTab: EventTab = isGuest ? 'details' : requestedTab

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

  const deriveEventRangeFromItinerary = React.useCallback((items: ItineraryItem[]) => {
    if (!items || items.length === 0) return null

    let minStart: Date | null = null
    let maxEnd: Date | null = null

    for (const item of items) {
      const start = new Date(item.startTime)
      if (Number.isNaN(start.getTime())) continue
      const end = new Date(start.getTime() + item.durationMinutes * 60 * 1000)

      if (!minStart || start.getTime() < minStart.getTime()) minStart = start
      if (!maxEnd || end.getTime() > maxEnd.getTime()) maxEnd = end
    }

    if (!minStart || !maxEnd) return null
    return { start: minStart, end: maxEnd }
  }, [])

  const itineraryItems: ItineraryItem[] =
    (isEditMode ? edit?.itinerary?.items : event.itineraryItems) ?? []
  const hasItinerary = itineraryItems.length > 0

  const orderedItineraryItems = React.useMemo(() => {
    return itineraryItems
      .slice()
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
  }, [itineraryItems])

  const itineraryLocationList = React.useMemo(() => {
    // Only include explicit itinerary item locations; if an item has no location, skip it.
    return orderedItineraryItems
      .map((item) => String(item.location ?? '').trim())
      .filter(Boolean)
  }, [orderedItineraryItems])

  const uniqueItineraryLocations = React.useMemo(() => {
    const seen = new Set<string>()
    const out: string[] = []
    for (const loc of itineraryLocationList) {
      const q = String(loc ?? '').trim()
      if (!q) continue
      if (seen.has(q)) continue
      seen.add(q)
      out.push(q)
    }
    return out
  }, [itineraryLocationList])

  const derivedRange = hasItinerary ? deriveEventRangeFromItinerary(itineraryItems) : null
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
    { id: 'guests', label: 'Guests', icon: <Users className="w-4 h-4" /> },
    { id: 'chat', label: 'Chat', icon: <MessageSquare className="w-4 h-4" /> },
  ];

  const openInMaps = () => {
    const lat = event.coordinates?.lat;
    const lng = event.coordinates?.lng;
    if (typeof lat !== 'number' || typeof lng !== 'number') return;

    const url = `https://www.google.com/maps?q=${encodeURIComponent(`${lat},${lng}`)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const hasCoordinates = typeof event.coordinates?.lat === 'number' && typeof event.coordinates?.lng === 'number'
  const showItineraryBuilder = isEditMode && edit?.itinerary && (hasItinerary || showCreateItinerary)

  const openPrimaryLocationInMaps = React.useCallback(() => {
    if (hasItinerary) {
      const q = uniqueItineraryLocations[0]
      if (q) {
        openItineraryLocationInMaps(q)
        return
      }
    }
    openInMaps()
  }, [hasItinerary, uniqueItineraryLocations, event.coordinates?.lat, event.coordinates?.lng])

  useEffect(() => {
    if (!hasItinerary) {
      setItineraryGeo({})
      setItineraryGeoLoading(false)
      return
    }

    const controller = new AbortController()
    let cancelled = false

    ;(async () => {
      try {
        setItineraryGeoLoading(true)

        const next: Record<string, { lat: number; lng: number }> = {}

        // Prefer the event's stored coordinates when a location matches the event location.
        const eventLoc = String(event.location ?? '').trim()
        if (eventLoc && hasCoordinates) {
          next[eventLoc] = { lat: event.coordinates!.lat, lng: event.coordinates!.lng }
        }

        // Geocode itinerary location strings via Photon.
        for (const q of uniqueItineraryLocations) {
          if (cancelled) return
          if (next[q]) continue

          try {
            const url = new URL('https://photon.komoot.io/api/')
            url.searchParams.set('q', q)
            url.searchParams.set('limit', '1')
            const resp = await fetch(url.toString(), { signal: controller.signal })
            if (!resp.ok) continue
            const json = (await resp.json()) as { features?: Array<{ geometry?: { coordinates?: [number, number] } }> }
            const coords = json.features?.[0]?.geometry?.coordinates
            if (!coords || coords.length < 2) continue
            const [lng, lat] = coords
            if (typeof lat !== 'number' || typeof lng !== 'number') continue
            next[q] = { lat, lng }
          } catch (e) {
            if ((e as any)?.name === 'AbortError') return
          }
        }

        if (cancelled) return
        setItineraryGeo(next)
      } finally {
        if (!cancelled) setItineraryGeoLoading(false)
      }
    })()

    return () => {
      cancelled = true
      controller.abort()
    }
  }, [hasItinerary, uniqueItineraryLocations, event.location, event.coordinates?.lat, event.coordinates?.lng, hasCoordinates])

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

  useEffect(() => {
    if (!isEditMode) return
    if (itineraryItems.length !== 0) return
    setShowCreateItinerary(false)
    setExpandedItineraryItemId(null)
    setOpenItineraryMenuItemId(null)
  }, [isEditMode, itineraryItems.length])

  useEffect(() => {
    if (isGuest) return
    if (isEditMode) return
    if (activeTab !== 'guests') return
    let cancelled = false

    ;(async () => {
      try {
        const friends = await fetchFriends()
        if (cancelled) return
        setFriendIds(new Set(friends.map((f) => f.id)))
      } catch (err) {
        console.error('Error loading friends:', err)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [activeTab, isEditMode, isGuest])

  const handleRemoveAttendee = (attendeeId: string) => {
    if (!isEditMode) return
    if (!attendeeId) return
    if (attendeeId === event.hostId) return

    const nextAttendees = event.attendees.filter((id) => id !== attendeeId)
    edit?.onChange({ attendees: nextAttendees })
    setAttendeesList((prev) => prev.filter((u) => u.id !== attendeeId))
  }

  const openItineraryLocationInMaps = (locationFull: string) => {
    const q = String(locationFull ?? '').trim()
    if (!q) return
    const url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const handleTabChange = (id: any) => {
    const tabId = parseEventTab(id)
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

  const destroyMiniMap = React.useCallback(() => {
    if (miniMapInstanceRef.current) {
      miniMapInstanceRef.current.remove();
      miniMapInstanceRef.current = null;
    }
    miniMapMarkerRef.current = null;
    miniMapMarkerLayerRef.current = null;
    miniMapPolylineRef.current = null;

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

    if (!hasMiniMapPoints) {
      // If the mini map container is mounted but we no longer have coordinates,
      // tear down any existing Leaflet instance so we don't keep a map bound to a dead element.
      destroyMiniMap();
      return;
    }

    const [lat0, lng0] = miniMapPoints[0]!

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
      }).setView([lat0, lng0], 13);

      // Use a lighter basemap for clarity (CartoDB Voyager)
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        subdomains: 'abcd',
        maxZoom: 20,
        opacity: 0.95,
      }).addTo(map);

      miniMapInstanceRef.current = map;
    }

    const map = miniMapInstanceRef.current

    // Clear old layers
    if (miniMapMarkerRef.current) {
      miniMapMarkerRef.current.remove()
      miniMapMarkerRef.current = null
    }
    if (miniMapMarkerLayerRef.current) {
      miniMapMarkerLayerRef.current.remove()
      miniMapMarkerLayerRef.current = null
    }
    if (miniMapPolylineRef.current) {
      miniMapPolylineRef.current.remove()
      miniMapPolylineRef.current = null
    }

    if (miniMapPoints.length === 1) {
      const [lat, lng] = miniMapPoints[0]!
      map.setView([lat, lng], 15)
      const icon = L.divIcon({
        className: '',
        iconSize: [26, 26],
        iconAnchor: [13, 13],
        html: `
          <div style="
            width:26px;height:26px;border-radius:9999px;
            background:${theme.hex};
            border:2px solid #ffffff;
            box-shadow: 0 6px 18px rgba(0,0,0,0.35);
            display:flex;align-items:center;justify-content:center;
            font-weight:800;font-size:12px;line-height:1;
            color:#0b1020;
          ">1</div>
        `,
      })
      miniMapMarkerRef.current = L.marker([lat, lng], { icon }).addTo(map)
    } else {
      const layer = L.featureGroup()
      for (let i = 0; i < miniMapPoints.length; i++) {
        const [lat, lng] = miniMapPoints[i]!
        const icon = L.divIcon({
          className: '',
          iconSize: [26, 26],
          iconAnchor: [13, 13],
          html: `
            <div style="
              width:26px;height:26px;border-radius:9999px;
              background:${theme.hex};
              border:2px solid #ffffff;
              box-shadow: 0 6px 18px rgba(0,0,0,0.35);
              display:flex;align-items:center;justify-content:center;
              font-weight:800;font-size:12px;line-height:1;
              color:#0b1020;
            ">${i + 1}</div>
          `,
        })
        L.marker([lat, lng], { icon }).addTo(layer)
      }
      layer.addTo(map)
      miniMapMarkerLayerRef.current = layer

      miniMapPolylineRef.current = L.polyline(miniMapPoints, {
        color: theme.hex,
        weight: 3,
        opacity: 0.55,
      }).addTo(map)

      const bounds = layer.getBounds?.()
      if (bounds && bounds.isValid?.()) {
        try {
          map.fitBounds(bounds, { padding: [18, 18], maxZoom: 15, animate: false })
        } catch {
          // ignore
        }
      }
    }

    // Leaflet sometimes needs a size invalidation when a map is created/updated as a result
    // of dynamic UI changes (like selecting an autocomplete option).
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
  }, [activeTab, destroyMiniMap, hasMiniMapPoints, miniMapPoints, theme.hex]);

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

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fallback for older browsers or permission issues.
      try {
        const el = document.createElement('textarea');
        el.value = text;
        el.setAttribute('readonly', '');
        el.style.position = 'fixed';
        el.style.top = '-9999px';
        el.style.left = '-9999px';
        document.body.appendChild(el);
        el.select();
        el.setSelectionRange(0, el.value.length);
        const ok = document.execCommand('copy');
        document.body.removeChild(el);
        return ok;
      } catch {
        return false;
      }
    }
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

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isEditMode) return;
    if (isGuest) {
      onRequireAuth?.();
      return;
    }
    const text = commentText.trim();
    if (!text) return;

    // If the parent provides a persistence handler, use it.
    // (This allows pages to optimistically update state + write to DB.)
    if (onPostComment) {
      setCommentText('');
      await onPostComment(event.id, text);
      return;
    }

    // Fallback: local-only (used in previews/public shells)
    const newComment: Comment = {
      id: `optimistic-${Date.now().toString()}`,
      userId: currentUserId!,
      text,
      timestamp: new Date().toISOString(),
    };

    onUpdateEvent({ ...event, comments: [...event.comments, newComment] });
    setCommentText('');
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
                      <div className="space-y-4">
                        {!showItineraryBuilder ? (
                          <button
                            type="button"
                            onClick={async () => {
                              setShowCreateItinerary(true)
                              if (itineraryItems.length > 0) return

                              const startIso =
                                draftDate && draftTime ? new Date(`${draftDate}T${draftTime}`).toISOString() : event.startTime

                              const durationMinutes = (() => {
                                const h = edit?.durationHours
                                if (typeof h === 'number' && Number.isFinite(h) && h > 0)
                                  return Math.max(1, Math.round(h * 60))
                                return 60
                              })()

                              const newId = await edit.itinerary?.onAdd({
                                title: '',
                                startTime: startIso,
                                durationMinutes,
                                location: undefined,
                                description: undefined,
                              })

                              if (typeof newId === 'string') {
                                setExpandedItineraryItemId(newId)
                              }
                            }}
                            className="w-full py-3 rounded-xl font-bold text-sm bg-slate-800 text-white hover:bg-slate-700 transition-colors border border-slate-700"
                          >
                            Create Itinerary
                          </button>
                        ) : (
                          <>
                            <div className="space-y-3">
                              {itineraryItems.length === 0 ? (
                                <div className="text-sm text-slate-500 italic">No itinerary items yet.</div>
                              ) : null}

                              {itineraryItems
                                .slice()
                                .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                                .map((item) => {
                                  const start = new Date(item.startTime)
                                  const end = new Date(start.getTime() + item.durationMinutes * 60_000)
                                  const time = `${formatTime(start)} - ${formatTime(end)}`
                                  const date = formatDateLong(start)
                                  const loc = formatItineraryLocationForDisplay(item.location)
                                  const isExpanded = expandedItineraryItemId === item.id

                                  const { date: itemDate, time: itemTime } = splitLocalDateTime(
                                    toLocalDateTimeInputValue(item.startTime),
                                  )
                                  const durationHours = Math.round(((item.durationMinutes ?? 0) / 60) * 4) / 4

                                  return (
                                    <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-900/30">
                                      <div className="p-4">
                                        <div className="flex items-start justify-between gap-3">
                                          <button
                                            type="button"
                                            onClick={() => setExpandedItineraryItemId(isExpanded ? null : item.id)}
                                            className="min-w-0 flex-1 text-left"
                                          >
                                            <div className="font-bold text-white truncate">{item.title || 'Untitled item'}</div>
                                            <div className="text-sm text-slate-400">
                                              {showItineraryTimesOnly ? time : `${date} • ${time}`}
                                            </div>
                                            {loc.label ? (
                                              loc.isReal && loc.full ? (
                                                <button
                                                  type="button"
                                                  onClick={(e) => {
                                                    e.stopPropagation()
                                                    openItineraryLocationInMaps(loc.full)
                                                  }}
                                                  className="text-sm text-slate-400 truncate underline decoration-slate-600 decoration-dashed hover:text-slate-200 transition-colors text-left"
                                                  aria-label="Open location in maps"
                                                >
                                                  {loc.label}
                                                </button>
                                              ) : (
                                                <div className="text-sm text-slate-400 truncate">{loc.label}</div>
                                              )
                                            ) : null}
                                          </button>

                                          <div className="flex items-center gap-2 shrink-0">
                                            <div className="relative">
                                              <button
                                                type="button"
                                                onClick={(e) => {
                                                  e.stopPropagation()
                                                  setOpenItineraryMenuItemId((prev) => (prev === item.id ? null : item.id))
                                                }}
                                                className="p-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors"
                                                aria-label="Itinerary item menu"
                                              >
                                                <MoreVertical className="w-4 h-4" />
                                              </button>

                                              {openItineraryMenuItemId === item.id ? (
                                                <div
                                                  className="absolute right-0 mt-2 w-44 rounded-xl border border-slate-700 bg-slate-900 shadow-lg z-[2000] overflow-hidden"
                                                  onClick={(e) => e.stopPropagation()}
                                                >
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      setOpenItineraryMenuItemId(null)
                                                      if (expandedItineraryItemId === item.id) setExpandedItineraryItemId(null)
                                                      edit.itinerary?.onDelete(item.id)
                                                    }}
                                                    className="w-full px-3 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/10 flex items-center gap-2"
                                                  >
                                                    <Trash2 className="w-4 h-4" /> Delete
                                                  </button>
                                                </div>
                                              ) : null}
                                            </div>

                                            <button
                                              type="button"
                                              onClick={() => setExpandedItineraryItemId(isExpanded ? null : item.id)}
                                              className="p-2 rounded-lg border border-slate-700 bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors"
                                              aria-label={isExpanded ? 'Collapse item' : 'Expand item'}
                                            >
                                              {isExpanded ? (
                                                <ChevronUp className="w-4 h-4" />
                                              ) : (
                                                <ChevronDown className="w-4 h-4" />
                                              )}
                                            </button>
                                          </div>
                                        </div>
                                      </div>

                                      {isExpanded ? (
                                        <div className="border-t border-slate-800 p-4 space-y-3">
                                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                            <div className="space-y-1">
                                              <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Date</div>
                                              <input
                                                type="date"
                                                value={itemDate}
                                                onChange={(e) => {
                                                  const nextDate = e.target.value
                                                  if (!nextDate || !itemTime) return
                                                  edit.itinerary?.onUpdate(item.id, {
                                                    startTime: new Date(`${nextDate}T${itemTime}`).toISOString(),
                                                  })
                                                }}
                                                className="w-full bg-slate-900 border rounded-lg py-2.5 px-3 text-white outline-none [color-scheme:dark] border-slate-700 focus:border-primary"
                                              />
                                            </div>
                                            <div className="space-y-1">
                                              <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Time</div>
                                              <FormSelect
                                                value={itemTime}
                                                onChange={(e) => {
                                                  const nextTime = e.target.value
                                                  if (!itemDate || !nextTime) return
                                                  edit.itinerary?.onUpdate(item.id, {
                                                    startTime: new Date(`${itemDate}T${nextTime}`).toISOString(),
                                                  })
                                                }}
                                                required
                                                size="lg"
                                                variant="surface"
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
                                              <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                                                Duration (hours)
                                              </div>
                                              <input
                                                type="number"
                                                min={0.25}
                                                step={0.25}
                                                value={durationHours}
                                                onChange={(e) =>
                                                  edit.itinerary?.onUpdate(item.id, {
                                                    durationMinutes: Math.max(1, Math.round(Number(e.target.value || 0) * 60)),
                                                  })
                                                }
                                                className="w-full bg-slate-900 border rounded-lg py-2.5 px-3 text-white outline-none border-slate-700 focus:border-primary"
                                                placeholder="e.g. 1.5"
                                              />
                                            </div>
                                          </div>

                                          <div className="space-y-3">
                                            <div className="space-y-1">
                                              <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Title</div>
                                              <input
                                                value={item.title}
                                                onChange={(e) => edit.itinerary?.onUpdate(item.id, { title: e.target.value })}
                                                className="w-full bg-slate-900 border rounded-lg py-2.5 px-3 text-white outline-none border-slate-700 focus:border-primary"
                                                placeholder="e.g. Meet up"
                                              />
                                            </div>
                                            <div className="space-y-1">
                                              <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                                                Location (optional)
                                              </div>
                                              <LocationAutocomplete
                                                value={item.location ?? ''}
                                                onChangeText={(text) =>
                                                  edit.itinerary?.onUpdate(item.id, { location: text || undefined })
                                                }
                                                onSelect={(selection) =>
                                                  edit.itinerary?.onUpdate(item.id, {
                                                    location: selection.locationData.display.full,
                                                  })
                                                }
                                                placeholder="Location (optional)"
                                                className="w-full bg-slate-900 border rounded-lg py-2.5 px-3 text-white outline-none border-slate-700 focus:border-primary"
                                              />
                                            </div>
                                          </div>

                                          <div className="space-y-1">
                                            <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">
                                              Description (optional)
                                            </div>
                                            <textarea
                                              value={item.description ?? ''}
                                              onChange={(e) =>
                                                edit.itinerary?.onUpdate(item.id, { description: e.target.value || undefined })
                                              }
                                              className="w-full bg-slate-900 border rounded-lg py-2.5 px-3 text-white outline-none border-slate-700 focus:border-primary h-20 resize-none"
                                              placeholder="Notes, links, what to bring..."
                                            />
                                          </div>
                                        </div>
                                      ) : null}
                                    </div>
                                  )
                                })}

                              <button
                                type="button"
                                onClick={async () => {
                                  const sorted = itineraryItems
                                    .slice()
                                    .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                                  const last = sorted[sorted.length - 1]
                                  const defaultStartIso = last
                                    ? new Date(new Date(last.startTime).getTime() + last.durationMinutes * 60_000).toISOString()
                                    : new Date().toISOString()

                                  const newId = await edit.itinerary?.onAdd({
                                    title: '',
                                    startTime: defaultStartIso,
                                    durationMinutes: 60,
                                    location: undefined,
                                    description: undefined,
                                  })

                                  if (typeof newId === 'string') {
                                    setExpandedItineraryItemId(newId)
                                  }
                                }}
                                className="w-full py-3 rounded-xl font-bold text-sm bg-slate-800 text-white hover:bg-slate-700 transition-colors border border-slate-700"
                              >
                                Add Item
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <div className="text-sm text-slate-500 italic">Itinerary editing is unavailable.</div>
                    )
                  ) : (
                    <div className="space-y-3">
                      {itineraryItems
                        .slice()
                        .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
                        .map((item) => {
                          const start = new Date(item.startTime)
                          const end = new Date(start.getTime() + item.durationMinutes * 60_000)
                          const time = `${formatTime(start)} - ${formatTime(end)}`
                          const date = formatDateLong(start)
                          const loc = formatItineraryLocationForDisplay(item.location)
                          return (
                            <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-900/30 p-4">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <div className="font-bold text-white truncate">{item.title}</div>
                                  <div className="text-sm text-slate-400">
                                    {showItineraryTimesOnly ? time : `${date} • ${time}`}
                                  </div>
                                  {loc.label ? (
                                    loc.isReal && loc.full ? (
                                      <button
                                        type="button"
                                        onClick={() => openItineraryLocationInMaps(loc.full)}
                                        className="text-sm text-slate-400 truncate underline decoration-slate-600 decoration-dashed hover:text-slate-200 transition-colors text-left"
                                        aria-label="Open location in maps"
                                      >
                                        {loc.label}
                                      </button>
                                    ) : (
                                      <div className="text-sm text-slate-400 truncate">{loc.label}</div>
                                    )
                                  ) : null}
                                </div>
                              </div>
                              {item.description ? (
                                <div className="text-sm text-slate-300 mt-3 whitespace-pre-wrap">{item.description}</div>
                              ) : null}
                            </div>
                          )
                        })}
                    </div>
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
                        Open in maps
                      </button>
                    ) : null}
                  </div>
                </div>

                {/* Mini map preview (kept mounted to avoid page layout jumps) */}
                <div className="mt-4 relative rounded-2xl overflow-hidden border border-slate-700 bg-slate-900">
                  <div ref={miniMapContainerRef} className="w-full h-44 md:h-56" />

                  {/* Placeholder overlay (shown until a place is selected) */}
                  {!hasMiniMapPoints ? (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="text-center px-4">
                        <div className="text-sm font-semibold text-slate-300">
                          {hasItinerary ? 'Add itinerary locations to preview the map' : 'Pick a place to preview the map'}
                        </div>
                        <div className="text-xs text-slate-500 mt-1">
                          {hasItinerary
                            ? itineraryGeoLoading
                              ? 'Finding places…'
                              : 'Set a location on each itinerary item.'
                            : 'Type a location, then select a suggestion.'}
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {/* Click-to-open overlay */}
                  {hasMiniMapPoints ? (
                    <div
                      className="absolute inset-0 z-10 cursor-pointer"
                      role="button"
                      tabIndex={0}
                      aria-label="Open in maps"
                      onClick={openPrimaryLocationInMaps}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault()
                          openPrimaryLocationInMaps()
                        }
                      }}
                    />
                  ) : null}

                  <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black/25 via-transparent to-transparent" />
                  {hasMiniMapPoints ? (
                    <div className="absolute bottom-3 right-3 pointer-events-auto z-20">
                      <button
                        onClick={openPrimaryLocationInMaps}
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

          {activeTab === 'guests' ? (
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
                        className="w-full bg-slate-900 border rounded-lg py-3 px-4 text-white outline-none border-slate-700 focus:border-primary"
                      />
                      <div className="text-xs text-slate-500 mt-1">Leave blank for unlimited.</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Visibility</div>
                      <FormSelect
                        value={EventVisibility.INVITE_ONLY}
                        size="lg"
                        disabled
                      >
                        <option value={EventVisibility.INVITE_ONLY}>Invite only</option>
                      </FormSelect>
                    </div>
                  </div>

                </div>
              ) : null}

              <div className="bg-surface border border-slate-700 rounded-2xl p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Users className="w-5 h-5 text-slate-400" /> Guests
                  </h2>
                  <div className="text-sm text-slate-400 font-medium">{event.maxSeats ? goingLabel : `${attendeeCount}`}</div>
                </div>

                {attendeesList.length === 0 ? (
                  <div className="text-sm text-slate-500 italic">No guests yet.</div>
                ) : (
                  <div className="space-y-2">
                    {attendeesList.map((u) => {
                      const isThisHost = u.id === event.hostId
                      const isMe = !!currentUserId && u.id === currentUserId
                      const isFriend = friendIds.has(u.id)
                      const canRemove = isEditMode && !isThisHost

                      return (
                        <div
                          key={u.id}
                          className="flex items-center justify-between gap-3 p-3 rounded-xl border border-slate-800 bg-slate-900/30 hover:border-slate-700 transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="relative shrink-0">
                              <img
                                src={u.avatar}
                                className="w-10 h-10 rounded-full border-2 border-slate-700 bg-slate-800"
                                alt={u.name}
                              />
                              {isThisHost ? (
                                <div className="absolute -top-1 -right-1 bg-yellow-500 text-black text-[10px] w-5 h-5 flex items-center justify-center rounded-full font-bold border border-surface">
                                  ★
                                </div>
                              ) : null}
                            </div>
                            <div className="min-w-0">
                              <div className="text-sm font-bold text-white truncate">{u.name}</div>
                              {isThisHost ? (
                                <div className="text-xs text-yellow-400 font-semibold">Host</div>
                              ) : isMe ? (
                                <div className="text-xs text-slate-500 font-semibold">You</div>
                              ) : null}
                            </div>
                          </div>

                          <div className="shrink-0">
                            {isEditMode ? (
                              <button
                                type="button"
                                onClick={() => handleRemoveAttendee(u.id)}
                                disabled={!canRemove}
                                className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors ${
                                  canRemove
                                    ? 'bg-red-500/10 text-red-300 border-red-500/40 hover:bg-red-500/20'
                                    : 'bg-slate-800 text-slate-500 border-slate-700'
                                }`}
                              >
                                Remove
                              </button>
                            ) : isMe ? null : isFriend ? (
                              <button
                                type="button"
                                disabled
                                className="px-3 py-2 rounded-xl text-xs font-bold border bg-slate-800 text-slate-300 border-slate-700"
                              >
                                Friends
                              </button>
                            ) : (
                              <button
                                type="button"
                                aria-disabled="true"
                                onClick={(e) => comingSoon.show(e, 'Coming Soon!')}
                                className="px-3 py-2 rounded-xl text-xs font-bold border bg-slate-900 text-slate-500 border-slate-700 opacity-60 cursor-not-allowed"
                              >
                                Add Friend
                              </button>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}

                {event.maxSeats && attendeesList.length < event.maxSeats ? (
                  <div className="mt-3 text-xs text-slate-500">
                    {event.maxSeats - attendeesList.length} spot{event.maxSeats - attendeesList.length === 1 ? '' : 's'} open
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {activeTab === 'chat' ? (
            <div className="bg-surface border border-slate-700 rounded-2xl p-5">
              <h2 className="text-lg font-bold text-white mb-4">Chat</h2>

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
                  Chat is read-only while editing. Save your changes to return to normal interaction.
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

      <ComingSoonPopover state={comingSoon.state} />
    </div>
  );
};

function AddItineraryItemForm(props: {
  defaultLocation: string
  timeOptions: { value: string; label: string }[]
  onAdd: (input: {
    title: string
    startTime: string
    durationMinutes: number
    location?: string
    description?: string
  }) => Promise<void> | void
}) {
  const [title, setTitle] = useState('')
  const [startDate, setStartDate] = useState('')
  const [startTime, setStartTime] = useState('')
  const [durationHours, setDurationHours] = useState<number>(1)
  const [location, setLocation] = useState<string>('')
  const [description, setDescription] = useState<string>('')

  const canAdd = title.trim() && startDate && startTime && durationHours > 0

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/30 p-4 space-y-3">
      <div className="text-sm font-bold text-white">Add item</div>
      {/* Date / Time / Duration in one row (matches main Date & Time layout) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-full bg-slate-900 border rounded-lg py-2.5 px-3 text-white outline-none [color-scheme:dark] border-slate-700 focus:border-primary"
        />
        <FormSelect value={startTime} onChange={(e) => setStartTime(e.target.value)} required size="lg" variant="surface">
          <option value="">Select time</option>
          {props.timeOptions.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </FormSelect>
        <input
          type="number"
          min={0.25}
          step={0.25}
          value={durationHours}
          onChange={(e) => setDurationHours(Number(e.target.value || 0))}
          className="w-full bg-slate-900 border rounded-lg py-2.5 px-3 text-white outline-none border-slate-700 focus:border-primary"
          placeholder="Duration (hours)"
        />
      </div>

      <div className="space-y-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full bg-slate-900 border rounded-lg py-2.5 px-3 text-white outline-none border-slate-700 focus:border-primary"
          placeholder="Title"
        />
      </div>
      <div className="space-y-1">
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          className="w-full bg-slate-900 border rounded-lg py-2.5 px-3 text-white outline-none border-slate-700 focus:border-primary"
          placeholder={`Location (optional, defaults to: ${props.defaultLocation})`}
        />
      </div>

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="w-full bg-slate-900 border rounded-lg py-2.5 px-3 text-white outline-none border-slate-700 focus:border-primary h-20 resize-none"
        placeholder="Description (optional)"
      />

      <div className="flex justify-end">
        <button
          type="button"
          disabled={!canAdd}
          onClick={() => {
            if (!canAdd) return
            props.onAdd({
              title: title.trim(),
              startTime: new Date(`${startDate}T${startTime}`).toISOString(),
              durationMinutes: Math.max(1, Math.round(durationHours * 60)),
              location: location.trim() ? location.trim() : undefined,
              description: description.trim() ? description.trim() : undefined,
            })
            setTitle('')
            setStartDate('')
            setStartTime('')
            setDurationHours(1)
            setLocation('')
            setDescription('')
          }}
          className="px-4 py-2 rounded-xl text-sm font-bold transition-colors border border-slate-700 bg-slate-800 text-white hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Add
        </button>
      </div>
    </div>
  )
}
