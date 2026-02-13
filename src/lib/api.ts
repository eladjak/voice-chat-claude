export interface Message {
  role: 'user' | 'assistant'
  content: string
}

export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  const formData = new FormData()
  // Use appropriate filename extension based on MIME type
  const extension = audioBlob.type.includes('wav') ? 'wav' : 'webm'
  formData.append('audio', audioBlob, `recording.${extension}`)

  const response = await fetch('/api/transcribe', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Transcription failed')
  }

  const data = await response.json()
  return data.text
}

export async function sendMessage(messages: Message[]): Promise<string> {
  const response = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Chat failed')
  }

  const data = await response.json()
  return data.response
}

export async function* streamMessage(
  messages: Message[]
): AsyncGenerator<string> {
  const response = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ messages }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Stream failed')
  }

  const reader = response.body?.getReader()
  if (!reader) throw new Error('No response body')

  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    const text = decoder.decode(value)
    const lines = text.split('\n')

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        try {
          const data = JSON.parse(line.slice(6))
          if (data.text) {
            yield data.text
          }
          if (data.done || data.error) {
            return
          }
        } catch {
          // Skip invalid JSON
        }
      }
    }
  }
}

export async function textToSpeech(text: string): Promise<Blob> {
  const response = await fetch('/api/speak', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'TTS failed')
  }

  return response.blob()
}
