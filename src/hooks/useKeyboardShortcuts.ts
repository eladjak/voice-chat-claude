import { useEffect, useRef, useCallback } from 'react'

export interface KeyboardShortcutHandlers {
  onSpaceDown?: () => void
  onSpaceUp?: () => void
  onEscape?: () => void
}

export function useKeyboardShortcuts(handlers: KeyboardShortcutHandlers) {
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  const spaceHeldRef = useRef(false)

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Don't trigger shortcuts when typing in input/textarea/select elements
    const target = e.target as HTMLElement
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.tagName === 'SELECT' ||
      target.isContentEditable
    ) {
      return
    }

    if (e.code === 'Space' && !e.repeat) {
      e.preventDefault()
      if (!spaceHeldRef.current) {
        spaceHeldRef.current = true
        handlersRef.current.onSpaceDown?.()
      }
    }

    if (e.code === 'Escape') {
      e.preventDefault()
      handlersRef.current.onEscape?.()
    }
  }, [])

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.code === 'Space') {
      e.preventDefault()
      if (spaceHeldRef.current) {
        spaceHeldRef.current = false
        handlersRef.current.onSpaceUp?.()
      }
    }
  }, [])

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [handleKeyDown, handleKeyUp])
}
