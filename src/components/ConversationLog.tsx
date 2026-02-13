import type { Message } from '../lib/api'

interface ConversationLogProps {
  messages: Message[]
  currentTranscript: string
  onClear: () => void
}

export function ConversationLog({ messages, currentTranscript, onClear }: ConversationLogProps) {
  if (messages.length === 0 && !currentTranscript) {
    return null
  }

  return (
    <div className="w-full max-w-2xl mx-auto mt-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-700">היסטוריית שיחה</h2>
        {messages.length > 0 && (
          <button
            onClick={onClear}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            נקה שיחה
          </button>
        )}
      </div>
      <div className="space-y-4 max-h-96 overflow-y-auto p-4 bg-gray-50 rounded-lg">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`
                max-w-[80%] rounded-2xl px-4 py-3
                ${message.role === 'user'
                  ? 'bg-blue-500 text-white rounded-br-md'
                  : 'bg-white text-gray-800 border border-gray-200 rounded-bl-md shadow-sm'
                }
              `}
            >
              <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            </div>
          </div>
        ))}
        {currentTranscript && (
          <div className="flex justify-end">
            <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-blue-300 text-white rounded-br-md opacity-70">
              <p className="text-sm whitespace-pre-wrap">{currentTranscript}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
