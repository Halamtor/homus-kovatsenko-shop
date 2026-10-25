// ---- Галереи альбомов VK: сетка миниатюр + полноэкранный просмотр со свайпом (использует глобальные функции из app.js) ----
const albById = id => ALBUMS.find(a=>a.id===id);
const albSrc = (a,f,thumb) => `img/albums/${a.id}/${thumb?'t/':''}${f}`;
// к каким товарам/опциям привязаны альбомы: товар 6 — «Варган 2.0 с натуральными камнями», o2 — «Гравировка на чехле»
const ALB_LINKS = {p:{6:['stones']}, o:{o2:['engraving']}};
const albumBtns = (kind,id) => ((ALB_LINKS[kind]||{})[id]||[]).map(k=>{const a=albById(k); return `<button class="btn sec" data-alb="${k}">🖼 Примеры: «${a.name}» (${a.photos.length} фото)</button>`;}).join('');
const albumMenu = () => `<h3>Фотоальбомы</h3>${ALBUMS.map(a=>`<button class="btn sec" data-alb="${a.id}">🖼 ${esc(a.name)} · ${a.photos.length} фото</button>`).join('')}`;
function bindAlbBtns(){ $app.querySelectorAll('[data-alb]').forEach(b=>b.onclick=()=>go(()=>album(b.dataset.alb))); }
function albumsList(){
  $app.innerHTML=`<div class="p"><h2>Фотоальбомы</h2><p class="hint">Фотографии из альбомов сообщества VK</p></div>
  <div class="grid">${ALBUMS.map(a=>`<div class="item" data-alb="${a.id}"><img src="${albSrc(a,a.photos[0][0],1)}" alt="" loading="lazy"><div class="t">${esc(a.name)}<div class="tag">${a.photos.length} фото</div></div></div>`).join('')}</div><div class="p">${backLink()}</div>`;
  bindBack(); bindAlbBtns(); setMain('Перейти в каталог', catalog);
}
function album(id){
  const a=albById(id);
  $app.innerHTML=`<div class="p"><h2>${esc(a.name)}</h2><p class="hint">${a.photos.length} фото · нажмите, чтобы открыть · <a href="${a.vk}" data-href="${a.vk}">альбом в VK</a></p></div>
  <div class="agrid">${a.photos.map((p,i)=>`<img src="${albSrc(a,p[0],1)}" data-i="${i}" width="${p[1]}" height="${p[2]}" alt="" loading="lazy" decoding="async">`).join('')}</div><div class="p">${backLink()}</div>`;
  bindBack(); $app.querySelectorAll('.agrid img').forEach(im=>im.onclick=()=>viewer(a,+im.dataset.i));
  setMain('Перейти в каталог', catalog);
}
function viewer(a,start){
  const v=document.createElement('div'); v.className='viewer';
  v.innerHTML=`<div class="vtrack">${a.photos.map(p=>`<div class="vslide"><img data-src="${albSrc(a,p[0])}" alt=""></div>`).join('')}</div>
  <div class="vbar"><span class="vcount"></span><button class="vclose" aria-label="Закрыть">✕</button></div>`;
  document.body.appendChild(v); document.body.style.overflow='hidden';
  const tr=v.querySelector('.vtrack'), slides=[...v.querySelectorAll('.vslide')], cnt=v.querySelector('.vcount');
  const load=i=>{const im=slides[i]&&slides[i].firstChild; if(im&&!im.src) im.src=im.dataset.src;};
  const cur=()=>Math.round(tr.scrollLeft/tr.clientWidth);
  const upd=()=>{const i=cur(); [i-1,i,i+1].forEach(load); cnt.textContent=`${i+1} / ${a.photos.length}`;};
  tr.addEventListener('scroll',()=>{clearTimeout(tr._t); tr._t=setTimeout(upd,60);});
  const key=e=>{ if(e.key==='Escape') close(); if(e.key==='ArrowRight') tr.scrollBy({left:tr.clientWidth}); if(e.key==='ArrowLeft') tr.scrollBy({left:-tr.clientWidth}); };
  function close(){ v.remove(); document.body.style.overflow=''; document.removeEventListener('keydown',key); if(inTG){ tg.BackButton.offClick(close); tg.BackButton.onClick(onBack); } }
  document.addEventListener('keydown',key); v.querySelector('.vclose').onclick=close;
  if(inTG){ tg.BackButton.offClick(onBack); tg.BackButton.onClick(close); tg.BackButton.show(); }
  tr.scrollLeft=start*tr.clientWidth; upd(); requestAnimationFrame(()=>{ tr.scrollLeft=start*tr.clientWidth; upd(); });
}
