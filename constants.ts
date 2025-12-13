
import { SocialEvent, User, EventPrivacy, EventGroup, Notification } from './types';

export const USERS: User[] = [
  { id: 'u1', name: 'Alex (You)', avatar: 'https://picsum.photos/seed/alex/100/100', isCurrentUser: true },
  { id: 'u2', name: 'Sarah', avatar: 'https://picsum.photos/seed/sarah/100/100' },
  { id: 'u3', name: 'Marcus', avatar: 'https://picsum.photos/seed/marcus/100/100' },
  { id: 'u4', name: 'Elena', avatar: 'https://picsum.photos/seed/elena/100/100' },
  { id: 'u5', name: 'Raj', avatar: 'https://picsum.photos/seed/raj/100/100' },
  { id: 'u6', name: 'Chloe', avatar: 'https://picsum.photos/seed/chloe/100/100' },
  { id: 'u7', name: 'Tom', avatar: 'https://picsum.photos/seed/tom/100/100' },
];

export const GROUPS = [
  { id: EventGroup.ALL_FRIENDS, label: 'All Friends' },
  { id: EventGroup.CLIMBERS, label: '🧗 Climbing Crew' },
  { id: EventGroup.FAMILY, label: '🏠 Family' },
  { id: EventGroup.WORK, label: '💼 Work' },
];

// Helper to create dates relative to now
const today = new Date();

// Helper to set specific time on a relative day
const setTime = (dayOffset: number, hour: number, minute: number = 0) => {
  const d = new Date(today);
  d.setDate(d.getDate() + dayOffset);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};

// --- Category Themes ---
export const CATEGORY_THEMES: Record<string, { bg: string, border: string, text: string, hex: string, bgSoft: string }> = {
  Social: { bg: 'bg-pink-500', border: 'border-pink-500', text: 'text-pink-500', hex: '#ec4899', bgSoft: 'bg-pink-500/20' },
  Sport: { bg: 'bg-orange-500', border: 'border-orange-500', text: 'text-orange-500', hex: '#f97316', bgSoft: 'bg-orange-500/20' },
  Food: { bg: 'bg-emerald-500', border: 'border-emerald-500', text: 'text-emerald-500', hex: '#10b981', bgSoft: 'bg-emerald-500/20' },
  Work: { bg: 'bg-blue-500', border: 'border-blue-500', text: 'text-blue-500', hex: '#3b82f6', bgSoft: 'bg-blue-500/20' },
  Errand: { bg: 'bg-amber-500', border: 'border-amber-500', text: 'text-amber-500', hex: '#f59e0b', bgSoft: 'bg-amber-500/20' },
  Travel: { bg: 'bg-violet-500', border: 'border-violet-500', text: 'text-violet-500', hex: '#8b5cf6', bgSoft: 'bg-violet-500/20' },
  Entertainment: { bg: 'bg-rose-500', border: 'border-rose-500', text: 'text-rose-500', hex: '#f43f5e', bgSoft: 'bg-rose-500/20' },
};

export const getTheme = (type: string) => CATEGORY_THEMES[type] || { bg: 'bg-slate-500', border: 'border-slate-500', text: 'text-slate-500', hex: '#64748b', bgSoft: 'bg-slate-500/20' };

export const MOCK_NOTIFICATIONS: Notification[] = [
    {
        id: 'n1',
        type: 'INVITE',
        title: 'New Invite from Sarah',
        message: 'Sarah invited you to "Friday Night Beers"',
        timestamp: setTime(0, 14, 30),
        isRead: false,
        actorId: 'u2',
        relatedEventId: 'e8'
    },
    {
        id: 'n2',
        type: 'COMMENT',
        title: 'New Comment',
        message: 'Marcus commented on "Bouldering at Crag X"',
        timestamp: setTime(0, 10, 15),
        isRead: false,
        actorId: 'u3',
        relatedEventId: 'e1'
    },
    {
        id: 'n3',
        type: 'REMINDER',
        title: 'Upcoming Event',
        message: 'Sunset Walk is starting in 1 hour',
        timestamp: setTime(0, 19, 15), // Assuming event is later today
        isRead: true,
        relatedEventId: 'e4'
    },
    {
        id: 'n4',
        type: 'REACTION',
        title: 'Reaction Received',
        message: 'Elena reacted with 🔥 to your event',
        timestamp: setTime(-1, 9, 0),
        isRead: true,
        actorId: 'u4',
        relatedEventId: 'e4'
    },
    {
        id: 'n5',
        type: 'SYSTEM',
        title: 'Welcome to Open Invite!',
        message: 'Start by adding friends or creating your first event.',
        timestamp: setTime(-5, 12, 0),
        isRead: true,
    }
];

export const MOCK_EVENTS: SocialEvent[] = [
  {
    id: 'e1',
    hostId: 'u2',
    title: 'Bouldering at Crag X',
    description: 'Projecting the new V4s in the cave. Come hang!',
    activityType: 'Sport',
    location: '769 Pandora Ave',
    coordinates: { lat: 48.4293, lng: -123.3635 },
    startTime: setTime(0, 17, 30), // Today 5:30 PM
    isFlexibleStart: false,
    isFlexibleEnd: true,
    privacy: EventPrivacy.OPEN,
    targetGroup: EventGroup.CLIMBERS,
    maxSeats: 5,
    attendees: ['u2', 'u1', 'u6'],
    noPhones: false,
    comments: [
      { id: 'c1', userId: 'u3', text: 'I might be 10 mins late', timestamp: setTime(0, 16, 0) }
    ],
    reactions: {
      '💪': { emoji: '💪', count: 3, userReacted: true }
    }
  },
  {
    id: 'e2',
    hostId: 'u3',
    title: 'Costco Run 🛒',
    description: 'Driving to Costco in Langford. I have 2 seats if anyone needs a ride or bulk snacks.',
    activityType: 'Errand',
    location: 'Costco Langford',
    coordinates: { lat: 48.4557, lng: -123.5097 },
    startTime: setTime(2, 11, 0), // 2 days from now, 11 AM
    isFlexibleStart: true,
    isFlexibleEnd: false,
    privacy: EventPrivacy.OPEN,
    targetGroup: EventGroup.ALL_FRIENDS,
    maxSeats: 2,
    attendees: ['u3'],
    noPhones: false,
    comments: [],
    reactions: {}
  },
  {
    id: 'e3',
    hostId: 'u4',
    title: 'Board Game Night',
    description: 'Settlers of Catan and Pizza. No phones at the table please!',
    activityType: 'Social',
    location: 'Fernwood Square',
    coordinates: { lat: 48.4353, lng: -123.3409 },
    startTime: setTime(4, 19, 0), // 4 days from now, 7 PM
    isFlexibleStart: false,
    isFlexibleEnd: false,
    privacy: EventPrivacy.INVITE_ONLY,
    targetGroup: EventGroup.ALL_FRIENDS,
    maxSeats: 6,
    attendees: ['u4', 'u2', 'u5', 'u7'],
    noPhones: true,
    comments: [],
    reactions: {
      '🎲': { emoji: '🎲', count: 4, userReacted: false }
    }
  },
  {
    id: 'e4',
    hostId: 'u1',
    title: 'Sunset Walk',
    description: 'Walking the dog along Dallas Rd. Catching the sunset.',
    activityType: 'Social',
    location: 'Dallas Road',
    coordinates: { lat: 48.4069, lng: -123.3752 },
    startTime: setTime(0, 20, 15), // Today 8:15 PM
    isFlexibleStart: true,
    isFlexibleEnd: true,
    privacy: EventPrivacy.OPEN,
    targetGroup: EventGroup.ALL_FRIENDS,
    maxSeats: 10,
    attendees: ['u1', 'u6'],
    noPhones: true,
    comments: [],
    reactions: {
        '🌅': { emoji: '🌅', count: 2, userReacted: true }
    }
  },
  {
    id: 'e5',
    hostId: 'u5',
    title: 'Deep Focus Study',
    description: 'Grinding out some code at the library. Silent company welcome.',
    activityType: 'Work',
    location: 'UVic Library',
    coordinates: { lat: 48.4633, lng: -123.3113 },
    startTime: setTime(1, 14, 0), // Tomorrow 2 PM
    isFlexibleStart: false,
    isFlexibleEnd: false,
    privacy: EventPrivacy.OPEN,
    targetGroup: EventGroup.WORK,
    maxSeats: 4,
    attendees: ['u5', 'u2'],
    noPhones: true,
    comments: [],
    reactions: {}
  },
  {
    id: 'e6',
    hostId: 'u7',
    title: 'Morning Coffee @ Hey Happy',
    description: 'Quick espresso before work. Come say hi.',
    activityType: 'Food',
    location: 'Hey Happy Coffee',
    coordinates: { lat: 48.4286, lng: -123.3660 },
    startTime: setTime(1, 8, 30), // Tomorrow 8:30 AM
    isFlexibleStart: true,
    isFlexibleEnd: true,
    privacy: EventPrivacy.OPEN,
    targetGroup: EventGroup.ALL_FRIENDS,
    maxSeats: 8,
    attendees: ['u7', 'u1', 'u3'],
    noPhones: false,
    comments: [],
    reactions: {
        '☕': { emoji: '☕', count: 3, userReacted: true }
    }
  },
  {
    id: 'e7',
    hostId: 'u6',
    title: 'Spikeball in the Park',
    description: 'Bringing the net and some snacks. Beginners welcome!',
    activityType: 'Sport',
    location: 'Beacon Hill Park',
    coordinates: { lat: 48.4132, lng: -123.3642 },
    startTime: setTime(3, 13, 0), // 3 days from now, 1 PM
    isFlexibleStart: false,
    isFlexibleEnd: true,
    privacy: EventPrivacy.OPEN,
    targetGroup: EventGroup.ALL_FRIENDS,
    maxSeats: 12,
    attendees: ['u6', 'u4', 'u5', 'u2'],
    noPhones: false,
    comments: [
        { id: 'c2', userId: 'u2', text: 'I am terrible at this but I am coming!', timestamp: setTime(1, 10, 0) }
    ],
    reactions: {}
  },
  {
    id: 'e8',
    hostId: 'u2',
    title: 'Friday Night Beers',
    description: 'The Drake Eatery. Craft beer and good vibes.',
    activityType: 'Social',
    location: 'The Drake',
    coordinates: { lat: 48.4290, lng: -123.3680 },
    startTime: setTime(5, 19, 30), // 5 days from now (Friday-ish), 7:30 PM
    isFlexibleStart: true,
    isFlexibleEnd: true,
    privacy: EventPrivacy.OPEN,
    targetGroup: EventGroup.ALL_FRIENDS,
    maxSeats: 20,
    attendees: ['u2', 'u1', 'u3', 'u4', 'u5', 'u6', 'u7'],
    noPhones: false,
    comments: [],
    reactions: {
        '🍻': { emoji: '🍻', count: 7, userReacted: true }
    }
  },
  {
    id: 'e9',
    hostId: 'u4',
    title: 'Mt Doug Hike',
    description: 'Hiking up to the summit for the view. Moderate pace.',
    activityType: 'Sport',
    location: 'Mount Douglas Park',
    coordinates: { lat: 48.4925, lng: -123.3456 },
    startTime: setTime(12, 10, 0), // ~2 weeks
    isFlexibleStart: false,
    isFlexibleEnd: false,
    privacy: EventPrivacy.OPEN,
    targetGroup: EventGroup.ALL_FRIENDS,
    maxSeats: 10,
    attendees: ['u4', 'u6'],
    noPhones: false,
    comments: [],
    reactions: {}
  },
  {
    id: 'e10',
    hostId: 'u1',
    title: 'Fish & Chips Lunch',
    description: 'Red Fish Blue Fish on the wharf. It might be busy.',
    activityType: 'Food',
    location: 'Inner Harbour',
    coordinates: { lat: 48.4246, lng: -123.3689 },
    startTime: setTime(0, 12, 15), // Today 12:15 PM
    isFlexibleStart: false,
    isFlexibleEnd: false,
    privacy: EventPrivacy.OPEN,
    targetGroup: EventGroup.ALL_FRIENDS,
    maxSeats: 4,
    attendees: ['u1', 'u5'],
    noPhones: false,
    comments: [],
    reactions: {
        '🐟': { emoji: '🐟', count: 2, userReacted: true }
    }
  },
  {
    id: 'e11',
    hostId: 'u3',
    title: 'Hackathon Prep',
    description: 'Brainstorming ideas for the upcoming hackathon.',
    activityType: 'Work',
    location: 'Kanzei Style Office',
    coordinates: { lat: 48.4275, lng: -123.3665 },
    startTime: setTime(8, 18, 0), // Next week
    isFlexibleStart: false,
    isFlexibleEnd: false,
    privacy: EventPrivacy.INVITE_ONLY,
    targetGroup: EventGroup.WORK,
    maxSeats: 5,
    attendees: ['u3', 'u1', 'u5'],
    noPhones: false,
    comments: [],
    reactions: {}
  },
  {
    id: 'e12',
    hostId: 'u5',
    title: 'Surfing Jordan River',
    description: 'Early morning swell looks good. Need a ride? I have a rack.',
    activityType: 'Sport',
    location: 'Jordan River',
    coordinates: { lat: 48.4230, lng: -124.0540 }, // Further out
    startTime: setTime(25, 6, 0), // Next month
    isFlexibleStart: false,
    isFlexibleEnd: false,
    privacy: EventPrivacy.OPEN,
    targetGroup: EventGroup.ALL_FRIENDS,
    maxSeats: 3,
    attendees: ['u5'],
    noPhones: false,
    comments: [],
    reactions: {
        '🏄': { emoji: '🏄', count: 1, userReacted: true }
    }
  },
  {
    id: 'e13',
    hostId: 'u6',
    title: 'Thrift Shopping',
    description: 'Hitting up Value Village and WIN downtown.',
    activityType: 'Errand',
    location: 'Store Street',
    coordinates: { lat: 48.4310, lng: -123.3690 },
    startTime: setTime(-1, 14, 0), // Yesterday 2 PM (for history check)
    isFlexibleStart: true,
    isFlexibleEnd: true,
    privacy: EventPrivacy.OPEN,
    targetGroup: EventGroup.ALL_FRIENDS,
    maxSeats: 4,
    attendees: ['u6', 'u4'],
    noPhones: false,
    comments: [],
    reactions: {}
  },
  {
    id: 'e14',
    hostId: 'u7',
    title: 'Trivia Night',
    description: 'Need big brains for the quiz at Beagle Pub.',
    activityType: 'Social',
    location: 'Cook Street Village',
    coordinates: { lat: 48.4144, lng: -123.3567 },
    startTime: setTime(16, 20, 0), // 2 weeks out
    isFlexibleStart: false,
    isFlexibleEnd: false,
    privacy: EventPrivacy.OPEN,
    targetGroup: EventGroup.ALL_FRIENDS,
    maxSeats: 6,
    attendees: ['u7', 'u1', 'u3', 'u2'],
    noPhones: true,
    comments: [],
    reactions: {
        '🧠': { emoji: '🧠', count: 4, userReacted: true }
    }
  },
  {
    id: 'e15',
    hostId: 'u2',
    title: 'Willows Beach Chill',
    description: 'Bonfire (if allowed) and blankets. Watching the moon rise.',
    activityType: 'Social',
    location: 'Willows Beach',
    coordinates: { lat: 48.4380, lng: -123.3080 },
    startTime: setTime(32, 21, 0), // Next Month
    isFlexibleStart: true,
    isFlexibleEnd: true,
    privacy: EventPrivacy.OPEN,
    targetGroup: EventGroup.ALL_FRIENDS,
    maxSeats: 15,
    attendees: ['u2', 'u6', 'u7'],
    noPhones: true,
    comments: [],
    reactions: {}
  },
  // --- NEW EVENTS ---
  {
    id: 'e16',
    hostId: 'u4',
    title: 'Winter Market Walk',
    description: 'Browsing the artisan stalls at Bastion Square.',
    activityType: 'Social',
    location: 'Bastion Square',
    coordinates: { lat: 48.4256, lng: -123.3694 },
    startTime: setTime(45, 13, 0), // 1.5 months
    isFlexibleStart: true,
    isFlexibleEnd: true,
    privacy: EventPrivacy.OPEN,
    targetGroup: EventGroup.ALL_FRIENDS,
    maxSeats: 6,
    attendees: ['u4', 'u1'],
    noPhones: false,
    comments: [],
    reactions: {}
  },
  {
    id: 'e17',
    hostId: 'u5',
    title: 'Code & Coffee',
    description: 'Working on side projects. Habit Coffee has good wifi.',
    activityType: 'Work',
    location: 'Habit Coffee',
    coordinates: { lat: 48.4286, lng: -123.3644 },
    startTime: setTime(60, 9, 0), // 2 months
    isFlexibleStart: false,
    isFlexibleEnd: false,
    privacy: EventPrivacy.OPEN,
    targetGroup: EventGroup.WORK,
    maxSeats: 4,
    attendees: ['u5', 'u3'],
    noPhones: true,
    comments: [],
    reactions: {}
  },
  {
    id: 'e18',
    hostId: 'u6',
    title: 'Badminton Drop-in',
    description: 'Casual games at Commonwealth Place.',
    activityType: 'Sport',
    location: 'Commonwealth Place',
    coordinates: { lat: 48.5086, lng: -123.3934 },
    startTime: setTime(18, 18, 30), // 2.5 weeks
    isFlexibleStart: false,
    isFlexibleEnd: false,
    privacy: EventPrivacy.OPEN,
    targetGroup: EventGroup.ALL_FRIENDS,
    maxSeats: 4,
    attendees: ['u6'],
    noPhones: false,
    comments: [],
    reactions: {}
  },
  {
    id: 'e19',
    hostId: 'u1',
    title: 'Sushi Dinner',
    description: 'Craving Ebizo sushi. Need reservations, let me know by noon.',
    activityType: 'Food',
    location: 'Ebizo Japanese',
    coordinates: { lat: 48.4262, lng: -123.3664 },
    startTime: setTime(75, 19, 0), // 2.5 months
    isFlexibleStart: false,
    isFlexibleEnd: false,
    privacy: EventPrivacy.INVITE_ONLY,
    targetGroup: EventGroup.ALL_FRIENDS,
    maxSeats: 6,
    attendees: ['u1', 'u2', 'u7'],
    noPhones: false,
    comments: [],
    reactions: {
        '🍣': { emoji: '🍣', count: 3, userReacted: true }
    }
  },
  {
    id: 'e20',
    hostId: 'u3',
    title: 'Book Club: Dune',
    description: 'Discussing the first half. Meeting at Russell Books reading nook.',
    activityType: 'Social',
    location: 'Russell Books',
    coordinates: { lat: 48.4253, lng: -123.3665 },
    startTime: setTime(40, 18, 0), // 1+ month
    isFlexibleStart: false,
    isFlexibleEnd: false,
    privacy: EventPrivacy.OPEN,
    targetGroup: EventGroup.ALL_FRIENDS,
    maxSeats: 8,
    attendees: ['u3', 'u4', 'u5'],
    noPhones: true,
    comments: [],
    reactions: {}
  },
  {
    id: 'e21',
    hostId: 'u2',
    title: 'Airport Run (Pickup)',
    description: 'Picking up my brother. Anyone want a ride to Sidney?',
    activityType: 'Errand',
    location: 'Victoria Airport (YYJ)',
    coordinates: { lat: 48.6469, lng: -123.4258 },
    startTime: setTime(11, 15, 30), // 11 days out
    isFlexibleStart: true,
    isFlexibleEnd: false,
    privacy: EventPrivacy.OPEN,
    targetGroup: EventGroup.FAMILY,
    maxSeats: 2,
    attendees: ['u2'],
    noPhones: false,
    comments: [],
    reactions: {}
  },
  {
    id: 'e22',
    hostId: 'u7',
    title: 'Tech Meetup Downtown',
    description: 'Networking event at Fort Tectoria.',
    activityType: 'Work',
    location: 'Fort Tectoria',
    coordinates: { lat: 48.4243, lng: -123.3630 },
    startTime: setTime(50, 17, 0), // ~2 months
    isFlexibleStart: false,
    isFlexibleEnd: true,
    privacy: EventPrivacy.OPEN,
    targetGroup: EventGroup.WORK,
    maxSeats: 20,
    attendees: ['u7', 'u5', 'u3'],
    noPhones: false,
    comments: [],
    reactions: {}
  },
  {
    id: 'e23',
    hostId: 'u5',
    title: 'Squash Game',
    description: 'Booked a court at Cedar Hill. Looking for an opponent.',
    activityType: 'Sport',
    location: 'Cedar Hill Rec',
    coordinates: { lat: 48.4550, lng: -123.3421 },
    startTime: setTime(85, 16, 0), // ~3 months
    isFlexibleStart: false,
    isFlexibleEnd: false,
    privacy: EventPrivacy.OPEN,
    targetGroup: EventGroup.ALL_FRIENDS,
    maxSeats: 2,
    attendees: ['u5'],
    noPhones: false,
    comments: [],
    reactions: {}
  },
  {
    id: 'e24',
    hostId: 'u1',
    title: 'Late Night Pho',
    description: 'Comfort food after the gym. Pho Vy on Fort.',
    activityType: 'Food',
    location: 'Pho Vy',
    coordinates: { lat: 48.4289, lng: -123.3622 },
    startTime: setTime(13, 21, 0), // 2 weeks
    isFlexibleStart: true,
    isFlexibleEnd: true,
    privacy: EventPrivacy.OPEN,
    targetGroup: EventGroup.ALL_FRIENDS,
    maxSeats: 4,
    attendees: ['u1', 'u6'],
    noPhones: false,
    comments: [],
    reactions: {
        '🍜': { emoji: '🍜', count: 2, userReacted: true }
    }
  },
  {
    id: 'e25',
    hostId: 'u6',
    title: 'Christmas Shopping',
    description: 'Braving the mall for gifts. Strength in numbers.',
    activityType: 'Errand',
    location: 'Mayfair Mall',
    coordinates: { lat: 48.4452, lng: -123.3698 },
    startTime: setTime(5, 10, 0), // This week
    isFlexibleStart: false,
    isFlexibleEnd: true,
    privacy: EventPrivacy.OPEN,
    targetGroup: EventGroup.ALL_FRIENDS,
    maxSeats: 3,
    attendees: ['u6', 'u2'],
    noPhones: false,
    comments: [],
    reactions: {}
  },
  {
    id: 'e26',
    hostId: 'u3',
    title: 'Weekend Trip Planning',
    description: 'Planning the Tofino trip over beers.',
    activityType: 'Travel',
    location: 'Swan\'s Pub',
    coordinates: { lat: 48.4295, lng: -123.3704 },
    startTime: setTime(28, 19, 30), // Next month
    isFlexibleStart: true,
    isFlexibleEnd: false,
    privacy: EventPrivacy.INVITE_ONLY,
    targetGroup: EventGroup.ALL_FRIENDS,
    maxSeats: 5,
    attendees: ['u3', 'u1', 'u4', 'u5'],
    noPhones: false,
    comments: [],
    reactions: {
        '🌊': { emoji: '🌊', count: 4, userReacted: true }
    }
  },
  {
    id: 'e27',
    hostId: 'u2',
    title: 'Movie Night: Sci-Fi',
    description: 'Catching the late show at Capitol 6.',
    activityType: 'Entertainment',
    location: 'Capitol 6 Theatres',
    coordinates: { lat: 48.4239, lng: -123.3661 },
    startTime: setTime(55, 21, 15), // ~2 months
    isFlexibleStart: false,
    isFlexibleEnd: false,
    privacy: EventPrivacy.OPEN,
    targetGroup: EventGroup.ALL_FRIENDS,
    maxSeats: 8,
    attendees: ['u2', 'u7'],
    noPhones: true,
    comments: [],
    reactions: {
      '🎬': { emoji: '🎬', count: 2, userReacted: true }
    }
  },
  {
    id: 'e28',
    hostId: 'u4',
    title: 'Morning Jog',
    description: 'Ogden Point breakwater run. Easy pace.',
    activityType: 'Sport',
    location: 'Ogden Point',
    coordinates: { lat: 48.4147, lng: -123.3853 },
    startTime: setTime(90, 7, 0), // 3 months out
    isFlexibleStart: false,
    isFlexibleEnd: false,
    privacy: EventPrivacy.OPEN,
    targetGroup: EventGroup.ALL_FRIENDS,
    maxSeats: 4,
    attendees: ['u4'],
    noPhones: false,
    comments: [],
    reactions: {}
  },
  {
    id: 'e29',
    hostId: 'u7',
    title: 'Brunch at Blue Fox',
    description: 'Waiting in line but it\'s worth it. Benny time.',
    activityType: 'Food',
    location: 'Blue Fox Cafe',
    coordinates: { lat: 48.4265, lng: -123.3619 },
    startTime: setTime(22, 10, 30), // 3 weeks
    isFlexibleStart: true,
    isFlexibleEnd: false,
    privacy: EventPrivacy.OPEN,
    targetGroup: EventGroup.ALL_FRIENDS,
    maxSeats: 6,
    attendees: ['u7', 'u1', 'u2', 'u3'],
    noPhones: false,
    comments: [],
    reactions: {
        '🍳': { emoji: '🍳', count: 4, userReacted: true }
    }
  },
  {
    id: 'e30',
    hostId: 'u1',
    title: 'New Year\'s Eve Prep',
    description: 'Buying supplies for the party.',
    activityType: 'Errand',
    location: 'Market on Yates',
    coordinates: { lat: 48.4263, lng: -123.3616 },
    startTime: setTime(65, 14, 0), // 2+ months
    isFlexibleStart: true,
    isFlexibleEnd: true,
    privacy: EventPrivacy.OPEN,
    targetGroup: EventGroup.ALL_FRIENDS,
    maxSeats: 3,
    attendees: ['u1'],
    noPhones: false,
    comments: [],
    reactions: {}
  },
  // --- ENTERTAINMENT EVENTS ---
  {
    id: 'e31',
    hostId: 'u2',
    title: 'Symphony: The Nutcracker',
    description: 'Ballet Victoria at the Royal Theatre. Dressing up nicely for this one!',
    activityType: 'Entertainment',
    location: 'Royal Theatre',
    coordinates: { lat: 48.4237, lng: -123.3644 },
    startTime: setTime(35, 19, 0), // 1+ month
    isFlexibleStart: false,
    isFlexibleEnd: false,
    privacy: EventPrivacy.OPEN,
    targetGroup: EventGroup.ALL_FRIENDS,
    maxSeats: 4,
    attendees: ['u2', 'u1', 'u7'],
    noPhones: true,
    comments: [],
    reactions: {
      '🎻': { emoji: '🎻', count: 3, userReacted: true }
    }
  },
  {
    id: 'e32',
    hostId: 'u5',
    title: 'Dune: Part Two (IMAX)',
    description: 'Seeing it properly on the biggest screen possible. Museum IMAX.',
    activityType: 'Entertainment',
    location: 'IMAX Victoria',
    coordinates: { lat: 48.4206, lng: -123.3676 },
    startTime: setTime(10, 18, 45), // Next week
    isFlexibleStart: false,
    isFlexibleEnd: false,
    privacy: EventPrivacy.OPEN,
    targetGroup: EventGroup.ALL_FRIENDS,
    maxSeats: 6,
    attendees: ['u5', 'u4'],
    noPhones: true,
    comments: [],
    reactions: {
      '🍿': { emoji: '🍿', count: 2, userReacted: true }
    }
  },
  {
    id: 'e33',
    hostId: 'u3',
    title: 'Jazz Night at Hermann\'s',
    description: 'Live quartet playing standards. Cover is $20. Good food too.',
    activityType: 'Entertainment',
    location: 'Hermann\'s Jazz Club',
    coordinates: { lat: 48.4235, lng: -123.3664 },
    startTime: setTime(70, 20, 0), // 2+ months
    isFlexibleStart: false,
    isFlexibleEnd: true,
    privacy: EventPrivacy.OPEN,
    targetGroup: EventGroup.ALL_FRIENDS,
    maxSeats: 8,
    attendees: ['u3', 'u6'],
    noPhones: true,
    comments: [],
    reactions: {
      '🎷': { emoji: '🎷', count: 1, userReacted: true }
    }
  },
  {
    id: 'e34',
    hostId: 'u6',
    title: 'Comedy Night at Hecklers',
    description: 'Local stand-up showcase. Always good for a laugh.',
    activityType: 'Entertainment',
    location: 'Hecklers Bar',
    coordinates: { lat: 48.4419, lng: -123.3857 },
    startTime: setTime(42, 20, 30), // 1.5 months
    isFlexibleStart: false,
    isFlexibleEnd: false,
    privacy: EventPrivacy.OPEN,
    targetGroup: EventGroup.ALL_FRIENDS,
    maxSeats: 6,
    attendees: ['u6', 'u2', 'u1'],
    noPhones: true,
    comments: [],
    reactions: {
      '😂': { emoji: '😂', count: 3, userReacted: true }
    }
  },
  {
    id: 'e35',
    hostId: 'u4',
    title: 'Arkells Concert',
    description: 'Big show at Save-On. I have an extra ticket in the lower bowl!',
    activityType: 'Entertainment',
    location: 'Save-On-Foods Memorial Centre',
    coordinates: { lat: 48.4367, lng: -123.3607 },
    startTime: setTime(80, 19, 0), // 2.5 months
    isFlexibleStart: false,
    isFlexibleEnd: false,
    privacy: EventPrivacy.OPEN,
    targetGroup: EventGroup.ALL_FRIENDS,
    maxSeats: 2,
    attendees: ['u4'],
    noPhones: false,
    comments: [],
    reactions: {
      '🎸': { emoji: '🎸', count: 1, userReacted: true }
    }
  }
];
