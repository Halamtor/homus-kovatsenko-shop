// Хомус Коваценко — Telegram Mini App (прототип). Товары — из VK-магазина (js/data.js). ОПЛАТА — ДЕМО.
const tg = window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData !== undefined ? window.Telegram.WebApp : null;
const inTG = !!(tg && tg.platform && tg.platform !== 'unknown');
if (tg) { try { tg.ready(); tg.expand(); } catch (e) {} }

const state = {cat:'Варганы', q:'', cart:{}, stack:[], delivery:0, contact:'', ship:{country:'',city:'',zip:'',firstName:'',lastName:'',patronymic:'',phone:''}};
const $app = document.getElementById('app');
const fb = document.getElementById('fallbackMain');
let mainHandler = null;
const rub = n => n.toLocaleString('ru-RU') + ' ₽';
const esc = t => String(t).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const openExt = u => { if(inTG) tg.openLink(u); else window.open(u,'_blank'); };

// ---- MainButton / BackButton с фолбэком для обычного браузера ----
function setMain(text, handler){
  if (mainHandler && inTG) tg.MainButton.offClick(mainHandler);
  mainHandler = handler;
  if (inTG){ if(!text){tg.MainButton.hide();return;} tg.MainButton.setText(text); tg.MainButton.onClick(handler); tg.MainButton.show(); }
  else { if(!text){fb.classList.add('hidden');return;} fb.textContent=text; fb.onclick=handler; fb.classList.remove('hidden'); }
}
function onBack(){ state.stack.pop(); const prev = state.stack.pop() || catalog; prev(); }
if (inTG) tg.BackButton.onClick(onBack);
function go(view){ state.stack.push(view); if(inTG){ state.stack.length>1?tg.BackButton.show():tg.BackButton.hide(); } view(); window.scrollTo(0,0); }
const backLink = () => inTG ? '' : '<button class="btn sec" id="back">← Назад</button>';
function bindBack(){ const b=document.getElementById('back'); if(b) b.onclick=onBack; }
function haptic(){ try{ inTG && tg.HapticFeedback.impactOccurred('light'); }catch(e){} }

const optById = id => OPTIONS.find(o=>o.id===id);
const basePrice = p => p.price;
const priceLabel = p => p.customPrice?('от '+rub(p.price)):rub(p.price);
const lineUnit = l => { const p=PRODUCTS.find(x=>x.id===l.pid); const base=(l.custom!=null&&l.custom!=='')?+l.custom:p.price; return base + l.opts.reduce((s,o)=>s+optById(o).price,0); };
const cartItems = () => Object.values(state.cart).map(l=>({...l,p:PRODUCTS.find(x=>x.id===l.pid)}));
const cartTotal = () => cartItems().reduce((s,l)=>s+lineUnit(l)*l.q,0);
const orderTotal = () => cartTotal() + (state.delivery||0);
function updCount(){ document.getElementById('cartCount').textContent = cartItems().reduce((a,l)=>a+l.q,0); }
function add(pid,opts,custom){ const k=pid+'|'+opts.slice().sort().join(','); state.cart[k]=state.cart[k]||{pid,opts:opts.slice(),q:0}; state.cart[k].q++; if(custom!=null&&custom!=='') state.cart[k].custom=+custom; updCount(); haptic(); }
// ---- Экраны ----
function catalog(){
  state.stack=[catalog]; if(inTG) tg.BackButton.hide();
  const cats=['Варганы','Опции','Магазин в VK'];
  const isVK=state.cat==='Магазин в VK';
  const q=state.q.toLowerCase();
  const showP = !isVK&&state.cat!=='Опции', showO = !isVK&&state.cat!=='Варганы';
  const list=showP?PRODUCTS.filter(p=>p.name.toLowerCase().includes(q)):[];
  const olist=showO?OPTIONS.filter(o=>o.name.toLowerCase().includes(q)):[];
  $app.innerHTML=`<a class="vkbanner" href="${VK_SHOP}" data-href="${VK_SHOP}">🛍 Купить в VK-магазине — vk.com/market-73004917 ›</a><a class="vkbanner tgbanner" href="${CHANNEL}" data-href="${CHANNEL}">📣 Наш Telegram-канал — новости и звучание ›</a><input class="search" id="q" placeholder="Поиск" value="${esc(state.q)}">
  <div class="chips">${cats.map(c=>`<button class="chip ${c===state.cat?'on':''}" data-c="${c}">${c}</button>`).join('')}</div>
  <div class="grid">${list.map(p=>`<div class="item" data-id="${p.id}"><img src="${p.imgs[0]}" alt="" loading="lazy"><div class="t">${esc(p.name)}<div class="price">${priceLabel(p)}</div></div></div>`).join('')}</div>
  ${olist.length?`<h3 class="p" style="padding-bottom:0">Опции к варгану</h3><div class="grid">${olist.map(o=>`<div class="item opt" data-o="${o.id}"><img src="${o.imgs[0]}" alt="" loading="lazy"><div class="t">${esc(oname(o))}<div class="price">+${rub(o.price)}</div><div class="tag">добавляется к варгану</div></div></div>`).join('')}</div>`:''}
  ${isVK?`<div class="p" style="text-align:center"><h3>Магазин в VK</h3><p class="hint">Наш магазин в сообществе «Хомус Коваценко» во ВКонтакте</p><a class="btn" href="${VK_SHOP}" data-href="${VK_SHOP}">Перейти в магазин в VK</a></div>`:''}
  ${!isVK&&!list.length&&!olist.length?'<p class="hint p">Ничего не найдено</p>':''}`;
  const qi=document.getElementById('q'); qi.oninput=e=>{state.q=e.target.value; catalog(); const n=document.getElementById('q'); n.focus(); n.setSelectionRange(n.value.length,n.value.length);};
  $app.querySelectorAll('.chip').forEach(b=>b.onclick=()=>{ state.cat=b.dataset.c;catalog();});
  $app.querySelectorAll('.item[data-id]').forEach(el=>el.onclick=()=>go(()=>product(+el.dataset.id)));
  $app.querySelectorAll('.item[data-o]').forEach(el=>el.onclick=()=>go(()=>option(el.dataset.o)));
  const n=cartTotal(); setMain(n?`Корзина · ${rub(n)}`:'', ()=>go(cart));
}
const oname = o => o.name.replace(/^ОПЦИЯ:\s*/,'');
// Дословный текст VK → HTML: экранируем, markdown-ссылки [текст](url) и голые URL делаем кликабельными
// Посты VK открываем внутри магазина кнопкой «Смотреть»; остальные ссылки — через openLink
const WALL_RE=/https?:\/\/(?:m\.)?vk\.com\/(?:vargan64\?w=)?wall-73004917_(\d+)/;
function postBtn(id,label){ return `<a class="btn seebtn" href="#" data-post="${id}">${label||'Смотреть'}</a>`; }
// Если у товара/опции есть «Послушать звучание», ссылки на её же пост в описании заменяем отсылкой к этой кнопке
function descOf(e){
  let t=e.desc||'';
  if(e.posts&&e.posts.length){
    const ids=e.posts.map(p=>(p.post||'').match(WALL_RE)).filter(Boolean).map(m=>m[1]);
    if(ids.length){
      const wall=`https?://(?:m\\.)?vk\\.com/(?:vargan64\\?w=)?wall-73004917_(?:${ids.join('|')})(?!\\d)`;
      // подписи «тут/здесь» + свой же пост = дубль кнопки «Послушать звучание»
      t=t.replace(new RegExp(`Возможные настройки(?: с примерами звучания)?(?:\\s+по ссылке|\\s+тут)?\\s*:?\\s*${wall}`,'gi'),'Возможные настройки — в кнопке «Послушать звучание» выше');
      t=t.replace(new RegExp(`(?:Подробный обзор|Обзоры|Видео с демонстрацией звучания|Примеры звучания|Примеры звука)(?:\\s+тут|\\s+здесь)?\\s*:?\\s*${wall}`,'gi'),'');
      t=t.replace(new RegExp(`(?:по ссылке)\\s*:?\\s*${wall}`,'gi'),'');
      t=t.replace(new RegExp(`\\[[^\\]]+\\]\\(${wall}\\)`,'g'),'');
      t=t.replace(new RegExp(wall,'g'),'');
    }
  }
  // пустые «тут:/здесь:» без URL (из VK или после вырезания дубля)
  t=t.replace(/^(?:Возможные настройки|Подробный обзор|Обзоры|Примеры звучания|Примеры звука|Видео с демонстрацией звучания)(?:\s+тут|\s+здесь)?\s*:\s*$/gmi,'');
  // вердианская 432 Гц — ролик из постов VK
  t=t.replace(/\(подробнее о вердианской настройке здесь:\s*\)/gi,'(подробнее о вердианской настройке [здесь](https://youtu.be/E82V3f0yUr4))');
  t=t.replace(/подробнее о вердианской настройке здесь:\s*(?:https?:\/\/(?:www\.)?)?(?:youtu\.be\/|youtube\.com\/watch\?v=)?([\w-]{6,})/gi,'подробнее о вердианской настройке [здесь](https://youtu.be/$1)');
  // ссылки на альбомы, которые уже открывает «Смотреть примеры»
  try{
    const isOpt=OPTIONS.some(o=>o.id===e.id && o.name===e.name);
    const albIds=((typeof ALB_LINKS!=='undefined'?ALB_LINKS:{})[isOpt?'o':'p']||{})[e.id]||[];
    albIds.forEach(aid=>{
      const a=typeof albById==='function'?albById(aid):null; if(!a) return;
      const m=(a.vk||'').match(/album-73004917_\d+/);
      if(m) t=t.replace(new RegExp('https?://(?:m\\.)?vk\\.(?:com|ru)/'+m[0],'gi'),'');
      t=t.replace(/по ссылке вы можете увидеть примеры[^\n]*/gi,'');
    });
    if(albIds.length) t=t.replace(/Примеры гравировок и выбрать одну из них\.\.\./gi,'').replace(/примеры гравировок и выбрать одну из них\.\.\./gi,'');
  }catch(err){}
  t=t.replace(/[ \t]+\n/g,'\n').replace(/\n{3,}/g,'\n\n').trim();
  return richText(t);
}
function richText(t,own){
  if(own) t=t.replace(new RegExp('https?://(?:m\\.)?vk\\.com/(?:vargan64\\?w=)?wall-73004917_'+own+'(?!\\d)','g'),'смотрите видео ниже');
  let h=esc(t);
  h=h.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,(m,txt,u)=>{const w=u.match(WALL_RE); return w?postBtn(w[1]):`<a href="${u}" data-href="${u}">${txt}</a>`;});
  // отзывы в теме VK — кнопка «смотреть в VK», не сырая ссылка
  h=h.replace(/(^|[^">])(https?:\/\/(?:m\.)?vk\.com\/topic-[^\s<]+)/g,(m,pre,u)=>`${pre}<a class="btn seebtn" href="${u}" data-href="${u}">смотреть в VK</a>`);
  h=h.replace(/(^|[^"=>])(https?:\/\/[^\s<]+[^\s<.,)!?:;])/g,(m,pre,u)=>{const w=u.match(WALL_RE); return w?`${pre}${postBtn(w[1])}`:`${pre}<a href="${u}" data-href="${u}">${u}</a>`;});
  return h;
}
function allPosts(){ const m={}; [...PRODUCTS,...OPTIONS].forEach(e=>(e.posts||[]).forEach(p=>{const w=(p.post||'').match(WALL_RE); if(w&&!m[w[1]]) m[w[1]]=p;})); return m; }
function postScreen(id){
  const p=allPosts()[id];
  let title='',post=p;
  if(p&&p.text){ const lines=p.text.split('\n'); const i=lines.findIndex(l=>l.trim()); if(i>=0){ title=lines[i].trim(); post=Object.assign({},p,{text:lines.slice(i+1).join('\n').replace(/^\s+/,'')}); } }
  $app.innerHTML=`<div class="p">${title?`<h2 class="bigtitle">${esc(title)}</h2>`:''}${p?videoBlock([post]):'<p class="hint">Пост недоступен</p>'}${backLink()}</div>`;
  bindBack(); bindVideos(); setMain('Назад', onBack);
}
document.addEventListener('click',e=>{const a=e.target.closest('[data-post]'); if(a){e.preventDefault(); const id=a.dataset.post;
  if(allPosts()[id]) go(()=>postScreen(id)); else openExt(`https://vk.com/wall-73004917_${id}`);}});
// Ссылки открываем через Telegram.WebApp.openLink (в браузере — новая вкладка)
document.addEventListener('click',e=>{const a=e.target.closest('[data-href]'); if(a){e.preventDefault(); openExt(a.dataset.href);}});
function gallery(imgs){ return `<div class="gallery">${imgs.map(s=>`<img src="${s}" alt="" loading="lazy">`).join('')}</div>${imgs.length>1?`<p class="hint">← листайте фото (${imgs.length}) →</p>`:''}`; }
// Видео: VK-плеер грузится только по нажатию; ссылка-фолбэк всегда есть (VK может быть медленным/заблокированным)
function videoBlock(posts){
  if(!posts||!posts.length) return '';
  return posts.map(p=>`<div class="post">
    ${p.text?`<details open class="arrow"><summary aria-label="Свернуть или развернуть"></summary><div class="desc">${richText(p.text,((p.post||'').match(WALL_RE)||[])[1])}</div></details>`:''}
    ${p.videos.length?`<div class="vids">${p.videos.map((v,i)=>v.file?`<div class="vid"><video controls playsinline preload="none" poster="${v.file.replace('.mp4','.jpg')}" src="${v.file}"></video><div class="hint">Видео ${i+1}${v.dur?' · '+v.dur:''}</div></div>`
      :`<div class="vid"><button class="vplay" data-oid="${v.oid}" data-vid="${v.id}">▶ Видео ${i+1}${v.dur?' · '+v.dur:''} (плеер VK)</button>
      <a class="vlink" href="${v.url}" data-href="${v.url}">открыть в VK</a></div>`).join('')}</div>`:''}</div>`).join('');
}
// «Послушать звучание» — отдельный экран внутри магазина: локальные видео + дословные тексты постов VK
function listen(kind,id){
  const e=kind==='o'?optById(id):PRODUCTS.find(x=>x.id===id);
  $app.innerHTML=`<div class="p"><h2 class="bigtitle">${esc(e.name)}</h2>${videoBlock(e.posts)}${backLink()}</div>`;
  bindBack(); bindVideos(); setMain(kind==='o'?'Назад к опции':'Назад к товару', onBack);
}
const listenBtn = (kind,e) => e.posts&&e.posts.length?`<button class="btn" id="listen">🎧 Послушать звучание</button>`:'';
const VK_SHOP='https://vk.com/market-73004917';
const MASTER='https://t.me/vasilykovatsenko', CHANNEL='https://t.me/homuskovatsenko';
const supportBtn = name => { const u=`${MASTER}?text=${encodeURIComponent('Здравствуйте! Вопрос по товару: '+name)}`; return `<a class="btn sec" href="${u}" data-href="${u}">💬 Написать в поддержку</a>`; };
const buyVK = u => `<a class="btn sec" href="${u}" data-href="${u}">Купить в VK</a>`;
// VK-плеер — только запасной вариант для видео, которые не удалось скачать
function bindVideos(){ $app.querySelectorAll('.vplay').forEach(b=>b.onclick=()=>{
  const f=document.createElement('iframe'); f.className='vframe';
  f.src=`https://vk.com/video_ext.php?oid=${b.dataset.oid}&id=${b.dataset.vid}&hd=2`;
  f.allow='autoplay; encrypted-media; fullscreen; picture-in-picture'; f.setAttribute('allowfullscreen','');
  b.parentElement.insertBefore(f,b); b.remove(); });
  // одновременно играет только одно видео
  $app.querySelectorAll('video').forEach(v=>v.addEventListener('play',()=>$app.querySelectorAll('video').forEach(o=>o!==v&&o.pause())));
}
function option(id){
  const o=optById(id);
  $app.innerHTML=`<div class="p">${gallery(o.imgs)}
  <h2>${esc(o.name)}</h2><div class="price" style="font-size:22px">${rub(o.price)}</div>
  <p class="hint">Опция добавляется к варгану: отметьте её на странице варгана или в корзине.</p>
  ${albumBtns('o',id)}${buyVK(o.vk)}${supportBtn(o.name)}<div class="desc">${descOf(o)}</div>${backLink()}</div>`;
  bindBack(); bindAlbBtns(); setMain('Выбрать варган', catalog);
}
function product(id){
  const p=PRODUCTS.find(x=>x.id===id); const sel=new Set();
  const priceBlock=p.customPrice
    ?`<div class="price" style="font-size:22px">от ${rub(p.price)}</div>
  <p class="hint">Перед заказом уточните сумму у мастера — цена зависит от камня.</p>
  <label>Итоговая сумма, ₽<input id="customPrice" type="number" min="${p.price}" step="100" inputmode="numeric" placeholder="например ${p.price}" value="${p.price}"></label>`
    :`<div class="price" style="font-size:22px">${rub(p.price)}</div>`;
  $app.innerHTML=`<div class="p">${gallery(p.imgs)}
  <h2>${esc(p.name)}</h2>${priceBlock}
  ${listenBtn('p',p)}${albumBtns('p',id)}${buyVK(p.vk)}${supportBtn(p.name)}
  <h3>Опции</h3><p class="hint" style="margin:0 0 8px">Выберите дополнения к заказу, если нужны: они добавятся к цене варгана.</p>${OPTIONS.map(o=>`<label class="pm"><input type="checkbox" value="${o.id}" style="width:auto"> ${esc(oname(o))} <b>+${rub(o.price)}</b></label>${optExamples(o.id)}`).join('')}
  <h3>Описание</h3><div class="desc">${descOf(p)}</div>${backLink()}</div>`;
  bindBack(); bindAlbBtns(); const lb=document.getElementById('listen'); if(lb) lb.onclick=()=>go(()=>listen('p',id));
  const base=()=>{ if(!p.customPrice) return p.price; const v=+(document.getElementById('customPrice').value||0); return v; };
  const total=()=>base()+[...sel].reduce((s,o)=>s+optById(o).price,0);
  const upd=()=>setMain(`В корзину · ${rub(total())}`, ()=>{
    if(p.customPrice){ const v=base(); if(!v||v<p.price){ alert('Перед заказом уточните сумму у мастера и впишите от '+rub(p.price)); return; } add(id,[...sel],v); }
    else add(id,[...sel]);
    setMain('В корзине ✓ · перейти', ()=>go(cart));
  });
  $app.querySelectorAll('input[type=checkbox]').forEach(c=>c.onchange=()=>{c.checked?sel.add(c.value):sel.delete(c.value); upd();});
  const cp=document.getElementById('customPrice'); if(cp) cp.oninput=upd;
  upd();
}
const COMMUNITY={name:'ВАРГАН | ХОМУС | ВАСИЛИЯ КОВАЦЕНКО',vk:'https://vk.com/vargan64',phone:'+7 958 551-67-40',site:'https://shkolavargana.ru',
  about:'Здравствуйте, дорогие мои! Меня зовут Василий Коваценко, мастер по изготовлению варганов. Инструменты из титаносодержащей нержавеющей стали, полностью вручную, без станков, по классической технологии. На моих варганах играют и преподают Максим Булыгин, Добрыня Сатин, Алексей Чичаков, Игорь Вептипрахов, Алексей Митин и др.'};
function info(){
  const c=COMMUNITY;
  $app.innerHTML=`<div class="p" style="text-align:center"><img src="img/avatar.jpg" class="ava-big" alt=""><h2>Хомус Коваценко</h2><div class="hint">${esc(c.name)}</div></div>
  <div class="p"><div class="desc">${esc(c.about)}</div>
  <p>📞 <a href="tel:${c.phone.replace(/[^+\d]/g,'')}">${c.phone}</a></p>
  <p>🌐 <a href="${c.site}" data-href="${c.site}">shkolavargana.ru</a></p>
  <p>🛍 <a href="${VK_SHOP}" data-href="${VK_SHOP}">Купить в VK — магазин сообщества</a></p>
  <p>📣 <a href="${CHANNEL}" data-href="${CHANNEL}">Telegram-канал — t.me/homuskovatsenko</a></p>
  <p>✉️ <a href="${MASTER}" data-href="${MASTER}">Написать мастеру — @vasilykovatsenko</a></p>
  <p>💬 <a href="${c.vk}" data-href="${c.vk}">Сообщество VK — vk.com/vargan64</a></p>
  <p class="hint">Перед оформлением уточните доставку у мастера.</p>${backLink()}</div>`;
  bindBack(); bindAlbBtns(); setMain('Перейти в каталог', catalog);
}
function cart(){
  const items=Object.entries(state.cart);
  const delBlock=items.length?`<p class="hint">Перед оформлением уточните доставку у мастера.</p>
  <label>Стоимость доставки, ₽<input id="delivery" type="number" min="1" step="1" inputmode="numeric" placeholder="сумма доставки" value="${state.delivery||''}"></label>
  <p>Товары: <b>${rub(cartTotal())}</b>${state.delivery?` · Доставка: <b>${rub(state.delivery)}</b>`:''}<br>Итого: <b>${rub(orderTotal())}</b></p>`:`<p class="hint">Корзина пуста</p>`;
  $app.innerHTML=`<div class="p"><h2>Корзина</h2>${items.length?items.map(([k,l])=>{const p=PRODUCTS.find(x=>x.id===l.pid);return `<div class="row"><img src="${p.imgs[0]}"><div style="flex:1">${esc(p.name)}
   ${OPTIONS.map(o=>`<label class="hint" style="display:block"><input type="checkbox" class="co" data-k="${k}" value="${o.id}" ${l.opts.includes(o.id)?'checked':''} style="width:auto;margin:2px 4px 0 0">${esc(oname(o))} +${rub(o.price)}</label>`).join('')}
   ${p.customPrice?`<label class="hint" style="display:block;margin-top:6px">Сумма варгана, ₽<input class="cprice" data-k="${k}" type="number" min="${p.price}" step="100" inputmode="numeric" value="${l.custom!=null?l.custom:p.price}"></label>`:''}
   <div class="price">${rub(lineUnit(l)*l.q)}</div></div>
  <div class="qty"><button data-d="-1" data-k="${k}">−</button> ${l.q} <button data-d="1" data-k="${k}">+</button></div></div>`}).join('')+delBlock:'<p class="hint">Корзина пуста</p>'}${backLink()}</div>`;
  bindBack();
  const rerender=()=>{updCount(); state.stack.pop(); go(cart);};
  $app.querySelectorAll('.qty button').forEach(b=>b.onclick=()=>{const k=b.dataset.k; state.cart[k].q+= +b.dataset.d; if(state.cart[k].q<=0) delete state.cart[k]; rerender();});
  $app.querySelectorAll('.co').forEach(c=>c.onchange=()=>{const l=state.cart[c.dataset.k]; delete state.cart[c.dataset.k];
    const opts=c.checked?[...l.opts,c.value]:l.opts.filter(x=>x!==c.value); const k=l.pid+'|'+opts.slice().sort().join(',');
    if(state.cart[k]){ state.cart[k].q+=l.q; if(l.custom!=null) state.cart[k].custom=l.custom; }
    else state.cart[k]={pid:l.pid,opts,q:l.q,custom:l.custom}; rerender();});
  $app.querySelectorAll('.cprice').forEach(inp=>inp.onchange=()=>{ const l=state.cart[inp.dataset.k]; const p=PRODUCTS.find(x=>x.id===l.pid); let v=+inp.value; if(!v||v<p.price) v=p.price; l.custom=v; rerender(); });
  const d=document.getElementById('delivery');
  const syncDel=()=>{ state.delivery=Math.max(0, +(d&&d.value||0)); };
  const goPay=()=>{
    syncDel();
    if(!(state.delivery>=1)){ alert('Впишите стоимость доставки — уточните у мастера'); if(d) d.focus(); return; }
    go(checkout);
  };
  if(d){
    d.setAttribute('min','1');
    d.oninput=()=>{ syncDel(); setMain(items.length?((state.delivery>=1)?`К оплате · ${rub(orderTotal())}`:'Впишите доставку'):'', items.length?goPay:null); };
    d.onkeydown=e=>{ if(e.key==='Enter'){ e.preventDefault(); d.blur(); goPay(); } };
  }
  setMain(items.length?((state.delivery>=1)?`К оплате · ${rub(orderTotal())}`:'Впишите доставку'):'', items.length?goPay:null);
}
const METHODS={rf:'Карта РФ',intl:'Международная Visa',crypto:'Крипта (USDT/TON)'};
// Временные реквизиты (заглушка). Позже заменим на реальные от мастера.
const PAY={
  rf:{hint:'Перевод на карту РФ (временные реквизиты)', card:'2200 7001 2345 6789', who:'ВРЕМЕННЫЕ РЕКВИЗИТЫ', bank:'Сбербанк'},
  intl:{hint:'Перевод на международную Visa (временные реквизиты)', card:'4111 1111 2222 3333', who:'TEMP PLACEHOLDER', bank:'Visa'},
  crypto:{hint:'USDT · сеть TRC20 (временный адрес)', address:'TXk9mP2wQr7nL4vHj8sFd6cYb1aGe3uZqR', network:'TRC20'}
};
const ORDER_API='https://homus-bot.homus-kovatsenko.workers.dev/order';

function genOrderId(){
  const n=Math.floor(100000+Math.random()*900000);
  return 'HK-'+n;
}
function shipLine(s){
  const fio=[s.lastName,s.firstName,s.patronymic].filter(Boolean).join(' ');
  return [fio, s.phone, [s.country,s.city,s.zip].filter(Boolean).join(', ')].filter(Boolean).join(' · ');
}
function val(id){ const el=document.getElementById(id); return el?(el.value||'').trim():''; }
function copyText(t){
  const done=()=>{ try{ inTG && tg.HapticFeedback.notificationOccurred('success'); }catch(e){} const n=document.getElementById('copyNote'); if(n){ n.textContent='Скопировано'; setTimeout(()=>{ if(n) n.textContent=''; },1500);} };
  if(navigator.clipboard&&navigator.clipboard.writeText) return navigator.clipboard.writeText(t).then(done).catch(()=>fallbackCopy(t,done));
  return fallbackCopy(t,done);
}
function fallbackCopy(t,done){
  const ta=document.createElement('textarea'); ta.value=t; document.body.appendChild(ta); ta.select();
  try{ document.execCommand('copy'); }catch(e){}
  ta.remove(); done();
}

function checkout(){
  const defContact=state.contact||((inTG&&tg.initDataUnsafe.user&&tg.initDataUnsafe.user.username)?'@'+tg.initDataUnsafe.user.username:'');
  const s=state.ship||{};
  const paint=()=>{
    const goods=cartTotal(), del=state.delivery||0, tot=goods+del;
    document.getElementById('sumGoods').textContent=rub(goods);
    document.getElementById('sumDel').textContent=del?rub(del):'—';
    document.getElementById('sumTot').textContent=rub(tot);
    setMain(`К оплате · ${rub(tot)}`, ()=>{
      state.contact=val('contact');
      state.ship={
        country:val('shipCountry'), city:val('shipCity'), zip:val('shipZip'),
        firstName:val('shipFirst'), lastName:val('shipLast'), patronymic:val('shipPatr'), phone:val('shipPhone')
      };
      const v=+(document.getElementById('delivery').value||0);
      state.delivery=v>0?v:0;
      if(!(state.delivery>=1)){ alert('Впишите стоимость доставки — уточните у мастера'); return; }
      if(!state.contact){ alert('Укажите контакт (Telegram @)'); return; }
      if(!state.ship.country){ alert('Укажите страну'); return; }
      if(!state.ship.city){ alert('Укажите город'); return; }
      if(!state.ship.firstName){ alert('Укажите имя получателя'); return; }
      if(!state.ship.lastName){ alert('Укажите фамилию получателя'); return; }
      if(!state.ship.phone){ alert('Укажите номер телефона'); return; }
      const m=document.querySelector('input[name=pm]:checked').value; go(()=>pay(m));
    });
  };
  $app.innerHTML=`<div class="p"><h2>Оформление</h2>
  <p>Товары: <b id="sumGoods">${rub(cartTotal())}</b></p>
  <label>Доставка, ₽<input id="delivery" type="number" min="1" step="1" inputmode="numeric" placeholder="сумма доставки" value="${state.delivery||''}"></label>
  <p>Доставка: <b id="sumDel">${state.delivery?rub(state.delivery):'—'}</b><br>Итого к оплате: <b id="sumTot">${rub(orderTotal())}</b></p>
  <label>Telegram-контакт<input id="contact" placeholder="@username" value="${esc(defContact)}"></label>
  <h3>Доставка</h3>
  <label>Страна<input id="shipCountry" placeholder="Россия / другая страна" value="${esc(s.country||'')}"></label>
  <label>Город<input id="shipCity" placeholder="Город" value="${esc(s.city||'')}"></label>
  <label>Индекс<input id="shipZip" placeholder="Индекс / ZIP" inputmode="numeric" value="${esc(s.zip||'')}"></label>
  <div class="form-grid">
    <label>Фамилия<input id="shipLast" placeholder="Фамилия" value="${esc(s.lastName||'')}"></label>
    <label>Имя<input id="shipFirst" placeholder="Имя" value="${esc(s.firstName||'')}"></label>
  </div>
  <label>Отчество<input id="shipPatr" placeholder="Отчество (если есть)" value="${esc(s.patronymic||'')}"></label>
  <label>Телефон<input id="shipPhone" placeholder="+7 …" type="tel" inputmode="tel" value="${esc(s.phone||'')}"></label>
  <h3>Способ оплаты</h3>${Object.entries(METHODS).map(([k,v],i)=>`<label class="pm"><input type="radio" name="pm" value="${k}" ${i?'':'checked'} style="width:auto"> ${v}</label>`).join('')}
  <p class="hint">Оплата переводом по реквизитам. Заявка уйдёт мастеру с номером.</p>${backLink()}</div>`;
  bindBack();
  const d=document.getElementById('delivery');
  d.oninput=()=>{ state.delivery=+(d.value||0); paint(); };
  paint();
}

function buildOrder(m, orderId){
  const s=state.ship||{};
  return {
    orderId: orderId||genOrderId(),
    items:cartItems().map(i=>({id:i.p.id,name:i.p.name,options:i.opts.map(o=>oname(optById(o))),qty:i.q,unit:lineUnit(i)})),
    goods:cartTotal(), delivery:state.delivery||0, total:orderTotal(),
    contact:state.contact,
    ship:Object.assign({},s),
    addr:shipLine(s),
    method:METHODS[m]||m, paid:false
  };
}

async function sendOrder(order){
  const body={order, initData:(inTG&&tg.initData)||''};
  try{
    const r=await fetch(ORDER_API,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const j=await r.json().catch(()=>({}));
    // ok:true even when Telegram not configured — order is saved in Worker DB
    return {ok:!!j.ok, telegram:!!j.telegram, error:j.error||(j.ok?'':('HTTP '+r.status)), saved:!!j.saved};
  }catch(e){ return {ok:false, error:String(e)}; }
}
function readReceiptFile(file){
  return new Promise((resolve,reject)=>{
    if(!file) return resolve(null);
    if(file.size>5*1024*1024) return reject(new Error('Файл больше 5 МБ — сожмите скрин или PDF'));
    const ok=/^(image\/(jpeg|png|webp|gif)|application\/pdf)$/i.test(file.type)||/\.(jpe?g|png|webp|gif|pdf)$/i.test(file.name||'');
    if(!ok) return reject(new Error('Нужен скрин (JPG/PNG) или PDF'));
    const fr=new FileReader();
    fr.onload=()=>{
      const dataUrl=String(fr.result||'');
      const i=dataUrl.indexOf(',');
      const b64=i>=0?dataUrl.slice(i+1):'';
      resolve({data:b64, mime:file.type||'application/octet-stream', filename:file.name||'receipt.jpg'});
    };
    fr.onerror=()=>reject(new Error('Не удалось прочитать файл'));
    fr.readAsDataURL(file);
  });
}

function payHtml(m, order){
  const p=PAY[m]||{};
  const paidLabel=order.paid?'Оплачено':'Создана · ждёт оплату';
  const head=`<div class="p"><h2>${esc(METHODS[m])}</h2>
  <div class="order-box"><div>Номер заявки: <b id="orderIdLbl">${esc(order.orderId)}</b></div>
  <div>Статус: <b id="paidLbl">${paidLabel}</b></div>
  <div>К оплате: <b>${rub(order.total)}</b></div></div>
  <p class="hint">${esc(p.hint||'')}</p>`;
  let body='';
  if(m==='crypto'){
    const addr=p.address||'';
    const qr=`https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data=${encodeURIComponent(addr)}`;
    body=`<div class="qr-wrap"><img class="qr" src="${qr}" alt="QR"><div class="hint">Сканировать QR</div>
    <div class="net-badge">Сеть: <b>TRC20</b></div></div>
    <div class="mock" id="payReqs">${esc(addr)}</div>
    <button type="button" class="btn sec" id="copyPay">Скопировать адрес</button>
    <div id="copyNote" class="hint"></div>`;
  } else {
    const lines=[p.card?('Карта: '+p.card):'', p.who?('Получатель: '+p.who):'', p.bank?('Банк: '+p.bank):''].filter(Boolean);
    body=`<div class="mock" id="payReqs">${lines.map(esc).join('<br>')}</div>
    <button type="button" class="btn sec" id="copyPay">Скопировать реквизиты</button>
    <div id="copyNote" class="hint"></div>
    <p class="hint">Временные цифры — позже заменим на реальные реквизиты мастера.</p>`;
  }
  const receipt=`<div class="receipt-box">
    <label class="receipt-label">Прикрепить скрин / чек оплаты
      <input type="file" id="receiptFile" accept="image/*,application/pdf,.jpg,.jpeg,.png,.webp,.gif,.pdf">
    </label>
    <div id="receiptName" class="hint">Файл не выбран</div>
  </div>
  <p class="hint">После перевода прикрепите скрин или PDF и нажмите «Я оплатил». Мастер получит заявку и чек.</p>
  <div id="orderStatus" class="hint">Создаём заявку…</div>`;
  return head+body+receipt+`${backLink()}</div>`;
}

function pay(m){
  const order=buildOrder(m);
  let receiptFile=null;
  $app.innerHTML=payHtml(m, order); bindBack(); setMain('',null);
  const copyBtn=document.getElementById('copyPay');
  if(copyBtn){
    copyBtn.onclick=()=>{
      const p=PAY[m]||{};
      const t=m==='crypto'?(p.address||''):( [p.card&&('Карта: '+p.card), p.who&&('Получатель: '+p.who), p.bank&&('Банк: '+p.bank)].filter(Boolean).join('\n') );
      copyText(t);
    };
  }
  const fileInp=document.getElementById('receiptFile');
  const nameEl=document.getElementById('receiptName');
  if(fileInp){
    fileInp.onchange=()=>{
      receiptFile=fileInp.files&&fileInp.files[0]?fileInp.files[0]:null;
      if(nameEl) nameEl.textContent=receiptFile?('Выбрано: '+receiptFile.name):'Файл не выбран';
    };
  }
  sendOrder(order).then(r=>{
    const el=document.getElementById('orderStatus');
    if(el){
      if(r.ok){
        el.textContent=r.telegram
          ?('Шаг 1: заявка '+order.orderId+' создана — мастер уведомлён, ждёт оплату.')
          :('Шаг 1: заявка '+order.orderId+' сохранена. Telegram мастеру пока не настроен — после оплаты всё равно отметьте «Я оплатил».');
      } else {
        el.textContent='Заявку пока не удалось создать ('+(r.error||'')+'). Можно оплатить переводом — повторите позже.';
      }
    }
    setMain('Я оплатил', async ()=>{
      if(!receiptFile){ alert('Прикрепите скрин или документ оплаты'); if(fileInp) fileInp.click(); return; }
      let receipt;
      try{ receipt=await readReceiptFile(receiptFile); }
      catch(e){ alert(e.message||String(e)); return; }
      order.paid=true;
      order.hasReceipt=true;
      order.receipt=receipt;
      const pl=document.getElementById('paidLbl'); if(pl) pl.textContent='Оплачено';
      const st=document.getElementById('orderStatus'); if(st) st.textContent='Шаг 2: отправляем оплату и чек…';
      setMain('Отправляем…', null);
      const r2=await sendOrder(order);
      $app.innerHTML=`<div class="p"><h2>Спасибо!</h2>
      <div class="order-box"><div>Номер заявки: <b>${esc(order.orderId)}</b></div>
      <div>Статус: <b>Оплачено</b></div>
      <div>Чек: <b>приложен</b></div></div>
      <p>${r2.ok?(r2.telegram?'Мастер получил заявку, отметку об оплате и чек.':'Заявка и чек сохранены. Мастер увидит их, когда подключат уведомления.'):('Отметку об оплате не удалось отправить ('+esc(r2.error||'')+'). Сохраните номер заявки и напишите мастеру.')}</p>
      <p>Свяжется по контакту <b>${esc(order.contact)}</b>.</p>${backLink()}</div>`;
      state.cart={}; state.delivery=0; updCount(); bindBack(); setMain('В каталог', catalog);
    });
  });
}

document.getElementById('cartBtn').onclick=()=>go(cart);
document.getElementById('brand').onclick=()=>go(info);
catalog();
