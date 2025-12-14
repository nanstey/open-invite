
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ViewMode, InvitesMode, FriendsMode, SocialEvent, User } from './lib/types';
import { EventCard } from './components/EventCard';
import { CreateEventModal } from './components/CreateEventModal';
import { EventDetail } from './components/EventDetail';
import { MapView } from './components/MapView';
import { CalendarView } from './components/CalendarView';
import { FriendsView } from './components/FriendsView';
import { AlertsView } from './components/AlertsView';
import { ProfileView } from './components/ProfileView';
import { FilterBar, TimeFilter, StatusFilter } from './components/FilterBar';
import { TabGroup, TabOption } from './components/TabGroup';
import { Plus, LayoutGrid, Map as MapIcon, Calendar as CalendarIcon, Bell, Users as UsersIcon, UserCircle, CalendarDays } from 'lucide-react';
import { AuthProvider, useAuth } from './components/AuthProvider';
import { LoginModal } from './components/LoginModal';
import { LandingPage } from './components/LandingPage';
import { fetchEvents, createEvent, updateEvent, joinEvent, leaveEvent } from './services/eventService';
import { realtimeService } from './services/realtimeService';

const useSupabase = () => {
  return (import.meta as any).env?.VITE_USE_SUPABASE === 'true' && 
         (import.meta as any).env?.VITE_SUPABASE_URL && 
         (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;
};

const AppContent: React.FC = () => {
  const { user: currentUser, loading: authLoading } = useAuth();
  const [events, setEvents] = useState<SocialEvent[]>([]);
  const [eventsLoading, setEventsLoading] = useState(true);
  const [dismissedEventIds, setDismissedEventIds] = useState<Set<string>>(new Set());
  const [showLoginModal, setShowLoginModal] = useState(false);
  const useSupabaseFlag = useSupabase();
  
  // Top level navigation state
  const [viewMode, setViewMode] = useState<ViewMode>('EVENTS');
  
  // Sub-view states
  const [invitesMode, setInvitesMode] = useState<InvitesMode>('LIST');
  const [friendsMode, setFriendsMode] = useState<FriendsMode>('FRIENDS');
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<SocialEvent | null>(null);

  // --- Filtering State ---
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('ALL');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('ALL');
  const [showOpenOnly, setShowOpenOnly] = useState(false);

  // --- Scroll & Visibility State ---
  const [isFilterBarVisible, setIsFilterBarVisible] = useState(true);
  const lastScrollY = useRef(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Reset visibility when view changes
  useEffect(() => {
    setIsFilterBarVisible(true);
    lastScrollY.current = 0;
    if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollTop = 0;
    }
  }, [viewMode, invitesMode]);

  // Handle OAuth callback - close login modal when user becomes authenticated
  useEffect(() => {
    if (currentUser && showLoginModal) {
      // User just authenticated (likely from OAuth callback)
      setShowLoginModal(false);
      // Clean up OAuth callback URL parameters
      if (window.location.hash.includes('access_token') || window.location.search.includes('code')) {
        const url = new URL(window.location.href);
        url.hash = '';
        url.search = '';
        window.history.replaceState({}, '', url.toString());
      }
    }
  }, [currentUser, showLoginModal]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    // Only apply logic in List view where FilterBar is relevant
    if (viewMode !== 'EVENTS' || invitesMode !== 'LIST') return;

    const currentScrollY = e.currentTarget.scrollTop;
    const diff = currentScrollY - lastScrollY.current;
    
    // Threshold to prevent jitter
    if (Math.abs(diff) > 10) {
        if (diff > 0 && currentScrollY > 50) {
            // Scrolling Down
            setIsFilterBarVisible(false);
        } else if (diff < 0) {
            // Scrolling Up
            setIsFilterBarVisible(true);
        }
        lastScrollY.current = currentScrollY;
    }
  };

  // --- Tab Configurations ---
  const inviteTabs: TabOption[] = [
    { id: 'LIST', label: 'Cards', icon: <LayoutGrid className="w-4 h-4" /> },
    { id: 'MAP', label: 'Map', icon: <MapIcon className="w-4 h-4" /> },
    { id: 'CALENDAR', label: 'Calendar', icon: <CalendarIcon className="w-4 h-4" /> },
  ];

  const friendsTabs: TabOption[] = [
    { id: 'FRIENDS', label: 'Friends', icon: <UsersIcon className="w-4 h-4" /> },
    { id: 'GROUPS', label: 'Groups', icon: <UserCircle className="w-4 h-4" /> },
  ];

  // Load events on mount and when user changes
  useEffect(() => {
    if (authLoading) return;
    
    if (!useSupabaseFlag || !currentUser) {
      setEvents([]);
      setEventsLoading(false);
      return;
    }

    const loadEvents = async () => {
      setEventsLoading(true);
      try {
        const fetchedEvents = await fetchEvents();
        setEvents(fetchedEvents);
      } catch (error) {
        console.error('Error loading events:', error);
        setEvents([]);
      } finally {
        setEventsLoading(false);
      }
    };

    loadEvents();

    // Subscribe to new events
    const unsubscribeNewEvents = realtimeService.subscribeToAllEvents((newEvent) => {
      setEvents(prev => {
        // Check if event already exists
        if (prev.some(e => e.id === newEvent.id)) {
          return prev.map(e => e.id === newEvent.id ? newEvent : e);
        }
        return [newEvent, ...prev];
      });
    });

    return () => {
      unsubscribeNewEvents();
    };
  }, [currentUser, authLoading, useSupabaseFlag]);

  // Subscribe to event updates for selected event
  useEffect(() => {
    if (!selectedEvent || !useSupabaseFlag) return;

    const unsubscribe = realtimeService.subscribeToEvent(selectedEvent.id, {
      onUpdate: (updatedEvent) => {
        setSelectedEvent(updatedEvent);
        setEvents(prev => prev.map(e => e.id === updatedEvent.id ? updatedEvent : e));
      },
      onDelete: () => {
        setSelectedEvent(null);
        setEvents(prev => prev.filter(e => e.id !== selectedEvent.id));
      },
    });

    return () => {
      unsubscribe();
    };
  }, [selectedEvent, useSupabaseFlag]);

  const handleCreateEvent = async (newEventData: Omit<SocialEvent, 'id' | 'hostId' | 'attendees' | 'comments' | 'reactions'>) => {
    if (!currentUser) {
      setShowLoginModal(true);
      return;
    }

    if (!useSupabaseFlag) {
      console.error('Supabase is not enabled');
      return;
    }

    try {
      const newEvent = await createEvent(newEventData);
      if (newEvent) {
        setEvents(prev => [newEvent, ...prev]);
        setShowCreateModal(false);
        setStatusFilter('HOSTING');
      }
    } catch (error) {
      console.error('Error creating event:', error);
    }
  };

  const handleUpdateEvent = async (updated: SocialEvent) => {
    if (useSupabaseFlag) {
      try {
        const result = await updateEvent(updated.id, updated);
        if (result) {
          setSelectedEvent(result);
          setEvents(prev => prev.map(e => e.id === result.id ? result : e));
        }
      } catch (error) {
        console.error('Error updating event:', error);
      }
    } else {
      // Fallback to mock behavior
      setEvents(prev => prev.map(e => e.id === updated.id ? updated : e));
      setSelectedEvent(updated);
    }
  };

  // --- Action Handlers (Swipe / Buttons) ---
  const handleJoinEvent = async (eventId: string) => {
    if (!currentUser) {
      setShowLoginModal(true);
      return;
    }

    if (!useSupabaseFlag) {
      console.error('Supabase is not enabled');
      return;
    }

    try {
      const success = await joinEvent(eventId);
      if (success) {
        // Event will be updated via realtime subscription
        const updatedEvent = await fetchEvents();
        const event = updatedEvent.find(e => e.id === eventId);
        if (event) {
          setEvents(prev => prev.map(e => e.id === eventId ? event : e));
        }
      }
    } catch (error) {
      console.error('Error joining event:', error);
    }
  };

  const handleLeaveEvent = async (eventId: string) => {
    if (!currentUser) return;

    if (!useSupabaseFlag) {
      console.error('Supabase is not enabled');
      return;
    }

    try {
      const success = await leaveEvent(eventId);
      if (success) {
        const updatedEvent = await fetchEvents();
        const event = updatedEvent.find(e => e.id === eventId);
        if (event) {
          setEvents(prev => prev.map(e => e.id === eventId ? event : e));
        }
      }
    } catch (error) {
      console.error('Error leaving event:', error);
    }
  };

  const handleDismiss = (eventId: string) => {
    setDismissedEventIds(prev => {
       const next = new Set(prev);
       next.add(eventId);
       return next;
    });
  };

  const handleRestore = (eventId: string) => {
    setDismissedEventIds(prev => {
       const next = new Set(prev);
       next.delete(eventId);
       return next;
    });
  };

  // Get current user for filtering
  const effectiveUser = currentUser;

  // --- Filter Logic ---
  const filteredEvents = useMemo(() => {
    if (!effectiveUser) return [];
    
    const now = new Date();

    return events.filter(event => {
      // 1. Dismissed Check (unless viewing Dismissed tab)
      const isDismissed = dismissedEventIds.has(event.id);
      if (statusFilter === 'DISMISSED') {
         if (!isDismissed) return false;
      } else {
         if (isDismissed) return false;
      }

      // 2. Status Filter Bucket Logic
      const isHost = event.hostId === effectiveUser.id;
      const isAttending = event.attendees.includes(effectiveUser.id);
      const isPast = new Date(event.startTime) < now;

      // Filter by Past/Future first
      if (statusFilter !== 'PAST' && statusFilter !== 'DISMISSED') {
         // Default views show upcoming only
         if (isPast) return false;
      }
      if (statusFilter === 'PAST') {
         // Past view shows past events involved in
         if (!isPast) return false;
         // Usually only show past events if you were involved
         if (!isHost && !isAttending) return false;
      }

      // Filter by Relationship
      if (statusFilter === 'HOSTING' && !isHost) return false;
      if (statusFilter === 'ATTENDING' && (!isAttending || isHost)) return false; // Strict attending (not host)
      if (statusFilter === 'PENDING') {
         // "Pending" here means: Upcoming, Public/Visible, NOT hosting, NOT attending
         if (isHost || isAttending) return false;
      }
      // 'ALL' includes Hosting, Attending, and Pending (Everything visible)

      // 3. Search (Title, Description, Location)
      const term = searchTerm.toLowerCase();
      const matchesSearch = 
        event.title.toLowerCase().includes(term) || 
        event.description.toLowerCase().includes(term) ||
        event.location.toLowerCase().includes(term);
      
      if (!matchesSearch) return false;

      // 4. Category
      if (filterCategory !== 'ALL' && event.activityType !== filterCategory) return false;

      // 5. Open Seats (Only for All/Pending)
      if ((statusFilter === 'ALL' || statusFilter === 'PENDING') && showOpenOnly) {
         const taken = event.attendees.length;
         const max = event.maxSeats;
         if (max !== undefined && taken >= max) return false;
      }

      // 6. Time Filter (Skip if viewing Past)
      if (statusFilter !== 'PAST' && timeFilter !== 'ALL') {
        const eventDate = new Date(event.startTime);
        
        const checkDate = new Date(eventDate);
        checkDate.setHours(0,0,0,0);
        const todayZero = new Date(now);
        todayZero.setHours(0,0,0,0);
        
        if (timeFilter === 'TODAY') {
           if (checkDate.getTime() !== todayZero.getTime()) return false;
        } else if (timeFilter === 'TOMORROW') {
           const tomorrow = new Date(todayZero);
           tomorrow.setDate(tomorrow.getDate() + 1);
           if (checkDate.getTime() !== tomorrow.getTime()) return false;
        } else if (timeFilter === 'WEEK') {
           const nextWeek = new Date(todayZero);
           nextWeek.setDate(nextWeek.getDate() + 7);
           if (checkDate < todayZero || checkDate > nextWeek) return false;
        }
      }

      return true;
    }).sort((a, b) => {
       // Sort Past events descending (newest first), Future events ascending (soonest first)
       const timeA = new Date(a.startTime).getTime();
       const timeB = new Date(b.startTime).getTime();
       return statusFilter === 'PAST' ? timeB - timeA : timeA - timeB;
    });
  }, [events, searchTerm, filterCategory, showOpenOnly, timeFilter, statusFilter, effectiveUser?.id, dismissedEventIds]);

  // --- Grouping Logic for Card View ---
  const groupedEvents = useMemo(() => {
    if (invitesMode !== 'LIST' || filteredEvents.length === 0) return [];

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(today.getDate() + 7);

    const groups: { title: string; events: SocialEvent[] }[] = [];

    filteredEvents.forEach(event => {
       const eDate = new Date(event.startTime);
       const eDateOnly = new Date(eDate.getFullYear(), eDate.getMonth(), eDate.getDate());
       
       let title = "";

       if (statusFilter === 'PAST' || (eDate < now && statusFilter === 'DISMISSED')) {
          title = "Past"; // Or group by month if desired, but simplified for now
       } else if (eDateOnly.getTime() === today.getTime()) {
          title = "Today";
       } else if (eDateOnly.getTime() === tomorrow.getTime()) {
          title = "Tomorrow";
       } else if (eDate < nextWeek) {
          title = "This Week";
       } else if (eDate.getMonth() === now.getMonth() && eDate.getFullYear() === now.getFullYear()) {
          title = "This Month";
       } else {
          title = eDate.toLocaleDateString('en-US', { month: 'long', year: eDate.getFullYear() ? 'numeric' : undefined });
       }

       // Check if we can append to the last group
       const lastGroup = groups[groups.length - 1];
       if (lastGroup && lastGroup.title === title) {
          lastGroup.events.push(event);
       } else {
          groups.push({ title, events: [event] });
       }
    });

    return groups;
  }, [filteredEvents, invitesMode, statusFilter]);

  // Determine content container classes
  const contentClass = useMemo(() => {
    // If we are in Calendar or Map mode, we want full width (p-0) and the parent to NOT scroll (overflow-hidden)
    // so the components can handle their own layout/scrolling.
    if (viewMode === 'EVENTS' && (invitesMode === 'CALENDAR' || invitesMode === 'MAP')) {
      return "flex-1 flex flex-col overflow-hidden p-0 md:p-4 md:pt-2";
    }
    // Default list view scrolling
    return "flex-1 overflow-y-auto custom-scrollbar p-4 md:p-6 pt-2";
  }, [viewMode, invitesMode]);

  const pageTitle = useMemo(() => {
      switch(viewMode) {
          case 'EVENTS': return 'Events';
          case 'FRIENDS': return 'Friends';
          case 'ALERTS': return 'Alerts';
          case 'PROFILE': return 'Profile';
          default: return '';
      }
  }, [viewMode]);

  // Show loading state
  if (authLoading || eventsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-slate-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-slate-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Show landing page if using Supabase and not authenticated
  if (useSupabaseFlag && !currentUser) {
    return (
      <>
        <LandingPage onSignIn={() => setShowLoginModal(true)} />
        {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} />}
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row max-w-7xl mx-auto overflow-hidden h-screen text-slate-100 bg-background">
      
      {/* Desktop Sidebar */}
      <nav className="hidden md:flex w-20 lg:w-64 bg-slate-900 border-r border-slate-800 flex-col justify-between items-center p-4 z-20 shrink-0">
        <div className="flex flex-col items-center gap-8 w-full">
           <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary cursor-pointer select-none mb-4">
              Open Invite
           </div>
           
           <div className="flex flex-col gap-4 w-full">
              <button 
                onClick={() => setViewMode('EVENTS')}
                className={`p-3 rounded-xl transition-all flex items-center justify-start gap-3 w-full ${viewMode === 'EVENTS' ? 'bg-primary/10 text-primary' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
              >
                <CalendarDays className="w-6 h-6" />
                <span className="hidden lg:block font-medium">Events</span>
              </button>
              <button 
                 onClick={() => setViewMode('FRIENDS')} 
                 className={`p-3 rounded-xl transition-all flex items-center justify-start gap-3 w-full ${viewMode === 'FRIENDS' ? 'bg-primary/10 text-primary' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
              >
                <UsersIcon className="w-6 h-6" />
                <span className="hidden lg:block font-medium">Friends</span>
              </button>

              <button 
                 onClick={() => setShowCreateModal(true)}
                 className="p-3 rounded-xl transition-all flex items-center justify-start gap-3 w-full bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 group"
              >
                 <Plus className="w-6 h-6" />
                 <span className="hidden lg:block font-bold">New Invite</span>
              </button>
           </div>
        </div>

        <div className="flex flex-col gap-4 w-full">
           <button 
                onClick={() => setViewMode('ALERTS')}
                className={`p-3 rounded-xl transition-all flex items-center justify-start gap-3 w-full ${viewMode === 'ALERTS' ? 'bg-primary/10 text-primary' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
           >
              <div className="relative">
                 <Bell className="w-6 h-6" />
                 <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-900"></span>
              </div>
              <span className="hidden lg:block font-medium">Notifications</span>
           </button>
           
           <button 
                onClick={() => setViewMode('PROFILE')}
                className={`p-3 rounded-xl transition-all flex items-center justify-start gap-3 w-full ${viewMode === 'PROFILE' ? 'bg-primary/10 text-primary' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}
            >
              <div className={`w-6 h-6 rounded-full bg-gradient-to-br from-primary to-secondary p-[1px] ${viewMode === 'PROFILE' ? 'ring-2 ring-primary ring-offset-2 ring-offset-slate-900' : ''}`}>
                 <img src={effectiveUser.avatar} alt="Me" className="rounded-full w-full h-full bg-slate-900 object-cover" />
              </div>
              <span className="hidden lg:block font-medium">Profile</span>
           </button>
        </div>
      </nav>

      {/* Mobile Top Header (Fixed) */}
      <div className="md:hidden fixed top-0 left-0 right-0 h-14 bg-slate-900/95 backdrop-blur border-b border-slate-800 z-40 flex items-center justify-between px-4 shadow-lg">
          <h1 className="text-lg font-bold text-white tracking-wide">
            {pageTitle}
          </h1>
          <div>
            {viewMode === 'EVENTS' && (
               <TabGroup tabs={inviteTabs} activeTab={invitesMode} onChange={setInvitesMode} hideLabel />
            )}
            {viewMode === 'FRIENDS' && (
               <TabGroup tabs={friendsTabs} activeTab={friendsMode} onChange={setFriendsMode} hideLabel />
            )}
            {/* Alerts and Profile don't have top-right tabs on mobile */}
          </div>
      </div>

      {/* Main Content Area */}
      <main className="flex-1 relative flex flex-col bg-background overflow-hidden pt-14 pb-16 md:pt-0 md:pb-0 h-screen md:h-auto">
        
        {/* Desktop Header */}
        <header className="hidden md:flex flex-col gap-4 p-4 md:p-6 pb-2 shrink-0 border-b border-transparent z-10">
          <div className="flex items-center justify-between w-full">
            <h1 className="text-2xl font-bold text-white whitespace-nowrap">
              {pageTitle}
            </h1>

            {/* Desktop Tab Groups */}
            <div className="block">
              {viewMode === 'EVENTS' && (
                <TabGroup tabs={inviteTabs} activeTab={invitesMode} onChange={setInvitesMode} />
              )}
              {viewMode === 'FRIENDS' && (
                <TabGroup tabs={friendsTabs} activeTab={friendsMode} onChange={setFriendsMode} />
              )}
            </div>
          </div>
        </header>

        {/* Content Container */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          
          {/* Show Filter Bar only for Events view */}
          {viewMode === 'EVENTS' && (
            <FilterBar 
               isVisible={isFilterBarVisible}
               searchTerm={searchTerm}
               onSearchChange={setSearchTerm}
               selectedCategory={filterCategory}
               onCategoryChange={setFilterCategory}
               timeFilter={timeFilter}
               onTimeFilterChange={setTimeFilter}
               statusFilter={statusFilter}
               onStatusFilterChange={setStatusFilter}
               showOpenOnly={showOpenOnly}
               onShowOpenOnlyChange={setShowOpenOnly}
            />
          )}

          <div 
             ref={scrollContainerRef}
             className={contentClass} 
             onScroll={handleScroll}
          >
            
            {viewMode === 'EVENTS' && (
               <>
                  {invitesMode === 'LIST' && (
                    <>
                      {filteredEvents.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-64 text-slate-500">
                            <div className="text-4xl mb-4">🌪️</div>
                            <p>No events found matching your filters.</p>
                            <button onClick={() => {setFilterCategory('ALL'); setSearchTerm(''); setTimeFilter('ALL'); setShowOpenOnly(false); setStatusFilter('ALL')}} className="mt-2 text-primary hover:underline">Clear Filters</button>
                          </div>
                      ) : (
                          <div className="pb-20 space-y-8">
                             {groupedEvents.map(group => (
                               <div key={group.title}>
                                 {/* Removed 'sticky top-0 bg-background/95 backdrop-blur-sm z-10' to make it scroll normally */}
                                 <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider mb-3 mt-6 first:mt-0 py-1">
                                    {group.title}
                                 </h3>
                                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {group.events.map(event => (
                                       <div key={event.id} className="relative group">
                                          <EventCard 
                                             event={event} 
                                             onClick={() => setSelectedEvent(event)} 
                                             currentUser={effectiveUser}
                                             onJoin={handleJoinEvent}
                                             onLeave={handleLeaveEvent}
                                             onHide={handleDismiss}
                                             filterContext={statusFilter}
                                          />
                                          {statusFilter === 'DISMISSED' && (
                                             <button 
                                                onClick={(e) => { e.stopPropagation(); handleRestore(event.id); }}
                                                className="absolute top-2 right-2 bg-slate-800 text-green-400 px-3 py-1 rounded-full text-xs font-bold border border-green-500/50 hover:bg-green-500/20 z-10"
                                             >
                                                Restore
                                             </button>
                                          )}
                                       </div>
                                    ))}
                                 </div>
                               </div>
                             ))}
                             
                             <div className="flex flex-col items-center justify-center py-10 text-slate-600 gap-3">
                                <div className="w-16 h-1 bg-slate-800 rounded-full"></div>
                                <span className="text-xs font-bold uppercase tracking-widest">No more events</span>
                             </div>
                          </div>
                      )}
                    </>
                  )}

                  {invitesMode === 'MAP' && (
                    <MapView events={filteredEvents} onEventClick={setSelectedEvent} currentUser={effectiveUser} />
                  )}

                  {invitesMode === 'CALENDAR' && (
                    <CalendarView events={filteredEvents} onEventClick={setSelectedEvent} currentUser={effectiveUser} />
                  )}
               </>
            )}

            {viewMode === 'FRIENDS' && (
               <FriendsView activeTab={friendsMode} />
            )}

            {viewMode === 'ALERTS' && (
                <AlertsView />
            )}

            {viewMode === 'PROFILE' && (
                <ProfileView currentUser={effectiveUser} />
            )}
          </div>

        </div>
      </main>

      {/* Mobile Bottom Footer (Fixed) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-900 border-t border-slate-800 z-50 flex justify-around items-center px-1 pb-safe-area shadow-[0_-5px_20px_rgba(0,0,0,0.3)]">
          <button onClick={() => setViewMode('EVENTS')} className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${viewMode === 'EVENTS' ? 'text-primary' : 'text-slate-400'}`}>
             <CalendarDays className="w-6 h-6" />
             <span className="text-[10px] font-medium">Events</span>
          </button>
          
          <button onClick={() => setViewMode('FRIENDS')} className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${viewMode === 'FRIENDS' ? 'text-primary' : 'text-slate-400'}`}>
             <UsersIcon className="w-6 h-6" />
             <span className="text-[10px] font-medium">Friends</span>
          </button>

          <button onClick={() => setShowCreateModal(true)} className="-mt-8 bg-primary text-white p-3 rounded-full shadow-lg shadow-primary/30 border-4 border-slate-900 transform transition-transform hover:scale-105 active:scale-95">
             <Plus className="w-7 h-7" />
          </button>

          <button onClick={() => setViewMode('ALERTS')} className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${viewMode === 'ALERTS' ? 'text-primary' : 'text-slate-400'}`}>
             <div className="relative">
                <Bell className="w-6 h-6" />
                <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-slate-900"></span>
             </div>
             <span className="text-[10px] font-medium">Alerts</span>
          </button>

          <button onClick={() => setViewMode('PROFILE')} className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-colors ${viewMode === 'PROFILE' ? 'text-primary' : 'text-slate-400'}`}>
             <div className={`w-6 h-6 rounded-full overflow-hidden border ${viewMode === 'PROFILE' ? 'border-primary' : 'border-slate-500'}`}>
               <img src={effectiveUser.avatar} alt="Me" className="w-full h-full object-cover" />
             </div>
             <span className="text-[10px] font-medium">Profile</span>
          </button>
      </nav>

      {/* Modals */}
      {showCreateModal && (
        <CreateEventModal onClose={() => setShowCreateModal(false)} onCreate={handleCreateEvent} />
      )}

      {selectedEvent && (
        <EventDetail 
          event={selectedEvent} 
          currentUser={effectiveUser} 
          onClose={() => setSelectedEvent(null)} 
          onUpdateEvent={handleUpdateEvent}
          onDismiss={
              (statusFilter === 'ALL' || statusFilter === 'PENDING') 
              ? () => { handleDismiss(selectedEvent.id); setSelectedEvent(null); } 
              : undefined
          }
        />
      )}

      {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} />}

    </div>
  );
};

const App: React.FC = () => {
  // Always wrap in AuthProvider - it handles the case when Supabase is disabled
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;
