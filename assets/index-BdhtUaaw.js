import N from"$/v-scroll.js";(function(){const n=document.createElement("link").relList;if(n&&n.supports&&n.supports("modulepreload"))return;for(const e of document.querySelectorAll('link[rel="modulepreload"]'))c(e);new MutationObserver(e=>{for(const t of e)if(t.type==="childList")for(const o of t.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&c(o)}).observe(document,{childList:!0,subtree:!0});function r(e){const t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),e.crossOrigin==="use-credentials"?t.credentials="include":e.crossOrigin==="anonymous"?t.credentials="omit":t.credentials="same-origin",t}function c(e){if(e.ep)return;e.ep=!0;const t=r(e);fetch(e.href,t)}})();const D=128,v=3,R=.95,B=.5,V=.12,j=100,$=1500,z=400,F=new CSSStyleSheet;F.replaceSync(`
  :host {
    display: block;
    position: relative;
    overflow: hidden;
    height: 100%;
  }
  .vp {
    width: 100%;
    height: 100%;
    overflow: auto;
    scrollbar-width: none;
  }
  .vp::-webkit-scrollbar { display: none; }
  .ct { min-height: 100%; }
  [part~=track] {
    position: absolute;
    top: 0; right: 0;
    height: 100%;
    pointer-events: auto;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    box-sizing: border-box;
    transition: width 0.4s ease, opacity 0.6s ease,
                background 0.4s ease, border-color 0.4s ease;
  }
  [part~=bar] {
    flex-shrink: 0;
    user-select: none;
    touch-action: none;
  }
`);const _=(s,n)=>Math.max(D,s/n*(s-v*2)),G=(s,n,r,c)=>{const e=n-v*2-c,t=r-n;return v+(t>0?s/t*e:0)},W=(s,n,r,c,e)=>{const t=r-v*2-e,o=c-r;return t<=0?s:s+n/t*o},X=(s,n,r,c,e,t)=>{if(!s)return 0;let o=s;for(;o.prev&&n-o.prev.t<j;)o=o.prev;const l=n-o.t;if(l<=0)return 0;const y=(r-o.y)/l*16,h=c-v*2-t,p=h>0?(e-c)/h:0;return y*p},K=(s,n,r,c)=>{const e=r.clientHeight,t=c.scrollHeight;if(t<=e){n.hidden=!0;return}n.hidden=!1;const o=_(e,t),l=G(r.scrollTop,e,t,o);s.style.height=`${o}px`,s.style.transform=`translateY(${l}px)`},U=s=>{const n=s.attachShadow({mode:"open"});n.adoptedStyleSheets=[F];const r=Object.assign(document.createElement("div"),{className:"vp"}),c=Object.assign(document.createElement("div"),{className:"ct"}),e=document.createElement("slot"),t=document.createElement("div"),o=document.createElement("b");t.part.add("track"),o.part.add("bar"),c.appendChild(e),r.appendChild(c),t.appendChild(o),n.append(r,t)},J=s=>{const n=s.shadowRoot,r=n.querySelector(".vp"),c=n.querySelector(".ct"),e=n.querySelector("[part=track]"),t=n.querySelector("[part=bar]");let o=null,l=!1,y=0,h=0,p=0,f=null,u=null,m=null;const g=()=>K(t,e,r,c),Y=a=>{clearTimeout(m),e.part.remove("expanded");{const i=getComputedStyle(s);e.style.background=i.getPropertyValue("--track-bg").trim()||"#e8e8e8",e.style.borderLeft=`1px solid ${i.getPropertyValue("--track-border").trim()||"#d0d0d0"}`,e.style.opacity="1",e.style.width="18px",e.part.add("expanded");return}},E=()=>{const a=e.part.contains("expanded");e.part.remove("expanded"),e.style.background="transparent",e.style.borderLeft="1px solid transparent",e.style.width="6px",a?(clearTimeout(m),m=setTimeout(()=>{e.style.opacity="0"},z)):e.style.opacity="0"},b=()=>{clearTimeout(u),!e.part.contains("expanded")&&(u=setTimeout(()=>{l||E()},$))},q=a=>{cancelAnimationFrame(o);const i=()=>{if(Math.abs(a)<B){b();return}r.scrollTop=Math.max(0,Math.min(r.scrollTop+a,c.scrollHeight-r.clientHeight)),a*=R,o=requestAnimationFrame(i)};o=requestAnimationFrame(i)},T=()=>{const a=c.scrollHeight-r.clientHeight,i=r.scrollTop,d=Math.max(0,Math.min(p,a))-i;!l&&Math.abs(d)<.5||(r.scrollTop=i+d*V,o=requestAnimationFrame(T))},w=a=>{a.preventDefault(),cancelAnimationFrame(o),clearTimeout(u),clearTimeout(m),l=!0,y=a.clientY,h=r.scrollTop,p=r.scrollTop,f={t:a.timeStamp,y:a.clientY,prev:null},t.setPointerCapture(a.pointerId),t.part.add("dragging"),o=requestAnimationFrame(T)},k=a=>{if(!l)return;const i=r.clientHeight,d=c.scrollHeight,x=W(h,a.clientY-y,i,d,_(i,d));p=Math.max(0,Math.min(x,d-i)),f={t:a.timeStamp,y:a.clientY,prev:f}},L=a=>{if(!l)return;l=!1,cancelAnimationFrame(o),r.scrollTop=Math.max(0,Math.min(p,c.scrollHeight-r.clientHeight)),t.releasePointerCapture(a.pointerId),t.part.remove("dragging");const{left:i,right:d,top:x,bottom:I}=e.getBoundingClientRect();a.clientX>=i&&a.clientX<=d&&a.clientY>=x&&a.clientY<=I?b():E();const C=r.clientHeight,O=c.scrollHeight,P=X(f,a.timeStamp,a.clientY,C,O,_(C,O));if(f=null,P!==0){q(P);return}b()},H=()=>{clearTimeout(u),Y()},M=()=>{l||E()},A=()=>{clearTimeout(u),clearTimeout(m),e.part.remove("expanded"),e.style.background="transparent",e.style.borderLeft="1px solid transparent",e.style.opacity="1",e.style.width="6px",b()},S=new ResizeObserver(g);return S.observe(r),S.observe(c),r.addEventListener("scroll",g,{passive:!0}),r.addEventListener("wheel",A,{passive:!0}),t.addEventListener("pointerdown",w),t.addEventListener("pointermove",k),t.addEventListener("pointerup",L),t.addEventListener("pointercancel",L),e.addEventListener("mouseenter",H),e.addEventListener("mouseleave",M),e.style.background="transparent",e.style.borderLeft="1px solid transparent",e.style.opacity="0",e.style.width="6px",g(),()=>{cancelAnimationFrame(o),clearTimeout(u),clearTimeout(m),S.disconnect(),r.removeEventListener("scroll",g),r.removeEventListener("wheel",A),t.removeEventListener("pointerdown",w),t.removeEventListener("pointermove",k),t.removeEventListener("pointerup",L),t.removeEventListener("pointercancel",L),e.removeEventListener("mouseenter",H),e.removeEventListener("mouseleave",M)}},Q=()=>{if(document.querySelector("style[data-v-scroll]"))return;const s=document.createElement("style");s.dataset.vScroll="",s.textContent=N,document.head.appendChild(s)};class Z extends HTMLElement{connectedCallback(){Q(),this.shadowRoot||U(this),this._cleanup=J(this)}disconnectedCallback(){var n;(n=this._cleanup)==null||n.call(this)}}customElements.define("v-scroll",Z);
