import { app, BrowserWindow, globalShortcut, ipcMain, Tray, Menu, nativeImage, Notification } from 'electron'
import { spawn } from 'child_process'
import * as path from 'path'
import * as fs from 'fs'
import 'dotenv/config'
import { startWakeWordListener, stopWakeWordListener, isWakeWordListening } from './wakeWord'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isRecording = false
let settings = loadSettings()
let wakeWordEnabled = false

function loadSettings() {
  const settingsPath = path.join(app.getPath('userData'), 'settings.json')
  try {
    if (fs.existsSync(settingsPath)) {
      return JSON.parse(fs.readFileSync(settingsPath, 'utf-8'))
    }
  } catch (e) {
    console.error('Error loading settings:', e)
  }
  return {
    hotkey: 'CommandOrControl+Shift+V',
    language: 'he',
    voiceId: 'nova', // OpenAI voice - good for Hebrew
    whisperModel: 'whisper-1',
    openaiKey: process.env.OPENAI_API_KEY || '',
    elevenLabsKey: process.env.ELEVENLABS_API_KEY || '',
    anthropicKey: process.env.ANTHROPIC_API_KEY || '',
    picovoiceKey: process.env.PICOVOICE_ACCESS_KEY || '',
    wakeWordEnabled: true,
  }
}

function saveSettings(newSettings: typeof settings) {
  const settingsPath = path.join(app.getPath('userData'), 'settings.json')
  fs.writeFileSync(settingsPath, JSON.stringify(newSettings, null, 2))
  settings = newSettings
  registerGlobalShortcut()
  // Restart wake word listener if settings changed
  initWakeWordListener()
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 450,
    height: 700,
    minHeight: 500,
    maxHeight: 900,
    show: false,
    frame: false,
    resizable: true,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  // Load the renderer
  const isDev = !app.isPackaged
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    // mainWindow.webContents.openDevTools({ mode: 'detach' })
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('blur', () => {
    if (!isRecording) {
      mainWindow?.hide()
    }
  })
}

function createTray() {
  // Create a simple tray icon
  const icon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAA7AAAAOwBeShxvQAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAKwSURBVFiF7ZdNaBNBFMf/s5tNsmlSP4pWi4JHwYsX8SQIXkT04AcqiAcRPXsQBG+CIF5F8OhNPCh4ED9APShSkBZULBQKVqy2SZO02d2Z8ZDZZpNskk1jwIM/GHZn3v7fvJnZeQP8Z4P0B9x8LqxmvVe0JNdJ5p0koQTAdkKoJGKCKL9FuQslSSJvLj9hU/CsBERwOVFcz5LcLomZJGN/hBJaYqxNIVTXEOMpYIcgmkKIQ5RQpYAJDRYcfr2C/GaJqF0VVQUv5ghhuiT5ThKdJOJDZSMWkJJMbCHUPEq8I8QsQCwllJogxAQtR+QyY0M6QSiVRGYpx3Ig+XYCc6aUaB8p40lCTJKMbwBxmRBjzCYXHEJ5AOgfIMUyJcQZQCwE0B8Ae4fUujAgeSeAMZawGMAekEoq8GFAH6CE2AgACYADlFCb7W4swQpCLOb2PsJcwslcQZsFNOabAcwnJCBSQiKJuA7AYJJiRhLsB9AvgGJdXgASR/vH0mMXgD5SXQdKf08ADCfES4TYC6C/JAIJJgQNlTwCJZrKgv/S6Y+B5TvHlvKdI+UOkgqMKsf2jhP8OiXOoazOADYqMHEX0DsMYHQRWL4dZL+uaAZpbHdqC8gsI8RyAvgEYAfJOcD0LJAbcgCrXGDlNpANdpD9YrfZDrJLSaxPJWaSglhGSrG2kuv5PJCbD2AlASwC2kDiIDlm+bWFFatANjgEtu+qiGQWSF7mHi3hHJUCdg5gJgEuJIBVBLCWALsBOvUvOQMEa5FaTSJ+FsAjRf4pCRwgxI6y5AWDhFCVFPgXJC8R4jsAPwPhGnX/pwAmA7Sk/LpFMl4ixFQC/I5UaLYJqVWE+BbAZhJYRohxQqhZhJhBiHGSqCMJT5XvKhEPEcLNhDhIiEtI9YZLhJj5N4b+B/wFMOj4VmYQQb8AAAAASUVORK5CYII='
  )

  tray = new Tray(icon)
  tray.setToolTip('Voice Claude Code')

  const contextMenu = Menu.buildFromTemplate([
    {
      label: `הקש ${settings.hotkey} לדיבור`,
      enabled: false,
    },
    { type: 'separator' },
    {
      label: 'הגדרות',
      click: () => {
        mainWindow?.show()
        mainWindow?.webContents.send('show-settings')
      },
    },
    { type: 'separator' },
    {
      label: 'יציאה',
      click: () => app.quit(),
    },
  ])

  tray.setContextMenu(contextMenu)
  tray.on('click', () => {
    mainWindow?.show()
  })
}

function registerGlobalShortcut() {
  globalShortcut.unregisterAll()

  const registered = globalShortcut.register(settings.hotkey, () => {
    if (isRecording) {
      // Stop recording
      mainWindow?.webContents.send('stop-recording')
      isRecording = false
    } else {
      // Start recording
      mainWindow?.show()
      mainWindow?.webContents.send('start-recording')
      isRecording = true
    }
  })

  if (!registered) {
    console.error('Failed to register global shortcut:', settings.hotkey)
  } else {
    console.log('Global shortcut registered:', settings.hotkey)
  }
}

// IPC Handlers
ipcMain.handle('get-settings', () => settings)
ipcMain.handle('save-settings', (_, newSettings) => {
  saveSettings(newSettings)
  return settings
})

ipcMain.handle('transcribe-audio', async (_, audioBuffer: ArrayBuffer) => {
  const OpenAI = (await import('openai')).default
  const { toFile } = await import('openai/uploads')
  const openai = new OpenAI({ apiKey: settings.openaiKey })

  // Handle IPC serialization - ArrayBuffer might come as object with data array
  let buffer: Buffer
  if (audioBuffer && typeof audioBuffer === 'object' && 'byteLength' in audioBuffer) {
    buffer = Buffer.from(audioBuffer)
  } else if (audioBuffer && typeof audioBuffer === 'object') {
    // IPC might serialize as {0: ..., 1: ..., length: ...}
    const arr = Object.values(audioBuffer) as number[]
    buffer = Buffer.from(arr)
  } else {
    throw new Error('Invalid audio buffer format')
  }

  console.log('Transcribing audio, buffer size:', buffer.length)

  // Convert ArrayBuffer to File-like object for OpenAI
  const file = await toFile(buffer, 'audio.webm', {
    type: 'audio/webm',
  })

  const transcription = await openai.audio.transcriptions.create({
    file,
    model: settings.whisperModel,
    language: settings.language === 'auto' ? undefined : settings.language,
  })

  return transcription.text
})

ipcMain.handle('send-to-claude-code', async (_, text: string) => {
  console.log('Sending to Claude Code:', text)

  return new Promise((resolve, reject) => {
    // Use Claude Code CLI with --print flag
    // Pass text via stdin to avoid shell encoding issues with Hebrew
    const claude = spawn('claude', ['-p', '--output-format', 'text'], {
      shell: true,
      env: { ...process.env, ANTHROPIC_API_KEY: settings.anthropicKey },
      cwd: process.cwd(),
    })

    let output = ''
    let error = ''

    // Set a timeout of 60 seconds
    const timeout = setTimeout(() => {
      claude.kill()
      reject(new Error('Claude Code timed out after 60 seconds'))
    }, 60000)

    claude.stdout.on('data', (data) => {
      const chunk = data.toString('utf8')
      console.log('Claude stdout:', chunk)
      output += chunk
      mainWindow?.webContents.send('claude-response-chunk', chunk)
    })

    claude.stderr.on('data', (data) => {
      const chunk = data.toString('utf8')
      console.log('Claude stderr:', chunk)
      error += chunk
    })

    claude.on('close', (code) => {
      clearTimeout(timeout)
      console.log('Claude exited with code:', code)
      if (code === 0) {
        resolve(output)
      } else {
        reject(new Error(error || `Claude Code exited with code ${code}`))
      }
    })

    claude.on('error', (err) => {
      clearTimeout(timeout)
      console.error('Claude spawn error:', err)
      reject(err)
    })

    // Write the text to stdin and close it
    claude.stdin.write(text, 'utf8')
    claude.stdin.end()
  })
})

ipcMain.handle('text-to-speech', async (_, text: string) => {
  // Use OpenAI TTS - better Hebrew support with gpt-4o-mini-tts
  const OpenAI = (await import('openai')).default
  const openai = new OpenAI({ apiKey: settings.openaiKey })

  // Valid OpenAI voices
  const validVoices = ['alloy', 'ash', 'ballad', 'coral', 'echo', 'fable', 'onyx', 'nova', 'sage', 'shimmer', 'verse']
  const voice = validVoices.includes(settings.voiceId) ? settings.voiceId : 'nova'

  try {
    console.log(`TTS: Using OpenAI gpt-4o-mini-tts with voice "${voice}"`)
    const response = await openai.audio.speech.create({
      model: 'gpt-4o-mini-tts',
      voice: voice as 'alloy' | 'ash' | 'ballad' | 'coral' | 'echo' | 'fable' | 'onyx' | 'nova' | 'sage' | 'shimmer' | 'verse',
      input: text,
      response_format: 'mp3',
      speed: 1.0,
    })

    const arrayBuffer = await response.arrayBuffer()
    return Buffer.from(arrayBuffer)
  } catch (error) {
    console.error('OpenAI TTS error:', error)
    throw error
  }
})

ipcMain.on('recording-stopped', () => {
  isRecording = false
})

ipcMain.on('hide-window', () => {
  mainWindow?.hide()
})

ipcMain.handle('show-notification', (_, title: string, body: string) => {
  new Notification({ title, body }).show()
})

ipcMain.handle('get-wake-word-status', () => {
  return {
    enabled: settings.wakeWordEnabled,
    listening: isWakeWordListening(),
    hasKey: !!settings.picovoiceKey,
  }
})

ipcMain.handle('toggle-wake-word', async (_, enabled: boolean) => {
  settings.wakeWordEnabled = enabled
  saveSettings(settings)
  return enabled
})

function initWakeWordListener() {
  // Stop existing listener
  stopWakeWordListener()

  if (!settings.wakeWordEnabled || !settings.openaiKey) {
    console.log('Wake word disabled or no OpenAI API key')
    return
  }

  startWakeWordListener(settings.picovoiceKey, () => {
    // Wake word detected - start recording
    console.log('Wake word detected! Starting recording...')
    if (!isRecording) {
      mainWindow?.show()
      mainWindow?.webContents.send('start-recording')
      isRecording = true

      // Show notification
      new Notification({
        title: 'היי קלוד!',
        body: 'מקשיב...',
      }).show()
    }
  }, settings.openaiKey).catch((err) => {
    console.error('Failed to start wake word listener:', err)
  })
}

app.whenReady().then(() => {
  createWindow()
  createTray()
  registerGlobalShortcut()

  // Initialize wake word listener
  setTimeout(() => {
    initWakeWordListener()
  }, 2000) // Wait for app to fully initialize

  // Show notification that app is ready
  const wakeWordMsg = settings.wakeWordEnabled && settings.openaiKey
    ? ' או אמור "היי קלוד"'
    : ''
  new Notification({
    title: 'Voice Claude Code',
    body: `הקש ${settings.hotkey}${wakeWordMsg} כדי להתחיל לדבר`,
  }).show()
})

app.on('will-quit', () => {
  globalShortcut.unregisterAll()
  stopWakeWordListener()
})

app.on('window-all-closed', () => {
  // Keep running in tray on macOS
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
