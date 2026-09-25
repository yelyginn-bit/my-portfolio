import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent as ReactKeyboardEvent } from "react";
import type { ColorComparePair } from "../lib/colorCompare.data";

/**
 * Сплит-слайдер «до / после» для цветокоррекции.
 *
 * Требования дизайн-контракта §6.3:
 * — клавиатурное управление стрелками с шагом 5%;
 * — role="slider" с корректными aria-value*;
 * — подпись, что именно изменилось;
 * — оба кадра одного разрешения и кропа;
 * — при prefers-reduced-motion остаётся статичное состояние 50/50 без анимаций.
 *
 * Реализация без внешних библиотек: перетаскивание работает через pointer
 * events, поэтому мышь, тач и стилус обрабатываются одним кодом.
 */
export const ColorCompare = ({ pair }: { pair: ColorComparePair; key?: string | number }) => {
  const [position, setPosition] = useState(50);
  const [dragging, setDragging] = useState(false);
  // ≤767px: шторка нечитаема (рамка 351×197 делится на две половины по
  // ~175px — тона кожи и тени не видно). Переключатель на весь кадр даёт
  // вдвое больше картинки в каждом состоянии. mobileView independent от
  // position: слайдер на мобильном не перетаскивается вовсе.
  const [mobileView, setMobileView] = useState<"before" | "after">("after");
  const [isNarrow, setIsNarrow] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);

  useEffect(() => setPosition(50), [pair.id]);
  useEffect(() => setMobileView("after"), [pair.id]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const update = () => setIsNarrow(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const setFromClientX = useCallback((clientX: number) => {
    const frame = frameRef.current;
    if (!frame) return;
    const rect = frame.getBoundingClientRect();
    if (rect.width === 0) return;
    const next = ((clientX - rect.left) / rect.width) * 100;
    setPosition(Math.min(100, Math.max(0, next)));
  }, []);

  useEffect(() => {
    if (!dragging) return;
    // PROMPT-32 §1.2.8: setFromClientX на каждый "raw" pointermove гонит React
    // ре-рендер чаще, чем успевает перекраситься clip-path на полноразмерной
    // картинке (>16мс) — события копятся в очереди, ручка обновляется рывками,
    // догоняя пачками. Схлопываем в один setState на кадр — ручка и линия
    // раздела берутся из одного и того же React-состояния, так что расходиться
    // им всё равно некуда, но обновление идёт не чаще отрисовки экрана.
    let rafId: number | null = null;
    let pendingX: number | null = null;
    const flush = () => {
      rafId = null;
      if (pendingX !== null) {
        setFromClientX(pendingX);
        pendingX = null;
      }
    };
    const onMove = (event: PointerEvent) => {
      pendingX = event.clientX;
      if (rafId === null) rafId = requestAnimationFrame(flush);
    };
    const onUp = () => setDragging(false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
  }, [dragging, setFromClientX]);

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const step = event.shiftKey ? 10 : 5;
    if (event.key === "ArrowLeft" || event.key === "ArrowDown") {
      event.preventDefault();
      setPosition((p) => Math.max(0, p - step));
    } else if (event.key === "ArrowRight" || event.key === "ArrowUp") {
      event.preventDefault();
      setPosition((p) => Math.min(100, p + step));
    } else if (event.key === "Home") {
      event.preventDefault();
      setPosition(0);
    } else if (event.key === "End") {
      event.preventDefault();
      setPosition(100);
    }
  };

  // На ≤767px оба изображения уже загружены (тот же <img>, просто без
  // clip-path-разреза) — переключение кнопкой меняет только видимость,
  // без повторной загрузки и без мигания.
  const effectivePosition = isNarrow ? (mobileView === "before" ? 100 : 0) : position;
  const afterVisible = !isNarrow || mobileView === "after";
  const beforeVisible = isNarrow && mobileView === "before";

  return (
    <figure className="color-compare">
      <div
        ref={frameRef}
        className="color-compare-frame"
        data-dragging={dragging || undefined}
        data-mobile-view={isNarrow ? mobileView : undefined}
        onPointerDown={(event) => {
          if (isNarrow) return;
          event.preventDefault();
          setDragging(true);
          setFromClientX(event.clientX);
        }}
        onClick={() => {
          // Тап по кадру — дополнение к кнопкам ниже, не замена им.
          if (isNarrow) setMobileView((view) => (view === "before" ? "after" : "before"));
        }}
      >
        {/* Результат лежит снизу и виден целиком: если скрипт не отработает,
            посетитель увидит финальный кадр, а не пустоту. */}
        <img
          className="color-compare-img"
          src={pair.after}
          alt={afterVisible ? pair.afterAlt : ""}
          aria-hidden={afterVisible ? undefined : "true"}
          width={pair.width}
          height={pair.height}
          loading="lazy"
          decoding="async"
        />

        {/* Исходник лежит поверх и обрезается clip-path, а не шириной контейнера:
            так кадр не сжимается и оба изображения гарантированно совпадают
            пиксель в пиксель при любом положении разделителя (десктоп) или
            переключателя (мобильный — 0% или 100%, без промежуточных). */}
        <img
          className="color-compare-img color-compare-img--before"
          style={{ clipPath: `inset(0 ${100 - effectivePosition}% 0 0)` }}
          src={pair.before}
          alt={beforeVisible ? pair.beforeAlt : ""}
          aria-hidden={beforeVisible ? undefined : "true"}
          width={pair.width}
          height={pair.height}
          loading="lazy"
          decoding="async"
        />

        <span className="color-compare-tag color-compare-tag--before" aria-hidden="true">Исходник</span>
        <span className="color-compare-tag color-compare-tag--after" aria-hidden="true">После цвета</span>

        <div
          role="slider"
          tabIndex={isNarrow ? -1 : 0}
          aria-label={`Сравнение до и после цветокоррекции: ${pair.title}`}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(position)}
          aria-valuetext={`Исходник виден на ${Math.round(position)} процентов`}
          className="color-compare-handle"
          style={{ left: `${position}%` }}
          onKeyDown={onKeyDown}
        >
          <span className="color-compare-grip" aria-hidden="true" />
        </div>
      </div>

      {/* Только ≤767px (скрыто в CSS на десктопе) — замена шторке, а не
          дополнение: на узком экране деления не видно. */}
      <div className="color-compare-toggle" role="group" aria-label={`Переключить вид: ${pair.title}`}>
        <button
          type="button"
          aria-pressed={mobileView === "before"}
          onClick={() => setMobileView("before")}
        >
          Исходник
        </button>
        <button
          type="button"
          aria-pressed={mobileView === "after"}
          onClick={() => setMobileView("after")}
        >
          После цвета
        </button>
      </div>

      <figcaption className="color-compare-caption">
        <strong>{pair.title}</strong>
        <span>{pair.note}</span>
      </figcaption>
    </figure>
  );
};

export default ColorCompare;
