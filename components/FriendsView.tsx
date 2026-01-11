
import React, { useState, useEffect } from 'react';
import { FriendsMode, Group, User } from '../lib/types';
import { UserPlus, Search, MoreHorizontal, Settings, MessageCircle, Plus } from 'lucide-react';
import { fetchUserGroups, fetchGroupMembers } from '../services/friendService';
import { fetchFriends } from '../services/friendService';
import { supabase } from '../lib/supabase';

interface FriendsViewProps {
  activeTab: FriendsMode;
}

export const FriendsView: React.FC<FriendsViewProps> = ({ activeTab }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [groups, setGroups] = useState<Group[]>([]);
  const [friends, setFriends] = useState<User[]>([]);
  const [groupMembersMap, setGroupMembersMap] = useState<Map<string, User[]>>(new Map());
  const [loading, setLoading] = useState(true);

  // Fetch friends when FRIENDS tab is active
  useEffect(() => {
    const loadFriends = async () => {
      if (activeTab === 'FRIENDS') {
        setLoading(true);
        try {
          const fetchedFriends = await fetchFriends();
          setFriends(fetchedFriends);
        } catch (error) {
          console.error('Error loading friends:', error);
          setFriends([]);
        } finally {
          setLoading(false);
        }
      }
    };
    loadFriends();
  }, [activeTab]);

  // Fetch user groups when GROUPS tab is active
  useEffect(() => {
    const loadGroups = async () => {
      if (activeTab === 'GROUPS') {
        setLoading(true);
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const userGroups = await fetchUserGroups(user.id);
            setGroups(userGroups);
            
            // Fetch members for each group
            const membersPromises = userGroups.map(async (group) => {
              const members = await fetchGroupMembers(group.id);
              return [group.id, members] as [string, User[]];
            });
            const membersResults = await Promise.all(membersPromises);
            const membersMap = new Map(membersResults);
            setGroupMembersMap(membersMap);
          }
        } catch (error) {
          console.error('Error loading groups:', error);
          setGroups([]);
        } finally {
          setLoading(false);
        }
      }
    };
    loadGroups();
  }, [activeTab]);

  const filteredFriends = friends.filter(friend => 
    friend.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="max-w-5xl mx-auto pb-20 pt-2 space-y-6">
      
      {/* Search Bar */}
      <div className="bg-slate-900/50 p-1">
        <div className="relative w-full">
           <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" />
           <input 
             type="text" 
             placeholder={activeTab === 'FRIENDS' ? "Search friends..." : "Search groups..."}
             value={searchTerm}
             onChange={(e) => setSearchTerm(e.target.value)}
             className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-10 pr-4 py-3 text-sm text-white focus:border-primary outline-none focus:ring-1 focus:ring-primary"
           />
        </div>
      </div>

      {/* Friends Tab Content */}
      {activeTab === 'FRIENDS' && (
        <div className="animate-fade-in">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-slate-400">Loading friends...</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4 px-1">
                 <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                   {filteredFriends.length} Friends
                 </h3>
                 <button className="flex items-center gap-2 text-primary hover:text-white transition-colors text-xs font-bold uppercase tracking-wide">
                    <UserPlus className="w-4 h-4" /> Add Friend
                 </button>
              </div>
              
              {filteredFriends.length === 0 ? (
                <div className="text-center py-12 text-slate-400">
                  <UserPlus className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>{searchTerm ? 'No friends found matching your search.' : 'No friends yet. Add some friends to get started!'}</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredFriends.map(friend => (
               <div key={friend.id} className="bg-surface border border-slate-700 p-4 rounded-xl flex items-center justify-between group hover:border-primary/50 transition-colors">
                  <div className="flex items-center gap-3">
                     <div className="relative">
                        <img src={friend.avatar} alt={friend.name} className="w-12 h-12 rounded-full border-2 border-slate-600" />
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-surface rounded-full"></div>
                     </div>
                     <div>
                        <div className="font-bold text-white">{friend.name}</div>
                        <div className="text-xs text-slate-500">Last active: Today</div>
                     </div>
                  </div>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white" title="Message">
                        <MessageCircle className="w-4 h-4" />
                     </button>
                     <button className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white" title="Options">
                        <MoreHorizontal className="w-4 h-4" />
                     </button>
                  </div>
               </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Groups Tab Content */}
      {activeTab === 'GROUPS' && (
        <div className="animate-fade-in">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-slate-400">Loading groups...</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4 px-1">
                <h3 className="text-slate-400 text-xs font-bold uppercase tracking-wider">
                  My Groups
                </h3>
                <button className="flex items-center gap-2 text-primary hover:text-white transition-colors text-xs font-bold uppercase tracking-wide">
                   <Plus className="w-4 h-4" /> Create Group
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {groups.length === 0 ? (
                  <div className="col-span-2 text-center py-12 text-slate-400">
                    <p>No groups yet. Create a group to get started!</p>
                  </div>
                ) : (
                  groups.map(group => {
                    const members = groupMembersMap.get(group.id) || [];
                    return (
                   <div key={group.id} className="bg-surface border border-slate-700 p-6 rounded-xl hover:border-primary/50 transition-all cursor-pointer">
                       <div className="flex justify-between items-start mb-4">
                          <div>
                             <h3 className="text-xl font-bold text-white mb-1">{group.name}</h3>
                             <p className="text-sm text-slate-400">{members.length + 1} Members</p>
                          </div>
                          <button className="p-2 hover:bg-slate-700 rounded-full text-slate-400 hover:text-white">
                             <Settings className="w-4 h-4" />
                          </button>
                       </div>
                       
                       <div className="flex items-center -space-x-3 overflow-hidden py-2">
                          {members.slice(0, 3).map((m, i) => (
                            <img key={m.id} src={m.avatar} alt={m.name} className="inline-block h-10 w-10 rounded-full border-2 border-surface ring-2 ring-surface" style={{ zIndex: 10-i }} />
                          ))}
                          {members.length > 3 && (
                            <div className="h-10 w-10 rounded-full bg-slate-800 border-2 border-surface flex items-center justify-center text-xs font-bold text-slate-400" style={{ zIndex: 0 }}>
                              +{members.length - 3}
                            </div>
                          )}
                       </div>
                       
                       <div className="mt-4 pt-4 border-t border-slate-700 flex justify-between items-center">
                          <div className="text-xs text-slate-500">
                            <span className="text-green-400">●</span> 2 active events
                          </div>
                          <button className="text-xs font-bold text-primary hover:text-white">View Board</button>
                       </div>
                   </div>
                    );
                  })
                )}
              </div>
            </>
          )}
        </div>
      )}

    </div>
  );
};
