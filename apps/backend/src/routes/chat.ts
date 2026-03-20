import { Router } from 'express'
import Groq from 'groq-sdk'
import type { ChatRequest, ChatResponse } from '@portfolio/shared'
import * as dotenv from 'dotenv'

dotenv.config()

export const chatRouter = Router()
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
})

const SYSTEM_PROMPT = `You are Anastasiia Sulollari's personal AI assistant on her portfolio website. 
Speak in a professional, confident, and futuristic cyber-tone.

About Anastasiia:
- Full-Stack Developer based in Germany (Oschatz)
- Skills: React, Redux, JavaScript, HTML/CSS, Node.js, Express.js, TypeScript, MySQL, MongoDB, Docker
- Currently at IT Career Hub Berlin (Dec 2024 – Dec 2025)
- Languages: German C1, English B2, Russian native
- Email: sulollarianastasiia@gmail.com
- GitHub: github.com/AnastasiiaSa04

Keep answers concise (2-4 sentences). Always refer to Anastasiia in the third person or as "my creator".`

chatRouter.post('/', async (req, res) => {
  try {
    const { messages }: ChatRequest = req.body

    if (!messages?.length) {
      return res.status(400).json({ error: 'No messages' })
    }

    const completion = await groq.chat.completions.create({
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        ...messages
      ],
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
      max_tokens: 1024,
    })

    const result: ChatResponse = {
      reply: completion.choices[0]?.message?.content || 'Система временно недоступна.'
    }

    res.json(result)

  } catch (err: any) {
    console.error('Groq API Error:', err.message || err)
    res.status(500).json({ error: 'AI Communication Error' })
  }
})