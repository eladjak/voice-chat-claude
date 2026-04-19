import { PvRecorder } from '@picovoice/pvrecorder-node'
import OpenAI from 'openai'
import { toFile } from 'openai/uploads'

let recorder: PvRecorder | null = null
let isListening = false
let onWakeWordDetected: (() => void) | null = null
let openaiClient: OpenAI | null = null
let openaiKey: string = ''

const SAMPLE_RATE = 16000
const FRAME_LENGTH = 512
const SILENCE_THRESHOLD = 500 // Amplitude threshold for speech detection
const SPEECH_FRAMES_NEEDED = 5 // Frames of speech to trigger recording
const SILENCE_FRAMES_TO_STOP = 20 // Frames of silence to stop wake word capture
const MAX_WAKE_WORD_FRAMES = 60 // Max ~2 seconds for wake word

// Clean transcription for better matching
function cleanText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[,!?.'":;\-־]/g, '') // Remove punctuation
    .replace(/\s+/g, ' ')   // Normalize spaces
    .trim()
}

// Check if text contains wake word patterns
function isWakePhrase(text: string): boolean {
  const cleaned = cleanText(text)

  // Check for various patterns
  const patterns = [
    /הי+\s*קלו?א?ד/i,     // היי קלוד, הי קלוד, היי קלאוד
    /hey\s*claude/i,       // hey claude
    /hi\s*claude/i,        // hi claude
  ]

  // Also check if "קלוד" appears at the start (user might just say "קלוד")
  const startsWithClaude = cleaned.startsWith('קלוד') || cleaned.startsWith('claude')

  return patterns.some(p => p.test(cleaned)) || startsWithClaude
}

export async function startWakeWordListener(
  accessKey: string, // Keep for API compatibility but use OpenAI key from settings
  callback: () => void,
  openaiApiKey?: string
): Promise<void> {
  if (isListening) {
    console.log('Wake word listener already running')
    return
  }

  openaiKey = openaiApiKey || process.env.OPENAI_API_KEY || ''
  if (!openaiKey) {
    console.log('No OpenAI API key for wake word detection')
    return
  }

  try {
    onWakeWordDetected = callback
    openaiClient = new OpenAI({ apiKey: openaiKey })

    // Get available audio devices
    const devices = PvRecorder.getAvailableDevices()
    console.log('Available audio devices:', devices)

    // Use default device (index -1)
    recorder = new PvRecorder(FRAME_LENGTH, -1)
    recorder.start()

    isListening = true
    console.log('Wake word listener started (say "היי קלוד" to activate)')
    console.log(`Sample rate: ${SAMPLE_RATE}, Frame length: ${FRAME_LENGTH}`)

    // Start listening loop
    listenLoop()
  } catch (error) {
    console.error('Failed to start wake word listener:', error)
    stopWakeWordListener()
    throw error
  }
}

function calculateRMS(pcm: Int16Array): number {
  let sum = 0
  for (let i = 0; i < pcm.length; i++) {
    sum += pcm[i] * pcm[i]
  }
  return Math.sqrt(sum / pcm.length)
}

async function listenLoop(): Promise<void> {
  let speechFrames = 0
  let silenceFrames = 0
  let isCapturing = false
  let capturedFrames: Int16Array[] = []

  while (isListening && recorder) {
    try {
      const pcm = await recorder.read()
      const rms = calculateRMS(pcm)
      const isSpeech = rms > SILENCE_THRESHOLD

      if (!isCapturing) {
        // Waiting for speech to start
        if (isSpeech) {
          speechFrames++
          if (speechFrames >= SPEECH_FRAMES_NEEDED) {
            // Start capturing
            isCapturing = true
            capturedFrames = []
            silenceFrames = 0
            console.log('Detecting wake word...')
          }
        } else {
          speechFrames = 0
        }
      } else {
        // Currently capturing wake word
        capturedFrames.push(new Int16Array(pcm))

        if (isSpeech) {
          silenceFrames = 0
        } else {
          silenceFrames++
        }

        // Stop if silence detected or max length reached
        if (silenceFrames >= SILENCE_FRAMES_TO_STOP || capturedFrames.length >= MAX_WAKE_WORD_FRAMES) {
          // Process captured audio
          const isWakeWord = await checkWakeWord(capturedFrames)

          if (isWakeWord) {
            console.log('Wake word "היי קלוד" detected!')
            if (onWakeWordDetected) {
              onWakeWordDetected()
            }
          }

          // Reset for next detection
          isCapturing = false
          speechFrames = 0
          silenceFrames = 0
          capturedFrames = []
        }
      }
    } catch (error) {
      if (isListening) {
        console.error('Error in wake word loop:', error)
      }
      break
    }
  }
}

async function checkWakeWord(frames: Int16Array[]): Promise<boolean> {
  if (!openaiClient || frames.length === 0) return false

  try {
    // Combine all frames into a single buffer
    const totalLength = frames.reduce((sum, f) => sum + f.length, 0)
    const combined = new Int16Array(totalLength)
    let offset = 0
    for (const frame of frames) {
      combined.set(frame, offset)
      offset += frame.length
    }

    // Convert to WAV format
    const wavBuffer = createWavBuffer(combined, SAMPLE_RATE)

    // Send to Whisper
    const file = await toFile(wavBuffer, 'wakeword.wav', { type: 'audio/wav' })
    const transcription = await openaiClient.audio.transcriptions.create({
      file,
      model: 'whisper-1',
      language: 'he',
    })

    const text = transcription.text
    console.log('Wake word check:', text)

    // Check if wake phrase is detected
    return isWakePhrase(text)
  } catch (error) {
    console.error('Wake word transcription error:', error)
    return false
  }
}

function createWavBuffer(samples: Int16Array, sampleRate: number): Buffer {
  const numChannels = 1
  const bitsPerSample = 16
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8)
  const blockAlign = numChannels * (bitsPerSample / 8)
  const dataSize = samples.length * (bitsPerSample / 8)
  const headerSize = 44
  const buffer = Buffer.alloc(headerSize + dataSize)

  // RIFF header
  buffer.write('RIFF', 0)
  buffer.writeUInt32LE(36 + dataSize, 4)
  buffer.write('WAVE', 8)

  // fmt chunk
  buffer.write('fmt ', 12)
  buffer.writeUInt32LE(16, 16) // chunk size
  buffer.writeUInt16LE(1, 20) // PCM format
  buffer.writeUInt16LE(numChannels, 22)
  buffer.writeUInt32LE(sampleRate, 24)
  buffer.writeUInt32LE(byteRate, 28)
  buffer.writeUInt16LE(blockAlign, 32)
  buffer.writeUInt16LE(bitsPerSample, 34)

  // data chunk
  buffer.write('data', 36)
  buffer.writeUInt32LE(dataSize, 40)

  // Write samples
  for (let i = 0; i < samples.length; i++) {
    buffer.writeInt16LE(samples[i], headerSize + i * 2)
  }

  return buffer
}

export function stopWakeWordListener(): void {
  isListening = false

  if (recorder) {
    try {
      recorder.stop()
      recorder.release()
    } catch (e) {
      // Ignore cleanup errors
    }
    recorder = null
  }

  onWakeWordDetected = null
  openaiClient = null
  console.log('Wake word listener stopped')
}

export function isWakeWordListening(): boolean {
  return isListening
}
