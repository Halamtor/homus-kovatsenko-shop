// Хомус Коваценко — Telegram Mini App (прототип). Товары — из VK-магазина (js/data.js). ОПЛАТА — ДЕМО.
const tg = window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initData !== undefined ? window.Telegram.WebApp : null;
const inTG = !!(tg && tg.platform && tg.platform !== 'unknown');
if (tg) { try { tg.ready(); tg.expand(); } catch (e) {} }

const state = {cat:'Варганы', q:'', cart:{}, stack:[]};
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
const lineUnit = l => PRODUCTS.find(p=>p.id===l.pid).price + l.opts.reduce((s,o)=>s+optById(o).price,0);
const cartItems = () => Object.values(state.cart).map(l=>({...l,p:PRODUCTS.find(x=>x.id===l.pid)}));
const cartTotal = () => cartItems().reduce((s,l)=>s+lineUnit(l)*l.q,0);
function updCount(){ document.getElementById('cartCount').textContent = cartItems().reduce((a,l)=>a+l.q,0); }
function add(pid,opts){ const k=pid+'|'+opts.slice().sort().join(','); state.cart[k]=state.cart[k]||{pid,opts:opts.slice(),q:0}; state.cart[k].q++; updCount(); haptic(); }
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
  <div class="grid">${list.map(p=>`<div class="item" data-id="${p.id}"><img src="${p.imgs[0]}" alt="" loading="lazy"><div class="t">${esc(p.name)}<div class="price">${rub(p.price)}</div></div></div>`).join('')}</div>
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
    ids.forEach(id=>{ const u=`https?://(?:m\\.)?vk\\.com/wall-73004917_${id}`;
      t=t.replace(new RegExp(`по ссылке\\s*${u}`,'g'),'в кнопке «Послушать звучание» выше')
         .replace(new RegExp(`\\[[^\\]]+\\]\\(${u}\\)`,'g'),'в кнопке «Послушать звучание» выше')
         .replace(new RegExp(u,'g'),'в кнопке «Послушать звучание» выше'); });
  }
  return richText(t);
}
function richText(t,own){
  if(own) t=t.replace(new RegExp('https?://(?:m\\.)?vk\\.com/(?:vargan64\\?w=)?wall-73004917_'+own+'(?!\\d)','g'),'смотрите видео ниже');
  let h=esc(t);
  h=h.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g,(m,txt,u)=>{const w=u.match(WALL_RE); return w?postBtn(w[1]):`<a href="${u}" data-href="${u}">${txt}</a>`;});
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
  ${listenBtn('o',o)}${albumBtns('o',id)}${buyVK(o.vk)}${supportBtn(o.name)}<div class="desc">${descOf(o)}</div>${backLink()}</div>`;
  bindBack(); bindAlbBtns(); const lb=document.getElementById('listen'); if(lb) lb.onclick=()=>go(()=>listen('o',id)); setMain('Выбрать варган', catalog);
}
function product(id){
  const p=PRODUCTS.find(x=>x.id===id); const sel=new Set();
  $app.innerHTML=`<div class="p">${gallery(p.imgs)}
  <h2>${esc(p.name)}</h2><div class="price" style="font-size:22px">${rub(p.price)}</div>
  ${listenBtn('p',p)}${albumBtns('p',id)}${buyVK(p.vk)}${supportBtn(p.name)}
  <h3>Опции</h3><p class="hint" style="margin:0 0 8px">Выберите дополнения к заказу, если нужны: они добавятся к цене варгана.</p>${OPTIONS.map(o=>`<label class="pm"><input type="checkbox" value="${o.id}" style="width:auto"> ${esc(oname(o))} <b>+${rub(o.price)}</b></label>${optExamples(o.id)}`).join('')}
  <h3>Описание</h3><div class="desc">${descOf(p)}</div>${backLink()}</div>`;
  bindBack(); bindAlbBtns(); const lb=document.getElementById('listen'); if(lb) lb.onclick=()=>go(()=>listen('p',id));
  const total=()=>p.price+[...sel].reduce((s,o)=>s+optById(o).price,0);
  const upd=()=>setMain(`В корзину · ${rub(total())}`, ()=>{add(id,[...sel]); setMain('В корзине ✓ · перейти', ()=>go(cart));});
  $app.querySelectorAll('input[type=checkbox]').forEach(c=>c.onchange=()=>{c.checked?sel.add(c.value):sel.delete(c.value); upd();});
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
  <p>💬 <a href="${c.vk}" data-href="${c.vk}">Сообщество VK — vk.com/vargan64</a></p>${backLink()}</div>`;
  bindBack(); bindAlbBtns(); setMain('Перейти в каталог', catalog);
}
function cart(){
  const items=Object.entries(state.cart);
  $app.innerHTML=`<div class="p"><h2>Корзина</h2>${items.length?items.map(([k,l])=>{const p=PRODUCTS.find(x=>x.id===l.pid);return `<div class="row"><img src="${p.imgs[0]}"><div style="flex:1">${esc(p.name)}
   ${OPTIONS.map(o=>`<label class="hint" style="display:block"><input type="checkbox" class="co" data-k="${k}" value="${o.id}" ${l.opts.includes(o.id)?'checked':''} style="width:auto;margin:2px 4px 0 0">${esc(oname(o))} +${rub(o.price)}</label>`).join('')}
   <div class="price">${rub(lineUnit(l)*l.q)}</div></div>
  <div class="qty"><button data-d="-1" data-k="${k}">−</button> ${l.q} <button data-d="1" data-k="${k}">+</button></div></div>`}).join('')+`<h3>Итого: ${rub(cartTotal())}</h3>`:'<p class="hint">Корзина пуста</p>'}${backLink()}</div>`;
  bindBack();
  const rerender=()=>{updCount(); state.stack.pop(); go(cart);};
  $app.querySelectorAll('.qty button').forEach(b=>b.onclick=()=>{const k=b.dataset.k; state.cart[k].q+= +b.dataset.d; if(state.cart[k].q<=0) delete state.cart[k]; rerender();});
  $app.querySelectorAll('.co').forEach(c=>c.onchange=()=>{const l=state.cart[c.dataset.k]; delete state.cart[c.dataset.k];
    const opts=c.checked?[...l.opts,c.value]:l.opts.filter(x=>x!==c.value); const k=l.pid+'|'+opts.slice().sort().join(',');
    if(state.cart[k]) state.cart[k].q+=l.q; else state.cart[k]={pid:l.pid,opts,q:l.q}; rerender();});
  setMain(items.length?`Оформить · ${rub(cartTotal())}`:'', ()=>go(checkout));
}
const METHODS={crypto:'Крипта (USDT/TON)',rf:'Карта РФ',intl:'Международная карта'};
function checkout(){
  $app.innerHTML=`<div class="p"><h2>Оформление</h2><p>Сумма: <b>${rub(cartTotal())}</b></p>
  <label>Имя / контакт<input id="contact" placeholder="@username или телефон" value="${(inTG&&tg.initDataUnsafe.user&&tg.initDataUnsafe.user.username)?'@'+tg.initDataUnsafe.user.username:''}"></label>
  <label>Адрес доставки<textarea id="addr" rows="2" placeholder="Страна, город, адрес"></textarea></label>
  <h3>Способ оплаты</h3>${Object.entries(METHODS).map(([k,v],i)=>`<label class="pm"><input type="radio" name="pm" value="${k}" ${i?'':'checked'} style="width:auto"> ${v}</label>`).join('')}
  <p class="hint">Цены в рублях. При оплате криптой сумма в USDT/TON подтверждается продавцом вручную по текущему курсу.</p><p class="hint">⚠️ Демо: реальные платежи не подключены.</p>${backLink()}</div>`;
  bindBack();
  setMain('Перейти к оплате', ()=>{ const m=document.querySelector('input[name=pm]:checked').value; go(()=>pay(m)); });
}
function pay(m){
  const order={items:cartItems().map(i=>({id:i.p.id,name:i.p.name,options:i.opts.map(o=>oname(optById(o))),qty:i.q,unit:lineUnit(i)})),total:cartTotal(),contact:(document.getElementById('contact')||{}).value};
  $app.innerHTML=`<div class="p"><h2>${METHODS[m]}</h2><p>К оплате: <b>${rub(order.total)}</b></p><div id="res" class="hint">Создаём счёт…</div>${backLink()}</div>`; bindBack(); setMain('',null);
  const fn = m==='crypto'?createCryptoInvoice:createCardPayment;
  fn(order,m).then(r=>{ document.getElementById('res').innerHTML=r.html; setMain('Я оплатил (демо)', ()=>{ $app.innerHTML=`<div class="p"><h2>Спасибо!</h2><div class="mock">ДЕМО: заказ «оформлен». В реальной версии бэкенд проверит оплату и пришлёт уведомление владельцу через Bot API sendMessage.</div></div>`; state.cart={}; updCount(); setMain('В каталог',catalog); }); });
}

// ================= ТОЧКИ ИНТЕГРАЦИИ ПЛАТЕЖЕЙ (сейчас МОК) =================
// Никаких секретных токенов во фронтенде! Все вызовы — через ваш бэкенд (POST /api/...).

/** Крипто-счёт. Реально: бэкенд вызывает Crypto Pay API (@CryptoBot) createInvoice
 *  (https://help.crypt.bot/crypto-pay-api) с asset USDT/TON и amount (или currency_type=fiat, fiat=RUB — тогда курс считает сам CryptoBot), возвращает pay_url / mini_app_invoice_url;
 *  во фронте: tg.openTelegramLink(pay_url). Альтернатива: NOWPayments API. Статус — по webhook. */
async function createCryptoInvoice(order){
  // const r = await fetch('/api/crypto-invoice',{method:'POST',body:JSON.stringify(order)}).then(r=>r.json());
  await new Promise(r=>setTimeout(r,400));
  return {html:`<div class="mock"><b>ДЕМО-счёт</b><br>Сумма заказа: ${rub(order.total)}<br>К оплате в USDT (TRC-20) / TON: <i>сумма будет подтверждена продавцом вручную по курсу</i><br>Адрес: <code>T_ADDRESS_PLACEHOLDER_XXXXXXXXXXXX</code><br>Счёт №DEMO-${Date.now()%100000}<br>В реальной версии — кнопка «Оплатить в @CryptoBot».</div>`};
}
/** Оплата картой. m==='rf': бэкенд создаёт платёж в ЮKassa (POST https://api.yookassa.ru/v3/payments,
 *  confirmation.type=redirect) или CloudPayments / Т-Банк (Init) → confirmation_url, открываем tg.openLink(url).
 *  m==='intl': бэкенд создаёт Stripe Checkout Session (POST /v1/checkout/sessions) → session.url.
 *  Подтверждение оплаты — только по webhook провайдера на бэкенде. */
async function createCardPayment(order,m){
  await new Promise(r=>setTimeout(r,400));
  const prov = m==='rf'?'ЮKassa / CloudPayments / Т-Банк':'Stripe Checkout';
  return {html:`<div class="mock"><b>ДЕМО-платёж (${prov})</b><br>Здесь пользователь был бы перенаправлен на защищённую страницу оплаты провайдера.<br>Ссылка: <code>https://pay.example/DEMO</code></div>`};
}
document.getElementById('cartBtn').onclick=()=>go(cart);
document.getElementById('brand').onclick=()=>go(info);
catalog();
