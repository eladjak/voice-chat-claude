import { Hono } from 'hono'
import { streamSSE } from 'hono/streaming'
import { chatWithClaude, streamChatWithClaude, type Message } from '../lib/claude'

export const chatRoute = new Hono()

interface ChatRequestBody {
  messages: Message[]
  system?: string
  model?: string
}

// Non-streaming endpoint
chatRoute.post('/', async (c) => {
  try {
    const body = await c.req.json<ChatRequestBody>()

    if (!body.messages || !Array.isArray(body.messages)) {
      return c.json({ error: 'Invalid messages format' }, 400)
    }

    if (body.messages.length === 0) {
      return c.json({ error: 'Messages array is empty' }, 400)
    }

    const response = await chatWithClaude(body.messages, body.system, body.model)
    return c.json({ response })
  } catch (error) {
    console.error('Chat error:', error)
    return c.json(
      { error: error instanceof Error ? error.message : 'Chat failed' },
      500
    )
  }
})

// Streaming endpoint
chatRoute.post('/stream', async (c) => {
  try {
    const body = await c.req.json<ChatRequestBody>()

    if (!body.messages || !Array.isArray(body.messages)) {
      return c.json({ error: 'Invalid messages format' }, 400)
    }

    if (body.messages.length === 0) {
      return c.json({ error: 'Messages array is empty' }, 400)
    }

    return streamSSE(c, async (stream) => {
      try {
        for await (const chunk of streamChatWithClaude(body.messages, body.system, body.model)) {
          await stream.writeSSE({
            data: JSON.stringify({ text: chunk }),
          })
        }
        await stream.writeSSE({
          data: JSON.stringify({ done: true }),
        })
      } catch (error) {
        console.error('Stream error:', error)
        await stream.writeSSE({
          data: JSON.stringify({ error: error instanceof Error ? error.message : 'Stream failed' }),
        })
      }
    })
  } catch (error) {
    console.error('Stream request error:', error)
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to parse request' },
      400
    )
  }
})
