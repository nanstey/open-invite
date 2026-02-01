export type EmojiItem = {
  emoji: string
  shortcodes: string[]
  keywords?: string[]
}

export const EMOJI_DATA: EmojiItem[] = [
  { emoji: '😀', shortcodes: ['grinning'], keywords: ['smile', 'happy'] },
  { emoji: '😁', shortcodes: ['grin'], keywords: ['smile', 'happy'] },
  { emoji: '😃', shortcodes: ['smiley'], keywords: ['smile', 'happy'] },
  { emoji: '😄', shortcodes: ['smile'], keywords: ['happy', 'joy'] },
  { emoji: '😆', shortcodes: ['laughing', 'satisfied'], keywords: ['happy', 'laugh'] },
  { emoji: '😅', shortcodes: ['sweat_smile'], keywords: ['relief', 'smile'] },
  { emoji: '🤣', shortcodes: ['rofl'], keywords: ['lol', 'laugh'] },
  { emoji: '😂', shortcodes: ['joy'], keywords: ['tears', 'laugh'] },
  { emoji: '🙂', shortcodes: ['slight_smile'], keywords: ['smile'] },
  { emoji: '😉', shortcodes: ['wink'], keywords: ['playful'] },
  { emoji: '😊', shortcodes: ['blush'], keywords: ['smile', 'proud'] },
  { emoji: '😍', shortcodes: ['heart_eyes'], keywords: ['love'] },
  { emoji: '😘', shortcodes: ['kissing_heart'], keywords: ['love'] },
  { emoji: '😎', shortcodes: ['sunglasses'], keywords: ['cool'] },
  { emoji: '🤔', shortcodes: ['thinking'], keywords: ['hmm'] },
  { emoji: '😢', shortcodes: ['cry'], keywords: ['sad'] },
  { emoji: '😭', shortcodes: ['sob'], keywords: ['sad', 'cry'] },
  { emoji: '😠', shortcodes: ['angry'], keywords: ['mad'] },
  { emoji: '😡', shortcodes: ['rage'], keywords: ['mad'] },
  { emoji: '👍', shortcodes: ['thumbsup'], keywords: ['approve', 'yes'] },
  { emoji: '👎', shortcodes: ['thumbsdown'], keywords: ['no', 'disapprove'] },
  { emoji: '👏', shortcodes: ['clap'], keywords: ['praise'] },
  { emoji: '🙏', shortcodes: ['pray'], keywords: ['thanks', 'please'] },
  { emoji: '💪', shortcodes: ['muscle'], keywords: ['strength'] },
  { emoji: '👌', shortcodes: ['ok_hand'], keywords: ['ok'] },
  { emoji: '👋', shortcodes: ['wave'], keywords: ['hello', 'bye'] },
  { emoji: '🎉', shortcodes: ['tada', 'party_popper'], keywords: ['celebrate', 'party'] },
  { emoji: '🥳', shortcodes: ['partying'], keywords: ['celebrate', 'party'] },
  { emoji: '🔥', shortcodes: ['fire'], keywords: ['lit', 'hot'] },
  { emoji: '✨', shortcodes: ['sparkles'], keywords: ['shine'] },
  { emoji: '⭐', shortcodes: ['star'], keywords: ['favorite'] },
  { emoji: '💯', shortcodes: ['100'], keywords: ['score', 'perfect'] },
  { emoji: '✅', shortcodes: ['check'], keywords: ['confirm'] },
  { emoji: '❌', shortcodes: ['x'], keywords: ['cancel'] },
  { emoji: '⚠️', shortcodes: ['warning'], keywords: ['alert'] },
  { emoji: '❓', shortcodes: ['question'], keywords: ['help'] },
  { emoji: '🚀', shortcodes: ['rocket'], keywords: ['launch'] },
  { emoji: '💡', shortcodes: ['bulb'], keywords: ['idea'] },
  { emoji: '📅', shortcodes: ['calendar'], keywords: ['date'] },
  { emoji: '⏰', shortcodes: ['alarm_clock'], keywords: ['time'] },
  { emoji: '☕', shortcodes: ['coffee'], keywords: ['drink'] },
  { emoji: '🍺', shortcodes: ['beer'], keywords: ['drink'] },
  { emoji: '🍕', shortcodes: ['pizza'], keywords: ['food'] },
  { emoji: '🎂', shortcodes: ['birthday', 'cake'], keywords: ['celebrate', 'food'] },
  { emoji: '🎁', shortcodes: ['gift'], keywords: ['present'] },
  { emoji: '🎈', shortcodes: ['balloon'], keywords: ['party'] },
  { emoji: '📚', shortcodes: ['books'], keywords: ['study'] },
  { emoji: '📷', shortcodes: ['camera'], keywords: ['photo'] },
  { emoji: '🎤', shortcodes: ['microphone'], keywords: ['music'] },
  { emoji: '⚽', shortcodes: ['soccer'], keywords: ['sports'] },
  { emoji: '🏀', shortcodes: ['basketball'], keywords: ['sports'] },
  { emoji: '🏈', shortcodes: ['football'], keywords: ['sports'] },
  { emoji: '🎾', shortcodes: ['tennis'], keywords: ['sports'] },
  { emoji: '🎵', shortcodes: ['musical_note'], keywords: ['music'] },
  { emoji: '🎶', shortcodes: ['notes'], keywords: ['music'] },
  { emoji: '☀️', shortcodes: ['sunny'], keywords: ['weather'] },
  { emoji: '☁️', shortcodes: ['cloud'], keywords: ['weather'] },
  { emoji: '☔', shortcodes: ['umbrella'], keywords: ['rain'] },
  { emoji: '❄️', shortcodes: ['snowflake'], keywords: ['snow'] },
  { emoji: '❤️', shortcodes: ['heart'], keywords: ['love'] },
  { emoji: '💔', shortcodes: ['broken_heart'], keywords: ['sad', 'love'] },
]

export const EMOJI_SHORTCODE_MAP = new Map<string, string>()

for (const item of EMOJI_DATA) {
  for (const shortcode of item.shortcodes) {
    EMOJI_SHORTCODE_MAP.set(shortcode, item.emoji)
  }
}
