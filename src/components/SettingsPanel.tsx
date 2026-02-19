import { useState, useEffect } from 'react'
import type { AppSettings, VoiceOption, ModelOption, LanguageOption } from '../lib/types'
import { DEFAULT_VAD_SETTINGS, DEFAULT_WAKE_WORD_SETTINGS } from '../lib/types'

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
  const [showVAD, setShowVAD] = useState(false)
  const [showWakeWord, setShowWakeWord] = useState(false)
  const [newPhrase, setNewPhrase] = useState('')

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
    localSettings.language !== settings.language ||
    localSettings.vad.positiveSpeechThreshold !== (settings.vad?.positiveSpeechThreshold ?? DEFAULT_VAD_SETTINGS.positiveSpeechThreshold) ||
    localSettings.vad.negativeSpeechThreshold !== (settings.vad?.negativeSpeechThreshold ?? DEFAULT_VAD_SETTINGS.negativeSpeechThreshold) ||
    localSettings.vad.minSpeechMs !== (settings.vad?.minSpeechMs ?? DEFAULT_VAD_SETTINGS.minSpeechMs) ||
    localSettings.vad.redemptionMs !== (settings.vad?.redemptionMs ?? DEFAULT_VAD_SETTINGS.redemptionMs) ||
    localSettings.wakeWord.enabled !== (settings.wakeWord?.enabled ?? DEFAULT_WAKE_WORD_SETTINGS.enabled) ||
    JSON.stringify(localSettings.wakeWord.phrases) !== JSON.stringify(settings.wakeWord?.phrases ?? DEFAULT_WAKE_WORD_SETTINGS.phrases)

  const updateVAD = (key: keyof AppSettings['vad'], value: number) => {
    setLocalSettings({
      ...localSettings,
      vad: { ...localSettings.vad, [key]: value },
    })
  }

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
        role="dialog"
        aria-label="Settings"
        aria-hidden={!isOpen}
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

                {/* Wake Word Settings (collapsible) */}
                <div className="border border-gray-200 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setShowWakeWord(!showWakeWord)}
                    className="w-full flex items-center justify-between p-3 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
                  >
                    <span className="flex items-center gap-2">
                      Wake Word
                      {localSettings.wakeWord.enabled && (
                        <span className="inline-block w-2 h-2 bg-green-500 rounded-full" />
                      )}
                    </span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${showWakeWord ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showWakeWord && (
                    <div className="p-3 pt-0 space-y-3">
                      <p className="text-xs text-gray-400">
                        Say a wake phrase to start a conversation hands-free. Works in continuous mode.
                      </p>

                      {/* Enable toggle */}
                      <label htmlFor="wake-word-toggle" className="flex items-center justify-between cursor-pointer">
                        <span className="text-xs text-gray-600">Enable wake word</span>
                        <div className="relative">
                          <input
                            id="wake-word-toggle"
                            type="checkbox"
                            className="sr-only peer"
                            checked={localSettings.wakeWord.enabled}
                            onChange={(e) =>
                              setLocalSettings({
                                ...localSettings,
                                wakeWord: { ...localSettings.wakeWord, enabled: e.target.checked },
                              })
                            }
                          />
                          <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:bg-blue-500 transition-colors" />
                          <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform peer-checked:translate-x-4" />
                        </div>
                      </label>

                      {/* Phrases list */}
                      <div>
                        <span className="text-xs text-gray-600 block mb-1">Wake phrases:</span>
                        <div className="space-y-1">
                          {localSettings.wakeWord.phrases.map((phrase, i) => (
                            <div key={i} className="flex items-center gap-1 text-xs">
                              <span className="flex-1 px-2 py-1 bg-gray-50 rounded border border-gray-100 text-gray-700" dir="auto">
                                {phrase}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = localSettings.wakeWord.phrases.filter((_, idx) => idx !== i)
                                  setLocalSettings({
                                    ...localSettings,
                                    wakeWord: { ...localSettings.wakeWord, phrases: updated },
                                  })
                                }}
                                className="p-1 text-gray-400 hover:text-red-500"
                                aria-label={`Remove phrase "${phrase}"`}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ))}
                        </div>

                        {/* Add new phrase */}
                        <div className="flex items-center gap-1 mt-2">
                          <input
                            type="text"
                            value={newPhrase}
                            onChange={(e) => setNewPhrase(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' && newPhrase.trim()) {
                                setLocalSettings({
                                  ...localSettings,
                                  wakeWord: {
                                    ...localSettings.wakeWord,
                                    phrases: [...localSettings.wakeWord.phrases, newPhrase.trim()],
                                  },
                                })
                                setNewPhrase('')
                              }
                            }}
                            placeholder="Add phrase..."
                            className="flex-1 px-2 py-1 text-xs border border-gray-200 rounded focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
                            dir="auto"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (newPhrase.trim()) {
                                setLocalSettings({
                                  ...localSettings,
                                  wakeWord: {
                                    ...localSettings.wakeWord,
                                    phrases: [...localSettings.wakeWord.phrases, newPhrase.trim()],
                                  },
                                })
                                setNewPhrase('')
                              }
                            }}
                            className="px-2 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600"
                          >
                            Add
                          </button>
                        </div>
                      </div>

                      {/* Reset to defaults */}
                      <button
                        type="button"
                        onClick={() => setLocalSettings({ ...localSettings, wakeWord: { ...DEFAULT_WAKE_WORD_SETTINGS } })}
                        className="text-xs text-blue-500 hover:text-blue-700 underline"
                      >
                        Reset to defaults
                      </button>
                    </div>
                  )}
                </div>

                {/* VAD Settings (collapsible) */}
                <div className="border border-gray-200 rounded-lg">
                  <button
                    type="button"
                    onClick={() => setShowVAD(!showVAD)}
                    className="w-full flex items-center justify-between p-3 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
                  >
                    <span>Voice Detection (VAD)</span>
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className={`h-4 w-4 text-gray-400 transition-transform duration-200 ${showVAD ? 'rotate-180' : ''}`}
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showVAD && (
                    <div className="p-3 pt-0 space-y-4">
                      <p className="text-xs text-gray-400">
                        Adjust these to reduce false positives or improve detection sensitivity.
                      </p>

                      {/* Positive Speech Threshold */}
                      <div>
                        <label htmlFor="vad-positive" className="flex items-center justify-between text-xs text-gray-600 mb-1">
                          <span>Speech detection sensitivity</span>
                          <span className="font-mono">{localSettings.vad.positiveSpeechThreshold.toFixed(2)}</span>
                        </label>
                        <input
                          id="vad-positive"
                          type="range"
                          min="0.5"
                          max="0.99"
                          step="0.01"
                          value={localSettings.vad.positiveSpeechThreshold}
                          onChange={(e) => updateVAD('positiveSpeechThreshold', parseFloat(e.target.value))}
                          className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                        <div className="flex justify-between text-[10px] text-gray-400">
                          <span>Sensitive</span>
                          <span>Strict</span>
                        </div>
                      </div>

                      {/* Negative Speech Threshold */}
                      <div>
                        <label htmlFor="vad-negative" className="flex items-center justify-between text-xs text-gray-600 mb-1">
                          <span>End-of-speech sensitivity</span>
                          <span className="font-mono">{localSettings.vad.negativeSpeechThreshold.toFixed(2)}</span>
                        </label>
                        <input
                          id="vad-negative"
                          type="range"
                          min="0.1"
                          max="0.7"
                          step="0.01"
                          value={localSettings.vad.negativeSpeechThreshold}
                          onChange={(e) => updateVAD('negativeSpeechThreshold', parseFloat(e.target.value))}
                          className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                        <div className="flex justify-between text-[10px] text-gray-400">
                          <span>Quick cutoff</span>
                          <span>Lenient</span>
                        </div>
                      </div>

                      {/* Min Speech Duration */}
                      <div>
                        <label htmlFor="vad-min-speech" className="flex items-center justify-between text-xs text-gray-600 mb-1">
                          <span>Min speech duration</span>
                          <span className="font-mono">{localSettings.vad.minSpeechMs}ms</span>
                        </label>
                        <input
                          id="vad-min-speech"
                          type="range"
                          min="50"
                          max="500"
                          step="10"
                          value={localSettings.vad.minSpeechMs}
                          onChange={(e) => updateVAD('minSpeechMs', parseInt(e.target.value))}
                          className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                        <div className="flex justify-between text-[10px] text-gray-400">
                          <span>50ms</span>
                          <span>500ms</span>
                        </div>
                      </div>

                      {/* Redemption Period */}
                      <div>
                        <label htmlFor="vad-redemption" className="flex items-center justify-between text-xs text-gray-600 mb-1">
                          <span>Silence tolerance (pause length)</span>
                          <span className="font-mono">{localSettings.vad.redemptionMs}ms</span>
                        </label>
                        <input
                          id="vad-redemption"
                          type="range"
                          min="100"
                          max="1000"
                          step="50"
                          value={localSettings.vad.redemptionMs}
                          onChange={(e) => updateVAD('redemptionMs', parseInt(e.target.value))}
                          className="w-full h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                        <div className="flex justify-between text-[10px] text-gray-400">
                          <span>100ms</span>
                          <span>1000ms</span>
                        </div>
                      </div>

                      {/* Reset to defaults */}
                      <button
                        type="button"
                        onClick={() => setLocalSettings({ ...localSettings, vad: { ...DEFAULT_VAD_SETTINGS } })}
                        className="text-xs text-blue-500 hover:text-blue-700 underline"
                      >
                        Reset to defaults
                      </button>
                    </div>
                  )}
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
