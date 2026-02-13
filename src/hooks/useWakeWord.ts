import { useState, useCallback, useRef, useEffect } from 'react'
import { transcribeAudio } from '../lib/api'
import { useVAD, float32ToWavBlob } from './useVAD'

/**
 * Wake word detection using VAD + Whisper.
 *
 * Flow:
 * 1. VAD listens for speech
 * 2. When speech is detected, it's transcribed via Whisper
 * 3. If the transcription contains the wake phrase, the callback fires
 * 4. The wake phrase is stripped from the text and passed to the callback
 *
 * This avoids requiring Picovoice/Porcupine (which need API keys and native libs).
 * The tradeoff is slightly higher latency (requires a Whisper call per utterance).
 */

export interface UseWakeWordOptions {
  /** Whether wake word detection is enabled */
  enabled?: boolean
  /** The wake phrases to listen for (case-insensitive, partial match) */
  wakePhrases?: string[]
  /** Called when wake word is detected, with the remaining text after the wake phrase */
  onWakeWord: (remainingText: string) => void
  /** Called when speech is detected but no wake word found */
  onSpeechWithoutWakeWord?: (text: string) => void
}

const DEFAULT_WAKE_PHRASES = [
  'hey claude',
  'hi claude',
  'ok claude',
  'okay claude',
  // Hebrew variants
  'היי קלוד',
  'הי קלוד',
  'שמע קלוד',
  'קלוד',
]

export function useWakeWord(options: UseWakeWordOptions) {
  const {
    enabled = false,
    wakePhrases = DEFAULT_WAKE_PHRASES,
    onWakeWord,
    onSpeechWithoutWakeWord,
  } = options

  const [isListening, setIsListening] = useState(false)
  const [lastDetection, setLastDetection] = useState<string | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)

  const callbacksRef = useRef({ onWakeWord, onSpeechWithoutWakeWord })
  useEffect(() => {
    callbacksRef.current = { onWakeWord, onSpeechWithoutWakeWord }
  }, [onWakeWord, onSpeechWithoutWakeWord])

  const wakePhrasesRef = useRef(wakePhrases)
  useEffect(() => {
    wakePhrasesRef.current = wakePhrases
  }, [wakePhrases])

  const handleSpeechEnd = useCallback(async (audio: Float32Array) => {
    setIsProcessing(true)
    try {
      const wavBlob = float32ToWavBlob(audio)
      const transcript = await transcribeAudio(wavBlob)
      const text = transcript.trim().toLowerCase()

      if (!text) {
        setIsProcessing(false)
        return
      }

      // Check if any wake phrase is present
      for (const phrase of wakePhrasesRef.current) {
        const phraseNormalized = phrase.toLowerCase()
        const idx = text.indexOf(phraseNormalized)

        if (idx !== -1) {
          // Extract text after the wake phrase
          const remaining = text.slice(idx + phraseNormalized.length).trim()
          setLastDetection(phrase)
          callbacksRef.current.onWakeWord(remaining)
          setIsProcessing(false)
          return
        }
      }

      // No wake word found
      callbacksRef.current.onSpeechWithoutWakeWord?.(transcript)
    } catch (err) {
      console.error('Wake word detection error:', err)
    } finally {
      setIsProcessing(false)
    }
  }, [])

  const { isLoading, error } = useVAD({
    enabled,
    onSpeechEnd: handleSpeechEnd,
    onSpeechStart: () => {
      setIsListening(true)
    },
    onVADMisfire: () => {
      setIsListening(false)
    },
  })

  const clearLastDetection = useCallback(() => {
    setLastDetection(null)
  }, [])

  return {
    isListening,
    isLoading,
    isProcessing,
    error,
    lastDetection,
    clearLastDetection,
  }
}
