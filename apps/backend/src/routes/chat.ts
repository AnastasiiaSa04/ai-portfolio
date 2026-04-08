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
- High-performing Full-Stack Developer with a management background and 6+ years of leadership experience
- Skills: React, Redux, JavaScript, TypeScript, HTML/CSS, Tailwind CSS, Node.js, Express.js, REST APIs, MySQL, MongoDB, Docker, Git/GitHub, Agile/Scrum, Linux, system analysis, and cloud basics (AWS/Azure)
- IT Career Hub Berlin: Full-Stack Development Training (December 2024 – December 2025)
- Frontend experience at Kunst Schule Berlin (January 2026 – April 2026)
- Volunteer Interpreter at the German Red Cross (DRK) in Germany (June 2023 – June 2024)
- Former Director at Rosinant Riding School in Ukraine (May 2013 – December 2019)
- Former Riding Instructor at Rosinant Riding School in Ukraine (June 2010 – May 2013)
- Languages: German C1, English B2, Russian native
- Email: sulollarianastasiia@gmail.com
- Phone: +49 152 36148177
- GitHub: github.com/AnastasiiaSa04
- LinkedIn: linkedin.com/in/anastasiiasulollaribb3a20369
- Focus areas: frontend craftsmanship, practical backend development, accessible UX, and interactive AI experiences
- Portfolio highlights: an AI assistant, an accessibility-minded guide robot, and a modern full-stack portfolio experience.
- Resume note: the portfolio offers a German Lebenslauf PDF and an English CV PDF depending on the current site language.

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
      en: `Anastasiia completed full-stack development training at IT Career Hub Berlin from December 2024 to December 2025. She then gained frontend experience at Kunst Schule Berlin from January 2026 to April 2026, which strengthened her practical work with interfaces, layout, and visual presentation. Her earlier background also includes volunteer interpreting at the German Red Cross and more than six years of leadership experience as a director.`,
      ru: `Анастасия прошла full-stack обучение в IT Career Hub Berlin с декабря 2024 по декабрь 2025 года. Затем у неё был frontend-опыт в Kunst Schule Berlin с января 2026 по апрель 2026 года, что усилило её практические навыки работы с интерфейсами, вёрсткой и визуальной подачей. Ранее у неё также был опыт волонтёрного перевода в German Red Cross и более шести лет управленческого опыта в роли директора.`,
      de: `Anastasiia absolvierte von Dezember 2024 bis Dezember 2025 eine Full-Stack-Weiterbildung bei IT Career Hub Berlin. Danach sammelte sie von Januar 2026 bis April 2026 Frontend-Erfahrung an der Kunst Schule Berlin, was ihre praktische Arbeit mit Interfaces, Layout und visueller Darstellung gestärkt hat. Zuvor war sie außerdem ehrenamtliche Dolmetscherin beim Deutschen Roten Kreuz und bringt mehr als sechs Jahre Führungserfahrung als Direktorin mit.`,
    });
  }

  if (/(tech|stack|skill|react|typescript|node|docker|mongo|mysql|tailwind|scrum|agile|linux|git)/.test(normalized)) {
    return pickLocalizedText(language, {
      en: `Thank you for your question. Anastasiia works with a modern full-stack toolkit that includes React, Redux, JavaScript, TypeScript, HTML/CSS, Tailwind CSS, Node.js, Express, REST APIs, MySQL, MongoDB, Docker, Git, and Agile workflows. She enjoys building interfaces that feel clear and intentional while keeping the technical foundation reliable and maintainable.`,
      ru: `Спасибо за вопрос. Анастасия работает с современным full-stack стеком: React, Redux, JavaScript, TypeScript, HTML/CSS, Tailwind CSS, Node.js, Express, REST API, MySQL, MongoDB, Docker, Git и Agile-подходом. Ей особенно интересны проекты, где важны и визуальное качество, и надёжная, поддерживаемая техническая основа.`,
      de: `Vielen Dank für Ihre Frage. Anastasiia arbeitet mit einem modernen Full-Stack-Stack aus React, Redux, JavaScript, TypeScript, HTML/CSS, Tailwind CSS, Node.js, Express, REST-APIs, MySQL, MongoDB, Docker, Git und agilen Arbeitsweisen. Sie verbindet gern klare Benutzeroberflächen mit einer soliden und gut wartbaren technischen Basis.`,
    });
  }

  if (/(resume|cv|lebenslauf)/.test(normalized)) {
    return pickLocalizedText(language, {
      en: `Anastasiia's resume highlights strong frontend work with React and TypeScript, practical backend development with Node.js and SQL, as well as a leadership background from her years as a director. It also shows her volunteer interpreting work at the German Red Cross, her training at IT Career Hub Berlin, and her frontend experience at Kunst Schule Berlin. On the portfolio site, the Resume button opens the German PDF or the English PDF depending on the selected language.`,
      ru: `В резюме Анастасии особенно выделяются сильный frontend с React и TypeScript, практический backend на Node.js и SQL, а также управленческий бэкграунд из её опыта работы директором. Там также отражены её волонтёрский переводческий опыт в German Red Cross, обучение в IT Career Hub Berlin и frontend-опыт в Kunst Schule Berlin. На сайте кнопка Resume открывает немецкий или английский PDF в зависимости от выбранного языка страницы.`,
      de: `Im Lebenslauf von Anastasiia stechen ihr starkes Frontend mit React und TypeScript, praktische Backend-Erfahrung mit Node.js und SQL sowie ihr Management-Hintergrund aus ihrer Zeit als Direktorin besonders hervor. Außerdem sind dort ihre ehrenamtliche Dolmetschertätigkeit beim Deutschen Roten Kreuz, ihre Weiterbildung am IT Career Hub Berlin und ihre Frontend-Erfahrung an der Kunst Schule Berlin aufgeführt. Auf der Portfolio-Seite öffnet die Resume-Schaltfläche je nach ausgewählter Sprache den deutschen oder englischen PDF-Lebenslauf.`,
    });
  }

  if (/(language|languages|sprach|deutsch|english|russian)/.test(normalized)) {
    return pickLocalizedText(language, {
      en: `Anastasiia speaks German at C1 level, English at B2 level, and Russian as her native language. This multilingual background also supports her communication with international teams and users.`,
      ru: `Анастасия говорит на немецком на уровне C1, на английском на уровне B2, а русский является её родным языком. Такой языковой опыт помогает ей уверенно взаимодействовать с международными командами и пользователями.`,
      de: `Anastasiia spricht Deutsch auf C1-Niveau, Englisch auf B2-Niveau und Russisch als Muttersprache. Dieser mehrsprachige Hintergrund unterstützt auch ihre Kommunikation mit internationalen Teams und Nutzerinnen und Nutzern.`,
    });
  }

  // Дефолтный ответ если ничего не подошло
  return pickLocalizedText(language, {
    en: `Thank you for your question. Anastasiia Sulollari is a full-stack developer based in Germany, ready for relocation across Germany, with strong frontend skills, practical backend experience, and frontend work at Kunst Schule Berlin from January 2026 to April 2026. She also brings leadership experience, multilingual communication, and a thoughtful product mindset. How can I help you explore her background in more detail?`,
    ru: `Спасибо за вопрос. Анастасия Сулоллари — full-stack разработчик из Германии, готовая к релокации по всей Германии, с сильным frontend-бэкграундом, практическим backend-опытом и frontend-опытом в Kunst Schule Berlin с января 2026 по апрель 2026 года. Она также сочетает управленческий опыт, многоязычную коммуникацию и внимательный product mindset. Чем я могу помочь вам узнать больше о её опыте?`,
    de: `Vielen Dank für Ihre Frage. Anastasiia Sulollari ist eine Full-Stack-Entwicklerin aus Deutschland, bereit für Relocation innerhalb Deutschlands, mit starken Frontend-Skills, praktischer Backend-Erfahrung und Frontend-Arbeit an der Kunst Schule Berlin von Januar 2026 bis April 2026. Sie verbindet außerdem Führungserfahrung, mehrsprachige Kommunikation und ein durchdachtes Produktverständnis. Wie kann ich Ihnen helfen, mehr über ihren Hintergrund zu erfahren?`,
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
      reply: reply || buildFallbackReply(latestUserMessage),
    };

    res.json(result);
  } catch (err: any) {
    console.error('AI Router Error:', err.message || err);
    const latestUserMessage = getLatestUserMessage(req.body.messages ?? []);
    res.json({ reply: buildFallbackReply(latestUserMessage) });
  }
});
