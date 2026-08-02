/**
 * text-scramble — 랜덤 문자가 정답으로 수렴하는 텍스트
 * ───────────────────────────────────────────────────────────
 * 티어 T1 · 추가 용량 0KB
 *
 * 개발자 포트폴리오의 단골. 화면에 들어올 때 한 번, 글자들이 랜덤 문자를
 * 거쳐 원래 글로 자리잡습니다. 왼쪽 글자부터 차례로 확정되므로 끝날수록
 * 읽을 수 있는 부분이 늘어납니다.
 *
 * 동작 줄이기 사용자에게는 아예 시작하지 않습니다 — 깜빡이는 랜덤 문자가
 * 정확히 그들이 피하려는 종류의 움직임입니다(가드가 대신 걸러 줍니다).
 * rAF 루프는 수렴이 끝나면 멈춥니다.
 */

import { defineEffect, observeVisibility } from '../_core/index.js';

const CHARSET = '!<>-_\\/[]{}—=+*^?#ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

export const mount = defineEffect({
  name: 'text-scramble',

  defaults: {
    /**
     * 전체 재생 시간(ms) — 글자 수와 무관하게 이 안에 끝납니다.
     * 900으로 뒀더니 페이지가 열리자마자 한 번 재생되고 끝나 **아무도 못 봤습니다.**
     * 1400이 "확실히 보이는데 지루하지 않은" 지점입니다.
     */
    duration: 1400,
    /** 프레임마다 랜덤 문자를 갈아치울 확률 0..1 (낮을수록 지글거림이 적습니다) */
    churn: 0.28,
    /** 화면에 들어오고 나서의 지연(ms) */
    delay: 0,
    /**
     * 다시 들어올 때마다 반복. 기본 true — 앵커(#contact)로 열고 나중에
     * 위로 스크롤하는 방문자도, 다시 돌아온 방문자도 봐야 하는 효과입니다.
     */
    repeat: true,
  },

  guard: {
    motion: 'skip',   // 동작 줄이기에서는 원문 그대로 둡니다
  },

  setup({ el, opts, addCleanup }) {
    const win = el.ownerDocument.defaultView ?? window;

    /*
     * **텍스트 노드 단위**로 다룹니다. el.textContent로 통째로 쓰면
     * 제목 속 `<br>`이 사라집니다 — 여러 줄 히어로 제목이 한 줄로 붙어 버린
     * 사고의 원인입니다. 노드별로 원문을 쥐고 노드별로 되씁니다.
     */
    const walker = el.ownerDocument.createTreeWalker(el, 4 /* NodeFilter.SHOW_TEXT */);
    const nodes = [];
    let total = 0;
    for (let n = walker.nextNode(); n; n = walker.nextNode()) {
      if (!n.data.trim()) continue;
      nodes.push({ node: n, original: n.data, offset: total });
      total += n.data.length;
    }
    if (!total) return; // 빈 제목·자리표시자는 건드릴 것이 없습니다

    let raf = 0;
    let timer = 0;
    let played = false;

    const restore = () => nodes.forEach(({ node, original }) => { node.data = original; });

    const play = () => {
      if (played && !opts.repeat) return;
      played = true;
      const t0 = win.performance.now();

      const frame = (now) => {
        const p = Math.min(1, (now - t0) / Math.max(200, opts.duration));
        /* 왼쪽부터 확정 — 전체 글자 수 기준 p 비율까지는 원문입니다. */
        const settled = Math.floor(total * p);
        for (const { node, original, offset } of nodes) {
          node.data = [...original]
            .map((ch, i) => {
              if (offset + i < settled || /\s/.test(ch)) return ch;
              /* 매 프레임 전부 갈지 않습니다 — churn 확률로만 바꿔 지글거림을 줄입니다. */
              return Math.random() < opts.churn
                ? CHARSET[(Math.random() * CHARSET.length) | 0]
                : node.data[i] ?? ch;
            })
            .join('');
        }
        if (p < 1) raf = win.requestAnimationFrame(frame);
        else { restore(); raf = 0; }
      };
      raf = win.requestAnimationFrame(frame);
    };

    /*
     * 같은 영역에 '스크롤 등장(scroll-reveal)'이 걸려 있으면 **영역이 다 나타난
     * 뒤에** 시작합니다. 등장 페이드인과 겹치면 스크램블이 투명한 채로 재생돼
     * 끝나 버립니다 — "효과가 안 나온다"의 실제 원인이었습니다.
     */
    const revealHost = el.closest?.('.fx-scroll-reveal');
    const afterReveal = (fn) => {
      if (!revealHost || revealHost.classList.contains('is-revealed')) return fn();
      let done = false;
      const cancel = () => { done = true; mo.disconnect(); win.clearTimeout(fallback); };
      const go = () => { if (done) return; cancel(); fn(); };
      const mo = new win.MutationObserver(() => {
        if (revealHost.classList.contains('is-revealed')) win.setTimeout(go, 150);
      });
      mo.observe(revealHost, { attributes: true, attributeFilter: ['class'] });
      /* 등장 신호를 놓쳐도 2초 뒤엔 재생 — 영영 안 나오는 것보다 낫습니다. */
      const fallback = win.setTimeout(go, 2000);
      addCleanup(cancel);
    };

    const stopWatch = observeVisibility(el, {
      threshold: 0.4,
      onEnter: () => { timer = win.setTimeout(() => afterReveal(play), opts.delay); },
    });

    addCleanup(() => {
      stopWatch();
      win.clearTimeout(timer);
      if (raf) win.cancelAnimationFrame(raf);
      restore();   // 어떤 순간에 떼어내도 원문으로 되돌립니다
    });
  },
});

export default mount;
