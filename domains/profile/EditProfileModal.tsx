import { Check, Globe, Loader2, Lock, Upload, X } from 'lucide-react';
import type React from 'react';
import { useEffect, useRef, useState } from 'react';
import {
  type ProfileVisibility,
  SOCIAL_PLATFORMS,
  type SocialLinks,
  type SocialPlatform,
  type User,
} from '../../lib/types';
import { Button } from '../../lib/ui/9ui/button';
import { Switch } from '../../lib/ui/9ui/switch';
import { Textarea } from '../../lib/ui/9ui/textarea';
import { FormInput } from '../../lib/ui/components/FormControls';
import {
  isUsernameAvailable,
  updateUserProfile,
  uploadAvatar,
  validateUsername,
} from '../../services/userService';

interface EditProfileModalProps {
  currentUser: User;
  onClose: () => void;
  onSaved?: () => void;
}

const BIO_MAX = 300;

const SOCIAL_META: Record<SocialPlatform, { label: string; placeholder: string }> = {
  instagram: { label: 'Instagram', placeholder: 'username' },
  x: { label: 'X', placeholder: 'username' },
  tiktok: { label: 'TikTok', placeholder: 'username' },
  linkedin: { label: 'LinkedIn', placeholder: 'profile URL or handle' },
  facebook: { label: 'Facebook', placeholder: 'profile URL or handle' },
  website: { label: 'Website', placeholder: 'https://…' },
};

type UsernameStatus = 'idle' | 'checking' | 'available' | 'taken' | 'invalid';

export function EditProfileModal({ currentUser, onClose, onSaved }: EditProfileModalProps) {
  const [avatar, setAvatar] = useState(currentUser.avatar);
  const [name, setName] = useState(currentUser.name);
  const [username, setUsername] = useState(currentUser.username ?? '');
  const [pronouns, setPronouns] = useState(currentUser.pronouns ?? '');
  const [bio, setBio] = useState(currentUser.bio ?? '');
  const [location, setLocation] = useState(currentUser.location ?? '');
  const [socialLinks, setSocialLinks] = useState<SocialLinks>(currentUser.socialLinks ?? {});
  const [visibility, setVisibility] = useState<ProfileVisibility>(
    currentUser.profileVisibility ?? 'private'
  );

  const [usernameStatus, setUsernameStatus] = useState<UsernameStatus>('idle');
  const [usernameError, setUsernameError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = '';
    };
  }, []);

  // Debounced username availability check
  useEffect(() => {
    const trimmed = username.trim().toLowerCase();
    if (trimmed === (currentUser.username ?? '')) {
      setUsernameStatus('idle');
      setUsernameError(null);
      return;
    }
    const validationError = validateUsername(trimmed);
    if (validationError) {
      setUsernameStatus('invalid');
      setUsernameError(validationError);
      return;
    }
    setUsernameStatus('checking');
    setUsernameError(null);
    const handle = setTimeout(async () => {
      const available = await isUsernameAvailable(trimmed, currentUser.id);
      setUsernameStatus(available ? 'available' : 'taken');
      setUsernameError(available ? null : 'That username is taken');
    }, 400);
    return () => clearTimeout(handle);
  }, [username, currentUser.username, currentUser.id]);

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setUploading(true);
    try {
      const url = await uploadAvatar(file, currentUser.id);
      if (url) {
        setAvatar(url);
      } else {
        setError('Could not upload image. Use a PNG, JPEG, or WebP under 2 MB.');
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSocialChange = (platform: SocialPlatform, value: string) => {
    setSocialLinks(prev => ({ ...prev, [platform]: value }));
  };

  const canSave =
    name.trim().length > 0 &&
    usernameStatus !== 'checking' &&
    usernameStatus !== 'invalid' &&
    usernameStatus !== 'taken' &&
    !uploading &&
    !saving;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError('Name is required');
      return;
    }
    const trimmedUsername = username.trim().toLowerCase();
    const validationError = validateUsername(trimmedUsername);
    if (validationError) {
      setUsernameStatus('invalid');
      setUsernameError(validationError);
      return;
    }

    setSaving(true);
    try {
      // Final availability guard (the DB unique index is the source of truth).
      if (trimmedUsername !== (currentUser.username ?? '')) {
        const available = await isUsernameAvailable(trimmedUsername, currentUser.id);
        if (!available) {
          setUsernameStatus('taken');
          setUsernameError('That username is taken');
          setSaving(false);
          return;
        }
      }

      const result = await updateUserProfile(currentUser.id, {
        name: name.trim(),
        avatar,
        username: trimmedUsername,
        bio,
        location,
        pronouns,
        socialLinks,
        profileVisibility: visibility,
      });

      if (!result) {
        setError('Could not save your profile. Please try again.');
        setSaving(false);
        return;
      }

      onSaved?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999]">
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        role="presentation"
        aria-hidden="true"
        onClick={onClose}
      />

      <div className="flex items-center justify-center h-full p-4">
        <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-lg p-6 relative max-h-[90vh] overflow-y-auto animate-fade-in">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>

          <h2 className="text-2xl font-bold text-white mb-6">Edit Profile</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-2 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Avatar */}
            <div className="flex items-center gap-4">
              <div className="w-20 h-20 rounded-full p-1 bg-gradient-to-tr from-primary to-secondary shrink-0">
                <img
                  src={avatar}
                  alt={name}
                  className="w-full h-full rounded-full border-2 border-slate-900 object-cover"
                />
              </div>
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleAvatarSelect}
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex items-center gap-2"
                >
                  {uploading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                  {uploading ? 'Uploading…' : 'Change photo'}
                </Button>
                <p className="text-xs text-slate-500 mt-1">PNG, JPEG, or WebP · max 2 MB</p>
              </div>
            </div>

            {/* Name */}
            <div>
              <label
                htmlFor="profile-name"
                className="block text-sm font-medium text-slate-300 mb-1"
              >
                Display name <span className="text-red-400">*</span>
              </label>
              <FormInput
                id="profile-name"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Your name"
                size="lg"
                disabled={saving}
              />
            </div>

            {/* Username */}
            <div>
              <label
                htmlFor="profile-username"
                className="block text-sm font-medium text-slate-300 mb-1"
              >
                Username
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm">
                  @
                </span>
                <FormInput
                  id="profile-username"
                  value={username}
                  onChange={e => setUsername(e.target.value.toLowerCase())}
                  placeholder="username"
                  size="lg"
                  className="pl-7"
                  disabled={saving}
                  autoCapitalize="none"
                  autoCorrect="off"
                />
                {usernameStatus === 'checking' && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-slate-400" />
                )}
                {usernameStatus === 'available' && (
                  <Check className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-400" />
                )}
              </div>
              {usernameError && <p className="text-xs text-red-400 mt-1">{usernameError}</p>}
              {usernameStatus === 'available' && (
                <p className="text-xs text-green-400 mt-1">Available</p>
              )}
            </div>

            {/* Pronouns */}
            <div>
              <label
                htmlFor="profile-pronouns"
                className="block text-sm font-medium text-slate-300 mb-1"
              >
                Pronouns
              </label>
              <FormInput
                id="profile-pronouns"
                value={pronouns}
                onChange={e => setPronouns(e.target.value)}
                placeholder="e.g. they/them"
                size="lg"
                maxLength={40}
                disabled={saving}
              />
            </div>

            {/* Bio */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="profile-bio" className="block text-sm font-medium text-slate-300">
                  Bio
                </label>
                <span className="text-xs text-slate-500">
                  {bio.length}/{BIO_MAX}
                </span>
              </div>
              <Textarea
                id="profile-bio"
                value={bio}
                onChange={e => setBio(e.target.value.slice(0, BIO_MAX))}
                placeholder="Tell people a little about yourself…"
                rows={3}
                disabled={saving}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-4 py-3 text-white placeholder:text-slate-500 outline-none focus:border-primary resize-none"
              />
            </div>

            {/* Location */}
            <div>
              <label
                htmlFor="profile-location"
                className="block text-sm font-medium text-slate-300 mb-1"
              >
                Location
              </label>
              <FormInput
                id="profile-location"
                value={location}
                onChange={e => setLocation(e.target.value)}
                placeholder="City, Country"
                size="lg"
                maxLength={100}
                disabled={saving}
              />
            </div>

            {/* Social links */}
            <div>
              <span className="block text-sm font-medium text-slate-300 mb-2">Social links</span>
              <div className="space-y-2">
                {SOCIAL_PLATFORMS.map(platform => (
                  <div key={platform} className="flex items-center gap-3">
                    <span className="w-20 shrink-0 text-xs text-slate-400">
                      {SOCIAL_META[platform].label}
                    </span>
                    <FormInput
                      value={socialLinks[platform] ?? ''}
                      onChange={e => handleSocialChange(platform, e.target.value)}
                      placeholder={SOCIAL_META[platform].placeholder}
                      disabled={saving}
                      className="flex-1"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Visibility */}
            <div className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-900 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-800 text-slate-300">
                  {visibility === 'public' ? (
                    <Globe className="w-5 h-5" />
                  ) : (
                    <Lock className="w-5 h-5" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-bold text-slate-200">
                    {visibility === 'public' ? 'Public profile' : 'Private profile'}
                  </div>
                  <div className="text-xs text-slate-500">
                    {visibility === 'public'
                      ? 'Anyone signed in can view your profile'
                      : 'Only you and your friends can see details'}
                  </div>
                </div>
              </div>
              <Switch
                checked={visibility === 'public'}
                onCheckedChange={checked => setVisibility(checked ? 'public' : 'private')}
                disabled={saving}
              />
            </div>

            <Button
              type="submit"
              disabled={!canSave}
              className="w-full font-bold py-3 px-4 flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Saving…
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
