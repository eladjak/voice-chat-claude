import { useState, useCallback, useRef } from 'react'
import { transcribeAudio, streamMessage, type Message, type StreamController } from '../lib/api'
import { useAudioRecorder } from './useAudioRecorder'
import { useStreamingTTS } from './useStreamingTTS'

export type ChatState = 'idle' | 'recording' | 'transcribing' | 'thinking' | 'speaking'

export interface UseVoiceChatOptions {
  initialMessages?: Message[]
  onMessagesChange?: (messages: Message[]) => void
}

export function useVoiceChat(options: UseVoiceChatOptions = {}) {
  const { initialMessages, onMessagesChange } = options
  const [state, setState] = useState<ChatState>('idle')
  const [messages, setMessages] = useState<Message[]>(initialMessages ?? [])
  const [error, setError] = useState<string | null>(null)
  const [currentTranscript, setCurrentTranscript] = useState<string>('')
  const [streamingResponse, setStreamingResponse] = useState<string>('')
  const streamControllerRef = useRef<StreamController | null>(null)

  const { startRecording, stopRecording, cancelRecording } = useAudioRecorder()

  const tts = useStreamingTTS({
    onPlaybackStart: () => setState('speaking'),
    onPlaybackEnd: () => setState('idle'),
    onError: (err) => {
      setError(err.message)
      setState('idle')
    },
  })

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

  const handleStartRecording = useCallback(async () => {
    setError(null)
    setCurrentTranscript('')
    setStreamingResponse('')
    await startRecording()
    setState('recording')
  }, [startRecording])

  const handleStopRecording = useCallback(async () => {
    try {
      const audioBlob = await stopRecording()
      if (!audioBlob) {
        setState('idle')
        return
      }

      // Transcribe
      setState('transcribing')
      const transcript = await transcribeAudio(audioBlob)
      setCurrentTranscript(transcript)

      if (!transcript.trim()) {
        setError('No speech detected')
        setState('idle')
        return
      }

      // Add user message
      const userMessage: Message = { role: 'user', content: transcript }
      const newMessages = [...messages, userMessage]
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
          setState('idle')
        },
      )

      streamControllerRef.current = controller
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      setState('idle')
    }
  }, [stopRecording, messages, updateMessages, tts])

  const handleCancel = useCallback(() => {
    cancelRecording()

    // Abort any ongoing stream
    if (streamControllerRef.current) {
      streamControllerRef.current.abort()
      streamControllerRef.current = null
    }

    // Abort streaming TTS
    tts.abort()

    setState('idle')
    setCurrentTranscript('')
    setStreamingResponse('')
  }, [cancelRecording, tts])

  const clearMessages = useCallback(() => {
    updateMessages([])
    setCurrentTranscript('')
    setStreamingResponse('')
    setError(null)
  }, [updateMessages])

  return {
    state,
    messages,
    error,
    currentTranscript,
    streamingResponse,
    handleStartRecording,
    handleStopRecording,
    handleCancel,
    clearMessages,
  }
}
