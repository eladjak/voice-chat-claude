import { Hono } from 'hono'
import { textToSpeech, streamTextToSpeech } from '../lib/elevenlabs'

export const speakRoute = new Hono()

speakRoute.post('/', async (c) => {
  try {
    const body = await c.req.json<{ text: string }>()

    if (!body.text) {
      return c.json({ error: 'No text provided' }, 400)
    }

    const audioBuffer = await textToSpeech(body.text)

    return new Response(audioBuffer, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Length': audioBuffer.byteLength.toString(),
      },
    })
  } catch (error) {
    console.error('TTS error:', error)
    return c.json(
      { error: error instanceof Error ? error.message : 'TTS failed' },
      500
    )
  }
})

speakRoute.post('/stream', async (c) => {
  try {
    const body = await c.req.json<{ text: string }>()

    if (!body.text) {
      return c.json({ error: 'No text provided' }, 400)
    }

    const audioStream = await streamTextToSpeech(body.text)

    return new Response(audioStream, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Transfer-Encoding': 'chunked',
        'Cache-Control': 'no-cache',
      },
    })
  } catch (error) {
    console.error('TTS streaming error:', error)
    return c.json(
      { error: error instanceof Error ? error.message : 'TTS streaming failed' },
      500
    )
  }
})
