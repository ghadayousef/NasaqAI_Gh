/* Server-backed auth store: keeps the original NasaqAuth API, backed by Atoms Cloud auth + /api/v1/nasaq. */
(function(){
  const TOKEN_KEY = 'token';
  const DRAFT_KEY = 'nasaq-draft';
  const API = '/api/v1/nasaq';

  const PLANS = {
    free:{ id:'free', name:'البداية', short:'مجاني', posts:15, gens:10, chats:50, companies:1, seats:1, price:{ m:0, y:0 } },
    pro:{ id:'pro', name:'الاحترافي', short:'Pro', posts:Infinity, gens:Infinity, chats:Infinity, companies:3, seats:5, price:{ m:149, y:119 } },
    business:{ id:'business', name:'الأعمال', short:'Business', posts:Infinity, gens:Infinity, chats:Infinity, companies:Infinity, seats:Infinity, price:{ m:299, y:239 } }
  };

  let STATE = null;
  const token = () => { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch (e) { return ''; } };
  const clearToken = () => { try { localStorage.removeItem(TOKEN_KEY); localStorage.setItem('isLougOutManual', 'true'); } catch (e) {} };
  const readDraft = () => { try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch (e) { return null; } };

  function apiError(status, body){
    const err = new Error((body && body.detail) || 'REQUEST_FAILED');
    err.status = status;
    return err;
  }

  /* Async JSON request to the Nasaq API with the Atoms session token. */
  async function api(path, method = 'GET', data, opts = {}){
    const res = await fetch(API + path, {
      method,
      keepalive:!!opts.keepalive,
      headers:{ 'Content-Type':'application/json', 'App-Host':location.origin, Authorization:`Bearer ${token()}` },
      body:data === undefined ? undefined : JSON.stringify(data)
    });
    let body = null;
    try { body = await res.json(); } catch (e) {}
    if (res.status === 401){ clearToken(); STATE = null; }
    if (!res.ok) throw apiError(res.status, body);
    return body;
  }

  /* Synchronous bootstrap so existing synchronous page scripts keep working unchanged. */
  function bootstrapSync(){
    if (STATE || !token()) return STATE;
    try {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', API + '/bootstrap', false);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('Authorization', `Bearer ${token()}`);
      xhr.send(JSON.stringify({ draft:readDraft() }));
      if (xhr.status === 200){
        STATE = JSON.parse(xhr.responseText);
        try { localStorage.removeItem(DRAFT_KEY); } catch (e) {}
      } else if (xhr.status === 401){ clearToken(); }
    } catch (e) {}
    return STATE;
  }

  const goLogin = () => { location.href = '/login'; };

  const Auth = {
    PLANS,
    api,

    state(){ return bootstrapSync(); },
    setState(patch){ if (STATE) Object.assign(STATE, patch); },

    current(){ const s = bootstrapSync(); return s ? s.user : null; },

    isDemo(){ return false; },

    plan(user){
      const p = PLANS[user && user.plan] || PLANS.free;
      if (user && user.trialEnds){
        const days = Math.ceil((user.trialEnds - Date.now()) / 864e5);
        if (days <= 0) return { ...PLANS.free, trial:false, expired:true };
        return { ...p, trial:true, daysLeft:days };
      }
      return { ...p, trial:false };
    },

    /* Signup data is kept until the first authenticated bootstrap creates the profile. */
    async register(draft){
      const clean = { ...draft };
      delete clean.password;
      try { localStorage.setItem(DRAFT_KEY, JSON.stringify(clean)); } catch (e) {}
      goLogin();
      return new Promise(() => {});
    },

    async login(){ goLogin(); return new Promise(() => {}); },

    logout(){ clearToken(); STATE = null; },

    update(patch){
      if (!STATE) throw new Error('NO_SESSION');
      const u = STATE.user;
      ['name','phone','company','industry','city'].forEach(k => { if (patch[k] != null) u[k] = patch[k]; });
      if ('onboarded' in patch) u.onboarded = !!patch.onboarded;
      if (patch.brand) u.brand = patch.brand;
      if (patch.plan === 'free'){ u.plan = 'free'; u.trialEnds = null; }
      api('/profile', 'PATCH', { patch }).catch(() => window.App && App.toast('تعذّر حفظ التعديل على الخادم', 'error'));
      return u;
    },

    async changePassword(){ throw new Error('MANAGED'); },

    async deleteAccount(){
      await api('/account', 'DELETE');
      Auth.logout();
    },

    safeNext(next){
      return typeof next === 'string' && /^#\/[\w\-/]*$/.test(next) ? next : '';
    },

    guard(authUrl){
      if (Auth.current()) return true;
      const next = Auth.safeNext(location.hash);
      location.replace(`${authUrl}?mode=login${next ? '&next=' + encodeURIComponent(next) : ''}`);
      return false;
    }
  };

  window.NasaqAuth = Auth;
})();
