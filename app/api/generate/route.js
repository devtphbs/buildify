export const runtime = 'edge'

const SYSTEM = `You are an expert full-stack developer AI inside Buildify.
Generate a COMPLETE, BEAUTIFUL, self-contained HTML file with inline CSS and JS.

STRICT RULES:
- Return ONLY raw HTML starting with <!DOCTYPE html>. Zero markdown, zero backticks, zero explanation.
- Vanilla HTML/CSS/JS only. Google Fonts allowed.
- Visually stunning: gradients, animations, glassmorphism, micro-interactions.
- Fully functional and mobile-friendly.
- Strong color palette, CSS animations, beautiful Google Font, hover/active states.
- When the user has integrations connected (Supabase, Stripe, etc.), USE them in the generated code with the provided credentials.
- When modifying existing HTML, return the COMPLETE updated file.`

export async function POST(req) {
  const { messages, existingHtml, integrations } = await req.json()

  // Build context about connected integrations
  let intContext = ''
  if (integrations && Object.keys(integrations).length > 0) {
    intContext = '\n\nUSER\'S CONNECTED INTEGRATIONS — USE THESE IN THE CODE:\n'
    for (const [provider, config] of Object.entries(integrations)) {
      if (provider === 'supabase' && config.url && config.anonKey) {
        intContext += `- Supabase: URL="${config.url}", anon key="${config.anonKey}" — include <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script> and use it for database/auth\n`
      } else if (provider === 'stripe' && config.publishableKey) {
        intContext += `- Stripe: publishable key="${config.publishableKey}" — include Stripe.js and use it for payments\n`
      } else if (provider === 'openai' && config.apiKey) {
        intContext += `- OpenAI: API key="${config.apiKey}" — call OpenAI API from the frontend for AI features\n`
      } else if (provider === 'github' && config.token) {
        intContext += `- GitHub: token="${config.token}" — use GitHub API for repo features\n`
      }
    }
  }

  const userMessages = existingHtml
    ? [...messages.slice(0, -1), {
        role: 'user',
        content: `Existing HTML:\n${existingHtml}\n\n---\nRequest: ${messages[messages.length - 1].content}\n\nReturn complete updated HTML.`
      }]
    : messages

  const res = await fetch('https://router.requesty.ai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${process.env.REQUESTY_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'anthropic/claude-sonnet-4-5',
      max_tokens: 8000,
      messages: [
        { role: 'system', content: SYSTEM + intContext },
        ...userMessages,
      ],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    return Response.json({ html: '', error: err }, { status: 500 })
  }

  const data = await res.json()
  const raw = data.choices?.[0]?.message?.content ?? ''
  const html = raw.replace(/^```html\s*/i, '').replace(/```\s*$/i, '').trim()
  return Response.json({ html })
}
