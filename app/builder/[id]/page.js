'use client'
import { useState, useRef, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { createClient } from '../../../lib/supabase'

const BUILD_STEPS = [
  { step: '🧠 Planning', detail: ' the app structure...' },
  { step: '🎨 Designing', detail: ' the UI & layout...' },
  { step: '⚡ Building', detail: ' the frontend...' },
  { step: '🔧 Wiring up', detail: ' the logic...' },
  { step: '🗄️ Setting up', detail: ' the backend...' },
  { step: '✨ Polishing', detail: ' styles & animations...' },
  { step: '🚀 Finalizing', detail: ' and testing...' },
]

const INTEGRATION_META = {
  supabase: { name: 'Supabase', icon: '🗄️', bg: '#1a2e1a', fields: [{ key: 'url', label: 'Project URL', placeholder: 'https://xxx.supabase.co' }, { key: 'anonKey', label: 'Anon Key', placeholder: 'eyJ...' }] },
  stripe:   { name: 'Stripe',   icon: '💳', bg: '#1a1a2e', fields: [{ key: 'publishableKey', label: 'Publishable Key', placeholder: 'pk_live_...' }] },
  openai:   { name: 'OpenAI',   icon: '🤖', bg: '#1a2a1a', fields: [{ key: 'apiKey', label: 'API Key', placeholder: 'sk-...' }] },
  github:   { name: 'GitHub',   icon: '🐙', bg: '#1a1a1a', fields: [{ key: 'token', label: 'Access Token', placeholder: 'ghp_...' }] },
  vercel:   { name: 'Vercel',   icon: '▲',  bg: '#1a1a1a', fields: [{ key: 'token', label: 'API Token', placeholder: 'your-token' }] },
}

export default function Builder() {
  const { id } = useParams()
  const router = useRouter()
  const sb = createClient()

  const [project, setProject] = useState(null)
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [currentHtml, setCurrentHtml] = useState('')
  const [sessionHistory, setSessionHistory] = useState([])
  const [tab, setTab] = useState('preview')
  const [fullscreen, setFullscreen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [showHistory, setShowHistory] = useState(false)
  const [tickerStep, setTickerStep] = useState(0)
  const [tickerVisible, setTickerVisible] = useState(false)
  const [showIntegrations, setShowIntegrations] = useState(false)
  const [integrations, setIntegrations] = useState({})
  const [editingIntegration, setEditingIntegration] = useState(null)
  const [intFormValues, setIntFormValues] = useState({})
  const [projectName, setProjectName] = useState('Untitled Project')

  const chatRef = useRef(null)
  const taRef = useRef(null)
  const tickerRef = useRef(null)

  useEffect(() => {
    loadProject()
  }, [id])

  useEffect(() => {
    chatRef.current?.scrollTo(0, chatRef.current.scrollHeight)
  }, [messages, loading])

  useEffect(() => {
    if (taRef.current) {
      taRef.current.style.height = 'auto'
      taRef.current.style.height = Math.min(taRef.current.scrollHeight, 110) + 'px'
    }
  }, [input])

  async function loadProject() {
    const { data: { session } } = await sb.auth.getSession()
    if (!session) return router.push('/')
    const { data: proj } = await sb.from('projects').select('*').eq('id', id).single()
    if (!proj) return router.push('/dashboard')
    setProject(proj)
    setProjectName(proj.name)
    setCurrentHtml(proj.html || '')
    // Load integrations
    const { data: ints } = await sb.from('project_integrations').select('*').eq('project_id', id)
    const intMap = {}
    ;(ints || []).forEach(i => { intMap[i.provider] = i.config })
    setIntegrations(intMap)
  }

  async function saveName(name) {
    await sb.from('projects').update({ name }).eq('id', id)
  }

  async function saveHtml(html) {
    await sb.from('projects').update({ html }).eq('id', id)
  }

  async function saveIntegration(provider, config) {
    const existing = await sb.from('project_integrations').select('id').eq('project_id', id).eq('provider', provider).single()
    if (existing.data) {
      await sb.from('project_integrations').update({ config }).eq('id', existing.data.id)
    } else {
      const { data: { session } } = await sb.auth.getSession()
      await sb.from('project_integrations').insert({ project_id: id, user_id: session.user.id, provider, config })
    }
    setIntegrations(prev => ({ ...prev, [provider]: config }))
  }

  async function removeIntegration(provider) {
    await sb.from('project_integrations').delete().eq('project_id', id).eq('provider', provider)
    setIntegrations(prev => { const n = {...prev}; delete n[provider]; return n })
    setEditingIntegration(null)
  }

  function startTicker() {
    setTickerVisible(true)
    setTickerStep(0)
    let i = 0
    tickerRef.current = setInterval(() => {
      i = (i + 1) % BUILD_STEPS.length
      setTickerStep(i)
    }, 2200)
  }

  function stopTicker() {
    clearInterval(tickerRef.current)
    setTickerVisible(false)
  }

  async function send(promptOverride) {
    const text = (promptOverride || input).trim()
    if (!text || loading) return
    setInput('')
    const next = [...messages, { role: 'user', content: text }]
    setMessages(next)
    setLoading(true)
    startTicker()

    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: next, existingHtml: currentHtml || null, integrations }),
      })
      if (!res.ok) throw new Error(`API error ${res.status}`)
      const { html, error } = await res.json()
      if (error || !html) throw new Error(error || 'Empty response')

      setCurrentHtml(html)
      setTab('preview')
      const title = text.length > 36 ? text.slice(0, 36) + '…' : text
      setSessionHistory(h => [{ title, html }, ...h].slice(0, 20))
      setMessages(m => [...m, { role: 'assistant', content: '✅ Done! Your app is live in the preview →', type: 'sys' }])
      await saveHtml(html)
    } catch (e) {
      setMessages(m => [...m, { role: 'assistant', content: `❌ ${e.message}`, type: 'err' }])
    }
    stopTicker()
    setLoading(false)
  }

  function onKey(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  function copyCode() {
    navigator.clipboard.writeText(currentHtml)
    setCopied(true); setTimeout(() => setCopied(false), 2000)
  }

  function download() {
    const a = Object.assign(document.createElement('a'), {
      href: URL.createObjectURL(new Blob([currentHtml], { type: 'text/html' })),
      download: `${projectName}.html`
    })
    a.click()
  }

  function newGen() {
    setMessages([]); setCurrentHtml(''); setSessionHistory([])
  }

  const sendReady = input.trim() && !loading

  if (fullscreen) return (
    <div style={{ position:'fixed', inset:0, background:'#000', zIndex:999, display:'flex', flexDirection:'column' }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:'#111', borderBottom:'1px solid var(--border)' }}>
        <span style={{ color:'#aaa', fontSize:13, fontWeight:700 }}>👁 Full Preview</span>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={download} style={{ background:'#1a1a2e', border:'1px solid var(--border)', borderRadius:8, padding:'6px 12px', color:'#aaa', fontSize:12 }}>⬇️ Download</button>
          <button onClick={() => setFullscreen(false)} style={{ background:'#1a1a2e', border:'1px solid var(--border)', borderRadius:8, padding:'6px 12px', color:'#aaa', fontSize:12 }}>✕ Close</button>
        </div>
      </div>
      <iframe srcDoc={currentHtml} style={{ flex:1, border:'none', width:'100%' }} sandbox="allow-scripts allow-forms" />
    </div>
  )

  return (
    <div style={{ height:'100dvh', display:'flex', flexDirection:'column', overflow:'hidden' }}>
      {/* NAV */}
      <nav style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 14px', borderBottom:'1px solid var(--border)', background:'var(--card)', flexShrink:0 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <button onClick={() => router.push('/dashboard')} style={{ background:'none', border:'none', color:'#555', fontSize:18, cursor:'pointer' }}>←</button>
          <div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:15, background:'linear-gradient(90deg,#FF3CAC,#FF6B35,#FFE600)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>✦ buildify</div>
            <input value={projectName} onChange={e => setProjectName(e.target.value)} onBlur={() => saveName(projectName)}
              style={{ background:'none', border:'none', color:'#555', fontSize:11, fontWeight:700, fontFamily:'Nunito,sans-serif', width:120, cursor:'text' }} />
          </div>
        </div>
        <div style={{ display:'flex', gap:6, alignItems:'center' }}>
          <button onClick={() => setShowIntegrations(!showIntegrations)} style={{ background: Object.keys(integrations).length ? '#0f2a1a' : '#1a1a2e', border:`1px solid ${Object.keys(integrations).length ? '#00F5A033' : 'var(--border)'}`, borderRadius:9, padding:'6px 10px', color: Object.keys(integrations).length ? 'var(--green)' : '#aaa', fontSize:11, fontWeight:700 }}>
            🔌 {Object.keys(integrations).length ? `${Object.keys(integrations).length} connected` : 'Integrations'}
          </button>
          {sessionHistory.length > 0 && <button onClick={() => setShowHistory(!showHistory)} style={{ background:'#1a1a2e', border:'1px solid var(--border)', borderRadius:9, width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}>🕑</button>}
          {currentHtml && <>
            <button onClick={copyCode} style={{ background:'#1a1a2e', border:'1px solid var(--border)', borderRadius:9, width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}>{copied ? '✅' : '📋'}</button>
            <button onClick={download} style={{ background:'#1a1a2e', border:'1px solid var(--border)', borderRadius:9, width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}>⬇️</button>
            <button onClick={newGen} style={{ background:'#1a1a2e', border:'1px solid var(--border)', borderRadius:9, width:30, height:30, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}>✨</button>
          </>}
          <div style={{ width:7, height:7, borderRadius:'50%', background:'var(--green)', animation:'pulse 2s infinite' }} />
        </div>
      </nav>

      {/* INTEGRATIONS PANEL */}
      {showIntegrations && (
        <div style={{ background:'var(--card)', borderBottom:'1px solid var(--border)', padding:'12px 14px', flexShrink:0 }}>
          {editingIntegration ? (
            <div>
              <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
                <button onClick={() => setEditingIntegration(null)} style={{ background:'none', border:'none', color:'#555', fontSize:16, cursor:'pointer' }}>←</button>
                <span style={{ fontWeight:800, fontSize:14 }}>{INTEGRATION_META[editingIntegration].icon} {INTEGRATION_META[editingIntegration].name}</span>
              </div>
              {INTEGRATION_META[editingIntegration].fields.map(f => (
                <div key={f.key} style={{ marginBottom:10 }}>
                  <label style={{ fontSize:10, fontWeight:800, color:'#555', letterSpacing:.8, display:'block', marginBottom:4 }}>{f.label}</label>
                  <input value={intFormValues[f.key] || ''} onChange={e => setIntFormValues(v => ({ ...v, [f.key]: e.target.value }))}
                    placeholder={f.placeholder}
                    style={{ width:'100%', background:'#0f0f1e', border:'1.5px solid var(--border)', borderRadius:10, padding:'9px 12px', color:'#fff', fontSize:13 }} />
                </div>
              ))}
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={async () => { await saveIntegration(editingIntegration, intFormValues); setEditingIntegration(null) }}
                  style={{ flex:1, background:'var(--grad)', border:'none', borderRadius:10, padding:'10px', color:'#fff', fontWeight:800, fontSize:13 }}>Save</button>
                {integrations[editingIntegration] && (
                  <button onClick={() => removeIntegration(editingIntegration)}
                    style={{ background:'#2a1020', border:'1px solid #ff204e33', borderRadius:10, padding:'10px 14px', color:'#ff6b8a', fontWeight:700, fontSize:13 }}>Remove</button>
                )}
              </div>
            </div>
          ) : (
            <div>
              <div style={{ color:'#444', fontSize:10, fontWeight:800, letterSpacing:1, marginBottom:8 }}>PROJECT INTEGRATIONS — used in generated code</div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {Object.entries(INTEGRATION_META).map(([key, meta]) => {
                  const connected = !!integrations[key]
                  return (
                    <button key={key} onClick={() => { setEditingIntegration(key); setIntFormValues(integrations[key] || {}) }}
                      style={{ background: connected ? '#0f2a1a' : '#1a1a2e', border:`1px solid ${connected ? '#00F5A033' : 'var(--border)'}`, borderRadius:10, padding:'7px 12px', color: connected ? 'var(--green)' : '#666', fontSize:12, fontWeight:700, display:'flex', alignItems:'center', gap:6 }}>
                      <span>{meta.icon}</span>
                      <span>{meta.name}</span>
                      {connected && <span style={{ fontSize:10 }}>✓</span>}
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TICKER */}
      {tickerVisible && (
        <div style={{ background:'#0a0a18', borderBottom:'1px solid var(--border)', padding:'7px 14px', display:'flex', alignItems:'center', gap:8, flexShrink:0 }}>
          <div style={{ width:11, height:11, border:'2px solid #ffffff22', borderTopColor:'var(--pink)', borderRadius:'50%', animation:'spin 1s linear infinite', flexShrink:0 }} />
          <span style={{ fontSize:12, color:'var(--pink)', fontWeight:700 }}>{BUILD_STEPS[tickerStep].step}</span>
          <span style={{ fontSize:12, color:'#555', fontStyle:'italic' }}>{BUILD_STEPS[tickerStep].detail}</span>
        </div>
      )}

      {/* HISTORY */}
      {showHistory && sessionHistory.length > 0 && (
        <div style={{ background:'var(--card)', borderBottom:'1px solid var(--border)', padding:'8px 14px', flexShrink:0 }}>
          <div style={{ color:'#444', fontSize:10, fontWeight:800, letterSpacing:1, marginBottom:6 }}>HISTORY</div>
          <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:2 }}>
            {sessionHistory.map((h, i) => (
              <button key={i} onClick={() => { setCurrentHtml(h.html); setTab('preview'); setShowHistory(false) }}
                style={{ background:'#1a1a2e', border:'1px solid var(--border)', borderRadius:10, padding:'5px 12px', color:'#aaa', fontSize:11, whiteSpace:'nowrap', flexShrink:0 }}>
                {h.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* PREVIEW */}
      {currentHtml && (
        <div style={{ flexShrink:0 }}>
          <div style={{ display:'flex', alignItems:'center', borderBottom:'1px solid var(--border)', background:'var(--card)' }}>
            {['preview','code'].map(t => (
              <button key={t} onClick={() => setTab(t)} style={{ flex:1, padding:'8px', background: tab===t ? '#12122a' : 'transparent', border:'none', borderBottom: tab===t ? '2px solid var(--pink)' : '2px solid transparent', color: tab===t ? '#fff' : '#444', fontWeight:800, fontSize:11, letterSpacing:.5, cursor:'pointer', transition:'all .2s' }}>
                {t === 'preview' ? '👁 PREVIEW' : '💻 CODE'}
              </button>
            ))}
            <button onClick={() => setFullscreen(true)} style={{ padding:'8px 12px', background:'transparent', border:'none', borderBottom:'2px solid transparent', color:'#444', fontSize:13, cursor:'pointer' }}>⛶</button>
          </div>
          <div style={{ height:'40vh', background:'#050510', overflow:'hidden' }}>
            {tab === 'preview'
              ? <iframe srcDoc={currentHtml} style={{ width:'100%', height:'100%', border:'none' }} sandbox="allow-scripts allow-forms" title="preview" />
              : <pre style={{ color:'#7dd3a8', fontSize:10, padding:10, overflow:'auto', height:'100%', whiteSpace:'pre-wrap', wordBreak:'break-all', fontFamily:'monospace', lineHeight:1.6 }}>{currentHtml}</pre>
            }
          </div>
        </div>
      )}

      {/* CHAT */}
      <div ref={chatRef} style={{ flex:1, overflowY:'auto', padding:'12px 14px 4px', display:'flex', flexDirection:'column', gap:10 }}>
        {messages.length === 0 && (
          <div style={{ textAlign:'center', padding:'20px 14px', animation:'fadeUp .5s ease' }}>
            <div style={{ fontSize:36, marginBottom:8 }}>🚀</div>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:17, marginBottom:4 }}>What are we building?</div>
            <div style={{ color:'#444', fontSize:13, marginBottom:14 }}>Describe any app and watch it come to life</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:7 }}>
              {[
                ['🎮 Snake with neon glow','🎮 A snake game with neon glow'],
                ['✅ Todo with confetti','✅ A todo app with confetti when done'],
                ['⏱️ Pomodoro timer','⏱️ A Pomodoro timer with sound alerts'],
                ['🎨 Color palette gen','🎨 A random color palette generator'],
                ['💱 Currency converter','💱 A live currency converter'],
                ['🧮 Tip calculator','🧮 A tip calculator with bill splitting'],
                ['🌤️ Weather dashboard','🌤️ A beautiful weather dashboard'],
                ['🎵 Music visualizer','🎵 An audio visualizer with animated bars'],
              ].map(([label, prompt]) => (
                <button key={label} onClick={() => send(prompt)}
                  style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:11, padding:'8px 9px', color:'#666', fontSize:11, textAlign:'left', fontWeight:700, lineHeight:1.4, transition:'all .2s', cursor:'pointer' }}
                  onMouseEnter={e=>{ e.currentTarget.style.borderColor='#FF3CAC44'; e.currentTarget.style.color='#aaa' }}
                  onMouseLeave={e=>{ e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.color='#666' }}>
                  {label}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={i} style={{ display:'flex', gap:8, justifyContent: m.role==='user' ? 'flex-end' : 'flex-start', animation:'fadeUp .3s ease' }}>
            {m.role !== 'user' && <div style={{ width:24, height:24, borderRadius:'50%', background:'linear-gradient(135deg,#9B5DE5,#FF3CAC)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, flexShrink:0, marginTop:2 }}>✦</div>}
            <div style={{
              maxWidth:'78%', padding:'9px 12px', fontSize:13, lineHeight:1.55,
              borderRadius: m.role==='user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
              background: m.role==='user' ? 'var(--grad)' : m.type==='sys' ? '#0f2a1a' : m.type==='err' ? '#2a1020' : '#0f0f2a',
              border: m.role!=='user' ? `1px solid ${m.type==='sys' ? '#00F5A018' : m.type==='err' ? '#ff204e33' : 'var(--border)'}` : 'none',
              color: m.type==='err' ? '#ff6b8a' : '#fff',
              fontWeight: m.role==='user' ? 700 : 500,
              boxShadow: m.role==='user' ? '0 4px 14px #FF3CAC22' : 'none',
            }}>{m.content}</div>
          </div>
        ))}

        {loading && (
          <div style={{ display:'flex', gap:8, alignItems:'center', animation:'fadeUp .3s ease' }}>
            <div style={{ width:24, height:24, borderRadius:'50%', background:'linear-gradient(135deg,#9B5DE5,#FF3CAC)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, flexShrink:0 }}>✦</div>
            <div style={{ background:'#0f0f2a', border:'1px solid var(--border)', borderRadius:'16px 16px 16px 4px', padding:'8px 14px' }}>
              <div style={{ display:'flex', gap:5, alignItems:'center' }}>
                {[0,1,2].map(i => <div key={i} style={{ width:6, height:6, borderRadius:'50%', background:'var(--green)', animation:`bounce 1s ease-in-out ${i*.2}s infinite` }} />)}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* INPUT */}
      <div style={{ padding:'8px 14px 22px', borderTop:'1px solid var(--border)', background:'var(--card)', flexShrink:0 }}>
        {currentHtml && (
          <div style={{ display:'flex', gap:6, marginBottom:8, overflowX:'auto', paddingBottom:2 }}>
            {['Make it dark mode','Add animations','Make it mobile-friendly','Add more features','Change the colors','Add a settings panel'].map(s => (
              <button key={s} onClick={() => setInput(s)}
                style={{ background:'#14142a', border:'1px solid var(--border)', borderRadius:20, padding:'4px 10px', color:'#555', fontSize:11, whiteSpace:'nowrap', fontWeight:700, flexShrink:0 }}>
                {s}
              </button>
            ))}
          </div>
        )}
        <div style={{ display:'flex', alignItems:'flex-end', gap:8, background:'#0f0f1e', border:`1.5px solid ${input ? '#FF3CAC44' : 'var(--border)'}`, borderRadius:16, padding:'9px 11px', transition:'border-color .2s' }}>
          <textarea ref={taRef} value={input} onChange={e => setInput(e.target.value)} onKeyDown={onKey}
            placeholder={currentHtml ? 'Ask for changes…' : 'Describe your app…'}
            rows={1}
            style={{ flex:1, background:'none', border:'none', color:'#fff', fontSize:14, lineHeight:1.5, maxHeight:110, overflowY:'auto' }} />
          <button onClick={() => send()} disabled={!sendReady}
            style={{ width:34, height:34, borderRadius:'50%', flexShrink:0, border:`1px solid ${sendReady ? 'transparent' : 'var(--border)'}`, background: sendReady ? 'var(--grad)' : '#1a1a2e', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize: loading ? 14 : 16, boxShadow: sendReady ? '0 4px 12px #FF3CAC44' : 'none', transition:'all .2s', cursor: sendReady ? 'pointer' : 'default' }}>
            {loading ? <div style={{ width:12, height:12, border:'2px solid #fff3', borderTopColor:'#fff', borderRadius:'50%', animation:'spin 1s linear infinite' }} /> : '↑'}
          </button>
        </div>
        <div style={{ textAlign:'center', marginTop:5, color:'#1e1e2e', fontSize:10 }}>Powered by Claude via Requesty · Enter to send</div>
      </div>
    </div>
  )
}
