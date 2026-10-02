(() => {
  document.addEventListener("click", async (event) => {
    const button = event.target instanceof Element ? event.target.closest("[data-ai-copy]") : null;
    if (!button) return;
    const block = button.closest("[data-ai-ask]");
    const question = block?.querySelector("[data-ai-question]");
    const status = block?.querySelector("[data-ai-status]");
    if (!(question instanceof HTMLTextAreaElement) || !status) return;
    try {
      await navigator.clipboard.writeText(question.value);
      status.textContent = "Вопрос скопирован";
    } catch {
      question.focus();
      question.select();
      status.textContent = "Вопрос выделен. Скопируйте его вручную.";
    }
  });
})();
