import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { join, dirname } from 'node:path'
import { existsSync } from 'node:fs'

export interface VADSettings {
  positiveSpeechThreshold: number
  negativeSpeechThreshold: number
  minSpeechMs: number
  redemptionMs: number
}

export interface WakeWordSettings {
  enabled: boolean
  phrases: string[]
}

export interface AppSettings {
  voiceId: string
  modelId: string
  systemPrompt: string
  language: string
  vad: VADSettings
  wakeWord: WakeWordSettings
}

const DEFAULT_VAD_SETTINGS: VADSettings = {
  positiveSpeechThreshold: 0.8,
  negativeSpeechThreshold: 0.3,
  minSpeechMs: 150,
  redemptionMs: 300,
}

const DEFAULT_WAKE_WORD_SETTINGS: WakeWordSettings = {
  enabled: false,
  phrases: [
    'hey claude',
    'hi claude',
    'ok claude',
    'okay claude',
    'היי קלוד',
    'הי קלוד',
    'שמע קלוד',
    'קלוד',
  ],
}

const DEFAULT_SETTINGS: AppSettings = {
  voiceId: process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL',
  modelId: 'claude-sonnet-4-20250514',
  systemPrompt:
    'You are a helpful voice assistant. Keep responses concise and conversational since they will be spoken aloud. Respond in the same language the user speaks.',
  language: 'he',
  vad: DEFAULT_VAD_SETTINGS,
  wakeWord: DEFAULT_WAKE_WORD_SETTINGS,
}

const SETTINGS_PATH = join(process.cwd(), 'data', 'settings.json')

async function ensureDir(): Promise<void> {
  const dir = dirname(SETTINGS_PATH)
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true })
  }
}

export async function getSettings(): Promise<AppSettings> {
  await ensureDir()

  if (!existsSync(SETTINGS_PATH)) {
    return { ...DEFAULT_SETTINGS }
  }

  try {
    const data = await readFile(SETTINGS_PATH, 'utf-8')
    const parsed = JSON.parse(data) as Partial<AppSettings>
    // Merge with defaults to ensure all fields exist, including nested objects
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      vad: { ...DEFAULT_VAD_SETTINGS, ...(parsed.vad || {}) },
      wakeWord: { ...DEFAULT_WAKE_WORD_SETTINGS, ...(parsed.wakeWord || {}) },
    }
  } catch {
    return { ...DEFAULT_SETTINGS }
  }
}

export async function saveSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  await ensureDir()

  const current = await getSettings()
  const updated: AppSettings = {
    ...current,
    ...settings,
    vad: { ...current.vad, ...(settings.vad || {}) },
    wakeWord: { ...current.wakeWord, ...(settings.wakeWord || {}) },
  }

  await writeFile(SETTINGS_PATH, JSON.stringify(updated, null, 2), 'utf-8')
  return updated
}
