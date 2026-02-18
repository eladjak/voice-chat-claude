import { useState, useCallback, useMemo } from 'react'
import type { Message } from '../lib/api'
import { useVoiceChat } from '../hooks/useVoiceChat'
import { useContinuousVoiceChat } from '../hooks/useContinuousVoiceChat'
import { useChatHistory } from '../hooks/useChatHistory'
import { useSettings } from '../hooks/useSettings'
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts'
import { RecordButton } from './RecordButton'
import { ContinuousButton } from './ContinuousButton'
import { ConversationLog } from './ConversationLog'
import { ChatHistory } from './ChatHistory'
import { SettingsPanel } from './SettingsPanel'
import { Waveform } from './Waveform'

type Mode = 'push-to-talk' | 'continuous'

export function VoiceChat() {
  const [mode, setMode] = useState<Mode>('continuous')
  const [historyOpen, setHistoryOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [loadedMessages, setLoadedMessages] = useState<Message[] | undefined>(undefined)

  // Settings
  const settingsHook = useSettings()

  // Chat history persistence
  const chatHistory = useChatHistory()

  // Shared callback for when messages change (auto-save)
  const { saveMessages } = chatHistory
  const handleMessagesChange = useCallback(
    (messages: Message[]) => {
      saveMessages(messages)
    },
    [saveMessages]
  )

  // Memoize options to avoid re-creating on every render
  const voiceChatOptions = useMemo(() => ({
    initialMessages: loadedMessages,
    onMessagesChange: handleMessagesChange,
  }), [loadedMessages, handleMessagesChange])

  // Push-to-talk mode
  const pushToTalk = useVoiceChat(voiceChatOptions)

  // Continuous mode
  const continuous = useContinuousVoiceChat(voiceChatOptions)

  const isPushToTalk = mode === 'push-to-talk'
  const messages = isPushToTalk ? pushToTalk.messages : continuous.messages
  const error = isPushToTalk ? pushToTalk.error : continuous.error
  const currentTranscript = isPushToTalk ? pushToTalk.currentTranscript : continuous.currentTranscript
  const streamingResponse = isPushToTalk ? pushToTalk.streamingResponse : continuous.streamingResponse
  const clearMessages = isPushToTalk ? pushToTalk.clearMessages : continuous.clearMessages

  // Determine if waveform should be active
  const isProcessing = isPushToTalk
    ? pushToTalk.state === 'thinking' || pushToTalk.state === 'speaking'
    : continuous.state === 'thinking' || continuous.state === 'responding'

  const waveformColor = isPushToTalk
    ? (pushToTalk.state === 'speaking' ? '#22c55e' : '#8b5cf6')
    : (continuous.state === 'responding' ? '#22c55e' : '#8b5cf6')

  const handleModeChange = (newMode: Mode) => {
    // Stop current mode before switching
    if (mode === 'continuous' && continuous.isEnabled) {
      continuous.stopContinuousMode()
    }
    if (mode === 'push-to-talk' && pushToTalk.state === 'recording') {
      pushToTalk.handleCancel()
    }
    setMode(newMode)
  }

  const handleSelectConversation = useCallback(async (id: string) => {
    const msgs = await chatHistory.loadConversation(id)
    setLoadedMessages(msgs)
    setHistoryOpen(false)
  }, [chatHistory])

  const handleNewChat = useCallback(() => {
    chatHistory.startNewConversation()
    setLoadedMessages([])
    // Small delay to ensure state update, then reset to undefined so hooks see the change
    setTimeout(() => setLoadedMessages(undefined), 0)
    setHistoryOpen(false)
  }, [chatHistory])

  const handleClearMessages = useCallback(() => {
    clearMessages()
    chatHistory.startNewConversation()
    setLoadedMessages(undefined)
  }, [clearMessages, chatHistory])

  // Keyboard shortcuts: Space = push-to-talk, Escape = cancel/stop
  useKeyboardShortcuts({
    onSpaceDown: () => {
      if (isPushToTalk && pushToTalk.state === 'idle') {
        pushToTalk.handleStartRecording()
      }
    },
    onSpaceUp: () => {
      if (isPushToTalk && pushToTalk.state === 'recording') {
        pushToTalk.handleStopRecording()
      }
    },
    onEscape: () => {
      if (isPushToTalk) {
        pushToTalk.handleCancel()
      } else {
        if (continuous.isEnabled) {
          continuous.stopContinuousMode()
        }
      }
    },
  })

  return (
    <div className="min-h-dvh bg-gradient-to-b from-gray-50 to-gray-100 py-12 px-4" dir="rtl">
      {/* Chat History Sidebar (right) */}
      <ChatHistory
        conversations={chatHistory.conversations}
        activeConversationId={chatHistory.activeConversationId}
        isOpen={historyOpen}
        onToggle={() => setHistoryOpen(!historyOpen)}
        onSelect={handleSelectConversation}
        onDelete={chatHistory.removeConversation}
        onNewChat={handleNewChat}
      />

      {/* Settings Panel (left) */}
      <SettingsPanel
        isOpen={settingsOpen}
        onToggle={() => setSettingsOpen(!settingsOpen)}
        settings={settingsHook.settings}
        voices={settingsHook.voices}
        models={settingsHook.models}
        languages={settingsHook.languages}
        isLoading={settingsHook.isLoading}
        isSaving={settingsHook.isSaving}
        error={settingsHook.error}
        onSave={settingsHook.saveSettings}
      />

      <div className="max-w-2xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Voice Chat with Claude</h1>
          <p className="text-gray-600">
            {mode === 'continuous'
              ? 'Just speak - Claude is listening and will respond automatically'
              : 'Press the button and speak - Claude will listen and respond'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {isPushToTalk
              ? 'Space = push-to-talk | Escape = cancel'
              : 'Escape = stop conversation'}
          </p>
        </header>

        {/* Mode Toggle */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-lg bg-gray-200 p-1">
            <button
              onClick={() => handleModeChange('continuous')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'continuous'
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Continuous
            </button>
            <button
              onClick={() => handleModeChange('push-to-talk')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                mode === 'push-to-talk'
                  ? 'bg-white text-gray-900 shadow'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              Push to Talk
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center">
          {mode === 'continuous' ? (
            <ContinuousButton
              state={continuous.state}
              isLoading={continuous.isLoading}
              onStart={continuous.startContinuousMode}
              onStop={continuous.stopContinuousMode}
            />
          ) : (
            <RecordButton
              state={pushToTalk.state}
              onStart={pushToTalk.handleStartRecording}
              onStop={pushToTalk.handleStopRecording}
              onCancel={pushToTalk.handleCancel}
            />
          )}

          {/* Waveform animation during processing/speaking */}
          {isProcessing && (
            <div className="mt-4">
              <Waveform isActive={isProcessing} color={waveformColor} />
            </div>
          )}

          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 max-w-md text-center">
              <p>{error}</p>
            </div>
          )}

          <ConversationLog
            messages={messages}
            currentTranscript={currentTranscript}
            streamingResponse={streamingResponse}
            onClear={handleClearMessages}
          />
        </div>

        <footer className="mt-12 text-center text-sm text-gray-500">
          <p>
            Powered by{' '}
            <a href="https://anthropic.com" className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer">
              Claude
            </a>
            {' '}+{' '}
            <a href="https://openai.com/whisper" className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer">
              Whisper
            </a>
            {' '}+{' '}
            <a href="https://elevenlabs.io" className="text-blue-500 hover:underline" target="_blank" rel="noopener noreferrer">
              ElevenLabs
            </a>
          </p>
        </footer>
      </div>
    </div>
  )
}
