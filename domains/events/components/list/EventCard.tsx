
import React, { useState, useRef, useEffect } from 'react';
import type { User } from '../../../../lib/types';
import type { SocialEvent } from '../../types';
import { getTheme } from '../../../../lib/constants';
import { Calendar, MapPin, Users, PhoneOff, MessageSquare, Crown, CheckCircle2, X, LogOut } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { StatusFilter } from './EventsFilterBar';
import { fetchUser } from '../../../../services/userService';

// Helper for color interpolation
const hexToRgb = (hex: string) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
};

const interpolateColor = (color1: string, color2: string, factor: number) => {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  const r = Math.round(c1.r + factor * (c2.r - c1.r));
  const g = Math.round(c1.g + factor * (c2.g - c1.g));
  const b = Math.round(c1.b + factor * (c2.b - c1.b));
  return `rgb(${r}, ${g}, ${b})`;
};

interface EventCardProps {
  event: SocialEvent;
  onClick: () => void;
  isCompact?: boolean;
  currentUser: User;
  onJoin?: (eventId: string) => void;
  onLeave?: (eventId: string) => void;
  onHide?: (eventId: string) => void;
  filterContext?: StatusFilter;
}

export const EventCard: React.FC<EventCardProps> = ({ 
  event, 
  onClick, 
  isCompact, 
  currentUser,
  onJoin,
  onLeave,
  onHide,
  filterContext = 'ALL'
}) => {
  const [host, setHost] = useState<User | null>(null);

  useEffect(() => {
    const loadHost = async () => {
      const fetchedHost = await fetchUser(event.hostId, currentUser.id);
      if (fetchedHost) {
        setHost(fetchedHost);
      }
    };
    loadHost();
  }, [event.hostId, currentUser.id]);

  const date = new Date(event.startTime);
  const timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const dateString = date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
  
  const attendeeCount = event.attendees.length;
  const spotsLeft = event.maxSeats ? event.maxSeats - attendeeCount : null;
  const theme = getTheme(event.activityType);

  const isHost = event.hostId === currentUser.id;
  const isAttending = event.attendees.includes(currentUser.id);
  const isInvolved = isHost || isAttending;

  // --- Swipe Logic State ---
  const [offsetX, setOffsetX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  
  // Animation Phases
  const [isExiting, setIsExiting] = useState(false); // Phase 1: Slide off screen
  const [isCollapsing, setIsCollapsing] = useState(false); // Phase 2: Height collapses
  
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const isClick = useRef(true); // Track if the interaction is a tap or a drag/scroll

  // Constants
  const SWIPE_THRESHOLD = 150; // Increased: Requires further swipe to trigger
  const FULL_OPACITY_DISTANCE = 350; // Increased: Transition happens over longer distance
  const MAX_OFFSCREEN = 500; // Push it well off screen
  
  // Animation Durations
  const SNAP_DURATION = 500; // ms
  const SLIDE_DURATION = 400; // ms (Phase 1)
  const COLLAPSE_DELAY = 0; // ms (Pause between Slide and Collapse - Removed delay for snappiness)
  const COLLAPSE_DURATION = 400; // ms (Phase 2)

  const onTouchStart = (e: React.TouchEvent) => {
    // Disable swipe for Hosts (safety)
    if (isHost) return;

    touchStartX.current = e.targetTouches[0].clientX;
    touchStartY.current = e.targetTouches[0].clientY;
    setIsDragging(true);
    isClick.current = true; // Assume it's a click until moved
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null || isHost) return;

    const currentX = e.targetTouches[0].clientX;
    const currentY = e.targetTouches[0].clientY;
    const deltaX = currentX - touchStartX.current;
    const deltaY = currentY - touchStartY.current;

    // If moved significantly (more than 5px in any direction), it's not a click
    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
      isClick.current = false;
    }

    // Lock scrolling if swiping horizontally
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      
      // LOGIC:
      // If Pending: Can swipe Right (Join) or Left (Hide)
      // If Attending: Can swipe Left (Leave) only
      
      if (isAttending && deltaX > 0) return; // Cannot swipe right if already attending
      
      setOffsetX(deltaX);
    }
  };

  const performAction = (action: 'JOIN' | 'HIDE' | 'LEAVE') => {
    // Determine if the card should visually disappear based on the current filter context
    let shouldExit = false;

    if (action === 'HIDE') {
        shouldExit = true; // Hiding always removes it from the list
    } else if (action === 'JOIN') {
        // Only exit if we are looking specifically at "Pending" items
        if (filterContext === 'PENDING') shouldExit = true;
    } else if (action === 'LEAVE') {
        // Only exit if we are looking specifically at "Attending" items
        if (filterContext === 'ATTENDING') shouldExit = true;
    }

    if (shouldExit) {
        setIsExiting(true); // Phase 1: Trigger horizontal slide off
        setOffsetX(action === 'JOIN' ? MAX_OFFSCREEN : -MAX_OFFSCREEN);
        
        // Wait for slide animation to complete
        setTimeout(() => {
          setIsCollapsing(true); // Phase 2: Trigger vertical collapse
          
          // Wait for collapse animation to complete before removing data
          setTimeout(() => {
             if (action === 'JOIN' && onJoin) onJoin(event.id);
             if (action === 'HIDE' && onHide) onHide(event.id);
             if (action === 'LEAVE' && onLeave) onLeave(event.id);
          }, COLLAPSE_DURATION);

        }, SLIDE_DURATION + COLLAPSE_DELAY); 
    } else {
        // Execute immediately and snap back
        if (action === 'JOIN' && onJoin) onJoin(event.id);
        if (action === 'LEAVE' && onLeave) onLeave(event.id);
        
        setOffsetX(0); // Snap back to center
    }
  };

  const onTouchEnd = () => {
    if (isHost) return;
    setIsDragging(false);
    touchStartX.current = null;
    touchStartY.current = null;

    if (offsetX > SWIPE_THRESHOLD && !isAttending) {
      // Swipe Right -> Join
      performAction('JOIN');
    } else if (offsetX < -SWIPE_THRESHOLD) {
      // Swipe Left -> Hide (if pending) or Leave (if attending)
      if (isAttending) {
        performAction('LEAVE');
      } else {
        performAction('HIDE');
      }
    } else {
      // Reset
      setOffsetX(0);
    }
  };

  // --- Visual Calculations ---
  
  // Gradients based on Swipe Direction
  let gradientStyle = {};
  let ActionIcon: LucideIcon | null = null;
  let actionText = '';

  if (offsetX > 0 || (isExiting && offsetX > 0)) {
    // Swipe Right (Join) -> Green on LEFT, fading to right
    gradientStyle = {
      background: 'linear-gradient(to right, rgba(34, 197, 94, 1) 0%, rgba(34, 197, 94, 0.8) 40%, rgba(34, 197, 94, 0) 100%)'
    };
    ActionIcon = CheckCircle2;
    actionText = 'Join';
  } else if (offsetX < 0 || (isExiting && offsetX < 0)) {
    if (isAttending) {
      // Swipe Left (Leave) -> Yellow on RIGHT, fading to left
      gradientStyle = {
        background: 'linear-gradient(to left, rgba(234, 179, 8, 1) 0%, rgba(234, 179, 8, 0.8) 40%, rgba(234, 179, 8, 0) 100%)'
      };
      ActionIcon = LogOut;
      actionText = 'Leave';
    } else {
      // Swipe Left (Hide) -> Red on RIGHT, fading to left
      gradientStyle = {
        background: 'linear-gradient(to left, rgba(239, 68, 68, 1) 0%, rgba(239, 68, 68, 0.8) 40%, rgba(239, 68, 68, 0) 100%)'
      };
      ActionIcon = X;
      actionText = 'Hide';
    }
  }

  // Calculate Action Background Opacity (Gradual fade in)
  const bgOpacity = Math.min(Math.abs(offsetX) / FULL_OPACITY_DISTANCE, 1);

  // Dynamic Card Styling (The transition of the card itself)
  const containerBase = `relative rounded-xl overflow-hidden cursor-pointer transition-shadow hover:shadow-xl group touch-pan-y ${isCompact ? 'p-3' : 'p-4'}`;
  
  // Color calculation for interpolation
  const themeHex = theme.hex;
  const surfaceHex = '#1e293b'; // Slate 800/Surface color
  let dynamicBgColor: string | undefined = undefined;

  if (isDragging) {
    // Interpolate color over a slightly longer distance than the threshold for smoothness
    const progress = Math.min(Math.abs(offsetX) / (SWIPE_THRESHOLD * 1.5), 1);
    
    // If Joining (Dark -> Theme)
    if (offsetX > 0 && !isAttending && !isHost) {
        dynamicBgColor = interpolateColor(surfaceHex, themeHex, progress);
    } 
    // If Leaving (Theme -> Dark)
    else if (offsetX < 0 && isAttending && !isHost) {
        dynamicBgColor = interpolateColor(themeHex, surfaceHex, progress);
    }
  }

  // Static classes for non-dragging state (fallback)
  const colorClasses = isInvolved 
    ? `${theme.bg} text-white shadow-lg border border-transparent` 
    : `bg-surface border ${theme.border} shadow-sm hover:shadow-md hover:shadow-slate-800`;

  // Text colors
  const textColorPrimary = isInvolved ? 'text-white' : 'text-slate-100 group-hover:text-primary';
  const textColorSecondary = isInvolved ? 'text-white/80' : 'text-slate-400';
  const badgeColor = isInvolved ? 'text-white font-bold opacity-90' : theme.text;
  
  // Styles for the Exit Animation (Slide Up)
  // We use CSS Grid transition to smoothly animate height from auto to 0
  const wrapperClass = `
     grid transition-all duration-${COLLAPSE_DURATION} ease-[cubic-bezier(0.4,0,0.2,1)]
     ${isCollapsing ? 'grid-rows-[0fr] opacity-0 mb-0' : 'grid-rows-[1fr] opacity-100 mb-4'}
  `;

  return (
    <div className={wrapperClass}>
      <div className="overflow-hidden"> {/* Inner wrapper needed for grid transition */}
        <div className="relative w-full h-full select-none rounded-xl bg-slate-900">
          
          {/* Swipe Action Background Layer */}
          {/* This layer stays visible during Phase 1 (Slide Out) but disappears during Phase 2 (Collapse) */}
          <div 
            className="absolute inset-0 flex items-center justify-between px-6 rounded-xl z-0"
            style={{ 
              ...gradientStyle,
              // Opacity is 1 during exit phase so we see the gradient while the card flies off
              opacity: isExiting ? 1 : (isDragging ? bgOpacity : 0),
              transition: 'opacity 0.2s'
            }}
          >
            {/* Left Icon (Visible when swiping right) */}
            <div className={`flex items-center gap-2 font-bold text-white ${offsetX > 0 || (isExiting && offsetX > 0) ? 'opacity-100' : 'opacity-0'}`}>
              {ActionIcon && (offsetX > 0 || isExiting) && <ActionIcon className="w-8 h-8 drop-shadow-md" />}
              {(offsetX > 0 || isExiting) && <span className="drop-shadow-md">{actionText}</span>}
            </div>
            
            {/* Right Icon (Visible when swiping left) */}
            <div className={`flex items-center gap-2 font-bold text-white ${offsetX < 0 || (isExiting && offsetX < 0) ? 'opacity-100' : 'opacity-0'}`}>
               {(offsetX < 0 || isExiting) && <span className="drop-shadow-md">{actionText}</span>}
               {ActionIcon && (offsetX < 0 || isExiting) && <ActionIcon className="w-8 h-8 drop-shadow-md" />}
            </div>
          </div>

          {/* The Card Itself */}
          <div 
            ref={cardRef}
            onClick={() => { 
              // Only trigger click if the user hasn't dragged/scrolled significantly
              if (!isDragging && isClick.current && !isExiting) onClick(); 
            }}
            onTouchStart={onTouchStart}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
            className={`${containerBase} ${!dynamicBgColor ? colorClasses : 'text-white border border-transparent shadow-lg'} z-10`}
            style={{ 
              transform: `translateX(${offsetX}px)`,
              // Slower snap back animation
              transition: isDragging ? 'none' : `transform ${isExiting ? SLIDE_DURATION : SNAP_DURATION}ms cubic-bezier(0.2, 0.8, 0.2, 1), background-color 0.2s`,
              backgroundColor: dynamicBgColor ?? (isInvolved ? theme.hex : undefined), // Overrides class background when dragging
              borderColor: isInvolved ? 'transparent' : theme.hex,
            }}
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex items-center space-x-2">
                {host ? (
                  <>
                    <img 
                      src={host.avatar} 
                      alt={host.name} 
                      className={`w-8 h-8 rounded-full object-cover border-2 ${isInvolved ? 'border-white/30' : 'border-slate-600'}`} 
                    />
                    <div className="flex flex-col">
                      <div className={`text-xs leading-tight ${isInvolved ? 'text-white/90' : 'text-slate-400'}`}>
                        <span className={`font-medium ${isInvolved ? 'text-white' : 'text-slate-200'}`}>{host.name}</span>
                      </div>
                      <div className={`text-[10px] font-bold uppercase tracking-wider ${badgeColor}`}>
                        {event.activityType}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <div className={`w-8 h-8 rounded-full bg-slate-700 animate-pulse border-2 ${isInvolved ? 'border-white/30' : 'border-slate-600'}`} />
                    <div className="flex flex-col">
                      <div className={`text-xs leading-tight ${isInvolved ? 'text-white/90' : 'text-slate-400'}`}>
                        <span className={`font-medium ${isInvolved ? 'text-white' : 'text-slate-200'}`}>Loading...</span>
                      </div>
                      <div className={`text-[10px] font-bold uppercase tracking-wider ${badgeColor}`}>
                        {event.activityType}
                      </div>
                    </div>
                  </>
                )}
              </div>
              
              <div className="flex items-center gap-2">
                {/* Status Icons */}
                {isHost && (
                  <div className={`p-1 rounded-full ${isInvolved ? 'bg-white/20' : 'bg-yellow-500/10'} backdrop-blur-sm`} title="Hosting">
                      <Crown className={`w-4 h-4 ${isInvolved ? 'text-white' : 'text-yellow-500'}`} />
                  </div>
                )}
                {isAttending && !isHost && (
                  <div className={`p-1 rounded-full ${isInvolved ? 'bg-white/20' : 'bg-green-500/10'} backdrop-blur-sm`} title="Going">
                      <CheckCircle2 className={`w-4 h-4 ${isInvolved ? 'text-white' : 'text-green-500'}`} />
                  </div>
                )}
              </div>
            </div>

            <h3 className={`font-bold mb-1 transition-colors ${isCompact ? 'text-sm' : 'text-lg'} ${textColorPrimary}`}>
              {event.title}
            </h3>

            <div className={`space-y-1.5 text-sm mb-3 ${textColorSecondary}`}>
              <div className="flex items-center space-x-2">
                <Calendar className={`w-4 h-4 ${isInvolved ? 'text-white/70' : 'text-secondary'}`} />
                <span>{dateString} • <span className={event.isFlexibleStart ? 'italic opacity-80' : ''}>{timeString} {event.isFlexibleStart ? '(ish)' : ''}</span></span>
              </div>
              <div className="flex items-center space-x-2">
                <MapPin className={`w-4 h-4 ${isInvolved ? 'text-white/70' : 'text-accent'}`} />
                <span className="truncate">{event.location}</span>
              </div>
            </div>

            {!isCompact && (
              <div className={`flex items-center justify-between mt-3 pt-3 border-t ${isInvolved ? 'border-white/20' : 'border-slate-700/50'}`}>
                <div className={`flex space-x-3 text-xs ${textColorSecondary}`}>
                  <div className="flex items-center space-x-1">
                    <Users className="w-3 h-3" />
                    <span>{attendeeCount} going</span>
                    {spotsLeft !== null && <span className={`ml-1 ${isInvolved ? 'text-white font-bold' : 'text-secondary'}`}>({spotsLeft} left)</span>}
                  </div>
                  {event.noPhones && (
                    <div className="flex items-center space-x-1 opacity-90" title="No Phones">
                      <PhoneOff className="w-3 h-3" />
                      <span>Unplugged</span>
                    </div>
                  )}
                </div>
                
                <div className={`flex items-center space-x-1 text-xs ${isInvolved ? 'text-white/60' : 'text-slate-500'}`}>
                  <MessageSquare className="w-3 h-3" />
                  <span>{event.comments.length}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
