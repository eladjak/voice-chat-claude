import { useRef, useState, useCallback } from 'react'
import { SentenceSplitter } from '../lib/sentenceSplitter'
import { AudioQueue } from '../lib/audioQueue'
import { streamingTextToSpeech } from '../lib/api'

export interface UseStreamingTTSOptions {
  onPlaybackStart?: () => void
  onPlaybackEnd?: () => void
  onError?: (error: Error) => void
}

export function useStreamingTTS(options: UseStreamingTTSOptions = {}) {
  const [isPlaying, setIsPlaying] = useState(false)
  const abortControllerRef = useRef<AbortController | null>(null)
  const splitterRef = useRef<SentenceSplitter | null>(null)
  const queueRef = useRef<AudioQueue | null>(null)

  const getQueue = useCallback(() => {
    if (!queueRef.current) {
      queueRef.current = new AudioQueue({
        onStateChange: (state) => {
          const playing = state === 'playing'
          setIsPlaying(playing)
          if (playing) options.onPlaybackStart?.()
        },
        onError: (err) => options.onError?.(err),
        onPlaybackEnd: () => options.onPlaybackEnd?.(),
      })
    }
    return queueRef.current
  }, [options.onPlaybackStart, options.onPlaybackEnd, options.onError])

  const getSplitter = useCallback(() => {
    if (!splitterRef.current) {
      const ac = new AbortController()
      abortControllerRef.current = ac
      const queue = getQueue()

      splitterRef.current = new SentenceSplitter({
        onSentence: (sentence) => {
          const blobPromise = streamingTextToSpeech(sentence, ac.signal)
          queue.enqueue(blobPromise)
        },
      })
    }
    return splitterRef.current
  }, [getQueue])

  const pushChunk = useCallback((chunk: string) => {
    getSplitter().push(chunk)
  }, [getSplitter])

  const done = useCallback(() => {
    if (splitterRef.current) {
      splitterRef.current.done()
      splitterRef.current = null
    }
  }, [])

  const abort = useCallback(() => {
    // Abort in-flight TTS fetches
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }

    // Stop audio queue
    if (queueRef.current) {
      queueRef.current.reset()
      queueRef.current = null
    }

    // Reset splitter
    if (splitterRef.current) {
      splitterRef.current.reset()
      splitterRef.current = null
    }

    setIsPlaying(false)
  }, [])

  return { pushChunk, done, abort, isPlaying }
}
