// nodejs runtime = 60s timeout (fixes 504 from edge 10s limit)
export const runtime = 'nodejs'
export const maxDuration = 60

const SYSTEM = `You are an expert full-stack developer AI inside Buildify.
Generate a COMPLETE, BEAUTIFUL, self-contained HTML file with inline CSS and JS.

STRICT RULES:
- Return ONLY raw HTML starting with <!DOCTYPE html>. Zero markdown, zero backticks, zero explanation.
- Vanilla HTML/CSS/JS only. Google Fonts allowed.
- Visually stunning: gradients, animations, glassmorphism, micro-interactions.
- Fully functional and mobile-friendly.
- Strong color palette, CSS animations, beautiful Google Font, hover/active states on all buttons.
- When integrations are provided, USE their credentials in the generated code.
- When modifying existing HTML, return the COMPLETE updated file.`

export async function POST(req) {
  const { messages, existingHtml, integrations } = await req.json()

  let intContext = ''
  if (integrations && Object.keys(integrations).length > 0) {
    intContext = '\n\nUSER INTEGRATIONS - USE IN GENERATED CODE:\n'
    for (const [provider, config] of Object.entries(integrations)) {
      if (provider === 'supabase' && config.url && config.anonKey) {
        intContext += `- Supabase URL="${config.url}" anonKey="${config.anonKey}" - add supabase-js CDN and use it for database/auth\n`
      } else if (provider === 'stripe' && config.publishableKey) {
        intContext += `- Stripe publishableKey="${config.publishableKey}" - include Stripe.js and use for payments\n`
      } else if (provider === 'openai' && config.apiKey) {
        intContext += `- OpenAI apiKey="${config.apiKey}" - use OpenAI API for AI features\n`
      } else if (provider === 'github' && config.token) {
        intContext += `- GitHub token="${config.token}" - use GitHub API\n`
      }
    }
  }

  const userMessages = existingHtml
    ? [...messages.slice(0, -1), {
        role: 'user',
        content: `Existing HTML:\n${existingHtml}\n\n---\nRequest: ${messages[messages.length - 1].content}\n\nReturn complete updated HTML.`
      }]
    : messages

  // Use streaming to send status updates + final HTML
  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data) => controller.enqueue(encoder.encode('data: ' + JSON.stringify(data) + '\n\n'))

      try {
        send({ type: 'status', message: '🧠 Planning the app structure...' })
        await new Promise(r => setTimeout(r, 400))
        send({ type: 'status', message: '🎨 Designing the UI & layout...' })
        await new Promise(r => setTimeout(r, 400))
        send({ type: 'status', message: '⚡ Calling Claude AI...' })

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
          send({ type: 'error', message: `API error ${res.status}: ${err.slice(0, 200)}` })
          controller.close()
          return
        }

        send({ type: 'status', message: '🔧 Wiring up the logic...' })

        const data = await res.json()
        const raw = data.choices?.[0]?.message?.content ?? ''

        send({ type: 'status', message: '✨ Polishing styles & animations...' })
        await new Promise(r => setTimeout(r, 300))
        send({ type: 'status', message: '🚀 Finalizing your app...' })
        await new Promise(r => setTimeout(r, 300))

        const html = raw.replace(/^```html\s*/i, '').replace(/```\s*$/i, '').trim()

        if (!html) {
          send({ type: 'error', message: 'Empty response from AI' })
        } else {
          send({ type: 'done', html })
        }
      } catch (e) {
        send({ type: 'error', message: e.message || 'Unknown error' })
      }

      controller.close()
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
