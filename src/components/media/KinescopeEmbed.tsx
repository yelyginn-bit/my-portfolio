import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import type { VideoOrientation } from "../../lib/portfolio.data";

/**
 * Ленивый embed видео Kinescope.
 *
 * iframe не создаётся до активации: либо блок пересёк область видимости
 * (IntersectionObserver, с запасом в 200px), либо посетитель нажал на
 * заглушку сам. До активации — и в пре-рендеренном HTML, и до гидратации —
 * в DOM есть только доступная кнопка с текстом, что это за видео; на
 * странице кейса с 6–10 роликами это не даёт им всем грузиться разом.
 *
 * ID берётся из просмотровой ссылки Kinescope (`kinescope.io/<ID>`) — тот
 * же ID подставляется в embed-URL (`kinescope.io/embed/<ID>`).
 */

const ASPECT_PADDING: Record<VideoOrientation, string> = {
  "16:9": "56.25%",
  "9:16": "177.78%",
};

export interface KinescopeEmbedProps {
  id: string;
  orientation: VideoOrientation;
  /** Осмысленная подпись ролика — видна на заглушке и уходит в aria-label и iframe title. */
  title: string;
}

export function KinescopeEmbed({ id, orientation, title }: KinescopeEmbedProps) {
  const [active, setActive] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (active) return;
    const node = frameRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setActive(true);
      },
      { rootMargin: "200px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [active]);

  return (
    <div ref={frameRef} className="kinescope-embed" data-orientation={orientation} style={{ paddingTop: ASPECT_PADDING[orientation] }}>
      {active ? (
        <iframe
          className="kinescope-embed-iframe"
          src={`https://kinescope.io/embed/${id}`}
          title={title}
          allow="autoplay; fullscreen; picture-in-picture; encrypted-media; gyroscope; accelerometer; clipboard-write; screen-wake-lock;"
          allowFullScreen
        />
      ) : (
        <button
          type="button"
          className="kinescope-embed-placeholder"
          onClick={() => setActive(true)}
          aria-label={`Воспроизвести видео: ${title}`}
        >
          <span className="kinescope-embed-play" aria-hidden="true"><Play size={22} fill="currentColor" /></span>
          <span className="kinescope-embed-label">{title}</span>
        </button>
      )}
    </div>
  );
}

export default KinescopeEmbed;
