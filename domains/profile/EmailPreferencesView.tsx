import { useNavigate } from '@tanstack/react-router';
import { ChevronLeft, Mail } from 'lucide-react';
import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { Switch } from '../../lib/ui/9ui/switch';
import { LoadingSpinner } from '../../lib/ui/components/LoadingSpinner';
import {
  type EmailMessageClass,
  type EmailPreference,
  fetchEmailPreferences,
  setEmailPreference,
  unsubscribeFromAllEmail,
} from '../../services/emailPreferenceService';

const CLASS_LABELS: Record<EmailMessageClass, { title: string; blurb: string }> = {
  transactional: {
    title: 'Activity',
    blurb: 'Emails about your events and people you know.',
  },
  marketing: {
    title: 'Updates & tips',
    blurb: 'Occasional product news. Off unless you opt in.',
  },
  account: {
    title: 'Account & security',
    blurb: 'Essential messages. These are always on.',
  },
};

const CLASS_ORDER: EmailMessageClass[] = ['transactional', 'marketing', 'account'];

function labelForTopic(pref: EmailPreference): string {
  if (pref.description) {
    return pref.description;
  }
  // Fallback: humanize the topic id, e.g. "notif.invite" -> "Invite".
  const leaf = pref.topic.split('.').pop() ?? pref.topic;
  return leaf.charAt(0).toUpperCase() + leaf.slice(1);
}

export const EmailPreferencesView: React.FC = () => {
  const navigate = useNavigate();
  const [prefs, setPrefs] = useState<EmailPreference[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<Set<string>>(new Set());
  const [busyAll, setBusyAll] = useState(false);

  useEffect(() => {
    let active = true;
    fetchEmailPreferences()
      .then(result => {
        if (active) {
          setPrefs(result);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });
    return () => {
      active = false;
    };
  }, []);

  const grouped = useMemo(() => {
    const byClass = new Map<EmailMessageClass, EmailPreference[]>();
    for (const pref of prefs) {
      const list = byClass.get(pref.messageClass) ?? [];
      list.push(pref);
      byClass.set(pref.messageClass, list);
    }
    return byClass;
  }, [prefs]);

  const handleToggle = async (topic: string, next: boolean) => {
    // Capture only THIS topic's prior state; reverting the whole array on failure
    // would clobber other toggles that landed while this request was in flight.
    const prior = prefs.find(p => p.topic === topic);
    if (!prior) {
      return;
    }
    setPrefs(prev =>
      prev.map(p => (p.topic === topic ? { ...p, subscribed: next, isDefault: false } : p))
    );
    setPending(prev => new Set(prev).add(topic));

    const ok = await setEmailPreference(topic, next);

    setPending(prev => {
      const copy = new Set(prev);
      copy.delete(topic);
      return copy;
    });
    if (!ok) {
      // Revert just this topic to exactly what it was before the toggle.
      setPrefs(prev =>
        prev.map(p =>
          p.topic === topic ? { ...p, subscribed: prior.subscribed, isDefault: prior.isDefault } : p
        )
      );
    }
  };

  const handleUnsubscribeAll = async () => {
    setBusyAll(true);
    const ok = await unsubscribeFromAllEmail();
    if (ok) {
      setPrefs(prev =>
        prev.map(p =>
          p.messageClass === 'account' ? p : { ...p, subscribed: false, isDefault: false }
        )
      );
    }
    setBusyAll(false);
  };

  if (loading) {
    return <LoadingSpinner message="Loading email preferences..." />;
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate({ to: '/profile' })}
          className="p-2 -ml-2 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
          aria-label="Back to profile"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-100">Email</h1>
            <p className="text-xs text-slate-500">Choose which emails Open Invite sends you</p>
          </div>
        </div>
      </div>

      {prefs.length === 0 ? (
        <p className="text-sm text-slate-500 px-1">No email topics are configured yet.</p>
      ) : (
        CLASS_ORDER.filter(cls => grouped.has(cls)).map(cls => {
          const meta = CLASS_LABELS[cls];
          const isAccount = cls === 'account';
          return (
            <section key={cls} className="space-y-3">
              <div className="px-1">
                <h2 className="text-sm font-bold text-slate-300">{meta.title}</h2>
                <p className="text-xs text-slate-500">{meta.blurb}</p>
              </div>
              <div className="bg-surface rounded-xl border border-slate-700 overflow-hidden divide-y divide-slate-700/50">
                {(grouped.get(cls) ?? []).map(pref => (
                  <div key={pref.topic} className="flex items-center justify-between gap-3 p-4">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-200 truncate">
                        {labelForTopic(pref)}
                      </div>
                      <div className="text-xs text-slate-500 font-mono">{pref.topic}</div>
                    </div>
                    <Switch
                      checked={isAccount ? true : pref.subscribed}
                      disabled={isAccount || busyAll || pending.has(pref.topic)}
                      onCheckedChange={next => handleToggle(pref.topic, next)}
                      aria-label={`Toggle ${labelForTopic(pref)}`}
                    />
                  </div>
                ))}
              </div>
            </section>
          );
        })
      )}

      {prefs.some(p => p.messageClass !== 'account') && (
        <button
          type="button"
          onClick={handleUnsubscribeAll}
          disabled={busyAll}
          className="w-full p-3 rounded-xl border border-slate-700 text-slate-400 text-sm font-medium hover:bg-slate-800/50 transition-colors disabled:opacity-50"
        >
          {busyAll ? 'Unsubscribing…' : 'Unsubscribe from all non-essential email'}
        </button>
      )}
    </div>
  );
};
