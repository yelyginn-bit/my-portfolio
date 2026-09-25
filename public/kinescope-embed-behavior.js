// Клик-по-постеру → iframe (та же лёгкая загрузка, что у React
// KinescopeEmbed — src/components/media/KinescopeEmbed.tsx): ничего не
// грузится, пока не нажали на плей.
(() => {
  document.querySelectorAll(".kinescope-embed").forEach((frame) => {
    const button = frame.querySelector(".kinescope-embed-placeholder");
    const id = frame.getAttribute("data-kinescope-id");
    if (!(button instanceof HTMLElement) || !id) return;
    button.addEventListener("click", () => {
      const iframe = document.createElement("iframe");
      iframe.className = "kinescope-embed-iframe";
      iframe.src = `https://kinescope.io/embed/${id}`;
      iframe.title = button.getAttribute("aria-label") || "";
      iframe.allow = "autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer; clipboard-write; screen-wake-lock;";
      iframe.allowFullscreen = true;
      button.replaceWith(iframe);
    });
  });
})();
