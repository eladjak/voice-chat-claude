import { Hono } from 'hono'
import { transcribeAudio } from '../lib/whisper'

export const transcribeRoute = new Hono()

transcribeRoute.post('/', async (c) => {
  try {
    const formData = await c.req.formData()
    const audioFile = formData.get('audio') as File

    if (!audioFile) {
      return c.json({ error: 'No audio file provided' }, 400)
    }

    const result = await transcribeAudio(audioFile)
    return c.json({
      text: result.text,
      language: result.detectedLanguage,
    })
  } catch (error) {
    console.error('Transcription error:', error)
    return c.json(
      { error: error instanceof Error ? error.message : 'Transcription failed' },
      500
    )
  }
})
