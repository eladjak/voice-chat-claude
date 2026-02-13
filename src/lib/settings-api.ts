import type { AppSettings, VoiceOption } from './types'

export async function fetchSettings(): Promise<AppSettings> {
  const response = await fetch('/api/settings')

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch settings')
  }

  const data = await response.json()
  return data.settings
}

export async function updateSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  const response = await fetch('/api/settings', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update settings')
  }

  const data = await response.json()
  return data.settings
}

export async function fetchVoices(): Promise<VoiceOption[]> {
  const response = await fetch('/api/settings/voices')

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to fetch voices')
  }

  const data = await response.json()
  return data.voices
}
