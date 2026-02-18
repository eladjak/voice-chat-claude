import { useEffect, useRef } from 'react'

interface WaveformProps {
  isActive: boolean
  color?: string
  barCount?: number
}

export function Waveform({ isActive, color = '#6366f1', barCount = 5 }: WaveformProps) {
  const barsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isActive || !barsRef.current) return

    const bars = barsRef.current.children
    const intervals: ReturnType<typeof setInterval>[] = []

    for (let i = 0; i < bars.length; i++) {
      const bar = bars[i] as HTMLDivElement
      const delay = i * 80

      const interval = setInterval(() => {
        const height = 20 + Math.random() * 80
        bar.style.height = `${height}%`
      }, 150 + delay)

      intervals.push(interval)
    }

    return () => {
      intervals.forEach(clearInterval)
      // Reset bars to resting state
      for (let i = 0; i < bars.length; i++) {
        const bar = bars[i] as HTMLDivElement
        bar.style.height = '20%'
      }
    }
  }, [isActive])

  return (
    <div
      ref={barsRef}
      className="flex items-end justify-center gap-1 h-8 w-16"
      aria-hidden="true"
    >
      {Array.from({ length: barCount }, (_, i) => (
        <div
          key={i}
          className="w-1 rounded-full transition-all duration-150 ease-in-out"
          style={{
            height: '20%',
            backgroundColor: isActive ? color : '#d1d5db',
          }}
        />
      ))}
    </div>
  )
}
