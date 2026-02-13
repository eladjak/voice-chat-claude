import { Hono } from 'hono'
import { getSettings, saveSettings, type AppSettings } from '../lib/settings-store'

export const settingsRoute = new Hono()

// Get current settings
settingsRoute.get('/', async (c) => {
  try {
    const settings = await getSettings()
    return c.json({ settings })
  } catch (error) {
    console.error('Get settings error:', error)
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to get settings' },
      500
    )
  }
})

// Update settings (partial update)
settingsRoute.put('/', async (c) => {
  try {
    const body = await c.req.json<Partial<AppSettings>>()
    const updated = await saveSettings(body)
    return c.json({ settings: updated })
  } catch (error) {
    console.error('Save settings error:', error)
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to save settings' },
      500
    )
  }
})

// Fetch available ElevenLabs voices
settingsRoute.get('/voices', async (c) => {
  try {
    const apiKey = process.env.ELEVENLABS_API_KEY
    if (!apiKey) {
      return c.json({ error: 'ElevenLabs API key not configured' }, 500)
    }

    const response = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: {
        'xi-api-key': apiKey,
      },
    })

    if (!response.ok) {
      const errorText = await response.text()
      return c.json(
        { error: `ElevenLabs API error: ${errorText}` },
        response.status as 400 | 401 | 403 | 500
      )
    }

    const data = await response.json() as {
      voices: Array<{
        voice_id: string
        name: string
        category: string
        description: string | null
      }>
    }

    const voices = data.voices.map((v) => ({
      voice_id: v.voice_id,
      name: v.name,
      category: v.category,
      description: v.description,
    }))

    return c.json({ voices })
  } catch (error) {
    console.error('Fetch voices error:', error)
    return c.json(
      { error: error instanceof Error ? error.message : 'Failed to fetch voices' },
      500
    )
  }
})
