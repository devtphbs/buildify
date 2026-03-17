'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'

export default function Dashboard() {
  const [user, setUser] = useState(null)
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const router = useRouter()
  const sb = createClient()

  useEffect(() => {
    sb.auth.getSession().then(({ data: { session } }) => {
      if (!session) return router.push('/')
      setUser(session.user)
      loadProjects()
    })
  }, [])

  async function loadProjects() {
    const { data } = await sb.from('projects').select('*').order('updated_at', { ascending: false })
    setProjects(data || [])
    setLoading(false)
  }

  async function createProject() {
    const { data } = await sb.from('projects').insert({ name: 'Untitled Project', html: '' }).select().single()
    if (data) router.push(`/builder/${data.id}`)
  }

  async function logout() {
    await sb.auth.signOut()
    router.push('/')
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div style={{ minHeight:'100dvh', display:'flex', flexDirection:'column' }}>
      {/* NAV */}
      <nav style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'13px 18px', background:'rgba(8,8,16,.9)', backdropFilter:'blur(20px)', borderBottom:'1px solid var(--border)', position:'sticky', top:0, zIndex:50 }}>
        <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:900, fontSize:18, background:'linear-gradient(90deg,#FF3CAC,#FF6B35,#FFE600)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>✦ buildify</div>
        <button onClick={logout} style={{ background:'#1a1a2e', border:'1px solid var(--border)', borderRadius:10, padding:'8px 14px', color:'#aaa', fontSize:13, fontWeight:700 }}>Sign out</button>
      </nav>

      {/* CONTENT */}
      <div style={{ flex:1, overflow:'auto', padding:'20px 18px 60px' }}>
        <div style={{ fontFamily:"'Syne',sans-serif", fontWeight:800, fontSize:22, marginBottom:4 }}>{greeting}! 👋</div>
        <div style={{ color:'#444', fontSize:13, marginBottom:28 }}>{user?.email}</div>

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
          <span style={{ fontWeight:800, fontSize:15 }}>📁 Your Projects</span>
        </div>

        {loading ? (
          <div style={{ color:'#444', textAlign:'center', padding:40 }}>Loading...</div>
        ) : (
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
            {/* NEW PROJECT */}
            <div onClick={createProject} style={{ background:'var(--card)', border:'1.5px dashed var(--border)', borderRadius:16, padding:14, cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:8, minHeight:150, transition:'border-color .2s' }}
              onMouseEnter={e=>e.currentTarget.style.borderColor='#FF3CAC55'}
              onMouseLeave={e=>e.currentTarget.style.borderColor='var(--border)'}>
              <div style={{ width:40, height:40, borderRadius:12, background:'#1a1a2e', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20 }}>✨</div>
              <div style={{ color:'#555', fontSize:12, fontWeight:700 }}>New Project</div>
            </div>

            {projects.map(p => (
              <div key={p.id} onClick={() => router.push(`/builder/${p.id}`)}
                style={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:16, padding:14, cursor:'pointer', transition:'all .2s' }}
                onMouseEnter={e=>{ e.currentTarget.style.borderColor='#FF3CAC44'; e.currentTarget.style.transform='translateY(-2px)' }}
                onMouseLeave={e=>{ e.currentTarget.style.borderColor='var(--border)'; e.currentTarget.style.transform='' }}>
                <div style={{ width:'100%', height:70, background:'#0a0a14', borderRadius:10, marginBottom:10, overflow:'hidden', border:'1px solid var(--border)' }}>
                  {p.html
                    ? <iframe srcDoc={p.html} style={{ width:'200%', height:'200%', transform:'scale(.5)', transformOrigin:'0 0', border:'none', pointerEvents:'none' }} sandbox="allow-scripts" />
                    : <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100%', color:'#2a2a3e', fontSize:20 }}>✦</div>
                  }
                </div>
                <div style={{ fontWeight:800, fontSize:13, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis', marginBottom:3 }}>{p.name}</div>
                <div style={{ color:'#444', fontSize:11 }}>{new Date(p.updated_at).toLocaleDateString('en-SE', { month:'short', day:'numeric' })}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
