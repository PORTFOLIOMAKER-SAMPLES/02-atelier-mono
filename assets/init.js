/**
 * 3D 효과 마운트.
 *
 * 옵션은 HTML의 data-fx-* 속성에 들어 있고, 효과 팩의 defineEffect가
 * 그걸 알아서 읽습니다(effects/_core/effect.js). 그래서 여기서는
 * "선택자마다 mount 한 번"만 부르면 끝입니다.
 *
 * 효과를 빼고 싶으면 아래 한 줄을 지우고 HTML의 data-fx도 지우면 됩니다.
 */

import { mount as smoothScroll } from '../effects/smooth-scroll/index.js';
import { mount as cursorDot } from '../effects/cursor-dot/index.js';
import { mount as scramble } from '../effects/text-scramble/index.js';
import { mount as spotlight } from '../effects/spotlight/index.js';
import { mount as reveal } from '../effects/scroll-reveal/index.js';
import { mount as preview } from '../effects/hover-preview/index.js';
import { mount as magnetic } from '../effects/magnetic-button/index.js';
import { mount as model } from '../effects/model-showcase/index.js';
import { mount as dots } from '../effects/dot-grid-wave/index.js';
import { mount as tilt } from '../effects/tilt-card/index.js';

/**
 * 영역 안쪽 요소에 붙는 효과(tilt/flip/magnetic/scramble)는 옵션을 부모에서 읽습니다.
 * 효과가 둘 이상인 영역은 팩 이름 접두사(data-fx-<팩>-<키>)로 실려 옵니다 —
 * 접두사 속성이 하나라도 있으면 그것만, 없으면 옛 방식(접두사 없음)을 읽습니다.
 */
function readOpts(el, prefix) {
  const out = {};
  const scoped = prefix ? 'data-fx-' + prefix + '-' : null;
  const hasScoped = scoped && [...el.attributes].some((a) => a.name.startsWith(scoped));
  for (const { name, value } of el.attributes) {
    if (!name.startsWith('data-fx-')) continue;
    if (hasScoped && !name.startsWith(scoped)) continue;
    const raw = hasScoped ? name.slice(scoped.length) : name.slice(8);
    const key = raw.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    out[key] = value === 'true' ? true : value === 'false' ? false
      : value !== '' && !Number.isNaN(Number(value)) ? Number(value)
      : value.includes(',') ? value.split(',') : value;
  }
  return out;
}

function boot() {
  smoothScroll(document.body);
  cursorDot(document.body);
  document.querySelectorAll('.wf-sld').forEach((sl) => {
    const rs = [...sl.querySelectorAll('.wf-sld__r')];
    if (rs.length < 2) return;
    const loop = sl.dataset.loop !== '0';
    const go = (n) => {
      const i = rs.findIndex((r) => r.checked);
      let k = i + n;
      if (k >= rs.length) k = loop ? 0 : i;
      if (k < 0) k = loop ? rs.length - 1 : i;
      rs[Math.max(0, k)].checked = true;
    };
    /* 스와이프 — 손가락으로 40px 넘게 밀면 한 장 넘깁니다. */
    let x0 = null;
    sl.addEventListener('pointerdown', (e) => { if (e.pointerType === 'touch') x0 = e.clientX; });
    sl.addEventListener('pointerup', (e) => {
      if (x0 === null) return;
      const dx = e.clientX - x0;
      x0 = null;
      if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
    });
    const ms = Number(sl.dataset.auto || 0);
    if (!ms || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let t = setInterval(() => go(1), ms);
    if (sl.dataset.pause === '1') {
      sl.addEventListener('pointerenter', () => { clearInterval(t); t = null; });
      sl.addEventListener('pointerleave', () => { if (!t) t = setInterval(() => go(1), ms); });
    }
  });
  document.querySelectorAll('[data-fx~="scramble"]').forEach((el) => {
    const targets = el.querySelectorAll('.wf-hero__title, .wf-sec__title, .wf-aside__name');
    if (targets.length) scramble([...targets], readOpts(el, 'text-scramble'));
  });
  spotlight('[data-fx~="spotlight"]');
  reveal('[data-fx~="reveal"]');
  preview('[data-fx~="preview"]');
  document.querySelectorAll('[data-fx~="magnetic"]').forEach((el) => {
    const targets = el.querySelectorAll('.wf-btn, .wf-link, .wf-contact__mail');
    if (targets.length) magnetic([...targets], readOpts(el, 'magnetic-button'));
  });
  model('.fx-model');
  dots('[data-fx~="dots"]');
  document.querySelectorAll('[data-fx~="tilt"]').forEach((el) => {
    const targets = el.querySelectorAll('.wf-card, .wf-main__slot');
    if (targets.length) tilt([...targets], readOpts(el, 'tilt-card'));
  });
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
else boot();
