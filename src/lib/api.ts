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

export interface StreamController {
  abort: () => void
}

export async function streamMessage(
  messages: Message[],
  onChunk: (chunk: string) => void,
  onDone: (fullText: string) => void,
  onError: (error: Error) => void,
): StreamController {
  const abortController = new AbortController()

  const run = async () => {
    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ messages }),
        signal: abortController.signal,
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Stream failed')
      }

      const reader = response.body?.getReader()
      if (!reader) throw new Error('No response body')

      const decoder = new TextDecoder()
      let fullText = ''

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
                fullText += data.text
                onChunk(data.text)
              }
              if (data.error) {
                onError(new Error(data.error))
                return
              }
              if (data.done) {
                onDone(fullText)
                return
              }
            } catch {
              // Skip invalid JSON
            }
          }
        }
      }

      onDone(fullText)
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // Stream was intentionally aborted - not an error
        return
      }
      onError(err instanceof Error ? err : new Error('Stream failed'))
    }
  }

  run()

  return { abort: () => abortController.abort() }
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

export async function streamingTextToSpeech(text: string, signal?: AbortSignal): Promise<Blob> {
  const response = await fetch('/api/speak/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
    signal,
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Streaming TTS failed')
  }

  return response.blob()
}
