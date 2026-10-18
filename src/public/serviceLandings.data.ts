export interface ServiceLanding {
  path: string; label: string; title: string; description: string; h1: string;
  intro: string; heading: string; body: string; projectIds: string[];
  related: string[]; relatedLabels: string[];
}
export const SERVICE_LANDINGS: readonly ServiceLanding[] = [
  {"path": "/intervyu-i-podkasty", "label": "Интервью и подкасты", "title": "Съёмка интервью и подкастов | YELYGINN", "description": "Съёмка интервью и подкастов в Нижнем Новгороде: подготовка кадра, свет, запись и монтаж. Примеры работ и точная роль Юрия Елыгина в каждом проекте.", "h1": "Съёмка интервью и подкастов", "intro": "Съёмка интервью и подкастов начинается с задачи: разговор целиком, серия ответов или короткие фрагменты. Обсудим площадку, участников и результат; под них выберем кадр, свет и способ записи.", "heading": "Съёмка интервью и подкастов: что согласовать", "body": "Пришлите тему, число участников, длительность и пример формата. До записи проверим помещение, фон и звук. Число камер и монтаж согласуем заранее; из готового разговора можно отдельно собрать короткие версии.", "projectIds": ["scientists-nn", "sber-architecture", "egovtsev-podcast"], "related": ["/event-video", "/blog/podgotovka-intervyu"], "relatedLabels": ["Съёмка мероприятий", "Подготовка к интервью"]},
];
