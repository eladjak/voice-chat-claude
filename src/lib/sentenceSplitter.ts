const ABBREVIATIONS = new Set([
  'mr', 'mrs', 'ms', 'dr', 'prof', 'sr', 'jr', 'st', 'ave', 'blvd',
  'dept', 'est', 'fig', 'inc', 'ltd', 'vs', 'etc', 'approx', 'govt',
])

const MIN_SENTENCE_LENGTH = 20

export interface SentenceSplitterOptions {
  onSentence: (sentence: string) => void
  minLength?: number
}

export class SentenceSplitter {
  private buffer = ''
  private readonly onSentence: (sentence: string) => void
  private readonly minLength: number

  constructor(options: SentenceSplitterOptions) {
    this.onSentence = options.onSentence
    this.minLength = options.minLength ?? MIN_SENTENCE_LENGTH
  }

  push(chunk: string): void {
    this.buffer += chunk
    this.tryEmit()
  }

  done(): void {
    const remaining = this.buffer.trim()
    if (remaining.length > 0) {
      this.onSentence(remaining)
    }
    this.buffer = ''
  }

  reset(): void {
    this.buffer = ''
  }

  private tryEmit(): void {
    // Look for sentence boundaries: .!? followed by whitespace or end
    // Also split on newlines when the buffer is long enough
    const boundaryPattern = /([.!?])(\s+)|(\n)/g
    let match: RegExpExecArray | null
    let lastEmitEnd = 0

    while ((match = boundaryPattern.exec(this.buffer)) !== null) {
      const endIndex = match.index + (match[1] ? match[1].length : 0) + 1
      const candidate = this.buffer.slice(lastEmitEnd, endIndex).trim()

      if (candidate.length < this.minLength) {
        continue
      }

      // Check for abbreviation false positives (e.g. "Dr. Smith")
      if (match[1] === '.' && this.isAbbreviation(this.buffer, match.index)) {
        continue
      }

      // Check for decimal numbers (e.g. "3.14")
      if (match[1] === '.' && this.isDecimalNumber(this.buffer, match.index)) {
        continue
      }

      this.onSentence(candidate)
      lastEmitEnd = endIndex
    }

    if (lastEmitEnd > 0) {
      this.buffer = this.buffer.slice(lastEmitEnd)
    }
  }

  private isAbbreviation(text: string, dotIndex: number): boolean {
    // Walk backward from the dot to find the word before it
    let wordStart = dotIndex - 1
    while (wordStart >= 0 && /[a-zA-Z]/.test(text[wordStart])) {
      wordStart--
    }
    const word = text.slice(wordStart + 1, dotIndex).toLowerCase()
    return ABBREVIATIONS.has(word)
  }

  private isDecimalNumber(text: string, dotIndex: number): boolean {
    const charBefore = dotIndex > 0 ? text[dotIndex - 1] : ''
    const charAfter = dotIndex < text.length - 1 ? text[dotIndex + 1] : ''
    return /\d/.test(charBefore) && /\d/.test(charAfter)
  }
}
