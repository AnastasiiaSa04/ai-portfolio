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
- Ready for relocation across Germany
- Skills: React, Redux, JavaScript, HTML/CSS, Node.js, Express.js, TypeScript, MySQL, MongoDB, Docker
- IT Career Hub Berlin: Full-Stack Development Training (December 2024 – December 2025)
- Frontend experience at Kunst Schule Berlin (January 2026 – April 2026)
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

  if (/(relocation|relocat|remote|onsite|move|umzug|berlin|germany|deutschland|location)/.test(normalized)) {
    return pickLocalizedText(language, {
      en: `Anastasiia is based in Oschatz, Germany, and she is ready for relocation across Germany. She is open to full-time opportunities, collaborative teams, and roles where she can keep growing in modern full-stack development.`,
      ru: `Анастасия живёт в Oschatz, Германия, и готова к релокации по всей Германии. Она открыта к full-time возможностям, сильным командам и ролям, где сможет расти как modern full-stack developer.`,
      de: `Anastasiia lebt in Oschatz in Deutschland und ist bereit, innerhalb Deutschlands umzuziehen. Sie ist offen für Vollzeitstellen, starke Teams und Rollen, in denen sie sich im modernen Full-Stack-Bereich weiterentwickeln kann.`,
    });
  }

  if (/(kunst|schule|frontend experience|front-end experience|career|journey|experience|erfahrung|laufbahn)/.test(normalized)) {
    return pickLocalizedText(language, {
      en: `Anastasiia completed full-stack development training at IT Career Hub Berlin from December 2024 to December 2025. She also gained frontend experience at Kunst Schule Berlin from January 2026 to April 2026, which strengthened her practical work with interfaces, layout, and presentation.`,
      ru: `Анастасия прошла full-stack обучение в IT Career Hub Berlin с декабря 2024 по декабрь 2025 года. Также у неё был frontend-опыт в Kunst Schule Berlin с января 2026 по апрель 2026 года, что усилило её практические навыки работы с интерфейсами, вёрсткой и визуальной подачей.`,
      de: `Anastasiia absolvierte von Dezember 2024 bis Dezember 2025 eine Full-Stack-Weiterbildung bei IT Career Hub Berlin. Zusätzlich sammelte sie von Januar 2026 bis April 2026 Frontend-Erfahrung an der Kunst Schule Berlin, was ihre praktische Arbeit mit Interfaces, Layout und visueller Darstellung gestärkt hat.`,
    });
  }

  if (/(tech|stack|skill|react|typescript|node|docker|mongo|mysql)/.test(normalized)) {
    return pickLocalizedText(language, {
      en: `Thank you for your question. Anastasiia works with a modern full-stack toolkit that includes React, Redux, JavaScript, TypeScript, Node.js, Express, HTML/CSS, MySQL, MongoDB, and Docker. She enjoys building interfaces that feel clear and intentional while keeping the technical foundation reliable.`,
      ru: `Спасибо за вопрос. Анастасия работает с современным full-stack стеком: React, Redux, JavaScript, TypeScript, Node.js, Express, HTML/CSS, MySQL, MongoDB и Docker. Ей особенно интересны проекты, где важны и визуальное качество, и надёжная техническая основа.`,
      de: `Vielen Dank für Ihre Frage. Anastasiia arbeitet mit einem modernen Full-Stack-Stack aus React, Redux, JavaScript, TypeScript, Node.js, Express, HTML/CSS, MySQL, MongoDB und Docker. Sie verbindet gern klare Benutzeroberflächen mit einer soliden technischen Basis.`,
    });
  }

  // Дефолтный ответ если ничего не подошло
  return pickLocalizedText(language, {
    en: `Thank you for your question. Anastasiia Sulollari is a full-stack developer based in Germany, ready for relocation across Germany, with experience in React, TypeScript, Node.js, and frontend work at Kunst Schule Berlin from January 2026 to April 2026. How can I help you find out more about her work?`,
    ru: `Спасибо за вопрос. Анастасия Сулоллари — full-stack разработчик из Германии, готовая к релокации по всей Германии, с опытом работы с React, TypeScript, Node.js и frontend-опытом в Kunst Schule Berlin с января 2026 по апрель 2026 года. Чем я могу помочь вам узнать больше о её работе?`,
    de: `Vielen Dank für Ihre Frage. Anastasiia Sulollari ist eine Full-Stack-Entwicklerin aus Deutschland, bereit für Relocation innerhalb Deutschlands, mit Erfahrung in React, TypeScript, Node.js und Frontend-Arbeit an der Kunst Schule Berlin von Januar 2026 bis April 2026. Wie kann ich Ihnen helfen, mehr über ihre Arbeit zu erfahren?`,
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
