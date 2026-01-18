

import React, { useState, useEffect } from 'react';
import { EventVisibility, SocialEvent, Group } from '../lib/types';
import { X, Calendar, MapPin, Type, AlignLeft } from 'lucide-react';
import { fetchGroups } from '../services/friendService';
import { supabase } from '../lib/supabase';

interface CreateEventModalProps {
  onClose: () => void;
  onCreate: (event: Omit<SocialEvent, 'id' | 'slug' | 'hostId' | 'attendees' | 'comments' | 'reactions'>) => void;
}

export const CreateEventModal: React.FC<CreateEventModalProps> = ({ onClose, onCreate }) => {
  // Form State
  const [title, setTitle] = useState('');
  const [location, setLocation] = useState('');
  const [description, setDescription] = useState('');
  const [startDateTime, setStartDateTime] = useState('');
  const [activityType, setActivityType] = useState('Social');
  const [isFlexibleStart, setIsFlexibleStart] = useState(false);
  const [isFlexibleEnd, setIsFlexibleEnd] = useState(false);
  const [noPhones, setNoPhones] = useState(false);
  const [maxSeats, setMaxSeats] = useState<number | ''>('');
  const [visibilityType, setVisibilityType] = useState<EventVisibility>(EventVisibility.ALL_FRIENDS);
  const [selectedGroupIds, setSelectedGroupIds] = useState<string[]>([]);
  const [allowFriendInvites, setAllowFriendInvites] = useState(false);
  const [availableGroups, setAvailableGroups] = useState<Group[]>([]);

  // Fetch groups when visibility type is GROUPS
  useEffect(() => {
    const loadGroups = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && visibilityType === EventVisibility.GROUPS) {
        const groups = await fetchGroups(user.id);
        setAvailableGroups(groups);
      }
    };
    loadGroups();
  }, [visibilityType]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Generate random coordinates near Victoria BC for demo purposes
    // Center roughly 48.4284, -123.3656
    const baseLat = 48.4284;
    const baseLng = -123.3656;
    const randomOffsetLat = (Math.random() - 0.5) * 0.05;
    const randomOffsetLng = (Math.random() - 0.5) * 0.05;

    onCreate({
      title,
      location,
      description,
      startTime: new Date(startDateTime).toISOString(),
      activityType,
      isFlexibleStart,
      isFlexibleEnd,
      noPhones,
      maxSeats: maxSeats === '' ? undefined : Number(maxSeats),
      visibilityType,
      groupIds: visibilityType === EventVisibility.GROUPS ? selectedGroupIds : [],
      allowFriendInvites,
      coordinates: { lat: baseLat + randomOffsetLat, lng: baseLng + randomOffsetLng }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-surface w-full max-w-lg rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-slate-700 flex justify-between items-center bg-slate-900/50">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            Create New Invite
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="overflow-y-auto p-4 custom-scrollbar">
          <form id="create-event-form" onSubmit={handleSubmit} className="space-y-4">
              
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase">What & Where</label>
                <div className="relative">
                  <Type className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <input required value={title} onChange={e => setTitle(e.target.value)} placeholder="Event Title" className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-10 pr-3 text-white focus:border-primary outline-none" />
                </div>
                <div className="relative mt-2">
                  <MapPin className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <input required value={location} onChange={e => setLocation(e.target.value)} placeholder="Location" className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-10 pr-3 text-white focus:border-primary outline-none" />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase">When</label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <input 
                    required 
                    type="datetime-local" 
                    value={startDateTime} 
                    onChange={e => setStartDateTime(e.target.value)} 
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-10 pr-3 text-white focus:border-primary outline-none [color-scheme:dark]" 
                  />
                </div>
                <div className="flex gap-4 mt-2">
                  <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                    <input type="checkbox" checked={isFlexibleStart} onChange={e => setIsFlexibleStart(e.target.checked)} className="rounded bg-slate-800 border-slate-600 text-primary focus:ring-offset-slate-900" />
                    Flexible Start
                  </label>
                  <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                    <input type="checkbox" checked={isFlexibleEnd} onChange={e => setIsFlexibleEnd(e.target.checked)} className="rounded bg-slate-800 border-slate-600 text-primary focus:ring-offset-slate-900" />
                    Flexible End
                  </label>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-400 uppercase">Details</label>
                <div className="relative">
                  <AlignLeft className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <textarea required value={description} onChange={e => setDescription(e.target.value)} placeholder="Description" className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 pl-10 pr-3 text-white focus:border-primary outline-none h-20 resize-none" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase block mb-1">Seats Available</label>
                    <input type="number" min="1" value={maxSeats} onChange={e => setMaxSeats(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Unlimited" className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-white focus:border-primary outline-none" />
                 </div>
                 <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase block mb-1">Activity Type</label>
                    <select value={activityType} onChange={e => setActivityType(e.target.value)} className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-white focus:border-primary outline-none">
                      <option value="Social">Social</option>
                      <option value="Sport">Sport</option>
                      <option value="Entertainment">Entertainment</option>
                      <option value="Food">Food</option>
                      <option value="Work">Work</option>
                      <option value="Travel">Travel</option>
                    </select>
                 </div>
              </div>

              <div className="flex flex-col space-y-3 pt-2">
                 <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer bg-slate-800/50 p-2 rounded-lg border border-slate-800">
                    <input type="checkbox" checked={noPhones} onChange={e => setNoPhones(e.target.checked)} className="rounded bg-slate-800 border-slate-600 text-primary focus:ring-offset-slate-900" />
                    <span>📵 No Phones Zone (Unplugged)</span>
                  </label>
                  
                  <div className="space-y-2">
                    <select 
                      value={visibilityType} 
                      onChange={e => {
                        setVisibilityType(e.target.value as EventVisibility);
                        if (e.target.value !== EventVisibility.GROUPS) {
                          setSelectedGroupIds([]);
                        }
                      }} 
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg py-2 px-3 text-white text-sm focus:border-primary outline-none"
                    >
                      <option value={EventVisibility.ALL_FRIENDS}>All Friends</option>
                      <option value={EventVisibility.GROUPS}>Groups</option>
                      <option value={EventVisibility.INVITE_ONLY}>Invite Only</option>
                    </select>
                    
                    {visibilityType === EventVisibility.GROUPS && (
                      <div className="space-y-2">
                        <label className="text-xs font-semibold text-slate-400 uppercase block">Select Groups</label>
                        <div className="max-h-32 overflow-y-auto bg-slate-900 border border-slate-700 rounded-lg p-2 space-y-1">
                          {availableGroups.length === 0 ? (
                            <p className="text-sm text-slate-500 p-2">No groups available. Create groups in the Friends view.</p>
                          ) : (
                            availableGroups.map(group => (
                              <label key={group.id} className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer p-2 hover:bg-slate-800 rounded">
                                <input
                                  type="checkbox"
                                  checked={selectedGroupIds.includes(group.id)}
                                  onChange={e => {
                                    if (e.target.checked) {
                                      setSelectedGroupIds([...selectedGroupIds, group.id]);
                                    } else {
                                      setSelectedGroupIds(selectedGroupIds.filter(id => id !== group.id));
                                    }
                                  }}
                                  className="rounded bg-slate-800 border-slate-600 text-primary focus:ring-offset-slate-900"
                                />
                                <span>{group.name}</span>
                              </label>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                    
                    {visibilityType === EventVisibility.INVITE_ONLY && (
                      <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer bg-slate-800/50 p-2 rounded-lg border border-slate-800">
                        <input 
                          type="checkbox" 
                          checked={allowFriendInvites} 
                          onChange={e => setAllowFriendInvites(e.target.checked)} 
                          className="rounded bg-slate-800 border-slate-600 text-primary focus:ring-offset-slate-900" 
                        />
                        <span>Allow friends to invite others</span>
                      </label>
                    )}
                  </div>
              </div>

          </form>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-700 bg-slate-900/50 flex justify-end items-center">
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 rounded-lg text-slate-300 hover:bg-slate-800 text-sm font-medium">Cancel</button>
            <button form="create-event-form" type="submit" className="px-6 py-2 rounded-lg bg-primary hover:bg-primary/90 text-white text-sm font-bold shadow-lg shadow-primary/20">Create Invite</button>
          </div>
        </div>
      </div>
    </div>
  );
};