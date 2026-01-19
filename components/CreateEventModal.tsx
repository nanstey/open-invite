

import React, { useState } from 'react';
import { EventVisibility, SocialEvent } from '../lib/types';
import { X, Calendar, MapPin, Type, AlignLeft } from 'lucide-react';
import { FormInput, FormSelect } from './FormControls';

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
  // Sharing is URL-based right now; lock to INVITE_ONLY for consistent behavior.
  const [visibilityType] = useState<EventVisibility>(EventVisibility.INVITE_ONLY);

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
      groupIds: [],
      allowFriendInvites: false,
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
                    <FormInput
                      type="number"
                      min="1"
                      value={maxSeats}
                      onChange={e => setMaxSeats(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="Unlimited"
                      size="md"
                      variant="surface"
                    />
                 </div>
                 <div>
                    <label className="text-xs font-semibold text-slate-400 uppercase block mb-1">Activity Type</label>
                    <FormSelect value={activityType} onChange={e => setActivityType(e.target.value)} size="md" variant="surface">
                      <option value="Social">Social</option>
                      <option value="Sport">Sport</option>
                      <option value="Entertainment">Entertainment</option>
                      <option value="Food">Food</option>
                      <option value="Work">Work</option>
                      <option value="Travel">Travel</option>
                    </FormSelect>
                 </div>
              </div>

              <div className="flex flex-col space-y-3 pt-2">
                 <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer bg-slate-800/50 p-2 rounded-lg border border-slate-800">
                    <input type="checkbox" checked={noPhones} onChange={e => setNoPhones(e.target.checked)} className="rounded bg-slate-800 border-slate-600 text-primary focus:ring-offset-slate-900" />
                    <span>📵 No Phones Zone (Unplugged)</span>
                  </label>
                  
                  <div className="space-y-2">
                    <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Visibility</div>
                    <FormSelect 
                      value={visibilityType} 
                      disabled
                      size="md"
                      variant="surface"
                    >
                      <option value={EventVisibility.INVITE_ONLY}>Invite only</option>
                    </FormSelect>
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