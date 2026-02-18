export type AudioQueueState = 'idle' | 'playing'

export interface AudioQueueOptions {
  onStateChange?: (state: AudioQueueState) => void
  onError?: (error: Error) => void
  onPlaybackEnd?: () => void
}

export class AudioQueue {
  private queue: Promise<Blob>[] = []
  private playing = false
  private aborted = false
  private currentAudio: HTMLAudioElement | null = null
  private currentUrl: string | null = null
  private readonly onStateChange?: (state: AudioQueueState) => void
  private readonly onError?: (error: Error) => void
  private readonly onPlaybackEnd?: () => void

  constructor(options: AudioQueueOptions = {}) {
    this.onStateChange = options.onStateChange
    this.onError = options.onError
    this.onPlaybackEnd = options.onPlaybackEnd
  }

  enqueue(blobPromise: Promise<Blob>): void {
    this.queue.push(blobPromise)
    if (!this.playing) {
      this.playNext()
    }
  }

  abort(): void {
    this.aborted = true
    this.queue = []

    if (this.currentAudio) {
      this.currentAudio.pause()
      this.currentAudio.onended = null
      this.currentAudio.onerror = null
      this.currentAudio = null
    }

    if (this.currentUrl) {
      URL.revokeObjectURL(this.currentUrl)
      this.currentUrl = null
    }

    this.playing = false
    this.onStateChange?.('idle')
  }

  reset(): void {
    this.abort()
    this.aborted = false
  }

  private async playNext(): Promise<void> {
    if (this.aborted || this.queue.length === 0) {
      if (this.playing) {
        this.playing = false
        this.onStateChange?.('idle')
        this.onPlaybackEnd?.()
      }
      return
    }

    this.playing = true
    this.onStateChange?.('playing')

    const blobPromise = this.queue.shift()!
    try {
      const blob = await blobPromise
      if (this.aborted) return

      // Cleanup previous URL
      if (this.currentUrl) {
        URL.revokeObjectURL(this.currentUrl)
      }

      const url = URL.createObjectURL(blob)
      this.currentUrl = url

      const audio = new Audio(url)
      this.currentAudio = audio

      await new Promise<void>((resolve, reject) => {
        audio.onended = () => resolve()
        audio.onerror = () => reject(new Error('Audio playback failed'))
        audio.play().catch(reject)
      })

      if (this.aborted) return

      // Cleanup after playback
      URL.revokeObjectURL(url)
      if (this.currentUrl === url) {
        this.currentUrl = null
      }

      // Play next in queue
      this.playNext()
    } catch (err) {
      if (this.aborted) return
      this.onError?.(err instanceof Error ? err : new Error('Audio playback failed'))
      // Continue with next item despite error
      this.playNext()
    }
  }
}
