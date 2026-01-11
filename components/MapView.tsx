
import React, { useEffect, useRef, useState } from 'react';
import { SocialEvent, User } from '../lib/types';
import { getTheme } from '../lib/constants';
import { fetchUsers } from '../services/userService';

// Add declaration for Leaflet on window object
declare global {
  interface Window {
    L: any;
  }
}

interface MapViewProps {
  events: SocialEvent[];
  onEventClick: (e: SocialEvent) => void;
  currentUser: User;
}

export const MapView: React.FC<MapViewProps> = ({ events, onEventClick, currentUser }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const [hostsMap, setHostsMap] = useState<Map<string, User>>(new Map());

  // Fetch all unique host users
  useEffect(() => {
    const loadHosts = async () => {
      const uniqueHostIds = [...new Set(events.map((e: SocialEvent) => e.hostId))] as string[];
      if (uniqueHostIds.length > 0) {
        const fetchedHosts = await fetchUsers(uniqueHostIds);
        const hostsMap = new Map(fetchedHosts.map(u => [u.id, u]));
        setHostsMap(hostsMap);
      }
    };
    loadHosts();
  }, [events]);

  useEffect(() => {
    // Ensure Leaflet is loaded
    if (!window.L || !mapContainerRef.current) return;

    // Initialize Map if not already done
    if (!mapInstanceRef.current) {
      // Center on Victoria BC
      const map = window.L.map(mapContainerRef.current).setView([48.4284, -123.3656], 13);
      
      // Add a lighter basemap for better legibility in our dark UI (CartoDB Voyager)
      window.L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20,
        opacity: 0.95,
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    // Cleanup function
    return () => {
      // We don't necessarily want to destroy the map on every unmount if we want to preserve state,
      // but for this simple app, cleanup is safer.
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Markers when events change
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return;

    const map = mapInstanceRef.current;

    // Clear existing markers
    markersRef.current.forEach(marker => marker.remove());
    markersRef.current = [];

    // Add new markers
    events.forEach(event => {
       const host = hostsMap.get(event.hostId);
       if (!host) return; // Skip if host not loaded yet
       
       const theme = getTheme(event.activityType);
       const isHost = event.hostId === currentUser.id;
       const isAttending = event.attendees.includes(currentUser.id);
       
       // Pulse color based on status
       let pulseColorClass = theme.bg; // Default category color
       let ringBorder = 'border-white';
       
       if (isHost) {
         pulseColorClass = 'bg-yellow-500';
         ringBorder = 'border-yellow-500';
       } else if (isAttending) {
         pulseColorClass = 'bg-green-500';
         ringBorder = 'border-green-500';
       }

       // Create custom HTML icon with avatar
       const iconHtml = `
         <div class="relative w-10 h-10 group">
            <div class="absolute inset-0 ${pulseColorClass} rounded-full animate-pulse opacity-50"></div>
            <img src="${host.avatar}" class="relative w-10 h-10 rounded-full border-2 ${ringBorder} shadow-lg object-cover" />
            <div class="absolute -bottom-1 -right-1 bg-surface text-[10px] px-1 rounded border border-slate-700 shadow font-bold text-white z-10">
               ${new Date(event.startTime).getHours() < 12 ? new Date(event.startTime).getHours() + 'a' : (new Date(event.startTime).getHours() - 12 || 12) + 'p'}
            </div>
         </div>
       `;

       const customIcon = window.L.divIcon({
         html: iconHtml,
         className: 'bg-transparent', // Remove default styles
         iconSize: [40, 40],
         iconAnchor: [20, 20],
         popupAnchor: [0, -20]
       });

       const marker = window.L.marker([event.coordinates.lat, event.coordinates.lng], { icon: customIcon })
         .addTo(map)
         .bindPopup(`
            <div class="min-w-[150px]">
               <div class="text-xs ${theme.text} font-bold uppercase mb-1 flex justify-between">
                  <span>${event.activityType}</span>
                  ${isHost ? '<span class="text-yellow-500">★ HOST</span>' : isAttending ? '<span class="text-green-500">✓ GOING</span>' : ''}
               </div>
               <div class="font-bold text-sm mb-1">${event.title}</div>
               <div class="text-xs text-slate-300 mb-2">${event.location}</div>
               <button class="w-full ${theme.bg} text-white text-xs py-1 px-2 rounded hover:opacity-90 transition-opacity click-trigger" data-id="${event.id}">
                  View Details
               </button>
            </div>
         `);
       
       // Add click listener to marker to open popup
       marker.on('click', () => {
         // Optionally handle simple click
       });

       // Bind popup open event to attach custom click handler to the button inside popup
       marker.on('popupopen', () => {
          const btn = document.querySelector(`.click-trigger[data-id="${event.id}"]`);
          if (btn) {
            btn.addEventListener('click', (e) => {
               e.stopPropagation();
               onEventClick(event);
            });
          }
       });

       markersRef.current.push(marker);
    });

  }, [events, onEventClick, currentUser, hostsMap]);

  return (
    <div className="w-full h-full relative md:rounded-2xl overflow-hidden shadow-inner md:border border-slate-700 bg-slate-900 touch-pan-y">
      <div ref={mapContainerRef} className="w-full h-full z-0" />
    </div>
  );
};
