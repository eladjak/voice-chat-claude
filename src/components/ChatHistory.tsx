import type { ConversationSummary } from '../lib/conversations'

interface ChatHistoryProps {
  conversations: ConversationSummary[]
  activeConversationId: string | null
  isOpen: boolean
  onToggle: () => void
  onSelect: (id: string) => void
  onDelete: (id: string) => void
  onNewChat: () => void
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  const diffHours = Math.floor(diffMs / 3600000)
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffMins < 1) return 'עכשיו'
  if (diffMins < 60) return `לפני ${diffMins} דקות`
  if (diffHours < 24) return `לפני ${diffHours} שעות`
  if (diffDays < 7) return `לפני ${diffDays} ימים`

  return date.toLocaleDateString('he-IL', {
    day: 'numeric',
    month: 'short',
  })
}

export function ChatHistory({
  conversations,
  activeConversationId,
  isOpen,
  onToggle,
  onSelect,
  onDelete,
  onNewChat,
}: ChatHistoryProps) {
  return (
    <>
      {/* Toggle button (always visible) */}
      <button
        onClick={onToggle}
        className="fixed top-4 right-4 z-50 p-2 bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200"
        aria-label={isOpen ? 'סגור היסטוריה' : 'פתח היסטוריה'}
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6 text-gray-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          {isOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          )}
        </svg>
      </button>

      {/* Sidebar panel */}
      <div
        role="dialog"
        aria-label="Chat history"
        aria-hidden={!isOpen}
        className={`
          fixed top-0 right-0 h-full w-80 bg-white shadow-2xl z-40
          transition-transform duration-200 ease-in-out
          ${isOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
        dir="rtl"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-lg font-bold text-gray-800">היסטוריית שיחות</h2>
            <button
              onClick={onNewChat}
              className="mt-2 w-full px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm font-medium"
            >
              + שיחה חדשה
            </button>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">
                אין שיחות שמורות עדיין
              </div>
            ) : (
              <ul className="divide-y divide-gray-100">
                {conversations.map((conv) => (
                  <li
                    key={conv.id}
                    className={`
                      group flex items-start gap-2 p-3 cursor-pointer
                      hover:bg-gray-50 transition-colors
                      ${activeConversationId === conv.id ? 'bg-blue-50 border-r-2 border-blue-500' : ''}
                    `}
                  >
                    <button
                      onClick={() => onSelect(conv.id)}
                      className="flex-1 text-right min-w-0"
                    >
                      <p className="text-sm font-medium text-gray-800 truncate">
                        {conv.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        {formatDate(conv.updatedAt)}
                      </p>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onDelete(conv.id)
                      }}
                      className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 transition-all shrink-0"
                      aria-label="מחק שיחה"
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-4 w-4"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>

      {/* Backdrop overlay when sidebar is open */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30"
          onClick={onToggle}
        />
      )}
    </>
  )
}
