import React, { useState } from 'react';
import { useAuth } from './AuthProvider';
import { X } from 'lucide-react';
import { GoogleIcon } from '@/lib/ui/icons/GoogleIcon';

// ============================================================================
// Constants
// ============================================================================

const isEmailAuthEnabled = import.meta.env.VITE_APP_ENV !== 'prod';
const DEFAULT_AVATAR = 'https://picsum.photos/seed/user/100/100';

// ============================================================================
// Utilities
// ============================================================================

function getAuthRedirectPath(): string {
  const raw = window.location.pathname + window.location.search;
  if (raw.startsWith('/e/')) return raw.replace(/^\/e\//, '/events/');
  if (raw === '/') return '/events?view=list';
  return raw;
}

function getErrorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'An error occurred';
}

// ============================================================================
// Types
// ============================================================================

interface LoginModalProps {
  onClose: () => void;
}

interface FormInputProps {
  label: string;
  type: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  required?: boolean;
  minLength?: number;
}

interface GoogleSignInButtonProps {
  onClick: () => void;
  disabled: boolean;
  loading: boolean;
}

interface EmailSignInFormProps {
  isSignUp: boolean;
  loading: boolean;
  onSubmit: (e: React.FormEvent) => void;
  fields: {
    name: string;
    setName: (v: string) => void;
    avatar: string;
    setAvatar: (v: string) => void;
    email: string;
    setEmail: (v: string) => void;
    password: string;
    setPassword: (v: string) => void;
  };
}

interface AuthToggleProps {
  isSignUp: boolean;
  onToggle: () => void;
}

// ============================================================================
// Sub-components
// ============================================================================

function FormInput({ label, type, value, onChange, placeholder, required, minLength }: FormInputProps) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary"
        placeholder={placeholder}
        required={required}
        minLength={minLength}
      />
    </div>
  );
}

function AuthError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-2 rounded-lg text-sm mb-4">
      {message}
    </div>
  );
}

function AuthDivider() {
  return (
    <div className="relative mb-4">
      <div className="absolute inset-0 flex items-center">
        <div className="w-full border-t border-slate-600"></div>
      </div>
      <div className="relative flex justify-center text-sm">
        <span className="px-2 bg-slate-800 text-slate-400">Or continue with email</span>
      </div>
    </div>
  );
}

function GoogleSignInButton({ onClick, disabled, loading }: GoogleSignInButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full bg-slate-700 hover:bg-slate-600 border border-slate-600 text-white font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 mb-4"
    >
      <GoogleIcon />
      {loading ? 'Signing in...' : 'Sign in with Google'}
    </button>
  );
}

function EmailSignInForm({ isSignUp, loading, onSubmit, fields }: EmailSignInFormProps) {
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {isSignUp && (
        <>
          <FormInput
            label="Name"
            type="text"
            value={fields.name}
            onChange={fields.setName}
            placeholder="Your name"
            required
          />
          <FormInput
            label="Avatar URL"
            type="url"
            value={fields.avatar}
            onChange={fields.setAvatar}
            placeholder="https://..."
          />
        </>
      )}

      <FormInput
        label="Email"
        type="email"
        value={fields.email}
        onChange={fields.setEmail}
        placeholder="you@example.com"
        required
      />

      <FormInput
        label="Password"
        type="password"
        value={fields.password}
        onChange={fields.setPassword}
        placeholder="••••••••"
        required
        minLength={6}
      />

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-primary hover:bg-primary/90 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Loading...' : isSignUp ? 'Sign Up' : 'Sign In'}
      </button>
    </form>
  );
}

function AuthToggle({ isSignUp, onToggle }: AuthToggleProps) {
  return (
    <div className="mt-4 text-center">
      <button
        onClick={onToggle}
        className="text-sm text-slate-400 hover:text-primary transition-colors"
      >
        {isSignUp ? 'Already have an account? Sign in' : "Don't have an account? Sign up"}
      </button>
    </div>
  );
}

// ============================================================================
// Custom Hook
// ============================================================================

function useLoginForm(onClose: () => void) {
  const { signIn, signUp, signInWithGoogle } = useAuth();

  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [avatar, setAvatar] = useState(DEFAULT_AVATAR);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);

    try {
      const result = await signInWithGoogle(getAuthRedirectPath());
      if (result?.error) {
        setError(result.error.message || 'Google sign in failed');
        setGoogleLoading(false);
      }
    } catch (err) {
      setError(getErrorMessage(err));
      setGoogleLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (isSignUp) {
        if (!name.trim()) {
          setError('Name is required');
          setLoading(false);
          return;
        }
        const result = await signUp(email, password, name, avatar);
        if (result?.error) {
          setError(result.error.message || 'Sign up failed');
        } else {
          onClose();
        }
      } else {
        const result = await signIn(email, password);
        if (result?.error) {
          setError(result.error.message || 'Sign in failed');
        } else {
          onClose();
        }
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSignUp(!isSignUp);
    setError(null);
  };

  return {
    isSignUp,
    error,
    loading,
    googleLoading,
    handleGoogleSignIn,
    handleSubmit,
    toggleMode,
    fields: {
      name,
      setName,
      avatar,
      setAvatar,
      email,
      setEmail,
      password,
      setPassword,
    },
  };
}

// ============================================================================
// Main Component
// ============================================================================

export function LoginModal({ onClose }: LoginModalProps) {
  const {
    isSignUp,
    error,
    loading,
    googleLoading,
    handleGoogleSignIn,
    handleSubmit,
    toggleMode,
    fields,
  } = useLoginForm(onClose);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
      <div className="bg-slate-800 rounded-xl shadow-2xl w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-2xl font-bold text-white mb-6">
          {isEmailAuthEnabled && isSignUp ? 'Sign Up' : 'Sign In'}
        </h2>

        <GoogleSignInButton
          onClick={handleGoogleSignIn}
          disabled={loading || googleLoading}
          loading={googleLoading}
        />

        <AuthError message={error} />

        {isEmailAuthEnabled && (
          <>
            <AuthDivider />
            <EmailSignInForm
              isSignUp={isSignUp}
              loading={loading}
              onSubmit={handleSubmit}
              fields={fields}
            />
            <AuthToggle isSignUp={isSignUp} onToggle={toggleMode} />
          </>
        )}
      </div>
    </div>
  );
}

