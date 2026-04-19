import { useState, useEffect, useCallback, useRef } from 'react'

type AppState = 'idle' | 'recording' | 'transcribing' | 'processing' | 'speaking'
type View = 'main' | 'settings'

interface Settings {
  hotkey: string
  language: string
  voiceId: string
  whisperModel: string
  openaiKey: string
  elevenLabsKey: string
  anthropicKey: string
  picovoiceKey: string
  wakeWordEnabled: boolean
}

const VOICES = [
  { id: 'nova', name: 'Nova - נשי, חם ואנושי (מומלץ לעברית)', recommended: true },
  { id: 'shimmer', name: 'Shimmer - נשי, ברור וידידותי' },
  { id: 'alloy', name: 'Alloy - ניטרלי, מאוזן' },
  { id: 'echo', name: 'Echo - גברי, חם' },
  { id: 'fable', name: 'Fable - גברי, בריטי' },
  { id: 'onyx', name: 'Onyx - גברי, עמוק' },
  { id: 'coral', name: 'Coral - נשי, אקספרסיבי' },
  { id: 'sage', name: 'Sage - נשי, רגוע' },
]

export default function App() {
  const [state, setState] = useState<AppState>('idle')
  const [view, setView] = useState<View>('main')
  const [transcript, setTranscript] = useState('')
  const [response, setResponse] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [settings, setSettings] = useState<Settings | null>(null)

  const mediaRecorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const silenceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)

  // Load settings on mount
  useEffect(() => {
    window.electronAPI.getSettings().then(setSettings)
  }, [])

  // Listen for events from main process
  useEffect(() => {
    const unsubStart = window.electronAPI.onStartRecording(() => {
      startRecording()
    })

    const unsubStop = window.electronAPI.onStopRecording(() => {
      stopRecording()
    })

    const unsubSettings = window.electronAPI.onShowSettings(() => {
      setView('settings')
    })

    const unsubChunk = window.electronAPI.onClaudeResponseChunk((chunk) => {
      setResponse((prev) => prev + chunk)
    })

    return () => {
      unsubStart()
      unsubStop()
      unsubSettings()
      unsubChunk()
    }
  }, [])

  const startRecording = useCallback(async () => {
    try {
      setError(null)
      setTranscript('')
      setResponse('')

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, sampleRate: 16000 },
      })
      streamRef.current = stream

      // Setup VAD (Voice Activity Detection)
      const audioContext = new AudioContext()
      audioContextRef.current = audioContext
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 512
      analyser.smoothingTimeConstant = 0.5
      source.connect(analyser)
      analyserRef.current = analyser

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm'

      const mediaRecorder = new MediaRecorder(stream, { mimeType })
      mediaRecorderRef.current = mediaRecorder
      chunksRef.current = []

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
        }
      }

      mediaRecorder.start()
      setState('recording')

      // Start silence detection
      let speechDetected = false
      let consecutiveSilentFrames = 0
      const SILENCE_THRESHOLD = 15 // Adjust sensitivity
      const SILENCE_FRAMES_TO_STOP = 25 // ~1.5 seconds of silence after speech
      const dataArray = new Uint8Array(analyser.frequencyBinCount)

      const checkSilence = () => {
        if (mediaRecorderRef.current?.state !== 'recording') return

        analyser.getByteFrequencyData(dataArray)
        const average = dataArray.reduce((a, b) => a + b, 0) / dataArray.length

        if (average > SILENCE_THRESHOLD) {
          speechDetected = true
          consecutiveSilentFrames = 0
        } else if (speechDetected) {
          consecutiveSilentFrames++
          if (consecutiveSilentFrames >= SILENCE_FRAMES_TO_STOP) {
            // Auto-stop after silence detected
            console.log('Silence detected, auto-stopping...')
            stopRecording()
            return
          }
        }

        silenceTimerRef.current = setTimeout(checkSilence, 60)
      }

      // Start checking after a short delay (let user start speaking)
      setTimeout(checkSilence, 500)
    } catch (err) {
      setError('לא ניתן לגשת למיקרופון')
      console.error(err)
    }
  }, [])

  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
      return
    }

    // Clear silence detection timer
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current)
      silenceTimerRef.current = null
    }

    // Close audio context
    if (audioContextRef.current) {
      audioContextRef.current.close()
      audioContextRef.current = null
    }

    return new Promise<void>((resolve) => {
      mediaRecorderRef.current!.onstop = async () => {
        // Stop stream tracks
        streamRef.current?.getTracks().forEach((track) => track.stop())

        const blob = new Blob(chunksRef.current, { type: 'audio/webm' })
        window.electronAPI.recordingStopped()

        try {
          // Transcribe
          setState('transcribing')
          const arrayBuffer = await blob.arrayBuffer()
          const text = await window.electronAPI.transcribeAudio(arrayBuffer)
          setTranscript(text)

          if (!text.trim()) {
            setError('לא זוהה דיבור')
            setState('idle')
            return
          }

          // Send to Claude Code
          setState('processing')
          console.log('Sending to Claude Code:', text)
          const claudeResponse = await window.electronAPI.sendToClaudeCode(text)
          console.log('Claude response:', claudeResponse)
          setResponse(claudeResponse)

          // Speak response
          setState('speaking')
          const audioBuffer = await window.electronAPI.textToSpeech(claudeResponse)
          await playAudio(audioBuffer)

          setState('idle')
        } catch (err) {
          setError(err instanceof Error ? err.message : 'שגיאה')
          setState('idle')
        }

        resolve()
      }

      mediaRecorderRef.current!.stop()
    })
  }, [])

  const playAudio = useCallback((buffer: unknown) => {
    return new Promise<void>((resolve) => {
      // Handle different buffer types from IPC serialization
      let data: BlobPart
      if (buffer && typeof buffer === 'object' && 'data' in buffer && Array.isArray((buffer as { data: number[] }).data)) {
        // Node.js Buffer serialized through IPC becomes { type: 'Buffer', data: [...] }
        data = new Uint8Array((buffer as { data: number[] }).data)
      } else {
        data = buffer as BlobPart
      }
      const blob = new Blob([data], { type: 'audio/mpeg' })
      const url = URL.createObjectURL(blob)

      if (!audioRef.current) {
        audioRef.current = new Audio()
      }

      audioRef.current.src = url
      audioRef.current.onended = () => {
        URL.revokeObjectURL(url)
        resolve()
      }
      audioRef.current.onerror = () => {
        URL.revokeObjectURL(url)
        resolve()
      }
      audioRef.current.play()
    })
  }, [])

  const cancelOperation = useCallback(() => {
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop()
    }
    streamRef.current?.getTracks().forEach((track) => track.stop())
    audioRef.current?.pause()
    window.electronAPI.recordingStopped()
    setState('idle')
  }, [])

  const saveSettings = useCallback(async (newSettings: Settings) => {
    const saved = await window.electronAPI.saveSettings(newSettings)
    setSettings(saved)
    setView('main')
  }, [])

  if (view === 'settings' && settings) {
    return <SettingsView settings={settings} onSave={saveSettings} onBack={() => setView('main')} />
  }

  return (
    <div className="h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-3xl shadow-2xl">
      {/* Recording indicator - now clickable */}
      <div className="relative mb-8">
        {state === 'recording' && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="w-32 h-32 rounded-full bg-red-500/30 animate-pulse-ring" />
          </div>
        )}
        <button
          onClick={() => {
            if (state === 'idle') {
              startRecording()
            } else if (state === 'recording') {
              stopRecording()
            }
          }}
          disabled={state !== 'idle' && state !== 'recording'}
          className={`
            w-24 h-24 rounded-full flex items-center justify-center transition-all duration-300
            cursor-pointer hover:scale-105 focus:outline-none focus:ring-4 focus:ring-purple-400
            disabled:cursor-not-allowed disabled:hover:scale-100
            ${state === 'recording' ? 'bg-red-500 scale-110 hover:bg-red-600' : ''}
            ${state === 'transcribing' ? 'bg-yellow-500' : ''}
            ${state === 'processing' ? 'bg-blue-500' : ''}
            ${state === 'speaking' ? 'bg-green-500' : ''}
            ${state === 'idle' ? 'bg-slate-700 hover:bg-slate-600' : ''}
          `}
        >
          {state === 'recording' ? (
            <Waveform />
          ) : state === 'idle' ? (
            <MicIcon />
          ) : (
            <Spinner />
          )}
        </button>
      </div>

      {/* Status text */}
      <div className="text-center mb-6">
        <p className="text-white/90 text-lg font-medium">
          {state === 'idle' && `הקש ${settings?.hotkey || 'Ctrl+Shift+V'} לדיבור`}
          {state === 'recording' && 'מקליט... הקש שוב לסיום'}
          {state === 'transcribing' && 'מתמלל...'}
          {state === 'processing' && 'חושב...'}
          {state === 'speaking' && 'מדבר...'}
        </p>
      </div>

      {/* Transcript */}
      {transcript && (
        <div className="w-full max-w-md mb-4">
          <div className="bg-white/10 backdrop-blur rounded-xl p-4">
            <p className="text-white/60 text-xs mb-1">אתה:</p>
            <p className="text-white text-sm">{transcript}</p>
          </div>
        </div>
      )}

      {/* Response */}
      {response && (
        <div className="w-full max-w-md mb-4 max-h-48 overflow-y-auto">
          <div className="bg-purple-500/20 backdrop-blur rounded-xl p-4">
            <p className="text-white/60 text-xs mb-1">Claude:</p>
            <p className="text-white text-sm whitespace-pre-wrap">{response}</p>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="w-full max-w-md mb-4">
          <div className="bg-red-500/20 backdrop-blur rounded-xl p-4">
            <p className="text-red-300 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {state !== 'idle' && (
          <button
            onClick={cancelOperation}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors"
          >
            ביטול
          </button>
        )}
        <button
          onClick={() => setView('settings')}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors"
        >
          הגדרות
        </button>
        <button
          onClick={() => window.electronAPI.hideWindow()}
          className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors"
        >
          הסתר
        </button>
      </div>
    </div>
  )
}

function SettingsView({
  settings,
  onSave,
  onBack,
}: {
  settings: Settings
  onSave: (s: Settings) => void
  onBack: () => void
}) {
  const [form, setForm] = useState(settings)

  return (
    <div className="h-screen flex flex-col p-6 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 rounded-3xl shadow-2xl">
      {/* Fixed header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-white">הגדרות</h1>
        <button
          onClick={onBack}
          className="px-3 py-1 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Scrollable content */}
      <div className="space-y-4 flex-1 overflow-y-auto pr-2">
        <div>
          <label className="block text-white/70 text-sm mb-1">קיצור מקלדת</label>
          <input
            type="text"
            value={form.hotkey}
            onChange={(e) => setForm({ ...form, hotkey: e.target.value })}
            className="w-full bg-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <p className="text-white/40 text-xs mt-1">לדוגמה: CommandOrControl+Shift+V</p>
        </div>

        <div>
          <label className="block text-white/70 text-sm mb-1">שפת דיבור</label>
          <select
            value={form.language}
            onChange={(e) => setForm({ ...form, language: e.target.value })}
            className="w-full bg-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="he">עברית</option>
            <option value="en">English</option>
            <option value="auto">זיהוי אוטומטי</option>
          </select>
        </div>

        <div>
          <label className="block text-white/70 text-sm mb-1">קול</label>
          <select
            value={form.voiceId}
            onChange={(e) => setForm({ ...form, voiceId: e.target.value })}
            className="w-full bg-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            {VOICES.map((voice) => (
              <option key={voice.id} value={voice.id}>
                {voice.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-white/70 text-sm mb-1">OpenAI API Key</label>
          <input
            type="password"
            value={form.openaiKey}
            onChange={(e) => setForm({ ...form, openaiKey: e.target.value })}
            className="w-full bg-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="sk-..."
          />
        </div>

        <div>
          <label className="block text-white/70 text-sm mb-1">ElevenLabs API Key</label>
          <input
            type="password"
            value={form.elevenLabsKey}
            onChange={(e) => setForm({ ...form, elevenLabsKey: e.target.value })}
            className="w-full bg-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div>
          <label className="block text-white/70 text-sm mb-1">Anthropic API Key</label>
          <input
            type="password"
            value={form.anthropicKey}
            onChange={(e) => setForm({ ...form, anthropicKey: e.target.value })}
            className="w-full bg-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            placeholder="sk-ant-..."
          />
        </div>

        {/* Wake Word Section */}
        <div className="pt-4 border-t border-white/10">
          <h2 className="text-white font-medium mb-3">זיהוי קולי ("היי קלוד")</h2>

          <div className="flex items-center justify-between mb-3">
            <label className="text-white/70 text-sm">הפעל זיהוי קולי</label>
            <button
              onClick={() => setForm({ ...form, wakeWordEnabled: !form.wakeWordEnabled })}
              className={`
                w-12 h-6 rounded-full transition-colors relative
                ${form.wakeWordEnabled ? 'bg-purple-500' : 'bg-white/20'}
              `}
            >
              <div
                className={`
                  w-5 h-5 bg-white rounded-full absolute top-0.5 transition-all
                  ${form.wakeWordEnabled ? 'right-0.5' : 'left-0.5'}
                `}
              />
            </button>
          </div>

          <div>
            <label className="block text-white/70 text-sm mb-1">Picovoice Access Key</label>
            <input
              type="password"
              value={form.picovoiceKey}
              onChange={(e) => setForm({ ...form, picovoiceKey: e.target.value })}
              className="w-full bg-white/10 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              placeholder="קבל מפתח חינם מ-picovoice.ai"
            />
            <p className="text-white/40 text-xs mt-1">
              <a
                href="https://console.picovoice.ai/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-400 hover:text-purple-300"
              >
                הירשם ב-Picovoice Console (חינם)
              </a>
              {' '}וקבל Access Key
            </p>
            <p className="text-white/40 text-xs mt-1">
              אמור "היי קלוד" להפעלה
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-3 mt-6">
        <button
          onClick={onBack}
          className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm transition-colors"
        >
          חזרה
        </button>
        <button
          onClick={() => onSave(form)}
          className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm transition-colors"
        >
          שמור
        </button>
      </div>
    </div>
  )
}

function MicIcon() {
  return (
    <svg className="w-10 h-10 text-white" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
      <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
    </svg>
  )
}

function Waveform() {
  return (
    <div className="flex items-center gap-1 h-8">
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="w-1 bg-white rounded-full animate-wave"
          style={{ animationDelay: `${i * 0.1}s`, height: '100%' }}
        />
      ))}
    </div>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin w-8 h-8 text-white" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}

// Type declarations for the Electron API
declare global {
  interface Window {
    electronAPI: {
      getSettings: () => Promise<Settings>
      saveSettings: (settings: Settings) => Promise<Settings>
      transcribeAudio: (audioBuffer: ArrayBuffer) => Promise<string>
      sendToClaudeCode: (text: string) => Promise<string>
      textToSpeech: (text: string) => Promise<unknown>
      hideWindow: () => void
      showNotification: (title: string, body: string) => Promise<void>
      onStartRecording: (callback: () => void) => () => void
      onStopRecording: (callback: () => void) => () => void
      onShowSettings: (callback: () => void) => () => void
      onClaudeResponseChunk: (callback: (chunk: string) => void) => () => void
      recordingStopped: () => void
    }
  }
}
