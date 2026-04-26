export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY not configured' })

  const { system, user, maxTokens = 1200 } = req.body

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: system }] },
        contents: [{ role: 'user', parts: [{ text: user }] }],
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0.8 }
      })
    })

    const data = await response.json()
    if (!response.ok) return res.status(response.status).json({ error: data.error?.message || 'Gemini error' })

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) return res.status(500).json({ error: 'Empty response' })

    return res.status(200).json({ text })

  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' })
  }
}
