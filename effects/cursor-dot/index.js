/**
 * cursor-dot — 커스텀 커서 (점 + 따라오는 링)
 * ───────────────────────────────────────────────────────────
 * 티어 T1 · 추가 용량 0KB · 포인터(마우스) 필요
 *
 * 점은 커서에 붙어 다니고, 링은 lerp로 한 박자 늦게 따라옵니다.
 * 링크·버튼·카드 위에서는 링이 커집니다. 기본 커서는 숨기지 않습니다 —
 * 숨기면 iframe·비디오·셀렉트 위에서 커서가 사라지는 사고가 납니다.
 * 터치 기기에서는 가드가 아예 시작하지 않습니다.
 */

import { defineEffect, lerp, prefersReducedMotion } from '../_core/index.js';

export const mount = defineEffect({
  name: 'cursor-dot',

  defaults: {
    /** 링이 따라오는 속도 0..1 */
    speed: 0.18,
    /** 링 지름(px) */
    size: 34,
    /** 올리면 링이 커지는 요소 */
    grow: 'a, button, .wf-btn, .wf-card, .wf-link, .wf-contact__mail',
    /** 커질 때 배율 */
    growScale: 1.9,
  },

  guard: {
    pointer: 'fine',
    motion: 'ignore',   // 입력을 따르는 표시라 두되, 아래에서 지연만 없앱니다
  },

  setup({ el, opts, on, addCleanup }) {
    const doc = el.ownerDocument;
    const win = doc.defaultView ?? window;

    const ring = doc.createElement('span');
    ring.className = 'fx-cursor__ring';
    ring.style.width = ring.style.height = `${opts.size}px`;
    const dot = doc.createElement('span');
    dot.className = 'fx-cursor__dot';
    doc.body.append(ring, dot);
    addCleanup(() => { ring.remove(); dot.remove(); });

    let x = -100, y = -100, rx = -100, ry = -100;
    let raf = 0;
    let grown = false;
    const instant = prefersReducedMotion();

    const step = () => {
      const k = instant ? 1 : opts.speed;
      rx = lerp(rx, x, k);
      ry = lerp(ry, y, k);
      ring.style.transform = `translate(${rx}px, ${ry}px) translate(-50%, -50%) scale(${grown ? opts.growScale : 1})`;
      if (Math.abs(rx - x) < 0.3 && Math.abs(ry - y) < 0.3) { raf = 0; return; }
      raf = win.requestAnimationFrame(step);
    };
    const kick = () => { if (!raf) raf = win.requestAnimationFrame(step); };
    addCleanup(() => { if (raf) win.cancelAnimationFrame(raf); });

    on(win, 'pointermove', (e) => {
      x = e.clientX; y = e.clientY;
      dot.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%)`;
      /* 링 확대 대상 위인지 — 이벤트 위임이라 요소마다 리스너를 달지 않습니다. */
      grown = !!e.target?.closest?.(opts.grow);
      ring.classList.toggle('is-grown', grown);
      dot.classList.add('is-on');
      ring.classList.add('is-on');
      kick();
    }, { passive: true });

    on(doc, 'pointerleave', () => {
      dot.classList.remove('is-on');
      ring.classList.remove('is-on');
    });
  },
});

export default mount;
