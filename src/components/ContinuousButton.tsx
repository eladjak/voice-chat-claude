import { type ContinuousChatState } from '../hooks/useContinuousVoiceChat'

interface ContinuousButtonProps {
  state: ContinuousChatState
  isLoading: boolean
  onStart: () => void
  onStop: () => void
}

const stateLabels: Record<ContinuousChatState, string> = {
  idle: 'התחל שיחה',
  listening: 'מקשיב...',
  speaking: 'מדבר...',
  transcribing: 'מתמלל...',
  thinking: 'חושב...',
  responding: 'עונה...',
}

const stateColors: Record<ContinuousChatState, string> = {
  idle: 'bg-blue-500 hover:bg-blue-600',
  listening: 'bg-green-500 animate-pulse',
  speaking: 'bg-red-500 animate-pulse',
  transcribing: 'bg-yellow-500',
  thinking: 'bg-purple-500 animate-pulse',
  responding: 'bg-indigo-500 animate-pulse',
}

export function ContinuousButton({ state, isLoading, onStart, onStop }: ContinuousButtonProps) {
  const isActive = state !== 'idle'
  const label = isLoading ? 'טוען...' : stateLabels[state]
  const colorClass = isLoading ? 'bg-gray-400' : stateColors[state]

  const handleClick = () => {
    if (isLoading) return
    if (isActive) {
      onStop()
    } else {
      onStart()
    }
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        onClick={handleClick}
        disabled={isLoading}
        className={`
          relative w-32 h-32 rounded-full
          ${colorClass}
          text-white font-medium
          transition-all duration-200
          focus:outline-none focus:ring-4 focus:ring-blue-300
          disabled:opacity-50 disabled:cursor-not-allowed
          shadow-lg
        `}
      >
        {/* Pulsing ring for active states */}
        {isActive && !isLoading && (
          <span className="absolute inset-0 rounded-full border-4 border-white/30 animate-ping" />
        )}

        {/* Icon */}
        <span className="relative z-10 text-4xl">
          {state === 'idle' && '🎤'}
          {state === 'listening' && '👂'}
          {state === 'speaking' && '🗣️'}
          {state === 'transcribing' && '📝'}
          {state === 'thinking' && '🤔'}
          {state === 'responding' && '🔊'}
          {isLoading && '⏳'}
        </span>
      </button>

      <span className="text-lg font-medium text-gray-700">{label}</span>

      {isActive && (
        <button
          onClick={onStop}
          className="px-4 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
        >
          עצור שיחה
        </button>
      )}

      <p className="text-sm text-gray-500 text-center max-w-xs">
        {state === 'idle' && 'לחץ להתחיל שיחה רציפה - פשוט דבר וClaude יענה'}
        {state === 'listening' && 'מחכה שתדבר...'}
        {state === 'speaking' && 'ממשיך להקליט...'}
        {state === 'transcribing' && 'ממיר דיבור לטקסט...'}
        {state === 'thinking' && 'Claude מכין תשובה...'}
        {state === 'responding' && 'משמיע תשובה...'}
      </p>
    </div>
  )
}
