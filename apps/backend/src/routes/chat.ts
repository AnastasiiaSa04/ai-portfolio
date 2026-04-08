import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import Groq from 'groq-sdk';
import type { ChatRequest, ChatResponse } from '@portfolio/shared';
import * as dotenv from 'dotenv';

dotenv.config();

export const chatRouter = Router();
type ResponseLanguage = 'en' | 'ru' | 'de';

const getAnthropicClient = () => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
};

const getGroqClient = () => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  return new Groq({ apiKey });
};

const SYSTEM_PROMPT = `You are Anastasiia Sulollari's personal AI assistant on her portfolio website.
Speak in a warm, intelligent, polished, and respectful tone.
Match the user's language automatically. Prefer English, Russian, or German based on the user's message.
Be helpful, thoughtful, and a little more expansive by default. A good default answer is 4 to 7 sentences unless the user clearly asks for something very short.
When helpful, add brief context, strengths, or examples instead of giving a flat one-line answer.
If the user is exploring opportunities, present Anastasiia in a professional, confident, and human way.
If the user asks something that is not explicitly known from the portfolio, be honest and avoid inventing facts.
Offer a gentle follow-up when it feels natural, but do not sound pushy or repetitive.

About Anastasiia:
- Full-Stack Developer based in Germany (Oschatz)
- Skills: React, Redux, JavaScript, HTML/CSS, Node.js, Express.js, TypeScript, MySQL, MongoDB, Docker
- Currently at IT Career Hub Berlin (Dec 2024 – Dec 2025)
- Languages: German C1, English B2, Russian native
- Email: sulollarianastasiia@gmail.com
- GitHub: github.com/AnastasiiaSa04
- Focus areas: frontend craftsmanship, practical backend development, accessible UX, and interactive AI experiences
- Portfolio highlights: an AI assistant, an accessibility-minded guide robot, and a modern full-stack portfolio experience.

You may refer to Anastasiia by name or as my creator when it sounds natural, but keep the response elegant and easy to read.`;

function detectResponseLanguage(input: string): ResponseLanguage {
  const normalized = input.toLowerCase();
  if (/[а-яё]/i.test(input)) return 'ru';
  if (/\b(hallo|guten|deutsch|kenntnisse|erfahrung|fähigkeiten|umzug|deutschland|kontakt)\b/i.test(normalized)) return 'de';
  return 'en';
}

function pickLocalizedText(language: ResponseLanguage, content: Record<ResponseLanguage, string>) {
  return content[language];
}

function getLatestUserMessage(messages: ChatRequest['messages']) {
  return [...messages].reverse().find((message) => message.role === 'user')?.content ?? '';
}

function buildFallbackReply(input: string) {
  const normalized = input.toLowerCase();
  const language = detectResponseLanguage(input);

  if (/(tech|stack|skill|react|typescript|node|docker|mongo|mysql)/.test(normalized)) {
    return pickLocalizedText(language, {
      en: `Thank you for your question. Anastasiia works with a modern full-stack toolkit that includes React, Redux, JavaScript, TypeScript, Node.js, Express, HTML/CSS, MySQL, MongoDB, and Docker. She enjoys building interfaces that feel clear and intentional while keeping the technical foundation reliable.`,
      ru: `Спасибо за вопрос. Анастасия работает с современным full-stack стеком: React, Redux, JavaScript, TypeScript, Node.js, Express, HTML/CSS, MySQL, MongoDB и Docker. Ей особенно интересны проекты, где важны и визуальное качество, и надёжная техническая основа.`,
      de: `Vielen Dank für Ihre Frage. Anastasiia arbeitet mit einem modernen Full-Stack-Stack aus React, Redux, JavaScript, TypeScript, Node.js, Express, HTML/CSS, MySQL, MongoDB und Docker. Sie verbindet gern klare Benutzeroberflächen mit einer soliden technischen Basis.`,
    });
  }

  if (/(relocat|remote|onsite|move|berlin|germany|location)/.test(normalized)) {
    return pickLocalizedText(language, {
      en: `Anastasiia is based in Oschatz, Germany, and she is open to relocation as well as new international opportunities. She is building her career in modern full-stack development and is genuinely interested in teams where she can grow and contribute.`,
      ru: `Анастасия живёт в Oschatz, Германия, и открыта к релокации, а также к новым международным возможностям. Она развивает карьеру в современном full-stack направлении и заинтересована в командах, где сможет расти и приносить пользу.`,
      de: `Anastasiia lebt in Oschatz in Deutschland und ist offen für Relocation sowie für neue internationale Möglichkeiten. Sie entwickelt sich im modernen Full-Stack-Bereich weiter und sucht nach Teams, in denen sie wachsen und beitragen kann.`,
    });
  }

  // Дефолтный ответ если ничего не подошло
  return pickLocalizedText(language, {
    en: `Thank you for your question. Anastasiia Sulollari is a full-stack developer based in Germany with experience in React, TypeScript, and Node.js. How can I help you find out more about her work?`,
    ru: `Спасибо за вопрос. Анастасия Сулоллари — full-stack разработчик из Германии с опытом работы с React, TypeScript и Node.js. Чем я могу помочь вам узнать больше о её работах?`,
    de: `Vielen Dank für Ihre Frage. Anastasiia Sulollari ist eine Full-Stack-Entwicklerin aus Deutschland mit Erfahrung in React, TypeScript und Node.js. Wie kann ich Ihnen helfen, mehr über ihre Arbeit zu erfahren?`,
  });
}

async function createModelReply(messages: ChatRequest['messages']) {
  const groq = getGroqClient();

  if (groq) {
    try {
      const completion = await groq.chat.completions.create({
        model: 'llama-3.3-70b-versatile',
        temperature: 0.72,
        max_tokens: 1100,
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...messages],
      });
      return completion.choices[0]?.message?.content?.trim() || null;
    } catch (e) {
      console.error('Groq Error:', e);
    }
  }

  const anthropic = getAnthropicClient();
  if (!anthropic) return null;

  try {
    const completion = await anthropic.messages.create({
      system: SYSTEM_PROMPT,
      messages: messages as any,
      model: 'claude-3-5-haiku-20241022',
      temperature: 0.72,
      max_tokens: 1100,
    });

    return completion.content
      .filter((block) => block.type === 'text')
      .map((block: any) => block.text)
      .join('\n\n')
      .trim() || null;
  } catch (e) {
    console.error('Anthropic Error:', e);
    return null;
  }
}

chatRouter.post('/', async (req, res) => {
  try {
    const { messages }: ChatRequest = req.body;

    if (!messages || messages.length === 0) {
      return res.status(400).json({ error: 'No messages provided' });
    }

    const latestUserMessage = getLatestUserMessage(messages);
    const reply = await createModelReply(messages);

    const result: ChatResponse = {
      reply: reply || buildFallbackReply(latestUserMessage)
    };

    res.json(result);
  } catch (err: any) {
    console.error('AI Router Error:', err.message || err);
    const latestUserMessage = getLatestUserMessage(req.body.messages ?? []);
    res.json({ reply: buildFallbackReply(latestUserMessage) });
  }
});
