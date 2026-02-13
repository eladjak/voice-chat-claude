import type { ChatState } from '../hooks/useVoiceChat'

interface RecordButtonProps {
  state: ChatState
  onStart: () => void
  onStop: () => void
  onCancel: () => void
}

export function RecordButton({ state, onStart, onStop, onCancel }: RecordButtonProps) {
  const isRecording = state === 'recording'
  const isProcessing = state === 'transcribing' || state === 'thinking'
  const isSpeaking = state === 'speaking'
  const isIdle = state === 'idle'

  const handleClick = () => {
    if (isRecording) {
      onStop()
    } else if (isIdle) {
      onStart()
    }
  }

  const getButtonStyle = () => {
    if (isRecording) {
      return 'bg-red-500 hover:bg-red-600 scale-110 animate-pulse'
    }
    if (isProcessing) {
      return 'bg-yellow-500 cursor-not-allowed'
    }
    if (isSpeaking) {
      return 'bg-green-500 cursor-not-allowed'
    }
    return 'bg-blue-500 hover:bg-blue-600'
  }

  const getIcon = () => {
    if (isRecording) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      )
    }
    if (isProcessing) {
      return (
        <svg className="animate-spin h-12 w-12" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      )
    }
    if (isSpeaking) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M11.5 3.75a1.5 1.5 0 00-2.41-1.19l-5.4 4.03H1.5A1.5 1.5 0 000 8.09v7.82a1.5 1.5 0 001.5 1.5h2.19l5.4 4.03a1.5 1.5 0 002.41-1.19V3.75z" />
          <path d="M16.38 7.57a.75.75 0 00-1.08 1.04 6 6 0 010 6.78.75.75 0 001.08 1.04 7.5 7.5 0 000-8.86z" />
          <path d="M19.09 4.72a.75.75 0 00-1.06 1.06 9.5 9.5 0 010 12.44.75.75 0 001.06 1.06 11 11 0 000-14.56z" />
        </svg>
      )
    }
    // Microphone icon
    return (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z" />
        <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z" />
      </svg>
    )
  }

  const getLabel = () => {
    switch (state) {
      case 'recording':
        return 'לחץ לסיום'
      case 'transcribing':
        return 'מתמלל...'
      case 'thinking':
        return 'חושב...'
      case 'speaking':
        return 'מדבר...'
      default:
        return 'לחץ לדיבור'
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onClick={handleClick}
        disabled={isProcessing || isSpeaking}
        className={`
          rounded-full p-8 text-white transition-all duration-200
          focus:outline-none focus:ring-4 focus:ring-blue-300
          ${getButtonStyle()}
        `}
        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
      >
        {getIcon()}
      </button>
      <span className="text-lg font-medium text-gray-700">{getLabel()}</span>
      {(isProcessing || isSpeaking) && (
        <button
          onClick={onCancel}
          className="text-sm text-gray-500 hover:text-gray-700 underline"
        >
          ביטול
        </button>
      )}
    </div>
  )
}
