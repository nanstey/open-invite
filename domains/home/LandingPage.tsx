import React from 'react';
import { CalendarDays, Map, Users, Bell, MapPin, Sparkles } from 'lucide-react';

// ============================================================================
// Types
// ============================================================================

interface LandingPageProps {
  onSignIn: () => void;
}

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
  image: string;
}

interface Category {
  name: string;
  color: string;
  icon: string;
}

// ============================================================================
// Data
// ============================================================================

const FEATURES: Feature[] = [
  {
    icon: <CalendarDays className="w-8 h-8" />,
    title: 'Social Calendar',
    description: 'Coordinate plans with friends. Never miss an event or opportunity to connect.',
    image: 'https://images.unsplash.com/photo-1633526543814-9718c8922b7a?w=800&h=600&fit=crop',
  },
  {
    icon: <Map className="w-8 h-8" />,
    title: 'Map View',
    description: 'Discover events happening near you. See where your friends are gathering in real-time.',
    image: 'https://images.unsplash.com/photo-1619468129361-605ebea04b44?w=800&h=600&fit=crop',
  },
  {
    icon: <Bell className="w-8 h-8" />,
    title: 'Smart Notifications',
    description: 'Never miss an invite or update. Get personalized alerts for events you care about.',
    image: 'https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=800&h=600&fit=crop',
  },
];

const CATEGORIES: Category[] = [
  { name: 'Social', color: 'bg-pink-500', icon: '🎉' },
  { name: 'Sport', color: 'bg-orange-500', icon: '⚽' },
  { name: 'Food', color: 'bg-emerald-500', icon: '🍕' },
  { name: 'Work', color: 'bg-blue-500', icon: '💼' },
  { name: 'Travel', color: 'bg-violet-500', icon: '✈️' },
  { name: 'Entertainment', color: 'bg-rose-500', icon: '🎬' },
];

// ============================================================================
// Subcomponents
// ============================================================================

function HeroSection({ onSignIn }: { onSignIn: () => void }) {
  return (
    <section className="relative min-h-screen flex items-center justify-center px-4 py-20 md:py-32">
      {/* Background Image with Overlay */}
      <div className="absolute inset-0 z-0">
        <img
          src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?w=1920&h=1080&fit=crop"
          alt="Social gathering"
          className="w-full h-full object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background"></div>
      </div>

      {/* Hero Content */}
      <div className="relative z-10 max-w-5xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
          <Sparkles className="w-4 h-4 text-primary" />
          <span className="text-sm text-primary font-medium">A social calendar for friends</span>
        </div>

        <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary via-secondary to-primary animate-gradient">
          Open Invite<sup className="text-lg md:text-xl ml-1 text-primary inline-block align-top mt-5">beta</sup>
        </h1>

        <p className="text-xl md:text-2xl text-slate-300 mb-8 max-w-2xl mx-auto leading-relaxed">
          Coordinate activities with friends, manage invites, and discover what your circle is up to.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <button
            onClick={onSignIn}
            className="px-8 py-4 bg-gradient-to-r from-primary to-secondary text-white font-bold rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/40 transition-all transform hover:scale-105 text-lg"
          >
            Sign In to Get Started
          </button>
          <a
            href="#features"
            className="px-8 py-4 bg-slate-800/50 backdrop-blur-sm border border-slate-700 text-slate-200 font-medium rounded-xl hover:bg-slate-800/70 transition-all text-lg"
          >
            Learn More
          </a>
        </div>

        {/* Scroll Indicator */}
        <div className="mt-16 animate-bounce">
          <div className="w-6 h-10 border-2 border-slate-600 rounded-full mx-auto flex items-start justify-center p-2">
            <div className="w-1.5 h-1.5 bg-slate-400 rounded-full"></div>
          </div>
        </div>
      </div>
    </section>
  );
}

function FeatureCard({ feature }: { feature: Feature; key?: React.Key }) {
  return (
    <div className="group relative bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-2xl overflow-hidden hover:border-primary/50 transition-all duration-300 hover:shadow-xl hover:shadow-primary/10">
      {/* Image */}
      <div className="relative h-48 overflow-hidden">
        <img
          src={feature.image}
          alt={feature.title}
          className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/50 to-transparent"></div>
        <div className="absolute top-4 left-4 p-3 rounded-xl bg-primary/20 backdrop-blur-sm border border-primary/30 text-primary">
          {feature.icon}
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <h3 className="text-xl font-bold mb-2 text-white">{feature.title}</h3>
        <p className="text-slate-400 leading-relaxed">{feature.description}</p>
      </div>
    </div>
  );
}

function FeaturesSection() {
  return (
    <section id="features" className="py-20 md:py-32 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
            Everything You Need
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Powerful features to help you stay connected and never miss a moment
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {FEATURES.map((feature, index) => (
            <FeatureCard key={index} feature={feature} />
          ))}
        </div>
      </div>
    </section>
  );
}

function CategoryCard({ category }: { category: Category; key?: React.Key }) {
  return (
    <div className="group relative aspect-square bg-slate-800/50 backdrop-blur-sm border border-slate-700 rounded-xl overflow-hidden hover:border-primary/50 transition-all duration-300 cursor-pointer">
      <div className={`absolute inset-0 ${category.color} opacity-10 group-hover:opacity-20 transition-opacity`}></div>
      <div className="relative h-full flex flex-col items-center justify-center p-4">
        <div className="text-4xl mb-2">{category.icon}</div>
        <div className="text-sm font-semibold text-slate-200">{category.name}</div>
      </div>
    </div>
  );
}

function CategoriesSection() {
  return (
    <section className="py-20 md:py-32 px-4 bg-slate-900/30">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
            All Types of Events
          </h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            From casual hangouts to organized activities, we've got you covered
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {CATEGORIES.map((category, index) => (
            <CategoryCard key={index} category={category} />
          ))}
        </div>
      </div>
    </section>
  );
}

function ShowcaseSection() {
  return (
    <section className="py-20 md:py-32 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Location-Based Showcase */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-20">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-6">
              <MapPin className="w-4 h-4 text-primary" />
              <span className="text-sm text-primary font-medium">Location-Based</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
              Discover Events Near You
            </h2>
            <p className="text-xl text-slate-400 mb-6 leading-relaxed">
              See what's happening in your area. Find events by location and join gatherings with friends nearby.
            </p>
            <ul className="space-y-3 text-slate-300">
              <li className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary"></div>
                Real-time location tracking
              </li>
              <li className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary"></div>
                Map view for easy discovery
              </li>
              <li className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-primary"></div>
                Flexible start and end times
              </li>
            </ul>
          </div>
          <div className="relative rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
            <img
              src="https://images.unsplash.com/photo-1467269204594-9661b134dd2b?w=800&h=600&fit=crop"
              alt="Map view"
              className="w-full h-full object-cover"
            />
          </div>
        </div>

        {/* Social Connection Showcase */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="order-2 lg:order-1 relative rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
            <img
              src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800&h=600&fit=crop"
              alt="Social interaction"
              className="w-full h-full object-cover"
            />
          </div>
          <div className="order-1 lg:order-2">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/10 border border-secondary/20 mb-6">
              <Users className="w-4 h-4 text-secondary" />
              <span className="text-sm text-secondary font-medium">Social Connection</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-secondary to-primary">
              Stay Connected with Friends
            </h2>
            <p className="text-xl text-slate-400 mb-6 leading-relaxed">
              Build your social network. Create groups, invite friends, and keep track of everyone's plans in one place.
            </p>
            <ul className="space-y-3 text-slate-300">
              <li className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-secondary"></div>
                Friends and groups management
              </li>
              <li className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-secondary"></div>
                Comments and reactions
              </li>
              <li className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-secondary"></div>
                Real-time notifications
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function CTASection({ onSignIn }: { onSignIn: () => void }) {
  return (
    <section className="py-20 md:py-32 px-4 bg-gradient-to-br from-primary/10 via-secondary/10 to-primary/10">
      <div className="max-w-4xl mx-auto text-center">
        <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary">
          Ready to Get Started?
        </h2>
        <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
          Join your friends and start discovering amazing events happening around you.
        </p>
        <button
          onClick={onSignIn}
          className="px-10 py-5 bg-gradient-to-r from-primary to-secondary text-white font-bold rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/40 transition-all transform hover:scale-105 text-lg"
        >
          Sign In Now
        </button>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="py-12 px-4 border-t border-slate-800">
      <div className="max-w-7xl mx-auto text-center">
        <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-secondary mb-4">
          Open Invite
        </div>
        <p className="text-slate-500 text-sm">
          A social calendar for friends
        </p>
      </div>
    </footer>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export function LandingPage({ onSignIn }: LandingPageProps) {
  return (
    <div className="min-h-screen bg-background text-slate-100 overflow-x-hidden">
      <HeroSection onSignIn={onSignIn} />
      <FeaturesSection />
      <CategoriesSection />
      <ShowcaseSection />
      <CTASection onSignIn={onSignIn} />
      <Footer />
    </div>
  );
}

