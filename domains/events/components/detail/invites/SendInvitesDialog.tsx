import { Search, Send, Users } from 'lucide-react';
import * as React from 'react';
import type { Group, User } from '../../../../../lib/types';
import { Button } from '../../../../../lib/ui/9ui/button';
import { Checkbox } from '../../../../../lib/ui/9ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../../../../../lib/ui/9ui/dialog';
import { Input } from '../../../../../lib/ui/9ui/input';
import {
  EVENT_INVITE_RECIPIENT_LIMIT,
  sendEventInvites,
} from '../../../../../services/eventInviteService';
import { fetchFriends } from '../../../../../services/friendService';
import {
  fetchGroupMembers,
  fetchGroupMembershipsForCurrentUser,
} from '../../../../../services/groupService';

type ContactList = {
  group: Group;
  memberIds: string[];
};

export function SendInvitesDialog(props: {
  open: boolean;
  eventId: string;
  currentUserId: string;
  onOpenChange: (open: boolean) => void;
}) {
  const [friends, setFriends] = React.useState<User[]>([]);
  const [lists, setLists] = React.useState<ContactList[]>([]);
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set());
  const [selectedListIds, setSelectedListIds] = React.useState<Set<string>>(new Set());
  const [query, setQuery] = React.useState('');
  const [loading, setLoading] = React.useState(false);
  const [sending, setSending] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!props.open) return;
    let mounted = true;
    setLoading(true);
    setError(null);
    setMessage(null);

    Promise.all([fetchFriends(), fetchGroupMembershipsForCurrentUser()])
      .then(async ([nextFriends, memberships]) => {
        const groups = memberships.map(membership => membership.group);
        const contactLists = await Promise.all(
          groups.map(async group => {
            const members = await fetchGroupMembers(group.id);
            return {
              group,
              memberIds: members
                .map(member => member.id)
                .filter(memberId => memberId !== props.currentUserId),
            };
          })
        );
        if (!mounted) return;
        setFriends(nextFriends.filter(friend => friend.id !== props.currentUserId));
        setLists(contactLists);
      })
      .catch(err => {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Could not load invite options.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [props.currentUserId, props.open]);

  const lowerQuery = query.trim().toLowerCase();
  const selectedCount = selectedIds.size;
  const overLimit = selectedCount > EVENT_INVITE_RECIPIENT_LIMIT;

  const filteredFriends = React.useMemo(() => {
    if (!lowerQuery) return friends;
    return friends.filter(friend => friend.name.toLowerCase().includes(lowerQuery));
  }, [friends, lowerQuery]);

  const filteredLists = React.useMemo(() => {
    if (!lowerQuery) return lists;
    return lists.filter(list => list.group.name.toLowerCase().includes(lowerQuery));
  }, [lists, lowerQuery]);

  const togglePerson = (userId: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const toggleList = (list: ContactList) => {
    setSelectedListIds(prevListIds => {
      const listSelected = prevListIds.has(list.group.id);
      const nextListIds = new Set(prevListIds);
      setSelectedIds(prev => {
        const next = new Set(prev);
        for (const memberId of list.memberIds) {
          if (listSelected) next.delete(memberId);
          else next.add(memberId);
        }
        return next;
      });
      if (listSelected) nextListIds.delete(list.group.id);
      else nextListIds.add(list.group.id);
      return nextListIds;
    });
  };

  const suggestedFriends = friends.slice(0, 5);
  const suggestedLists = lists.slice(0, 3);

  const handleSend = async () => {
    setError(null);
    setMessage(null);
    if (selectedCount === 0) {
      setError('Choose at least one recipient.');
      return;
    }
    if (overLimit) {
      setError(`Choose ${EVENT_INVITE_RECIPIENT_LIMIT} or fewer recipients.`);
      return;
    }

    setSending(true);
    try {
      const result = await sendEventInvites({
        eventId: props.eventId,
        recipientIds: Array.from(selectedIds),
      });
      setMessage(
        result.inserted === 0
          ? 'Everyone selected was already invited.'
          : `Sent ${result.inserted} invite${result.inserted === 1 ? '' : 's'}.`
      );
      setSelectedIds(new Set());
      setSelectedListIds(new Set());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send invites.');
    } finally {
      setSending(false);
    }
  };

  const renderPerson = (user: User) => (
    <div
      key={user.id}
      className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3 hover:border-slate-700"
    >
      <Checkbox
        checked={selectedIds.has(user.id)}
        onChange={() => togglePerson(user.id)}
        aria-label={`Invite ${user.name}`}
      />
      <img src={user.avatar} alt="" className="h-9 w-9 rounded-full border border-slate-700" />
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-100">
        {user.name}
      </span>
    </div>
  );

  const renderList = (list: ContactList) => (
    <div
      key={list.group.id}
      className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-950/50 p-3 hover:border-slate-700"
    >
      <Checkbox
        checked={selectedListIds.has(list.group.id)}
        onChange={() => toggleList(list)}
        aria-label={`Invite ${list.group.name}`}
      />
      <div className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-700 bg-slate-800 text-slate-300">
        <Users className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-slate-100">{list.group.name}</div>
        <div className="text-xs text-slate-500">{list.memberIds.length} contacts</div>
      </div>
    </div>
  );

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[88vh] overflow-hidden p-0">
        <DialogHeader className="border-b border-slate-800 p-5">
          <DialogTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" />
            Send Invites
          </DialogTitle>
          <DialogDescription>
            Choose friends or group contact lists. One send can include up to{' '}
            {EVENT_INVITE_RECIPIENT_LIMIT} recipients.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 overflow-y-auto p-5">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input
              value={query}
              onChange={event => setQuery(event.target.value)}
              placeholder="Search friends or groups"
              className="pl-9"
            />
          </div>

          {loading ? <div className="text-sm text-slate-400">Loading invite options...</div> : null}

          {!loading && !lowerQuery && (suggestedFriends.length > 0 || suggestedLists.length > 0) ? (
            <section className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Suggested
              </h3>
              <div className="space-y-2">
                {suggestedLists.map(renderList)}
                {suggestedFriends.map(renderPerson)}
              </div>
            </section>
          ) : null}

          <section className="space-y-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {lowerQuery ? 'Search results' : 'All friends and lists'}
            </h3>
            <div className="space-y-2">
              {filteredLists.map(renderList)}
              {filteredFriends.map(renderPerson)}
              {!loading && filteredLists.length === 0 && filteredFriends.length === 0 ? (
                <div className="rounded-xl border border-slate-800 p-4 text-sm text-slate-500">
                  No friends or groups match your search.
                </div>
              ) : null}
            </div>
          </section>

          {error ? (
            <div className="rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{error}</div>
          ) : null}
          {message ? (
            <div className="rounded-xl bg-emerald-500/10 p-3 text-sm text-emerald-300">
              {message}
            </div>
          ) : null}
        </div>

        <DialogFooter className="border-t border-slate-800 p-5">
          <div
            className={`mr-auto text-sm font-semibold ${overLimit ? 'text-red-300' : 'text-slate-300'}`}
          >
            {selectedCount}/{EVENT_INVITE_RECIPIENT_LIMIT} selected
          </div>
          <Button variant="secondary" onClick={() => props.onOpenChange(false)}>
            Done
          </Button>
          <Button disabled={sending || selectedCount === 0 || overLimit} onClick={handleSend}>
            {sending ? 'Sending...' : 'Send'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
