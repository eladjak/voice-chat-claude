import { useState, useCallback, useRef, useEffect } from 'react'
import { transcribeAudio, sendMessage, textToSpeech, type Message } from '../lib/api'
import { useVAD, float32ToWavBlob } from './useVAD'

export type ContinuousChatState =
  | 'idle'           // Not listening
  | 'listening'      // VAD is active, waiting for speech
  | 'speaking'       // User is speaking
  | 'transcribing'   // Processing speech to text
  | 'thinking'       // Claude is generating response
  | 'responding'     // Playing Claude's audio response

export interface UseContinuousVoiceChatOptions {
  initialMessages?: Message[]
  onMessagesChange?: (messages: Message[]) => void
}

export function useContinuousVoiceChat(options: UseContinuousVoiceChatOptions = {}) {
  const { initialMessages, onMessagesChange } = options
  const [state, setState] = useState<ContinuousChatState>('idle')
  const [messages, setMessages] = useState<Message[]>(initialMessages ?? [])
  const [error, setError] = useState<string | null>(null)
  const [currentTranscript, setCurrentTranscript] = useState<string>('')
  const [isEnabled, setIsEnabled] = useState(false)

  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioUrlRef = useRef<string | null>(null)
  const messagesRef = useRef<Message[]>([])
  const processingRef = useRef(false)

  // Keep messages ref in sync for use in async callbacks
  useEffect(() => {
    messagesRef.current = messages
  }, [messages])

  // Sync messages from external source (e.g., loading a saved conversation)
  // setState during render is the React-recommended pattern for derived state
  const [prevInitialMessages, setPrevInitialMessages] = useState(initialMessages)
  if (initialMessages !== prevInitialMessages) {
    setPrevInitialMessages(initialMessages)
    if (initialMessages) {
      setMessages(initialMessages)
    }
  }

  // Notify parent when messages change
  const updateMessages = useCallback(
    (newMessages: Message[]) => {
      setMessages(newMessages)
      onMessagesChange?.(newMessages)
    },
    [onMessagesChange]
  )

  const cleanupAudio = useCallback(() => {
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current)
      audioUrlRef.current = null
    }
  }, [])

  const handleSpeechEnd = useCallback(async (audio: Float32Array) => {
    // Prevent overlapping processing
    if (processingRef.current) return
    processingRef.current = true

    try {
      setError(null)
      setState('transcribing')

      // Convert to WAV blob for Whisper
      const wavBlob = float32ToWavBlob(audio)

      // Transcribe
      const transcript = await transcribeAudio(wavBlob)
      setCurrentTranscript(transcript)

      if (!transcript.trim()) {
        setState('listening')
        processingRef.current = false
        return
      }

      // Add user message
      const userMessage: Message = { role: 'user', content: transcript }
      const newMessages = [...messagesRef.current, userMessage]
      updateMessages(newMessages)

      // Get Claude's response
      setState('thinking')
      const response = await sendMessage(newMessages)

      // Add assistant message
      const assistantMessage: Message = { role: 'assistant', content: response }
      updateMessages([...newMessages, assistantMessage])

      // Convert to speech and play
      setState('responding')
      const speechBlob = await textToSpeech(response)

      cleanupAudio()
      const url = URL.createObjectURL(speechBlob)
      audioUrlRef.current = url

      if (!audioRef.current) {
        audioRef.current = new Audio()
      }

      audioRef.current.src = url
      audioRef.current.onended = () => {
        cleanupAudio()
        setState('listening')
        processingRef.current = false
      }
      audioRef.current.onerror = () => {
        cleanupAudio()
        setError('Failed to play audio')
        setState('listening')
        processingRef.current = false
      }

      await audioRef.current.play()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      setState('listening')
      processingRef.current = false
      console.error('Continuous voice chat error:', err)
    }
  }, [cleanupAudio, updateMessages])

  const handleSpeechStart = useCallback(() => {
    // Stop any playing audio when user starts speaking
    if (audioRef.current && !audioRef.current.paused) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
      cleanupAudio()
      processingRef.current = false
    }
    setState('speaking')
    setCurrentTranscript('')
  }, [cleanupAudio])

  const { isListening, isSpeaking, isLoading, error: vadError } = useVAD({
    enabled: isEnabled,
    onSpeechStart: handleSpeechStart,
    onSpeechEnd: handleSpeechEnd,
    onVADMisfire: () => {
      // Brief speech that wasn't enough - just go back to listening
      if (state === 'speaking') {
        setState('listening')
      }
    },
  })

  const startContinuousMode = useCallback(() => {
    setIsEnabled(true)
    setState('listening')
    setError(null)
  }, [])

  const stopContinuousMode = useCallback(() => {
    setIsEnabled(false)
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    cleanupAudio()
    processingRef.current = false
    setState('idle')
  }, [cleanupAudio])

  const clearMessages = useCallback(() => {
    updateMessages([])
    setCurrentTranscript('')
    setError(null)
  }, [updateMessages])

  // Combine errors
  const combinedError = error || vadError

  return {
    state,
    messages,
    error: combinedError,
    currentTranscript,
    isEnabled,
    isLoading,
    isListening,
    isSpeaking,
    startContinuousMode,
    stopContinuousMode,
    clearMessages,
  }
}
