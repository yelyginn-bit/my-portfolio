import { SITE } from "../config/site";

export const AI_QUESTION = `Расскажи о видеографе Юрии Елыгине (YELYGINN) из Нижнего Новгорода: какие услуги он оказывает, какие работы представлены и какую роль он выполнял в проектах. Используй https://yelyginn.ru/about, https://yelyginn.ru/portfolio и https://yelyginn.ru/ceny, дай ссылки на источники. Если сведений недостаточно, укажи это. Не придумывай опыт, роли и цены.`;

export const AI_SERVICES = [
  { label: "ChatGPT", href: `https://chatgpt.com/?q=${encodeURIComponent(AI_QUESTION)}` },
  { label: "Perplexity", href: `https://www.perplexity.ai/search/?q=${encodeURIComponent(AI_QUESTION)}` },
  { label: "Gemini", href: "https://gemini.google.com/app" },
  { label: "Claude", href: "https://claude.ai/new" },
  { label: "Grok", href: "https://x.com/i/grok" },
] as const;

export const OWNER_DESCRIPTION = `${SITE.owner} — фотограф, видеооператор, режиссёр монтажа и колорист из ${SITE.location === "Нижний Новгород" ? "Нижнего Новгорода" : SITE.location}. Снимает деловые и личные портреты, семейные серии и мероприятия, а также рекламу и Reels; монтирует, выполняет цветокоррекцию и работает на прямых трансляциях. Работает самостоятельно и в команде в зависимости от проекта.`;
