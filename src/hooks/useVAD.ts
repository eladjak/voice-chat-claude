import { useEffect, useRef, useCallback, useState } from 'react'
import { MicVAD, type RealTimeVADOptions } from '@ricky0123/vad-web'

export interface UseVADOptions {
  onSpeechStart?: () => void
  onSpeechEnd?: (audio: Float32Array) => void
  onVADMisfire?: () => void
  enabled?: boolean
}

export function useVAD(options: UseVADOptions = {}) {
  const { onSpeechStart, onSpeechEnd, onVADMisfire, enabled = true } = options

  const [isListening, setIsListening] = useState(false)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const vadRef = useRef<MicVAD | null>(null)
  const callbacksRef = useRef({ onSpeechStart, onSpeechEnd, onVADMisfire })

  // Keep callbacks ref updated
  useEffect(() => {
    callbacksRef.current = { onSpeechStart, onSpeechEnd, onVADMisfire }
  }, [onSpeechStart, onSpeechEnd, onVADMisfire])

  const startListening = useCallback(async () => {
    if (vadRef.current) return

    setIsLoading(true)
    setError(null)

    try {
      const vadOptions: Partial<RealTimeVADOptions> = {
        onSpeechStart: () => {
          setIsSpeaking(true)
          callbacksRef.current.onSpeechStart?.()
        },
        onSpeechEnd: (audio: Float32Array) => {
          setIsSpeaking(false)
          callbacksRef.current.onSpeechEnd?.(audio)
        },
        onVADMisfire: () => {
          setIsSpeaking(false)
          callbacksRef.current.onVADMisfire?.()
        },
        positiveSpeechThreshold: 0.8,
        negativeSpeechThreshold: 0.3,
        minSpeechMs: 150,
        redemptionMs: 300,
        preSpeechPadMs: 90,
      }

      vadRef.current = await MicVAD.new(vadOptions)
      vadRef.current.start()
      setIsListening(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start VAD'
      setError(message)
      console.error('VAD error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const stopListening = useCallback(() => {
    if (vadRef.current) {
      vadRef.current.pause()
      vadRef.current.destroy()
      vadRef.current = null
    }
    setIsListening(false)
    setIsSpeaking(false)
  }, [])

  const pause = useCallback(() => {
    vadRef.current?.pause()
    setIsListening(false)
  }, [])

  const resume = useCallback(() => {
    vadRef.current?.start()
    setIsListening(true)
  }, [])

  // Auto start/stop based on enabled prop
  useEffect(() => {
    if (enabled && !vadRef.current) {
      startListening()
    } else if (!enabled && vadRef.current) {
      stopListening()
    }

    return () => {
      stopListening()
    }
  }, [enabled, startListening, stopListening])

  return {
    isListening,
    isSpeaking,
    isLoading,
    error,
    startListening,
    stopListening,
    pause,
    resume,
  }
}

// Convert Float32Array (PCM) to WAV Blob for API upload
export function float32ToWavBlob(float32Array: Float32Array, sampleRate = 16000): Blob {
  const buffer = new ArrayBuffer(44 + float32Array.length * 2)
  const view = new DataView(buffer)

  // WAV header
  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i))
    }
  }

  writeString(0, 'RIFF')
  view.setUint32(4, 36 + float32Array.length * 2, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true) // Subchunk1Size
  view.setUint16(20, 1, true) // AudioFormat (PCM)
  view.setUint16(22, 1, true) // NumChannels
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true) // ByteRate
  view.setUint16(32, 2, true) // BlockAlign
  view.setUint16(34, 16, true) // BitsPerSample
  writeString(36, 'data')
  view.setUint32(40, float32Array.length * 2, true)

  // Convert float32 to int16
  const offset = 44
  for (let i = 0; i < float32Array.length; i++) {
    const sample = Math.max(-1, Math.min(1, float32Array[i]))
    view.setInt16(offset + i * 2, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
  }

  return new Blob([buffer], { type: 'audio/wav' })
}
