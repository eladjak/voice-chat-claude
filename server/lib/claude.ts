import Anthropic from '@anthropic-ai/sdk'
import { getSettings } from './settings-store'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

export interface Message {
  role: 'user' | 'assistant'
  content: string
}

export interface ChatOptions {
  model?: string
  systemPrompt?: string
}

const DEFAULT_SYSTEM_PROMPT =
  'You are a helpful voice assistant. Keep responses concise and conversational since they will be spoken aloud. Respond in the same language the user speaks.'

async function resolveOptions(options?: ChatOptions): Promise<{ model: string; system: string }> {
  const settings = await getSettings()
  return {
    model: options?.model || settings.modelId || 'claude-sonnet-4-20250514',
    system: options?.systemPrompt || settings.systemPrompt || DEFAULT_SYSTEM_PROMPT,
  }
}

export async function chatWithClaude(
  messages: Message[],
  systemPrompt?: string,
  model?: string
): Promise<string> {
  const resolved = await resolveOptions({ model, systemPrompt })

  const response = await anthropic.messages.create({
    model: resolved.model,
    max_tokens: 1024,
    system: resolved.system,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  })

  const textBlock = response.content.find((block) => block.type === 'text')
  return textBlock?.text || ''
}

export async function* streamChatWithClaude(
  messages: Message[],
  systemPrompt?: string,
  model?: string
): AsyncGenerator<string> {
  const resolved = await resolveOptions({ model, systemPrompt })

  const stream = await anthropic.messages.stream({
    model: resolved.model,
    max_tokens: 1024,
    system: resolved.system,
    messages: messages.map((m) => ({
      role: m.role,
      content: m.content,
    })),
  })

  for await (const event of stream) {
    if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
      yield event.delta.text
    }
  }
}
