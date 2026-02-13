import { Hono } from 'hono'
import {
  createConversation,
  updateConversation,
  getConversation,
  listConversations,
  deleteConversation,
  type StoredMessage,
} from '../lib/chat-store'

export const conversationsRoute = new Hono()

// List all conversations (without messages, for sidebar)
conversationsRoute.get('/', async (c) => {
  try {
    const conversations = await listConversations()
    return c.json({ conversations })
  } catch (error) {
    console.error('List conversations error:', error)
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to list conversations' },
      500
    )
  }
})

// Get a single conversation (with messages)
conversationsRoute.get('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const conversation = await getConversation(id)

    if (!conversation) {
      return c.json({ error: 'Conversation not found' }, 404)
    }

    return c.json({ conversation })
  } catch (error) {
    console.error('Get conversation error:', error)
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to get conversation' },
      500
    )
  }
})

// Create a new conversation
conversationsRoute.post('/', async (c) => {
  try {
    const body = await c.req.json<{ messages: StoredMessage[] }>()

    if (!body.messages || !Array.isArray(body.messages)) {
      return c.json({ error: 'Invalid messages format' }, 400)
    }

    const conversation = await createConversation(body.messages)
    return c.json({ conversation }, 201)
  } catch (error) {
    console.error('Create conversation error:', error)
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to create conversation' },
      500
    )
  }
})

// Update a conversation (append/replace messages)
conversationsRoute.put('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const body = await c.req.json<{ messages: StoredMessage[] }>()

    if (!body.messages || !Array.isArray(body.messages)) {
      return c.json({ error: 'Invalid messages format' }, 400)
    }

    const conversation = await updateConversation(id, body.messages)

    if (!conversation) {
      return c.json({ error: 'Conversation not found' }, 404)
    }

    return c.json({ conversation })
  } catch (error) {
    console.error('Update conversation error:', error)
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to update conversation' },
      500
    )
  }
})

// Delete a conversation
conversationsRoute.delete('/:id', async (c) => {
  try {
    const id = c.req.param('id')
    const deleted = await deleteConversation(id)

    if (!deleted) {
      return c.json({ error: 'Conversation not found' }, 404)
    }

    return c.json({ success: true })
  } catch (error) {
    console.error('Delete conversation error:', error)
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to delete conversation' },
      500
    )
  }
})
