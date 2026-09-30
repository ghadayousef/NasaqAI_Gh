/* First-run setup for a new workspace. The demo account never sees this. */
(function(){
  const PALETTES = [
    { name:'زيتون وذهب', colors:['#3f6b4a','#d59938','#f6efe3','#5a3a22','#1c2521'] },
    { name:'وردي أنيق', colors:['#9b3a55','#e4b25e','#fdf2f4','#5a2433','#1c2521'] },
    { name:'أزرق طبي', colors:['#1d5e63','#3aa6a0','#e7f6f5','#14363a','#102026'] },
    { name:'كحلي وذهب', colors:['#14283e','#d59938','#f7f4ee','#1f3b5a','#0a1726'] }
  ];
  const TONES = ['ودّية قريبة من الزبون','احترافية رسمية','مرحة وشبابية','فاخرة وراقية'];
  const LANGS = ['اللهجة الفلسطينية','عربية فصحى مبسّطة'];
  const PLATS = [
    { id:'ig', name:'إنستغرام', icon:'i-ig' },
    { id:'fb', name:'فيسبوك', icon:'i-fb' },
    { id:'wa', name:'واتساب', icon:'i-wa' },
    { id:'tt', name:'تيك توك', icon:'i-tt' }
  ];
  const ROLES = ['أساسي','مميّز','خلفية','ثانوي','نصوص'];

  const S = { step:0, logo:'', palette:0, colors:PALETTES[0].colors.slice(), audience:'', products:'', tone:TONES[0], lang:LANGS[0], persona:[], platforms:['ig','wa'] };

  function esc(s){ return String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;' }[c])); }
  function icon(id){ return `<svg class="icon"><use href="#${id}"/></svg>`; }

  function root(){ return document.getElementById('obRoot'); }

  function resizeLogo(file, cb){
    if (!/^image\/(png|jpe?g|webp)$/.test(file.type)){ App.toast('اختار صورة PNG أو JPG', 'error'); return; }
    if (file.size > 5 * 1024 * 1024){ App.toast('حجم الشعار لازم يكون أقل من 5MB', 'error'); return; }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const size = 256, canvas = document.createElement('canvas');
      canvas.width = canvas.height = size;
      const ctx = canvas.getContext('2d');
      const scale = Math.max(size / img.width, size / img.height);
      const w = img.width * scale, h = img.height * scale;
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
      URL.revokeObjectURL(url);
      cb(canvas.toDataURL('image/jpeg', .86));
    };
    img.src = url;
  }

  function chips(list, picked, attr){
    const on = Array.isArray(picked) ? picked : [picked];
    return list.map(x => `<button type="button" class="chip ${on.includes(x) ? 'on' : ''}" data-${attr}="${esc(x)}">${esc(x)}</button>`).join('');
  }

  function body(){
    const D = window.NASAQ;
    const preset = D.industryPreset || { chips:{ audience:[], products:[] }, ideas:[], persona:[] };
    const co = (D.companies && D.companies[0]) || { name:'نشاطك', initial:'ن' };
    if (S.step === 0) return `
      <h2>هوية «${esc(co.name)}»</h2>
      <p>الشعار والألوان بيستخدمهم الاستوديو في كل تصميم. فيك تعدّلهم بعدين.</p>
      <div class="ob-brand">
        <label class="ob-logo">${S.logo ? `<img src="${S.logo}" alt="">` : `<span>${esc(co.initial)}</span>`}
          <small>${icon('i-upload')} ${S.logo ? 'تغيير الشعار' : 'ارفع الشعار'}</small>
          <input type="file" accept="image/png,image/jpeg,image/webp" hidden></label>
        <div>
          <div class="label" style="margin-bottom:8px">لوحة جاهزة</div>
          <div class="ob-pals">${PALETTES.map((p, i) => `<button type="button" class="ob-pal ${S.palette === i ? 'on' : ''}" data-pal="${i}"><span>${p.colors.map(c => `<i style="background:${c}"></i>`).join('')}</span>${p.name}</button>`).join('')}</div>
          <div class="label" style="margin:14px 0 8px">أو عدّل الألوان</div>
          <div class="ob-picks">${S.colors.slice(0, 3).map((c, i) => `<label><input type="color" value="${c}" data-pick="${i}" aria-label="${ROLES[i]}"><b>${ROLES[i]}</b></label>`).join('')}</div>
        </div>
      </div>`;
    if (S.step === 1) return `
      <h2>لمن بتحكي، وشو بتقدّم؟</h2>
      <p>كل ما وضّحت أكثر، صار المحتوى أقرب لزبائنك.</p>
      <div class="field"><label>جمهورك</label><textarea class="textarea" id="obAud" placeholder="مثال: عائلات وشباب في مدينتك">${esc(S.audience)}</textarea>
        <div class="chips" style="margin-top:8px">${(preset.chips.audience || []).map(x => `<button type="button" class="chip" data-add="obAud">${esc(x)}</button>`).join('')}</div></div>
      <div class="field" style="margin-bottom:0"><label>منتجاتك أو خدماتك</label><textarea class="textarea" id="obProd" placeholder="مثال: قهوة مختصة، حلويات، ضيافة">${esc(S.products)}</textarea>
        <div class="chips" style="margin-top:8px">${(preset.chips.products || []).map(x => `<button type="button" class="chip" data-add="obProd">${esc(x)}</button>`).join('')}</div></div>`;
    if (S.step === 2) return `
      <h2>كيف بتحكي علامتُك؟</h2>
      <p>النبرة واللغة بتطبّق على المنشورات وردود واتساب.</p>
      <div class="label" style="margin-bottom:8px">النبرة</div>
      <div class="chips" style="margin-bottom:16px">${chips(TONES, S.tone, 'tone')}</div>
      <div class="label" style="margin-bottom:8px">لغة المحتوى</div>
      <div class="chips" style="margin-bottom:16px">${chips(LANGS, S.lang, 'lang')}</div>
      <div class="label" style="margin-bottom:8px">صفات العلامة — اختَر ما يناسبك</div>
      <div class="chips">${chips(preset.persona.concat(['عصري','أصيل','مباشر']).filter((v, i, a) => a.indexOf(v) === i), S.persona, 'persona')}</div>`;
    return `
      <h2>وين بدك تنشر؟</h2>
      <p>بنربط الحسابات فعليًا من الإعدادات بعدين. هون بس منجهّز الخطة.</p>
      <div class="ob-plats">${PLATS.map(p => `<button type="button" class="ob-plat ${S.platforms.includes(p.id) ? 'on' : ''}" data-platform="${p.id}">${icon(p.icon)}<b>${p.name}</b></button>`).join('')}</div>
      <div class="brand-note">${icon('i-shield')}<span>الربط بيمر عبر صلاحيات Meta الرسمية، وما مننشر شي إلا بطلب منك.</span></div>`;
  }

  function paint(){
    const el = root();
    if (!el) return;
    el.querySelectorAll('[data-obstep]').forEach(s => s.classList.toggle('on', +s.dataset.obstep === S.step));
    el.querySelector('.ob-bar i').style.width = ((S.step + 1) / 4 * 100) + '%';
    el.querySelector('#obBody').innerHTML = body();
    const back = el.querySelector('#obBack');
    const next = el.querySelector('#obNext');
    back.style.visibility = S.step === 0 ? 'hidden' : 'visible';
    next.innerHTML = S.step === 3 ? `${icon('i-check')} خلّص التهيئة` : `التالي ${icon('i-chev-l')}`;
  }

  function readStep(){
    const el = root();
    const aud = el.querySelector('#obAud'); if (aud) S.audience = aud.value.trim();
    const prod = el.querySelector('#obProd'); if (prod) S.products = prod.value.trim();
  }

  function saveSetup(){
    const D = window.NASAQ;
    const colors = S.colors.map((hex, i) => ({ name:ROLES[i], role:ROLES[i], hex }));
    const brand = {
      logo:S.logo || '',
      colors,
      audience:S.audience,
      products:S.products,
      tone:S.tone,
      lang:S.lang,
      persona:S.persona.length ? S.persona : ((D.industryPreset && D.industryPreset.persona) || []),
      platforms:S.platforms
    };
    const saved = window.NasaqAuth.update({ onboarded:true, brand });
    D.brand = Object.assign({}, D.brand, {
      colors,
      audience:brand.audience || D.brand.audience,
      products:brand.products || D.brand.products,
      persona:brand.persona,
      ideas:(D.brand && D.brand.ideas) || (D.industryPreset && D.industryPreset.ideas),
      sample:(D.brand && D.brand.sample) || (D.industryPreset && D.industryPreset.sample)
    });
    if (D.companies[0]){
      D.companies[0].logo = S.logo || '';
      D.companies[0].tone = S.tone;
      if (window.App) App.setCompany(D.companies[0]);
    }
    D.needsOnboarding = false;
    D.account.user = saved;
    D.persistWorkspace && D.persistWorkspace();
    return brand;
  }

  function leave(go){
    const D = window.NASAQ;
    root().remove();
    document.body.classList.remove('ob-open');
    if (go === 'studio'){
      const idea = (D.brand.ideas && D.brand.ideas[0]) || '';
      App.studioPreset = { product:idea, audience:D.brand.audience || '', count:3, tone:S.tone.indexOf('احتراف') === 0 ? 'احترافي' : 'ودّي' };
      if (location.hash === '#/studio') App.rerender();
      else location.hash = '#/studio';
    } else if (location.hash !== '#/overview') location.hash = '#/overview';
    else App.rerender();
  }

  function showDone(){
    const el = root();
    const brand = saveSetup();
    el.querySelector('#obBody').innerHTML = `
      <div class="ob-done">
        <span class="ob-done-ic">${icon('i-check')}</span>
        <h2>مساحة عملك جاهزة</h2>
        <p>ما في بيانات تجريبية هون. ولّد أول محتوى بلهجة زبائنك، أو ادخل اللوحة وارجع للاستوديو متى ما بدك.</p>
        <div class="ob-done-acts">
          <button type="button" class="btn btn-gold" id="obStudio">${icon('i-spark')} ولّد أول محتوى</button>
          <button type="button" class="btn btn-outline" id="obHome">ادخل لوحة التحكم</button>
        </div>
      </div>`;
    el.querySelector('.ob-foot').hidden = true;
    el.querySelector('#obSkip').hidden = true;
    el.querySelector('.ob-bar i').style.width = '100%';
    el.querySelector('#obStudio').onclick = () => leave('studio');
    el.querySelector('#obHome').onclick = () => leave('home');
    return brand;
  }

  function open(){
    if (document.getElementById('obRoot')) return;
    const D = window.NASAQ;
    const preset = D.industryPreset || {};
    S.audience = (D.brand && D.brand.audience) || preset.audience || '';
    S.products = (D.brand && D.brand.products) || preset.products || '';
    S.tone = (D.companies[0] && D.companies[0].tone) || TONES[0];
    S.persona = (preset.persona || []).slice(0, 2);
    const known = PALETTES.findIndex(p => p.name && preset.colors && p.colors[0] === preset.colors[0].hex);
    if (known >= 0){ S.palette = known; S.colors = PALETTES[known].colors.slice(); }
    document.body.classList.add('ob-open');
    const el = document.createElement('div');
    el.id = 'obRoot';
    el.className = 'ob-root';
    el.innerHTML = `
      <div class="ob-card" role="dialog" aria-modal="true" aria-label="تهيئة الحساب">
        <div class="ob-top">
          <b>تهيئة نسق</b>
          <div class="ob-steps">${[0,1,2,3].map(i => `<i data-obstep="${i}"></i>`).join('')}</div>
          <button type="button" class="ob-skip" id="obSkip">تخطّي الآن</button>
        </div>
        <div class="ob-bar"><i></i></div>
        <div class="ob-body" id="obBody"></div>
        <div class="ob-foot">
          <button type="button" class="btn btn-ghost" id="obBack">${icon('i-chev-r')} رجوع</button>
          <button type="button" class="btn btn-gold" id="obNext">التالي</button>
        </div>
      </div>`;
    document.body.appendChild(el);
    paint();

    el.addEventListener('click', e => {
      const pal = e.target.closest('[data-pal]');
      if (pal){ S.palette = +pal.dataset.pal; S.colors = PALETTES[S.palette].colors.slice(); paint(); return; }
      const tone = e.target.closest('[data-tone]');
      if (tone){ S.tone = tone.dataset.tone; paint(); return; }
      const lang = e.target.closest('[data-lang]');
      if (lang){ S.lang = lang.dataset.lang; paint(); return; }
      const persona = e.target.closest('[data-persona]');
      if (persona){
        const v = persona.dataset.persona;
        S.persona = S.persona.includes(v) ? S.persona.filter(x => x !== v) : S.persona.concat(v);
        paint(); return;
      }
      const platform = e.target.closest('[data-platform]');
      if (platform){
        const id = platform.dataset.platform;
        S.platforms = S.platforms.includes(id) ? S.platforms.filter(x => x !== id) : S.platforms.concat(id);
        paint(); return;
      }
      const add = e.target.closest('[data-add]');
      if (add){
        const box = el.querySelector('#' + add.dataset.add);
        const bit = add.textContent.trim();
        if (box && !box.value.includes(bit)) box.value = (box.value ? box.value.replace(/[،,]\s*$/, '') + '، ' : '') + bit;
        return;
      }
    });
    el.addEventListener('change', e => {
      if (e.target.dataset.pick != null){
        S.colors[+e.target.dataset.pick] = e.target.value;
        S.palette = -1;
        el.querySelectorAll('.ob-pal').forEach(b => b.classList.remove('on'));
      }
      if (e.target.type === 'file' && e.target.files[0]) resizeLogo(e.target.files[0], url => { S.logo = url; paint(); });
    });
    el.querySelector('#obBack').onclick = () => { readStep(); S.step = Math.max(0, S.step - 1); paint(); };
    el.querySelector('#obNext').onclick = () => {
      readStep();
      if (S.step < 3){ S.step++; paint(); }
      else showDone();
    };
    el.querySelector('#obSkip').onclick = () => {
      window.NasaqAuth.update({ onboarded:true });
      window.NASAQ.needsOnboarding = false;
      el.remove();
      document.body.classList.remove('ob-open');
      App.toast('فيك تكمّل تهيئة الهوية من قسم الهوية بأي وقت', 'info');
    };
  }

  window.NasaqOnboarding = { open };
  window.addEventListener('load', () => {
    if (window.NASAQ && NASAQ.needsOnboarding) open();
  });
})();
