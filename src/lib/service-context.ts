const serviceLabels = {
  operator: "Съёмка // оператор",
  photo: "Фотосъёмка",
  advertising: "Рекламный ролик",
  event: "Событие",
  reels: "Reels",
  livestream: "Прямая трансляция",
  editing: "Монтаж",
  color: "Цветокоррекция",
  "content-day": "Контент-съёмка // фото и видео",
  sde: "SDE // отчётное видео",
  interview: "Интервью // подкаст",
  other: "Другая задача",
} as const;

const pageServices: Record<string, keyof typeof serviceLabels> = {
  "/content-day": "content-day",
  "/cvetokorrekciya": "color",
  "/event-video": "event",
  "/photo": "photo",
  "/portretnaya-fotosessiya": "photo",
  "/reportazhnaya-fotosemka": "photo",
  "/pryamye-translyacii": "livestream",
  "/reels": "reels",
  "/reklamnye-roliki": "advertising",
  "/video-dlya-marketpleysov": "other",
};

export type ServiceContext = { service: string; sourcePath: string };

export function resolveServiceContext(search: string, routePath = "/"): ServiceContext {
  const params = new URLSearchParams(search);
  const requestedService = params.get("service") as keyof typeof serviceLabels | null;
  const sourcePath = params.get("from");
  const safeSource = sourcePath && Object.prototype.hasOwnProperty.call(pageServices, sourcePath) ? sourcePath : undefined;
  const routeService = pageServices[routePath];
  const serviceKey = requestedService && Object.prototype.hasOwnProperty.call(serviceLabels, requestedService)
    ? requestedService
    : safeSource ? pageServices[safeSource] : routeService;

  return {
    service: serviceKey ? serviceLabels[serviceKey] : serviceLabels.operator,
    sourcePath: safeSource ?? (routeService ? routePath : "/"),
  };
}

export function serviceContactHref(service: keyof typeof serviceLabels, from: string): string {
  const safeFrom = Object.prototype.hasOwnProperty.call(pageServices, from) ? from : "/";
  const query = new URLSearchParams({ service, from: safeFrom });
  return `/?${query.toString()}#contact`;
}

const calculatorTypes: Record<string, string> = {
  "photo-reportage": "Репортажная фотосъёмка",
  "photo-studio": "Студийная фотосъёмка",
  "content-day": "Контент для бизнеса",
  reels: "Reels / Shorts",
  event: "Видеосъёмка мероприятия",
  color: "Цветокоррекция",
  operator: "Выездная видеосъёмка",
};

export function resolveCalculatorType(service: string | null, availableTypes: readonly string[]): string | undefined {
  const target = service ? calculatorTypes[service] : undefined;
  return target && availableTypes.includes(target) ? target : undefined;
}
