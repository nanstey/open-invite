
import React, { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { User } from '../../lib/types';
import { Settings, LogOut, ChevronRight,  Edit2, Shield, BellRing, Moon, MessageSquarePlus, ClipboardList } from 'lucide-react';
import { useAuth } from '../auth/AuthProvider';
import { supabase } from '../../lib/supabase';
import { fetchFriends } from '../../services/friendService';
import { checkIsAdmin } from '../../services/feedbackService';
import { ComingSoonPopover, useComingSoonPopover } from '../../lib/ui/components/ComingSoonPopover';
import { FeedbackModal } from '../feedback/components/feedback/FeedbackModal';

interface ProfileViewProps {
  currentUser: User;
}

export const ProfileView: React.FC<ProfileViewProps> = ({ currentUser }) => {
  const auth = useAuth();
  const navigate = useNavigate();
  const comingSoon = useComingSoonPopover();
  const [hostedCount, setHostedCount] = useState(0);
  const [attendedCount, setAttendedCount] = useState(0);
  const [friendsCount, setFriendsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  
  useEffect(() => {
    if (!currentUser) {
      setLoading(false);
      return;
    }

    const loadProfileData = async () => {
      try {
        // Fetch hosted events count
        const { count: hosted } = await supabase
          .from('events')
          .select('*', { count: 'exact', head: true })
          .eq('host_id', currentUser.id);

        // Fetch attended events count (events where user is an attendee but not host)
        const { data: attendeeData } = await supabase
          .from('event_attendees')
          .select('event_id')
          .eq('user_id', currentUser.id);

        if (attendeeData && attendeeData.length > 0) {
          const eventIds = attendeeData.map((a: { event_id: string }) => a.event_id);
          const { data: eventsData } = await supabase
            .from('events')
            .select('id, host_id')
            .in('id', eventIds);

          const attended = eventsData?.filter(
            (e: { id: string; host_id: string }) => e.host_id !== currentUser.id
          ).length || 0;
          setAttendedCount(attended);
        } else {
          setAttendedCount(0);
        }

        // Fetch friends count
        const friends = await fetchFriends();

        // Check admin status
        const adminStatus = await checkIsAdmin();
        setIsAdmin(adminStatus);

        setHostedCount(hosted || 0);
        setFriendsCount(friends.length);
      } catch (error) {
        console.error('Error loading profile data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadProfileData();
  }, [currentUser]);
  
  const handleSignOut = async () => {
    if (auth.signOut) {
      try {
        await auth.signOut();
      } catch (error) {
        console.error('Error signing out:', error);
      }
    }
  };

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
            <p className="text-slate-400 text-sm mb-4">{currentUser.name.toLowerCase().replace(/\s+/g, '_')}</p>
            
            <div className="flex gap-4 text-center">
                <div className="bg-slate-800/50 rounded-xl p-3 min-w-[100px] border border-slate-700">
                    <div className="text-xl font-bold text-white">{loading ? '...' : hostedCount}</div>
                    <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Hosted</div>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-3 min-w-[100px] border border-slate-700">
                    <div className="text-xl font-bold text-white">{loading ? '...' : attendedCount}</div>
                    <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Joined</div>
                </div>
                <div className="bg-slate-800/50 rounded-xl p-3 min-w-[100px] border border-slate-700">
                    <div className="text-xl font-bold text-white">{loading ? '...' : friendsCount}</div>
                    <div className="text-xs text-slate-500 uppercase font-bold tracking-wider">Friends</div>
                </div>
            </div>
        </div>

        {/* Bio / About */}
        <div className="bg-surface rounded-xl p-5 border border-slate-700 mb-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">About</h3>
            <p className="text-slate-300 text-sm leading-relaxed mb-4">
                {/* Bio field not yet in database - can be added later */}
            </p>
            <div className="flex flex-col gap-2 text-sm text-slate-400">
                {/* Location and social links not yet in database - can be added later */}
            </div>
        </div>

        {/* Settings List */}
        <div className="space-y-3">
             <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider px-1">Settings</h3>
             
             <div className="bg-surface rounded-xl border border-slate-700 overflow-hidden divide-y divide-slate-700/50">
                 <button
                     onClick={(e) => comingSoon.show(e, 'Coming Soon!')}
                     className="w-full flex items-center justify-between p-4 transition-colors opacity-60 cursor-not-allowed"
                 >
                     <div className="flex items-center gap-3">
                         <div className="p-2 bg-blue-500/10 rounded-lg text-slate-400"><BellRing className="w-5 h-5" /></div>
                         <div className="text-left">
                             <div className="text-sm font-bold text-slate-300">Notifications</div>
                             <div className="text-xs text-slate-500">Manage push & email alerts</div>
                         </div>
                     </div>
                     <ChevronRight className="w-5 h-5 text-slate-600" />
                 </button>
                 
                 <button
                     onClick={(e) => comingSoon.show(e, 'Coming Soon!')}
                     className="w-full flex items-center justify-between p-4 transition-colors opacity-60 cursor-not-allowed"
                 >
                     <div className="flex items-center gap-3">
                         <div className="p-2 bg-purple-500/10 rounded-lg text-slate-400"><Shield className="w-5 h-5" /></div>
                         <div className="text-left">
                             <div className="text-sm font-bold text-slate-300">Privacy</div>
                             <div className="text-xs text-slate-500">Who can see your events</div>
                         </div>
                     </div>
                     <ChevronRight className="w-5 h-5 text-slate-600" />
                 </button>

                 <button
                     onClick={(e) => comingSoon.show(e, 'Coming Soon!')}
                     className="w-full flex items-center justify-between p-4 transition-colors opacity-60 cursor-not-allowed"
                 >
                     <div className="flex items-center gap-3">
                         <div className="p-2 bg-yellow-500/10 rounded-lg text-slate-400"><Moon className="w-5 h-5" /></div>
                         <div className="text-left">
                             <div className="text-sm font-bold text-slate-300">Appearance</div>
                             <div className="text-xs text-slate-500">Dark mode is on</div>
                         </div>
                     </div>
                     <ChevronRight className="w-5 h-5 text-slate-600" />
                 </button>

                 <button
                     onClick={(e) => comingSoon.show(e, 'Coming Soon!')}
                     className="w-full flex items-center justify-between p-4 transition-colors opacity-60 cursor-not-allowed"
                 >
                     <div className="flex items-center gap-3">
                         <div className="p-2 bg-slate-700/50 rounded-lg text-slate-400"><Settings className="w-5 h-5" /></div>
                         <div className="text-left">
                             <div className="text-sm font-bold text-slate-300">Account</div>
                         </div>
                     </div>
                     <ChevronRight className="w-5 h-5 text-slate-600" />
                 </button>
             </div>
        </div>

        {/* Feedback Section */}
        <div className="space-y-3 mt-6">
             <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider px-1">Feedback</h3>
             
             <div className="bg-surface rounded-xl border border-slate-700 overflow-hidden divide-y divide-slate-700/50">
                 <button
                     onClick={() => setShowFeedbackModal(true)}
                     className="w-full flex items-center justify-between p-4 transition-colors hover:bg-slate-800/50"
                 >
                     <div className="flex items-center gap-3">
                         <div className="p-2 bg-primary/10 rounded-lg text-primary"><MessageSquarePlus className="w-5 h-5" /></div>
                         <div className="text-left">
                             <div className="text-sm font-bold text-slate-300">Submit Feedback</div>
                             <div className="text-xs text-slate-500">Help us improve Open Invite</div>
                         </div>
                     </div>
                     <ChevronRight className="w-5 h-5 text-slate-600" />
                 </button>
                 
                 {isAdmin && (
                   <button
                       onClick={() => navigate({ to: '/admin' })}
                       className="w-full flex items-center justify-between p-4 transition-colors hover:bg-slate-800/50"
                   >
                       <div className="flex items-center gap-3">
                           <div className="p-2 bg-amber-500/10 rounded-lg text-amber-400"><ClipboardList className="w-5 h-5" /></div>
                           <div className="text-left">
                               <div className="text-sm font-bold text-slate-300">Admin Dashboard</div>
                               <div className="text-xs text-slate-500">Feedback & Projects</div>
                           </div>
                       </div>
                       <ChevronRight className="w-5 h-5 text-slate-600" />
                   </button>
                 )}
             </div>
        </div>

        {/* Sign Out */}
        <button 
            onClick={handleSignOut}
            className="w-full mt-6 p-4 rounded-xl border border-red-900/30 bg-red-900/10 text-red-400 font-bold flex items-center justify-center gap-2 hover:bg-red-900/20 transition-colors"
        >
            <LogOut className="w-5 h-5" /> Sign Out
        </button>

        <ComingSoonPopover state={comingSoon.state} />
        
        {showFeedbackModal && (
          <FeedbackModal onClose={() => setShowFeedbackModal(false)} />
        )}
    </div>
  );
};
