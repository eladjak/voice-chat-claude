import { useState, useCallback, useRef, useEffect } from 'react'
import { transcribeAudio, streamMessage, type Message, type StreamController } from '../lib/api'
import { useVAD, float32ToWavBlob } from './useVAD'
import { useStreamingTTS } from './useStreamingTTS'

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
  const [streamingResponse, setStreamingResponse] = useState<string>('')
  const [isEnabled, setIsEnabled] = useState(false)

  const messagesRef = useRef<Message[]>([])
  const processingRef = useRef(false)
  const streamControllerRef = useRef<StreamController | null>(null)

  const tts = useStreamingTTS({
    onPlaybackStart: () => setState('responding'),
    onPlaybackEnd: () => {
      setState('listening')
      processingRef.current = false
    },
    onError: (err) => {
      setError(err.message)
      setState('listening')
      processingRef.current = false
    },
  })

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

  const interruptResponse = useCallback(() => {
    // Abort any ongoing stream
    if (streamControllerRef.current) {
      streamControllerRef.current.abort()
      streamControllerRef.current = null
    }

    // Abort streaming TTS (cancels fetches + stops audio)
    tts.abort()

    setStreamingResponse('')
    processingRef.current = false
  }, [tts])

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

      // Get Claude's response via streaming
      setState('thinking')
      setStreamingResponse('')

      const controller = streamMessage(
        newMessages,
        (chunk) => {
          setStreamingResponse((prev) => prev + chunk)
          tts.pushChunk(chunk)
        },
        (fullText) => {
          streamControllerRef.current = null
          setStreamingResponse('')

          // Add assistant message
          const assistantMessage: Message = { role: 'assistant', content: fullText }
          updateMessages([...newMessages, assistantMessage])

          // Flush remaining text to TTS
          tts.done()
        },
        (err) => {
          streamControllerRef.current = null
          setStreamingResponse('')
          tts.abort()
          setError(err.message)
          setState('listening')
          processingRef.current = false
        },
      )

      streamControllerRef.current = controller
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      setState('listening')
      processingRef.current = false
    }
  }, [updateMessages, tts])

  const handleSpeechStart = useCallback(() => {
    // Interrupt any ongoing response when user starts speaking
    interruptResponse()
    setState('speaking')
    setCurrentTranscript('')
  }, [interruptResponse])

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
    interruptResponse()
    setState('idle')
  }, [interruptResponse])

  const clearMessages = useCallback(() => {
    updateMessages([])
    setCurrentTranscript('')
    setStreamingResponse('')
    setError(null)
  }, [updateMessages])

  // Combine errors
  const combinedError = error || vadError

  return {
    state,
    messages,
    error: combinedError,
    currentTranscript,
    streamingResponse,
    isEnabled,
    isLoading,
    isListening,
    isSpeaking,
    startContinuousMode,
    stopContinuousMode,
    interruptResponse,
    clearMessages,
  }
}
