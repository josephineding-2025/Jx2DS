'use client'

import { useState, useRef, useCallback } from 'react'

type RecorderState = 'idle' | 'listening' | 'done' | 'error' | 'unsupported'

export function useVoiceRecorder() {
  const [state, setState] = useState<RecorderState>('idle')
  const [transcript, setTranscript] = useState('')
  const recognitionRef = useRef<SpeechRecognition | null>(null)

  const start = useCallback(() => {
    const SpeechRecognition = window.SpeechRecognition || (window as unknown as { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setState('unsupported')
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'en-MY'
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onresult = (e: SpeechRecognitionEvent) => {
      const t = Array.from(e.results)
        .map(r => r[0].transcript)
        .join(' ')
      setTranscript(t)
    }

    recognition.onend = () => setState('done')
    recognition.onerror = () => setState('error')

    recognitionRef.current = recognition
    recognition.start()
    setState('listening')
    setTranscript('')
  }, [])

  const stop = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  const reset = useCallback(() => {
    setState('idle')
    setTranscript('')
  }, [])

  return { state, transcript, start, stop, reset }
}
