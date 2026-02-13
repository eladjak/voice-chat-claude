/** Validate required environment variables at startup */
export function validateEnv(): void {
  const required: Array<{ key: string; description: string }> = [
    { key: 'ANTHROPIC_API_KEY', description: 'Anthropic API key for Claude' },
    { key: 'OPENAI_API_KEY', description: 'OpenAI API key for Whisper STT' },
    { key: 'ELEVENLABS_API_KEY', description: 'ElevenLabs API key for TTS' },
  ]

  const missing = required.filter(({ key }) => !process.env[key])

  if (missing.length > 0) {
    console.error('\n--- Missing Environment Variables ---')
    for (const { key, description } of missing) {
      console.error(`  ${key}: ${description}`)
    }
    console.error('\nPlease set them in your .env file. See .env.example for reference.\n')
    process.exit(1)
  }

  // Optional variables with warnings
  const optional: Array<{ key: string; description: string; fallback: string }> = [
    {
      key: 'ELEVENLABS_VOICE_ID',
      description: 'ElevenLabs voice ID',
      fallback: 'Using default "Sarah" voice',
    },
  ]

  for (const { key, description, fallback } of optional) {
    if (!process.env[key]) {
      console.warn(`  Warning: ${key} not set (${description}). ${fallback}.`)
    }
  }
}
