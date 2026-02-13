import { useState, useEffect } from 'react'
import type { AppSettings, VoiceOption, ModelOption, LanguageOption } from '../lib/types'

interface SettingsPanelProps {
  isOpen: boolean
  onToggle: () => void
  settings: AppSettings
  voices: VoiceOption[]
  models: ModelOption[]
  languages: LanguageOption[]
  isLoading: boolean
  isSaving: boolean
  error: string | null
  onSave: (updates: Partial<AppSettings>) => Promise<void>
}

export function SettingsPanel({
  isOpen,
  onToggle,
  settings,
  voices,
  models,
  languages,
  isLoading,
  isSaving,
  error,
  onSave,
}: SettingsPanelProps) {
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings)
  const [saveSuccess, setSaveSuccess] = useState(false)

  // Sync local state when settings load/change externally
  useEffect(() => {
    setLocalSettings(settings)
  }, [settings])

  const handleSave = async () => {
    setSaveSuccess(false)
    try {
      await onSave(localSettings)
      setSaveSuccess(true)
      setTimeout(() => setSaveSuccess(false), 2000)
    } catch {
      // Error is handled by parent hook
    }
  }

  const hasChanges =
    localSettings.voiceId !== settings.voiceId ||
    localSettings.modelId !== settings.modelId ||
    localSettings.systemPrompt !== settings.systemPrompt ||
    localSettings.language !== settings.language

  return (
    <>
      {/* Toggle button */}
      <button
        onClick={onToggle}
        className="fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200"
        aria-label={isOpen ? 'Close settings' : 'Open settings'}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 text-gray-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          {isOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
          )}
          {!isOpen && (
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          )}
        </svg>
      </button>

      {/* Settings panel */}
      <div
        className={`
          fixed top-0 left-0 h-full w-96 bg-white shadow-2xl z-40
          transition-transform duration-200 ease-in-out
          ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
        dir="rtl"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-800">Settings</h2>
            <p className="text-sm text-gray-500 mt-1">Voice, model, and language preferences</p>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-6">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-8 h-8 border-4 border-gray-200 border-t-blue-500 rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {/* Voice Selection */}
                <div>
                  <label htmlFor="voice-select" className="block text-sm font-medium text-gray-700 mb-2">
                    Voice (ElevenLabs)
                  </label>
                  {voices.length > 0 ? (
                    <select
                      id="voice-select"
                      value={localSettings.voiceId}
                      onChange={(e) =>
                        setLocalSettings({ ...localSettings, voiceId: e.target.value })
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {voices.map((voice) => (
                        <option key={voice.voice_id} value={voice.voice_id}>
                          {voice.name} ({voice.category})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-sm text-gray-400">
                      Unable to load voices. Check your ElevenLabs API key.
                    </p>
                  )}
                </div>

                {/* Model Selection */}
                <div>
                  <label htmlFor="model-select" className="block text-sm font-medium text-gray-700 mb-2">
                    AI Model (Claude)
                  </label>
                  <select
                    id="model-select"
                    value={localSettings.modelId}
                    onChange={(e) =>
                      setLocalSettings({ ...localSettings, modelId: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {models.map((model) => (
                      <option key={model.id} value={model.id}>
                        {model.name}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-400 mt-1">
                    {models.find((m) => m.id === localSettings.modelId)?.description}
                  </p>
                </div>

                {/* Language Selection */}
                <div>
                  <label htmlFor="language-select" className="block text-sm font-medium text-gray-700 mb-2">
                    Transcription Language (Whisper)
                  </label>
                  <select
                    id="language-select"
                    value={localSettings.language}
                    onChange={(e) =>
                      setLocalSettings({ ...localSettings, language: e.target.value })
                    }
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {languages.map((lang) => (
                      <option key={lang.code} value={lang.code}>
                        {lang.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* System Prompt */}
                <div>
                  <label htmlFor="system-prompt" className="block text-sm font-medium text-gray-700 mb-2">
                    System Prompt
                  </label>
                  <textarea
                    id="system-prompt"
                    value={localSettings.systemPrompt}
                    onChange={(e) =>
                      setLocalSettings({ ...localSettings, systemPrompt: e.target.value })
                    }
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
                    dir="ltr"
                    placeholder="Instructions for Claude..."
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    This defines Claude's behavior and personality during voice conversations.
                  </p>
                </div>
              </>
            )}

            {/* Error display */}
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}
          </div>

          {/* Footer with save button */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleSave}
              disabled={!hasChanges || isSaving}
              className={`
                w-full px-4 py-2 rounded-lg text-sm font-medium transition-colors
                ${
                  saveSuccess
                    ? 'bg-green-500 text-white'
                    : hasChanges
                      ? 'bg-blue-500 text-white hover:bg-blue-600'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }
                disabled:opacity-50
              `}
            >
              {isSaving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Settings'}
            </button>
          </div>
        </div>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30"
          onClick={onToggle}
        />
      )}
    </>
  )
}
