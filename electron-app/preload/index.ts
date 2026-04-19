import { contextBridge, ipcRenderer } from 'electron'

export type Settings = {
  hotkey: string
  language: string
  voiceId: string
  whisperModel: string
  openaiKey: string
  elevenLabsKey: string
  anthropicKey: string
  picovoiceKey: string
  wakeWordEnabled: boolean
}

contextBridge.exposeInMainWorld('electronAPI', {
  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings: Settings) => ipcRenderer.invoke('save-settings', settings),

  // Voice processing
  transcribeAudio: (audioBuffer: ArrayBuffer) => ipcRenderer.invoke('transcribe-audio', audioBuffer),
  sendToClaudeCode: (text: string) => ipcRenderer.invoke('send-to-claude-code', text),
  textToSpeech: (text: string) => ipcRenderer.invoke('text-to-speech', text),

  // Wake word
  getWakeWordStatus: () => ipcRenderer.invoke('get-wake-word-status'),
  toggleWakeWord: (enabled: boolean) => ipcRenderer.invoke('toggle-wake-word', enabled),

  // Window control
  hideWindow: () => ipcRenderer.send('hide-window'),
  showNotification: (title: string, body: string) => ipcRenderer.invoke('show-notification', title, body),

  // Events from main process
  onStartRecording: (callback: () => void) => {
    ipcRenderer.on('start-recording', callback)
    return () => ipcRenderer.removeListener('start-recording', callback)
  },
  onStopRecording: (callback: () => void) => {
    ipcRenderer.on('stop-recording', callback)
    return () => ipcRenderer.removeListener('stop-recording', callback)
  },
  onShowSettings: (callback: () => void) => {
    ipcRenderer.on('show-settings', callback)
    return () => ipcRenderer.removeListener('show-settings', callback)
  },
  onClaudeResponseChunk: (callback: (chunk: string) => void) => {
    const handler = (_: unknown, chunk: string) => callback(chunk)
    ipcRenderer.on('claude-response-chunk', handler)
    return () => ipcRenderer.removeListener('claude-response-chunk', handler)
  },

  // Tell main that recording stopped
  recordingStopped: () => ipcRenderer.send('recording-stopped'),
})
