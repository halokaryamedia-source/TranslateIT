const icon=(n,m='')=>`<svg class="ti-c-icon ${m}" aria-hidden="true"><use href="icons.svg#${n}"></use></svg>`;
const label=t=>`<span class="ti-v-component-label">${t}</span>`;
const swatch=(n,v,c)=>`<div class="ti-v-token-card"><span class="ti-v-token-swatch" style="background:${c}"></span><strong>${n}</strong><span>${v}</span></div>`;
const iconCell=n=>`<div class="ti-v-icon-cell">${icon(n)}<span>${n}</span></div>`;

const mainNav=[['Recent Chat',[['clock','Recent Chat',true],['file','Unsaved Chat',false]]],['Workspace',[['folder','Saved Chat',false],['shield','Local Data',false]]]];
const settingsNav=[['sliders','General','general'],['speaker','Audio','audio'],['translate','Translate','translate'],['code','Developer','developer']];

function mainSidebar(){
  const nav=mainNav.map((s,i)=>`${i?'<div class="ti-c-nav-divider"></div>':''}<div class="ti-c-nav__section"><p class="ti-c-nav__heading">${s[0]}</p>${s[1].map(x=>`<button class="ti-c-nav-item ${x[2]?'is-active':''}">${icon(x[0])}<span>${x[1]}</span>${icon('chevron','ti-c-icon--sm')}</button>`).join('')}</div>`).join('');
  return `<aside class="ti-l-main-sidebar"><div class="ti-c-brand"><div class="ti-c-brand__mark">T</div><div><h1 class="ti-c-brand__title">TRANSLATEIT</h1><p class="ti-c-brand__subtitle">Local voice translation</p></div></div><button class="ti-c-new-chat">${icon('plus')}<span>New Chat</span></button><nav class="ti-c-nav ti-p-main-sidebar-nav">${nav}</nav><section class="ti-c-account-card"><div class="ti-c-avatar">HK</div><div><strong class="ti-c-account-card__name">Marcel Berc...</strong><span class="ti-c-account-card__status">Invisible</span></div><div class="ti-c-account-card__actions"><button class="ti-c-icon-button ti-c-account-card__button ti-c-button--danger">${icon('mic-off','ti-c-icon--sm')}</button><button class="ti-c-icon-button ti-c-account-card__button ti-c-button--danger">${icon('chevron','ti-c-icon--sm')}</button><button class="ti-c-icon-button ti-c-account-card__button ti-c-button--danger">${icon('headphones-off','ti-c-icon--sm')}</button><button class="ti-c-icon-button ti-c-account-card__button ti-c-button--danger">${icon('chevron','ti-c-icon--sm')}</button><button class="ti-c-icon-button ti-c-account-card__button">${icon('settings','ti-c-icon--sm')}</button></div></section></aside>`;
}
function settingsSidebar(active){return `<aside class="ti-l-settings-sidebar"><h1 style="margin:0 0 52px;color:var(--ti-color-text-primary);font-size:32px;letter-spacing:-.04em;">Settings</h1><nav class="ti-c-nav">${settingsNav.map(x=>`<button class="ti-c-nav-item ti-c-nav-item--settings ${active===x[2]?'is-active':''}">${icon(x[0])}<span>${x[1]}</span></button>`).join('')}</nav></aside>`;}

const selectIcon=(l,i,v)=>`<div class="ti-c-field"><p class="ti-c-field__label">${l}</p><button class="ti-c-select">${icon(i)}<span>${v}</span>${icon('chevron','ti-c-icon--sm')}</button></div>`;
const selectText=(l,v)=>`<div class="ti-c-field"><p class="ti-c-field__label">${l}</p><button class="ti-c-select" style="grid-template-columns:minmax(0,1fr) 16px;"><span>${v}</span>${icon('chevron','ti-c-icon--sm')}</button></div>`;
const slider=(l,w=82)=>`<div class="ti-c-slider"><p class="ti-c-field__label">${l}</p><div class="ti-c-slider__track"><span class="ti-c-slider__fill" style="width:${w}%"></span><span class="ti-c-slider__thumb" style="left:${w}%"></span></div></div>`;
const meter=(n=34)=>`<div class="ti-c-meter">${Array.from({length:n},()=>'<span></span>').join('')}</div>`;
const radio=(l,d,a=false)=>`<button class="ti-c-radio-row ${a?'is-active':''}"><span class="ti-c-radio-row__control"></span><span><strong>${l}</strong><p>${d}</p></span></button>`;
