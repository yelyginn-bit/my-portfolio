import { AI_QUESTION, AI_SERVICES } from "../../lib/aiDiscovery";

export function AiAskBlock() {
  return <section className="v3-ai-ask" aria-labelledby="ai-ask-title" data-ai-ask>
    <div><h2 id="ai-ask-title">Спросите нейросеть</h2><p>О моих услугах и работах — с опорой на источники.</p></div>
    <div className="v3-ai-ask__actions">
      <nav aria-label="Открыть нейросеть">{AI_SERVICES.map((service) => <a key={service.label} href={service.href} target="_blank" rel="noopener noreferrer">{service.label}<span aria-hidden="true"> ↗</span></a>)}</nav>
      <details><summary>Вопрос о Юрии Елыгине</summary><label htmlFor="ai-ask-question">Скопируйте вопрос и вставьте его в выбранную нейросеть.</label><textarea id="ai-ask-question" data-ai-question readOnly value={AI_QUESTION} rows={5} /><button type="button" data-ai-copy>Скопировать вопрос</button><span data-ai-status role="status" aria-live="polite" /></details>
    </div>
  </section>;
}
