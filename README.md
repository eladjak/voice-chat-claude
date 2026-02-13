# Voice Chat with Claude

A React web app that enables voice conversation with Claude - speak to it, get voice responses back.

## Setup

1. Copy `.env.example` to `.env` and fill in your API keys:
   ```bash
   cp .env.example .env
   ```

2. Required API keys:
   - **ANTHROPIC_API_KEY** - Get from [Anthropic Console](https://console.anthropic.com/)
   - **OPENAI_API_KEY** - Get from [OpenAI Platform](https://platform.openai.com/)
   - **ELEVENLABS_API_KEY** - Get from [ElevenLabs](https://elevenlabs.io/)
   - **ELEVENLABS_VOICE_ID** (optional) - Default is "Sarah" voice

3. Install dependencies:
   ```bash
   npm install
   ```

4. Run development server:
   ```bash
   npm run dev
   ```

5. Open http://localhost:5173 in your browser

## How it Works

1. **Record** - Click the microphone button and speak
2. **Transcribe** - Your audio is sent to OpenAI Whisper for transcription
3. **Chat** - The transcription is sent to Claude for a response
4. **Speak** - Claude's response is converted to speech via ElevenLabs
5. **Play** - The audio response plays automatically

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS
- **Backend**: Hono (Node.js)
- **STT**: OpenAI Whisper API
- **LLM**: Claude (Anthropic)
- **TTS**: ElevenLabs

## Project Structure

```
voice-chat-claude/
├── src/                    # React frontend
│   ├── components/         # UI components
│   ├── hooks/              # React hooks
│   └── lib/                # API client
├── server/                 # Hono backend
│   ├── routes/             # API routes
│   └── lib/                # API clients
└── .env                    # API keys (create from .env.example)
```

## API Costs (approximate)

- **Whisper**: $0.006/minute
- **Claude**: ~$3-15/million tokens (model dependent)
- **ElevenLabs**: Free tier available, then ~$0.30/1000 chars

## License

MIT
