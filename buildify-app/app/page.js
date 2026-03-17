'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../lib/supabase'

export default function AuthPage() {
  const [mode, setMode] = useState('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()
  const sb = createClient()

  async function handleLogin(e) {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await sb.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) setError(error.message)
    else router.push('/dashboard')
  }

  async function handleSignup(e) {
    e.preventDefault()
    setLoading(true); setError('')
    // Sign up with email confirm disabled on Supabase side
    const { data, error } = await sb.auth.signUp({
      email, password,
      options: { emailRedirectTo: undefined, data: {} }
    })
    if (error) { setLoading(false); return setError(error.message) }
    // If session is returned immediately (email confirm off) → go to dashboard
    if (data.session) {
      router.push('/dashboard')
    } else {
      // Fallback: auto sign in
      const { error: signInError } = await sb.auth.signInWithPassword({ email, password })
      setLoading(false)
      if (signInError) setError('Account created! Please sign in.')
      else router.push('/dashboard')
    }
  }

  return (
    <div style={{ minHeight:'100dvh', display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', padding:'40px 24px', position:'relative', overflow:'hidden' }}>
      <div style={{ position:'absolute', width:400, height:400, top:-100, right:-150, borderRadius:'50%', filter:'blur(80px)', opacity:.09, background:'#FF3CAC', pointerEvents:'none' }} />
      <div style={{ position:'absolute', width:300, height:300, bottom:-80, left:-100, borderRadius:'50%', filter:'blur(80px)', opacity:.09, background:'#9B5DE5', pointerEvents:'none' }} />

      <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:30, background:'linear-gradient(90deg,#FF3CAC,#FF6B35,#FFE600)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent', marginBottom:8, animation:'fadeUp .5s ease both' }}>✦ buildify</div>
      <div style={{ color:'#444', fontSize:14, marginBottom:36, animation:'fadeUp .5s ease .05s both' }}>Build full-stack apps with AI — in seconds</div>

      <div style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:24, padding:'28px 24px', width:'100%', maxWidth:360, animation:'slideUp .5s ease .1s both' }}>
        {error && <div style={{ background:'#2a1020', border:'1px solid #ff204e33', borderRadius:10, padding:'10px 14px', fontSize:13, color:'#ff6b8a', marginBottom:14 }}>{error}</div>}

        {mode === 'login' ? (
          <form onSubmit={handleLogin}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:20, marginBottom:6 }}>Welcome back 👋</div>
            <div style={{ color:'#555', fontSize:13, marginBottom:24 }}>Sign in to your projects</div>
            <label style={{ fontSize:11, fontWeight:800, color:'#555', letterSpacing:.8, display:'block', marginBottom:6 }}>EMAIL</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required
              style={{ width:'100%', background:'#0f0f1e', border:'1.5px solid var(--border)', borderRadius:12, padding:'12px 14px', color:'#fff', fontSize:15, marginBottom:14 }}/>
            <label style={{ fontSize:11, fontWeight:800, color:'#555', letterSpacing:.8, display:'block', marginBottom:6 }}>PASSWORD</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required
              style={{ width:'100%', background:'#0f0f1e', border:'1.5px solid var(--border)', borderRadius:12, padding:'12px 14px', color:'#fff', fontSize:15, marginBottom:20 }}/>
            <button type="submit" disabled={loading}
              style={{ width:'100%', background:'var(--grad)', border:'none', borderRadius:12, padding:14, color:'#fff', fontWeight:800, fontSize:16, boxShadow:'0 4px 18px #FF3CAC33', opacity: loading?0.6:1 }}>
              {loading ? 'Signing in...' : 'Sign in →'}
            </button>
            <div style={{ textAlign:'center', marginTop:18, color:'#444', fontSize:13 }}>
              No account? <span onClick={()=>{setMode('signup');setError('')}} style={{ color:'var(--pink)', cursor:'pointer', fontWeight:700 }}>Create one free</span>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSignup}>
            <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:20, marginBottom:6 }}>Create account ✨</div>
            <div style={{ color:'#555', fontSize:13, marginBottom:24 }}>Free forever · No credit card</div>
            <label style={{ fontSize:11, fontWeight:800, color:'#555', letterSpacing:.8, display:'block', marginBottom:6 }}>EMAIL</label>
            <input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" required
              style={{ width:'100%', background:'#0f0f1e', border:'1.5px solid var(--border)', borderRadius:12, padding:'12px 14px', color:'#fff', fontSize:15, marginBottom:14 }}/>
            <label style={{ fontSize:11, fontWeight:800, color:'#555', letterSpacing:.8, display:'block', marginBottom:6 }}>PASSWORD</label>
            <input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Min 6 characters" required minLength={6}
              style={{ width:'100%', background:'#0f0f1e', border:'1.5px solid var(--border)', borderRadius:12, padding:'12px 14px', color:'#fff', fontSize:15, marginBottom:20 }}/>
            <button type="submit" disabled={loading}
              style={{ width:'100%', background:'var(--grad)', border:'none', borderRadius:12, padding:14, color:'#fff', fontWeight:800, fontSize:16, boxShadow:'0 4px 18px #FF3CAC33', opacity: loading?0.6:1 }}>
              {loading ? 'Creating account...' : 'Create account →'}
            </button>
            <div style={{ textAlign:'center', marginTop:18, color:'#444', fontSize:13 }}>
              Have an account? <span onClick={()=>{setMode('login');setError('')}} style={{ color:'var(--pink)', cursor:'pointer', fontWeight:700 }}>Sign in</span>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
