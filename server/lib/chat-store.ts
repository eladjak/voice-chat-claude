import { readFile, writeFile, mkdir, readdir, unlink } from 'node:fs/promises'
import { join } from 'node:path'
import { existsSync } from 'node:fs'

export interface StoredMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
}

export interface Conversation {
  id: string
  title: string
  messages: StoredMessage[]
  createdAt: string
  updatedAt: string
}

const DATA_DIR = join(process.cwd(), 'data', 'conversations')

async function ensureDataDir(): Promise<void> {
  if (!existsSync(DATA_DIR)) {
    await mkdir(DATA_DIR, { recursive: true })
  }
}

function conversationPath(id: string): string {
  return join(DATA_DIR, `${id}.json`)
}

function generateId(): string {
  return `conv_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function generateTitle(messages: StoredMessage[]): string {
  const firstUserMessage = messages.find((m) => m.role === 'user')
  if (!firstUserMessage) return 'שיחה חדשה'

  const text = firstUserMessage.content.trim()
  // Truncate to ~50 chars at word boundary
  if (text.length <= 50) return text
  const truncated = text.slice(0, 50)
  const lastSpace = truncated.lastIndexOf(' ')
  return (lastSpace > 20 ? truncated.slice(0, lastSpace) : truncated) + '...'
}

export async function createConversation(
  messages: StoredMessage[]
): Promise<Conversation> {
  await ensureDataDir()

  const now = new Date().toISOString()
  const conversation: Conversation = {
    id: generateId(),
    title: generateTitle(messages),
    messages,
    createdAt: now,
    updatedAt: now,
  }

  await writeFile(conversationPath(conversation.id), JSON.stringify(conversation, null, 2), 'utf-8')
  return conversation
}

export async function updateConversation(
  id: string,
  messages: StoredMessage[]
): Promise<Conversation | null> {
  await ensureDataDir()

  const existing = await getConversation(id)
  if (!existing) return null

  const updated: Conversation = {
    ...existing,
    messages,
    title: existing.messages.length === 0 ? generateTitle(messages) : existing.title,
    updatedAt: new Date().toISOString(),
  }

  await writeFile(conversationPath(id), JSON.stringify(updated, null, 2), 'utf-8')
  return updated
}

export async function getConversation(id: string): Promise<Conversation | null> {
  await ensureDataDir()

  const filePath = conversationPath(id)
  if (!existsSync(filePath)) return null

  try {
    const data = await readFile(filePath, 'utf-8')
    return JSON.parse(data) as Conversation
  } catch (err) {
    console.error(`Failed to read conversation ${id}:`, err)
    return null
  }
}

export async function listConversations(): Promise<Omit<Conversation, 'messages'>[]> {
  await ensureDataDir()

  const files = await readdir(DATA_DIR)
  const jsonFiles = files.filter((f) => f.endsWith('.json'))

  const conversations: Omit<Conversation, 'messages'>[] = []

  for (const file of jsonFiles) {
    try {
      const data = await readFile(join(DATA_DIR, file), 'utf-8')
      const conv = JSON.parse(data) as Conversation
      // Return without messages for the list (lighter payload)
      conversations.push({
        id: conv.id,
        title: conv.title,
        createdAt: conv.createdAt,
        updatedAt: conv.updatedAt,
      })
    } catch (err) {
      console.error(`Failed to read conversation file ${file}:`, err)
      // Skip corrupted files instead of crashing
    }
  }

  // Sort by updatedAt descending (most recent first)
  conversations.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())

  return conversations
}

export async function deleteConversation(id: string): Promise<boolean> {
  await ensureDataDir()

  const filePath = conversationPath(id)
  if (!existsSync(filePath)) return false

  await unlink(filePath)
  return true
}
