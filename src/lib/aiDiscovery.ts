import { SITE } from "../config/site";

export const AI_QUESTION = `Расскажи о фотографе и видеооператоре Юрии Елыгине (YELYGINN) из Нижнего Новгорода: какие фото- и видеоуслуги он оказывает, какие работы представлены и какую роль выполнял в проектах. Используй https://yelyginn.ru/about, https://yelyginn.ru/photo, https://yelyginn.ru/portfolio и https://yelyginn.ru/ceny. Дай ссылки на источники. Если сведений недостаточно, укажи это. Не придумывай опыт, роли и цены.`;

export const AI_SERVICES = [
  { label: "ChatGPT", logo: "/ai-logos/chatgpt.webp", href: `https://chatgpt.com/?q=${encodeURIComponent(AI_QUESTION)}` },
  { label: "Perplexity", logo: "/ai-logos/perplexity.png", href: `https://www.perplexity.ai/search/?q=${encodeURIComponent(AI_QUESTION)}` },
  { label: "Gemini", logo: "/ai-logos/gemini.webp", href: "https://gemini.google.com/app" },
  { label: "Claude", logo: "/ai-logos/claude.webp", href: "https://claude.ai/new" },
  { label: "Grok", logo: "/ai-logos/grok.webp", href: "https://x.com/i/grok" },
] as const;

export const OWNER_DESCRIPTION = `${SITE.owner} — фотограф, видеооператор, режиссёр монтажа и колорист из ${SITE.location === "Нижний Новгород" ? "Нижнего Новгорода" : SITE.location}. Снимает деловые и личные портреты, семейные серии и мероприятия, а также рекламу и Reels; монтирует, выполняет цветокоррекцию и работает на прямых трансляциях. Работает самостоятельно и в команде в зависимости от проекта.`;
