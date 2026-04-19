import OpenAI from 'openai'
import { getSettings } from './settings-store'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})

export interface TranscriptionResult {
  text: string
  detectedLanguage: string | null
}

export async function transcribeAudio(audioFile: File, language?: string): Promise<TranscriptionResult> {
  const settings = await getSettings()
  const resolvedLanguage = language || settings.language || 'he'

  // 'auto' means let Whisper detect the language
  const isAutoDetect = resolvedLanguage === 'auto'
  const langParam = isAutoDetect ? undefined : resolvedLanguage

  // Use verbose_json when auto-detecting to get the detected language back
  if (isAutoDetect) {
    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      response_format: 'verbose_json',
    })
    return {
      text: transcription.text,
      detectedLanguage: transcription.language ?? null,
    }
  }

  const transcription = await openai.audio.transcriptions.create({
    file: audioFile,
    model: 'whisper-1',
    language: langParam,
  })

  return {
    text: transcription.text,
    detectedLanguage: resolvedLanguage,
  }
}
