import { getSettings } from './settings-store'

const ELEVENLABS_API_URL = 'https://api.elevenlabs.io/v1'

export async function textToSpeech(text: string, voiceId?: string): Promise<ArrayBuffer> {
  const settings = await getSettings()
  const resolvedVoiceId =
    voiceId || settings.voiceId || process.env.ELEVENLABS_VOICE_ID || 'EXAVITQu4vr4xnSDxMaL'

  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY environment variable is not set')
  }

  const response = await fetch(
    `${ELEVENLABS_API_URL}/text-to-speech/${resolvedVoiceId}`,
    {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': apiKey,
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: {
          stability: 0.5,
          similarity_boost: 0.75,
          style: 0.0,
          use_speaker_boost: true,
        },
      }),
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`ElevenLabs API error (${response.status}): ${errorText}`)
  }

  return response.arrayBuffer()
}
