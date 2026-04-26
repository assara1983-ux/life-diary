// Vercel Serverless Function
// Использует Groq — бесплатный tier
// Бесплатно: 30 запросов/мин, 14400 запросов/день

export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'GROQ_API_KEY not configured' })

  const { system, user, maxTokens = 1200 } = req.body

  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        max_tokens: maxTokens,
        temperature: 0.8,
        messages: [
          { role: 'system', content: system },
          { role: 'user', content: user }
        ]
      })
    })

    const data = await response.json()

    if (!response.ok) {
      console.error('Groq error:', data)
      return res.status(response.status).json({ error: data.error?.message || 'Groq error' })
    }

    const text = data.choices?.[0]?.message?.content
    if (!text) return res.status(500).json({ error: 'Empty response from Groq' })

    return res.status(200).json({ text })

  } catch (error) {
    console.error('Server error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
