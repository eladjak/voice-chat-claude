import { useCallback } from 'react'
import type { Message } from '../lib/api'

/** Map Whisper language names to short display codes */
const LANGUAGE_LABELS: Record<string, string> = {
  hebrew: 'HE',
  english: 'EN',
  arabic: 'AR',
  russian: 'RU',
  french: 'FR',
  spanish: 'ES',
  german: 'DE',
  italian: 'IT',
  portuguese: 'PT',
  japanese: 'JA',
  chinese: 'ZH',
  korean: 'KO',
  // ISO codes (when language is set explicitly in settings)
  he: 'HE',
  en: 'EN',
  ar: 'AR',
  ru: 'RU',
  fr: 'FR',
  es: 'ES',
  de: 'DE',
}

function getLanguageLabel(lang: string): string {
  return LANGUAGE_LABELS[lang.toLowerCase()] ?? lang.slice(0, 2).toUpperCase()
}

interface ConversationLogProps {
  messages: Message[]
  currentTranscript: string
  streamingResponse: string
  onClear: () => void
}

function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export function ConversationLog({ messages, currentTranscript, streamingResponse, onClear }: ConversationLogProps) {
  const handleExportText = useCallback(() => {
    const lines = messages.map((m) => {
      const speaker = m.role === 'user' ? 'You' : 'Claude'
      return `${speaker}: ${m.content}`
    })
    const text = lines.join('\n\n')
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')
    downloadFile(text, `conversation-${timestamp}.txt`, 'text/plain')
  }, [messages])

  const handleExportJSON = useCallback(() => {
    const data = {
      exportedAt: new Date().toISOString(),
      messageCount: messages.length,
      messages: messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    }
    const json = JSON.stringify(data, null, 2)
    const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-')
    downloadFile(json, `conversation-${timestamp}.json`, 'application/json')
  }, [messages])

  if (messages.length === 0 && !currentTranscript && !streamingResponse) {
    return null
  }

  return (
    <div className="w-full max-w-2xl mx-auto mt-8">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-700">היסטוריית שיחה</h2>
        <div className="flex items-center gap-3">
          {messages.length > 0 && (
            <>
              {/* Export dropdown */}
              <div className="relative group">
                <button
                  className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                  aria-label="Export conversation"
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  <span>ייצוא</span>
                </button>
                <div className="absolute left-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-150 z-10 min-w-[120px]">
                  <button
                    onClick={handleExportText}
                    className="w-full text-right px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-t-lg"
                  >
                    Text (.txt)
                  </button>
                  <button
                    onClick={handleExportJSON}
                    className="w-full text-right px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded-b-lg"
                  >
                    JSON (.json)
                  </button>
                </div>
              </div>
              <button
                onClick={onClear}
                className="text-sm text-gray-500 hover:text-gray-700 underline"
              >
                נקה שיחה
              </button>
            </>
          )}
        </div>
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
              {message.language && (
                <span
                  className={`inline-block mt-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${
                    message.role === 'user'
                      ? 'bg-blue-400/50 text-blue-100'
                      : 'bg-gray-100 text-gray-500'
                  }`}
                >
                  {getLanguageLabel(message.language)}
                </span>
              )}
            </div>
          </div>
        ))}
        {/* Streaming response from Claude */}
        {streamingResponse && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-2xl px-4 py-3 bg-white text-gray-800 border border-purple-200 rounded-bl-md shadow-sm">
              <p className="text-sm whitespace-pre-wrap">{streamingResponse}</p>
              <span className="inline-block w-1.5 h-4 bg-purple-400 animate-pulse ml-0.5 align-text-bottom" />
            </div>
          </div>
        )}
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
