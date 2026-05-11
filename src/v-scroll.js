import CSS from '$/v-scroll.js';

// ---- 常量 ----
const BAR_MIN_H = 128,
      BAR_PADDING = 3,
      FRICTION = 0.95,
      MIN_VEL = 0.5,
      SPRING = 0.12,
      SAMPLE_MS = 100,
      SCROLL_HIDE_DELAY = 1500,
      COLLAPSE_DELAY = 400;

// ---- 纯函数 ----
const calcBarH = (vh, ch) =>
  Math.max(BAR_MIN_H, (vh / ch) * (vh - BAR_PADDING * 2));

const calcBarY = (scroll_top, vh, ch, bar_h) => {
  const track_h = vh - BAR_PADDING * 2 - bar_h,
        max_scroll = ch - vh;
  return BAR_PADDING + (max_scroll > 0 ? (scroll_top / max_scroll) * track_h : 0);
};

const calcScrollFromDrag = (start_scroll, delta_y, vh, ch, bar_h) => {
  const track_h = vh - BAR_PADDING * 2 - bar_h,
        max_scroll = ch - vh;
  if (track_h <= 0) return start_scroll;
  return start_scroll + (delta_y / track_h) * max_scroll;
};

const updateBar = (bar, track, vp, ct) => {
  const vh = vp.clientHeight,
        ch = ct.scrollHeight;
  if (ch <= vh) {
    track.hidden = true;
    return;
  }
  track.hidden = false;
  const bar_h = calcBarH(vh, ch),
        bar_y = calcBarY(vp.scrollTop, vh, ch, bar_h);
  bar.style.height = `${bar_h}px`;
  bar.style.transform = `translateY(${bar_y}px)`;
};

// ---- 构建 Shadow DOM ----
const buildShadow = (host) => {
  const shadow = host.attachShadow({ mode: 'open' });
  shadow.innerHTML = `
    <style>
      :host { display: block; position: relative; overflow: hidden; height: 100%; }
      .vp { width: 100%; height: 100%; overflow: auto; scrollbar-width: none; }
      .vp::-webkit-scrollbar { display: none; }
      .ct { min-height: 100%; }
      [part~=track] { position: absolute; top: 0; right: 0; height: 100%; pointer-events: auto;
        display: flex; justify-content: center; align-items: flex-start;
        transition: width 0.4s ease, opacity 0.6s ease, background 0.4s ease, border-color 0.4s ease;
        box-sizing: border-box; }
      [part~=bar] { flex-shrink: 0; user-select: none; touch-action: none; }
    </style>
    <div class="vp"><div class="ct"><slot></slot></div></div>
    <div part="track"><b part="bar"></b></div>`;
};

// ---- 挂载事件与状态，返回 cleanup 函数 ----
const mount = (host) => {
  const sr = host.shadowRoot,
        vp = sr.querySelector('.vp'),
        ct = sr.querySelector('.ct'),
        track = sr.querySelector('[part=track]'),
        bar = sr.querySelector('[part=bar]');

  let raf_id = null,
      is_drag = false,
      drag_start_y = 0,
      drag_start_scroll = 0,
      target_scroll = 0,
      vel_head = null,
      scroll_timer = null,
      collapse_timer = null;

  const sync = () => updateBar(bar, track, vp, ct);

  // ---- track 宽度辅助 ----
  const setTrackW = (w) => { track.style.width = w; };

  // 进入 scrolling 状态：细条、透明背景、无边框
  const showScrolling = () => {
    clearTimeout(scroll_timer);
    clearTimeout(collapse_timer);
    track.part.remove('expanded');
    track.style.background = 'transparent';
    track.style.borderLeft = '1px solid transparent';
    track.style.opacity = '1';
    setTrackW('6px');
  };

  // 退出到 idle：若已展开则先收缩再淡出，否则直接淡出
  const hideTrack = () => {
    const was_expanded = track.part.contains('expanded');
    track.part.remove('expanded');
    if (was_expanded) {
      track.style.background = 'transparent';
      track.style.borderLeft = '1px solid transparent';
      setTrackW('6px');
      collapse_timer = setTimeout(() => {
        track.style.opacity = '0';
      }, COLLAPSE_DELAY);
    } else {
      track.style.opacity = '0';
    }
  };

  // 滚动停止后延迟隐藏（hover 期间不触发）
  const scheduleHide = () => {
    clearTimeout(scroll_timer);
    if (track.part.contains('expanded')) return;
    scroll_timer = setTimeout(() => {
      if (!is_drag) hideTrack();
    }, SCROLL_HIDE_DELAY);
  };

  // ---- 惯性滚动 ----
  const startMomentum = (v) => {
    cancelAnimationFrame(raf_id);
    const tick = () => {
      if (Math.abs(v) < MIN_VEL) { scheduleHide(); return; }
      vp.scrollTop = Math.max(0, Math.min(vp.scrollTop + v, ct.scrollHeight - vp.clientHeight));
      v *= FRICTION;
      raf_id = requestAnimationFrame(tick);
    };
    raf_id = requestAnimationFrame(tick);
  };

  // ---- 拖拽弹簧跟随（每帧追赶 target_scroll）----
  const springTick = () => {
    const max_scroll = ct.scrollHeight - vp.clientHeight,
          cur = vp.scrollTop,
          diff = Math.max(0, Math.min(target_scroll, max_scroll)) - cur;
    if (!is_drag && Math.abs(diff) < 0.5) return;
    vp.scrollTop = cur + diff * SPRING;
    raf_id = requestAnimationFrame(springTick);
  };

  // ---- Pointer Events ----
  const onDown = (e) => {
    e.preventDefault();
    cancelAnimationFrame(raf_id);
    clearTimeout(scroll_timer);
    clearTimeout(collapse_timer);
    is_drag = true;
    drag_start_y = e.clientY;
    drag_start_scroll = vp.scrollTop;
    target_scroll = vp.scrollTop;
    vel_head = { t: e.timeStamp, y: e.clientY, prev: null };
    bar.setPointerCapture(e.pointerId);
    bar.part.add('dragging');
    raf_id = requestAnimationFrame(springTick);
  };

  const onMove = (e) => {
    if (!is_drag) return;
    const vh = vp.clientHeight, ch = ct.scrollHeight,
          bar_h = calcBarH(vh, ch),
          new_scroll = calcScrollFromDrag(drag_start_scroll, e.clientY - drag_start_y, vh, ch, bar_h);
    target_scroll = Math.max(0, Math.min(new_scroll, ch - vh));
    vel_head = { t: e.timeStamp, y: e.clientY, prev: vel_head };
  };

  const onUp = (e) => {
    if (!is_drag) return;
    is_drag = false;
    cancelAnimationFrame(raf_id);
    vp.scrollTop = Math.max(0, Math.min(target_scroll, ct.scrollHeight - vp.clientHeight));
    bar.releasePointerCapture(e.pointerId);
    bar.part.remove('dragging');

    const rect = track.getBoundingClientRect(),
          in_track = e.clientX >= rect.left && e.clientX <= rect.right
                  && e.clientY >= rect.top  && e.clientY <= rect.bottom;
    if (!in_track) {
      hideTrack();
    } else {
      scheduleHide();
    }

    if (vel_head) {
      const now = e.timeStamp;
      let s = vel_head;
      while (s.prev && (now - s.prev.t) < SAMPLE_MS) s = s.prev;
      const dt = now - s.t;
      if (dt > 0) {
        const bar_vel = (e.clientY - s.y) / dt * 16,
              vh = vp.clientHeight, ch = ct.scrollHeight,
              bar_h = calcBarH(vh, ch),
              track_h = vh - BAR_PADDING * 2 - bar_h,
              scale = track_h > 0 ? (ch - vh) / track_h : 0;
        startMomentum(bar_vel * scale);
        return;
      }
    }
    vel_head = null;
    scheduleHide();
  };

  // ---- track hover ----
  const onTrackEnter = () => {
    clearTimeout(scroll_timer);
    clearTimeout(collapse_timer);
    track.part.add('expanded');
    const s = getComputedStyle(host);
    track.style.background = s.getPropertyValue('--track-bg').trim() || '#e8e8e8';
    track.style.borderLeft = `1px solid ${s.getPropertyValue('--track-border').trim() || '#d0d0d0'}`;
    track.style.opacity = '1';
    setTrackW('18px');
  };

  const onTrackLeave = () => {
    if (is_drag) return;
    hideTrack();
  };

  // ---- wheel：显示滚动条并重置隐藏计时器 ----
  const onWheel = () => {
    showScrolling();
    scheduleHide();
  };

  // ---- ResizeObserver ----
  const ro = new ResizeObserver(sync);
  ro.observe(vp);
  ro.observe(ct);

  // ---- 事件绑定 ----
  vp.addEventListener('scroll', sync, { passive: true });
  vp.addEventListener('wheel', onWheel, { passive: true });
  bar.addEventListener('pointerdown', onDown);
  bar.addEventListener('pointermove', onMove);
  bar.addEventListener('pointerup', onUp);
  bar.addEventListener('pointercancel', onUp);
  track.addEventListener('mouseenter', onTrackEnter);
  track.addEventListener('mouseleave', onTrackLeave);

  // 初始态：隐藏 track
  track.style.background = 'transparent';
  track.style.borderLeft = '1px solid transparent';
  track.style.opacity = '0';
  setTrackW('6px');
  sync();

  // ---- cleanup（disconnectedCallback 时调用）----
  return () => {
    cancelAnimationFrame(raf_id);
    clearTimeout(scroll_timer);
    clearTimeout(collapse_timer);
    ro.disconnect();
    vp.removeEventListener('scroll', sync);
    vp.removeEventListener('wheel', onWheel);
    bar.removeEventListener('pointerdown', onDown);
    bar.removeEventListener('pointermove', onMove);
    bar.removeEventListener('pointerup', onUp);
    bar.removeEventListener('pointercancel', onUp);
    track.removeEventListener('mouseenter', onTrackEnter);
    track.removeEventListener('mouseleave', onTrackLeave);
  };
};

// ---- CSS 注入（document head，只注一次）----
const injectCSS = () => {
  if (document.querySelector('style[data-v-scroll]')) return;
  const el = document.createElement('style');
  el.dataset.vScroll = '';
  el.textContent = CSS;
  document.head.appendChild(el);
};

// ---- Web Component 注册 ----
class VScroll extends HTMLElement {
  connectedCallback() {
    injectCSS();
    if (!this.shadowRoot) buildShadow(this);
    this._cleanup = mount(this);
  }
  disconnectedCallback() {
    this._cleanup?.();
  }
}

customElements.define('v-scroll', VScroll);
