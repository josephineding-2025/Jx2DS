'use client'

import { useState } from 'react'
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder'

const DEMO_USER_ID = '00000000-0000-0000-0000-000000000001'

export default function TestPage() {
  const { state: voiceState, transcript, start, stop, reset } = useVoiceRecorder()
  const [voiceResult, setVoiceResult] = useState<object | null>(null)
  const [receiptResult, setReceiptResult] = useState<object | null>(null)
  const [reconcileResult, setReconcileResult] = useState<object | null>(null)
  const [arusResult, setArusResult] = useState<object | null>(null)
  const [musimResult, setMusimResult] = useState<object | null>(null)
  const [seedResult, setSeedResult] = useState<string>('')
  const [loading, setLoading] = useState<string>('')

  async function parseVoice() {
    if (!transcript) return
    setLoading('voice')
    const res = await fetch('/api/parse-voice', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript }),
    })
    setVoiceResult(await res.json())
    setLoading('')
  }

  async function parseReceipt(file: File) {
    setLoading('receipt')
    const compressed = await resizeImage(file, 1024)
    const base64 = compressed.split(',')[1]
    const mimeType = file.type
    const res = await fetch('/api/parse-receipt', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageBase64: base64, mimeType }),
    })
    setReceiptResult(await res.json())
    setLoading('')
  }

  async function simulateReconcile() {
    setLoading('reconcile')
    const res = await fetch('/api/reconcile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senderName: 'Ali', amount: 21, userId: DEMO_USER_ID }),
    })
    setReconcileResult(await res.json())
    setLoading('')
  }

  async function simulateArus() {
    setLoading('arus')
    const res = await fetch('/api/arus', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: DEMO_USER_ID, amount: 2800 }),
    })
    setArusResult(await res.json())
    setLoading('')
  }

  async function loadMusim() {
    setLoading('musim')
    const res = await fetch(`/api/musim?userId=${DEMO_USER_ID}`)
    setMusimResult(await res.json())
    setLoading('')
  }

  async function seedData() {
    setLoading('seed')
    const res = await fetch('/api/seed', { method: 'POST' })
    const data = await res.json()
    setSeedResult(JSON.stringify(data))
    setLoading('')
  }

  async function resetDemo() {
    setLoading('reset')
    const res = await fetch('/api/seed', { method: 'DELETE' })
    const data = await res.json()
    setSeedResult(JSON.stringify(data))
    setLoading('')
  }

  return (
    <div style={{ padding: 20, fontFamily: 'monospace', maxWidth: 800, margin: '0 auto' }}>
      <h1>Kira — Backend Test Page</h1>

      <section style={{ marginBottom: 32, borderBottom: '1px solid #ccc', paddingBottom: 16 }}>
        <h2>0. Seed / Reset Demo Data</h2>
        <button onClick={seedData} disabled={loading === 'seed'} style={btn}>
          {loading === 'seed' ? 'Seeding...' : 'POST /api/seed — Full seed'}
        </button>
        <button onClick={resetDemo} disabled={loading === 'reset'} style={{ ...btn, marginLeft: 8 }}>
          {loading === 'reset' ? 'Resetting...' : 'DELETE /api/seed — Reset demo state'}
        </button>
        {seedResult && <pre style={pre}>{seedResult}</pre>}
      </section>

      <section style={{ marginBottom: 32, borderBottom: '1px solid #ccc', paddingBottom: 16 }}>
        <h2>1. Voice Input → Parse-Voice API</h2>
        <p>Say: "Paid RM85 at Nando&apos;s Midvalley for 4 people"</p>
        <button onClick={voiceState === 'listening' ? stop : start} style={btn}>
          {voiceState === 'listening' ? 'Stop Recording' : 'Start Recording'}
        </button>
        {transcript && (
          <>
            <p>Transcript: <strong>{transcript}</strong></p>
            <button onClick={parseVoice} disabled={loading === 'voice'} style={btn}>
              {loading === 'voice' ? 'Parsing...' : 'Send to Claude Haiku'}
            </button>
          </>
        )}
        {voiceState === 'unsupported' && <p style={{ color: 'red' }}>Voice not supported in this browser</p>}
        {voiceResult && <pre style={pre}>{JSON.stringify(voiceResult, null, 2)}</pre>}
      </section>

      <section style={{ marginBottom: 32, borderBottom: '1px solid #ccc', paddingBottom: 16 }}>
        <h2>2. Receipt Upload → Parse-Receipt API</h2>
        <input
          type="file"
          accept="image/*"
          onChange={e => e.target.files?.[0] && parseReceipt(e.target.files[0])}
          disabled={loading === 'receipt'}
        />
        {loading === 'receipt' && <p>Parsing receipt with Claude Sonnet Vision...</p>}
        {receiptResult && <pre style={pre}>{JSON.stringify(receiptResult, null, 2)}</pre>}
      </section>

      <section style={{ marginBottom: 32, borderBottom: '1px solid #ccc', paddingBottom: 16 }}>
        <h2>3. Reconcile — Simulate "Ali paid RM21"</h2>
        <p>Requires seed data with Ali&apos;s pending debt</p>
        <button onClick={simulateReconcile} disabled={loading === 'reconcile'} style={btn}>
          {loading === 'reconcile' ? 'Reconciling...' : 'POST /api/reconcile { senderName: Ali, amount: 21 }'}
        </button>
        {reconcileResult && <pre style={pre}>{JSON.stringify(reconcileResult, null, 2)}</pre>}
      </section>

      <section style={{ marginBottom: 32, borderBottom: '1px solid #ccc', paddingBottom: 16 }}>
        <h2>4. Arus — Simulate salary RM2,800</h2>
        <button onClick={simulateArus} disabled={loading === 'arus'} style={btn}>
          {loading === 'arus' ? 'Processing...' : 'POST /api/arus { amount: 2800 }'}
        </button>
        {arusResult && <pre style={pre}>{JSON.stringify(arusResult, null, 2)}</pre>}
      </section>

      <section style={{ marginBottom: 32, paddingBottom: 16 }}>
        <h2>5. Musim — Load upcoming events</h2>
        <button onClick={loadMusim} disabled={loading === 'musim'} style={btn}>
          {loading === 'musim' ? 'Loading...' : 'GET /api/musim'}
        </button>
        {musimResult && <pre style={pre}>{JSON.stringify(musimResult, null, 2)}</pre>}
      </section>
    </div>
  )
}

const btn: React.CSSProperties = {
  padding: '8px 16px',
  cursor: 'pointer',
  background: '#7C3AED',
  color: 'white',
  border: 'none',
  borderRadius: 6,
  fontSize: 14,
}

const pre: React.CSSProperties = {
  background: '#f0f0f0',
  padding: 12,
  borderRadius: 6,
  overflowX: 'auto',
  fontSize: 12,
  marginTop: 8,
}

async function resizeImage(file: File, maxPx: number): Promise<string> {
  return new Promise(resolve => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height))
      const canvas = document.createElement('canvas')
      canvas.width = img.width * scale
      canvas.height = img.height * scale
      canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height)
      URL.revokeObjectURL(url)
      resolve(canvas.toDataURL('image/jpeg', 0.85))
    }
    img.src = url
  })
}
