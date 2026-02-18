/** Voice option from ElevenLabs */
export interface VoiceOption {
  voice_id: string
  name: string
  category: string
  description: string | null
}

/** Available Claude model options */
export interface ModelOption {
  id: string
  name: string
  description: string
}

/** VAD threshold settings */
export interface VADSettings {
  positiveSpeechThreshold: number
  negativeSpeechThreshold: number
  minSpeechMs: number
  redemptionMs: number
}

/** Application settings persisted to server */
export interface AppSettings {
  voiceId: string
  modelId: string
  systemPrompt: string
  language: string
  vad: VADSettings
}

/** Available configuration options from server */
export interface AvailableOptions {
  voices: VoiceOption[]
  models: ModelOption[]
  languages: LanguageOption[]
  currentSettings: AppSettings
}

export interface LanguageOption {
  code: string
  name: string
}

/** Default VAD settings */
export const DEFAULT_VAD_SETTINGS: VADSettings = {
  positiveSpeechThreshold: 0.8,
  negativeSpeechThreshold: 0.3,
  minSpeechMs: 150,
  redemptionMs: 300,
}

/** Default settings */
export const DEFAULT_SETTINGS: AppSettings = {
  voiceId: 'EXAVITQu4vr4xnSDxMaL', // Sarah
  modelId: 'claude-sonnet-4-20250514',
  systemPrompt:
    'You are a helpful voice assistant. Keep responses concise and conversational since they will be spoken aloud. Respond in the same language the user speaks.',
  language: 'he',
  vad: DEFAULT_VAD_SETTINGS,
}

/** Available models for selection */
export const AVAILABLE_MODELS: ModelOption[] = [
  {
    id: 'claude-sonnet-4-20250514',
    name: 'Claude Sonnet 4',
    description: 'Fast and capable - best for voice chat',
  },
  {
    id: 'claude-haiku-35-20250620',
    name: 'Claude Haiku 3.5',
    description: 'Fastest responses, lower cost',
  },
  {
    id: 'claude-opus-4-20250514',
    name: 'Claude Opus 4',
    description: 'Most capable - slower but thorough',
  },
  {
    id: 'claude-opus-4-6-20250616',
    name: 'Claude Opus 4.6',
    description: 'Latest flagship - deepest reasoning',
  },
]

/** Supported languages for Whisper transcription */
export const AVAILABLE_LANGUAGES: LanguageOption[] = [
  { code: 'he', name: 'Hebrew' },
  { code: 'en', name: 'English' },
  { code: 'ar', name: 'Arabic' },
  { code: 'ru', name: 'Russian' },
  { code: 'fr', name: 'French' },
  { code: 'es', name: 'Spanish' },
  { code: 'de', name: 'German' },
  { code: 'auto', name: 'Auto-detect' },
]
