import OpenAI from 'openai'
import { getSettings } from './settings-store'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export async function transcribeAudio(audioFile: File, language?: string): Promise<string> {
  const settings = await getSettings()
  const resolvedLanguage = language || settings.language || 'he'

  // 'auto' means let Whisper detect the language
  const langParam = resolvedLanguage === 'auto' ? undefined : resolvedLanguage

  const transcription = await openai.audio.transcriptions.create({
    file: audioFile,
    model: 'whisper-1',
    ...(langParam ? { language: langParam } : {}),
  })

  return transcription.text
}
