import { useState, useEffect, useCallback } from 'react'
import type { AppSettings, VoiceOption } from '../lib/types'
import { DEFAULT_SETTINGS, DEFAULT_VAD_SETTINGS, DEFAULT_WAKE_WORD_SETTINGS, AVAILABLE_MODELS, AVAILABLE_LANGUAGES } from '../lib/types'
import { fetchSettings, updateSettings, fetchVoices } from '../lib/settings-api'

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS)
  const [voices, setVoices] = useState<VoiceOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Load settings and voices on mount
  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      setError(null)

      try {
        const [loadedSettings, loadedVoices] = await Promise.all([
          fetchSettings().catch(() => DEFAULT_SETTINGS),
          fetchVoices().catch(() => []),
        ])
        // Ensure nested settings have defaults for backward compatibility
        const settingsWithDefaults: AppSettings = {
          ...loadedSettings,
          vad: { ...DEFAULT_VAD_SETTINGS, ...(loadedSettings.vad || {}) },
          wakeWord: { ...DEFAULT_WAKE_WORD_SETTINGS, ...(loadedSettings.wakeWord || {}) },
        }
        setSettings(settingsWithDefaults)
        setVoices(loadedVoices)
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load settings'
        setError(message)
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [])

  const saveSettings = useCallback(async (updates: Partial<AppSettings>) => {
    setIsSaving(true)
    setError(null)

    try {
      const updated = await updateSettings(updates)
      setSettings(updated)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save settings'
      setError(message)
      throw err
    } finally {
      setIsSaving(false)
    }
  }, [])

  const refreshVoices = useCallback(async () => {
    try {
      const loadedVoices = await fetchVoices()
      setVoices(loadedVoices)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to refresh voices'
      setError(message)
    }
  }, [])

  return {
    settings,
    voices,
    models: AVAILABLE_MODELS,
    languages: AVAILABLE_LANGUAGES,
    isLoading,
    isSaving,
    error,
    saveSettings,
    refreshVoices,
  }
}
