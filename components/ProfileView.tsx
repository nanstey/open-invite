
import React from 'react';
import { User } from '../types';
import { MOCK_EVENTS } from '../constants';
import { Settings, LogOut, ChevronRight, MapPin, Link as LinkIcon, Edit2, Shield, BellRing, Moon } from 'lucide-react';
import { useAuth } from './AuthProvider';

interface ProfileViewProps {
  currentUser: User;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ currentUser }) => {
  const auth = useAuth();
  const useSupabase = () => {
    return (import.meta as any).env?.VITE_USE_SUPABASE === 'true' && 
           (import.meta as any).env?.VITE_SUPABASE_URL && 
           (import.meta as any).env?.VITE_SUPABASE_ANON_KEY;
  };
  
  const handleSignOut = async () => {
    if (useSupabase() && auth.signOut) {
      try {
        await auth.signOut();
      } catch (error) {
        console.error('Error signing out:', error);
      }
    }
  };
  const hostedCount = MOCK_EVENTS.filter(e => e.hostId === currentUser.id).length;
  const attendedCount = MOCK_EVENTS.filter(e => e.attendees.includes(currentUser.id)).length;

  return (
    <div className="max-w-2xl mx-auto pb-20 pt-8 px-4 animate-fade-in">
        
        {/* Profile Header */}
        <div className="flex flex-col items-center mb-8">
            <div className="relative mb-4">
                <div className="w-24 h-24 rounded-full p-1 bg-gradient-to-tr from-primary to-secondary">
                    <img src={currentUser.avatar} alt={currentUser.name} className="w-full h-full rounded-full border-4 border-slate-900 object-cover" />
                </div>
                <button className="absolute bottom-0 right-0 p-2 bg-slate-800 rounded-full border border-slate-600 text-white hover:bg-slate-700">
                    <Edit2 className="w-4 h-4" />
                </button>
            </div>
            <h2 className="text-2xl font-bold text-white mb-1">{currentUser.name}</h2>
            <p className="text-slate-400 text-sm mb-4">@alex_climbs • Victoria, BC</p>
            
            <div className="flex gap-4 text-center">
                <div className="bg-slate-800/50 rounded-xl p-3 min-w-[100px] border border-slate-700">
                    <div className="text-xl font-bold text-white">{hostedCount}</div>
                    <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Hosted</div>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-3 min-w-[100px] border border-slate-700">
                    <div className="text-xl font-bold text-white">{attendedCount}</div>
                    <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Joined</div>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-3 min-w-[100px] border border-slate-700">
                    <div className="text-xl font-bold text-white">42</div>
                    <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Friends</div>
                </div>
            </div>
        </div>

        {/* Bio / About */}
        <div className="bg-surface rounded-xl p-5 border border-slate-700 mb-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">About</h3>
            <p className="text-slate-300 text-sm leading-relaxed mb-4">
                Always down for spontaneous climbing or coffee. Trying to hike every trail in Victoria this year. 🧗‍♂️☕️
            </p>
            <div className="flex flex-col gap-2 text-sm text-slate-400">
                <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-500" />
                    <span>Fernwood, Victoria</span>
                </div>
                <div className="flex items-center gap-2">
                    <LinkIcon className="w-4 h-4 text-slate-500" />
                    <a href="#" className="text-primary hover:underline">instagram.com/alex_climbs</a>
                </div>
            </div>
        </div>

        {/* Settings List */}
        <div className="space-y-3">
             <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider px-1">Settings</h3>
             
             <div className="bg-surface rounded-xl border border-slate-700 overflow-hidden divide-y divide-slate-700/50">
                 <button className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors">
                     <div className="flex items-center gap-3">
                         <div className="p-2 bg-blue-500/10 rounded-lg text-blue-500"><BellRing className="w-5 h-5" /></div>
                         <div className="text-left">
                             <div className="text-sm font-bold text-white">Notifications</div>
                             <div className="text-xs text-slate-500">Manage push & email alerts</div>
                         </div>
                     </div>
                     <ChevronRight className="w-5 h-5 text-slate-600" />
                 </button>
                 
                 <button className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors">
                     <div className="flex items-center gap-3">
                         <div className="p-2 bg-purple-500/10 rounded-lg text-purple-500"><Shield className="w-5 h-5" /></div>
                         <div className="text-left">
                             <div className="text-sm font-bold text-white">Privacy</div>
                             <div className="text-xs text-slate-500">Who can see your events</div>
                         </div>
                     </div>
                     <ChevronRight className="w-5 h-5 text-slate-600" />
                 </button>

                 <button className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors">
                     <div className="flex items-center gap-3">
                         <div className="p-2 bg-yellow-500/10 rounded-lg text-yellow-500"><Moon className="w-5 h-5" /></div>
                         <div className="text-left">
                             <div className="text-sm font-bold text-white">Appearance</div>
                             <div className="text-xs text-slate-500">Dark mode is on</div>
                         </div>
                     </div>
                     <ChevronRight className="w-5 h-5 text-slate-600" />
                 </button>

                 <button className="w-full flex items-center justify-between p-4 hover:bg-slate-800/50 transition-colors group">
                     <div className="flex items-center gap-3">
                         <div className="p-2 bg-slate-700/50 rounded-lg text-slate-400 group-hover:text-white"><Settings className="w-5 h-5" /></div>
                         <div className="text-left">
                             <div className="text-sm font-bold text-white">Account</div>
                         </div>
                     </div>
                     <ChevronRight className="w-5 h-5 text-slate-600" />
                 </button>
             </div>

             {useSupabase() && (
                 <button 
                     onClick={handleSignOut}
                     className="w-full mt-6 p-4 rounded-xl border border-red-900/30 bg-red-900/10 text-red-400 font-bold flex items-center justify-center gap-2 hover:bg-red-900/20 transition-colors"
                 >
                     <LogOut className="w-5 h-5" /> Sign Out
                 </button>
             )}
        </div>
    </div>
  );
};
