import { Router } from 'express'
import Anthropic from '@anthropic-ai/sdk'
import type { ChatRequest, ChatResponse } from '@portfolio/shared'
import * as dotenv from 'dotenv'

dotenv.config()

export const chatRouter = Router()
const ASSISTANT_FALLBACK_PREFIX = 'I am answering from Anastasiia\'s portfolio knowledge base.'

const getAnthropicClient = () => {
  const apiKey = process.env.ANTHROPIC_API_KEY

  if (!apiKey) {
    return null
  }

  return new Anthropic({ apiKey })
}

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

function getLatestUserMessage(messages: ChatRequest['messages']) {
  return [...messages].reverse().find((message) => message.role === 'user')?.content ?? ''
}

function buildFallbackReply(input: string) {
  const normalized = input.toLowerCase()

  if (/(tech|stack|skill|react|typescript|node|docker|mongo|mysql)/.test(normalized)) {
    return `${ASSISTANT_FALLBACK_PREFIX} Anastasiia works as a full-stack developer with React, Redux, JavaScript, TypeScript, Node.js, Express, HTML/CSS, MySQL, MongoDB, and Docker. She enjoys building polished interfaces and practical backend systems together.`
  }

  if (/(relocat|remote|onsite|move|berlin|germany|location)/.test(normalized)) {
    return `${ASSISTANT_FALLBACK_PREFIX} Anastasiia is based in Oschatz, Germany, and she is open to relocation and new international opportunities. She is building her career in modern full-stack development and is happy to discuss the right team fit.`
  }

  if (/(experience|career|work|it career hub|journey)/.test(normalized)) {
    return `${ASSISTANT_FALLBACK_PREFIX} Anastasiia is currently studying and building projects at IT Career Hub Berlin from December 2024 to December 2025. Her work combines frontend craft, backend logic, and practical product thinking.`
  }

  if (/(ai|assistant|robot|guide|portfolio)/.test(normalized)) {
    return `${ASSISTANT_FALLBACK_PREFIX} This portfolio includes an AI assistant and a guide robot experience designed to present Anastasiia's work in a more interactive and accessible way. It reflects her interest in thoughtful UX, accessibility, and AI-enhanced interfaces.`
  }

  if (/(contact|email|hire|reach|github|resume|cv)/.test(normalized)) {
    return `${ASSISTANT_FALLBACK_PREFIX} You can contact Anastasiia at sulollarianastasiia@gmail.com and explore more of her work on GitHub at github.com/AnastasiiaSa04. She is open to professional conversations, collaboration, and new opportunities.`
  }

  if (/(language|german|english|russian)/.test(normalized)) {
    return `${ASSISTANT_FALLBACK_PREFIX} Anastasiia speaks German at C1 level, English at B2 level, and Russian as her native language. That helps her collaborate comfortably in international teams.`
  }

  return `${ASSISTANT_FALLBACK_PREFIX} Anastasiia Sulollari is a full-stack developer based in Germany with experience in React, TypeScript, Node.js, Express, and modern web interfaces. She is focused on building clean, thoughtful digital experiences and is open to new opportunities.`
}

chatRouter.post('/', async (req, res) => {
  try {
    const anthropic = getAnthropicClient()
    const { messages }: ChatRequest = req.body
    const latestUserMessage = getLatestUserMessage(messages)

    if (!messages?.length) {
      return res.status(400).json({ error: 'No messages' })
    }

    if (!anthropic) {
      return res.json({ reply: buildFallbackReply(latestUserMessage) })
    }

    const completion = await anthropic.messages.create({
      system: SYSTEM_PROMPT,
      messages,
      model: 'claude-3-5-haiku-20241022',
      temperature: 0.7,
      max_tokens: 700,
    })

    const result: ChatResponse = {
      reply: completion.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('\n\n') || 'Система временно недоступна.'
    }

    res.json(result)

  } catch (err: any) {
    console.error('Anthropic API Error:', err.message || err)
    const latestUserMessage = getLatestUserMessage(req.body.messages ?? [])
    res.json({ reply: buildFallbackReply(latestUserMessage) })
  }
})
