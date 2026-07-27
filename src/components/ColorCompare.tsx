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
  const frameRef = useRef<HTMLDivElement>(null);

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
    const onMove = (event: PointerEvent) => setFromClientX(event.clientX);
    const onUp = () => setDragging(false);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    return () => {
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

  return (
    <figure className="color-compare">
      <div
        ref={frameRef}
        className="color-compare-frame"
        data-dragging={dragging || undefined}
        onPointerDown={(event) => {
          event.preventDefault();
          setDragging(true);
          setFromClientX(event.clientX);
        }}
      >
        {/* Результат лежит снизу и виден целиком: если скрипт не отработает,
            посетитель увидит финальный кадр, а не пустоту. */}
        <img className="color-compare-img" src={pair.after} alt={pair.afterAlt} loading="lazy" decoding="async" />

        {/* Исходник лежит поверх и обрезается clip-path, а не шириной контейнера:
            так кадр не сжимается и оба изображения гарантированно совпадают
            пиксель в пиксель при любом положении разделителя. */}
        <img
          className="color-compare-img color-compare-img--before"
          style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
          src={pair.before}
          alt=""
          aria-hidden="true"
          loading="lazy"
          decoding="async"
        />

        <span className="color-compare-tag color-compare-tag--before" aria-hidden="true">Исходник</span>
        <span className="color-compare-tag color-compare-tag--after" aria-hidden="true">После цвета</span>

        <div
          role="slider"
          tabIndex={0}
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

      <figcaption className="color-compare-caption">
        <strong>{pair.title}</strong>
        <span>{pair.note}</span>
      </figcaption>
    </figure>
  );
};

export default ColorCompare;
