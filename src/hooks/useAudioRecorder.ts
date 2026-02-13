import { useState, useRef, useCallback } from 'react'

export function useAudioRecorder() {
  const [isRecording, setIsRecording] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const mediaRecorder = useRef<MediaRecorder | null>(null)
  const chunks = useRef<Blob[]>([])
  const stream = useRef<MediaStream | null>(null)

  const startRecording = useCallback(async () => {
    try {
      setError(null)
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
        },
      })
      stream.current = mediaStream

      // Try to use webm with opus, fall back to default
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'

      mediaRecorder.current = new MediaRecorder(mediaStream, { mimeType })
      chunks.current = []

      mediaRecorder.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.current.push(e.data)
        }
      }

      mediaRecorder.current.start()
      setIsRecording(true)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to access microphone'
      setError(message)
      console.error('Recording error:', err)
    }
  }, [])

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorder.current || mediaRecorder.current.state === 'inactive') {
        resolve(null)
        return
      }

      mediaRecorder.current.onstop = () => {
        const blob = new Blob(chunks.current, {
          type: mediaRecorder.current?.mimeType || 'audio/webm',
        })

        // Stop all tracks to release the microphone
        if (stream.current) {
          stream.current.getTracks().forEach((track) => track.stop())
          stream.current = null
        }

        resolve(blob)
      }

      mediaRecorder.current.stop()
      setIsRecording(false)
    })
  }, [])

  const cancelRecording = useCallback(() => {
    if (mediaRecorder.current && mediaRecorder.current.state !== 'inactive') {
      mediaRecorder.current.stop()
    }
    if (stream.current) {
      stream.current.getTracks().forEach((track) => track.stop())
      stream.current = null
    }
    chunks.current = []
    setIsRecording(false)
  }, [])

  return {
    isRecording,
    error,
    startRecording,
    stopRecording,
    cancelRecording,
  }
}
