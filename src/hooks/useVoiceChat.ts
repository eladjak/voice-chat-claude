import { useState, useCallback, useRef } from 'react'
import { transcribeAudio, sendMessage, textToSpeech, type Message } from '../lib/api'
import { useAudioRecorder } from './useAudioRecorder'

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
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioUrlRef = useRef<string | null>(null)

  const { startRecording, stopRecording, cancelRecording } = useAudioRecorder()

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

  const playAudio = useCallback(async (audioBlob: Blob) => {
    cleanupAudio()

    const url = URL.createObjectURL(audioBlob)
    audioUrlRef.current = url

    if (!audioRef.current) {
      audioRef.current = new Audio()
    }

    audioRef.current.src = url
    audioRef.current.onended = () => {
      setState('idle')
      cleanupAudio()
    }
    audioRef.current.onerror = () => {
      setState('idle')
      cleanupAudio()
      setError('Failed to play audio')
    }

    await audioRef.current.play()
  }, [cleanupAudio])

  const handleStartRecording = useCallback(async () => {
    setError(null)
    setCurrentTranscript('')
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

      // Get Claude's response
      setState('thinking')
      const response = await sendMessage(newMessages)

      // Add assistant message
      const assistantMessage: Message = { role: 'assistant', content: response }
      updateMessages([...newMessages, assistantMessage])

      // Convert to speech
      setState('speaking')
      const speechBlob = await textToSpeech(response)
      await playAudio(speechBlob)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'An error occurred'
      setError(message)
      setState('idle')
      console.error('Voice chat error:', err)
    }
  }, [stopRecording, messages, playAudio, updateMessages])

  const handleCancel = useCallback(() => {
    cancelRecording()
    if (audioRef.current) {
      audioRef.current.pause()
      audioRef.current.currentTime = 0
    }
    cleanupAudio()
    setState('idle')
    setCurrentTranscript('')
  }, [cancelRecording, cleanupAudio])

  const clearMessages = useCallback(() => {
    updateMessages([])
    setCurrentTranscript('')
    setError(null)
  }, [updateMessages])

  return {
    state,
    messages,
    error,
    currentTranscript,
    handleStartRecording,
    handleStopRecording,
    handleCancel,
    clearMessages,
  }
}
