/* Client-side auth store — swap these functions for real API calls when the backend is ready. */
(function(){
  const USERS_KEY = 'nasaq-users';
  const SESSION_KEY = 'nasaq-session';
  const WS_PREFIX = 'nasaq-ws-';
  const TRIAL_DAYS = 14;
  const RESET_TTL = 60 * 60 * 1000;
  const DEMO_EMAIL = 'demo@nasaq.ps';

  const PLANS = {
    free:{ id:'free', name:'البداية', short:'مجاني', posts:15, gens:10, chats:50, companies:1, seats:1, price:{ m:0, y:0 } },
    pro:{ id:'pro', name:'الاحترافي', short:'Pro', posts:Infinity, gens:Infinity, chats:Infinity, companies:3, seats:5, price:{ m:149, y:119 } },
    business:{ id:'business', name:'الأعمال', short:'Business', posts:Infinity, gens:Infinity, chats:Infinity, companies:Infinity, seats:Infinity, price:{ m:299, y:239 } }
  };
  const PRIVATE = ['passHash', 'salt', 'resetToken', 'resetExp', 'verifyToken'];

  const read = (store, key, fallback) => { try { const v = store.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; } };
  const write = (store, key, val) => { try { store.setItem(key, JSON.stringify(val)); } catch (e) {} };

  const users = () => read(localStorage, USERS_KEY, []);
  const saveUsers = list => write(localStorage, USERS_KEY, list);
  const normEmail = e => String(e || '').trim().toLowerCase();

  function randomHex(bytes){
    const a = new Uint8Array(bytes);
    (window.crypto || {}).getRandomValues ? crypto.getRandomValues(a) : a.forEach((_, i) => a[i] = Math.random() * 256);
    return [...a].map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async function hash(password, salt){
    const input = `${salt}:${password}`;
    if (window.crypto && crypto.subtle){
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
      return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
    }
    // crypto.subtle is unavailable on file:// — fall back to a non-cryptographic digest.
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < input.length; i++){ const c = input.charCodeAt(i); h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677); }
    return ((h2 >>> 0).toString(16) + (h1 >>> 0).toString(16)).padStart(16, '0');
  }

  const publicUser = u => {
    if (!u) return null;
    const out = { ...u };
    PRIVATE.forEach(k => delete out[k]);
    return out;
  };

  function readSession(){
    return read(sessionStorage, SESSION_KEY, null) || read(localStorage, SESSION_KEY, null);
  }

  function startSession(user, remember){
    endSession();
    write(remember ? localStorage : sessionStorage, SESSION_KEY, { uid:user.id, at:Date.now() });
  }

  function endSession(){
    try { localStorage.removeItem(SESSION_KEY); sessionStorage.removeItem(SESSION_KEY); } catch (e) {}
  }

  /* Applies fn to the stored record of the signed-in user and persists it. */
  function mutateCurrent(fn){
    const s = readSession();
    if (!s) throw new Error('NO_SESSION');
    const list = users();
    const u = list.find(x => x.id === s.uid);
    if (!u) throw new Error('NO_SESSION');
    const r = fn(u);
    saveUsers(list);
    return r;
  }

  async function setPassword(u, password){
    u.salt = randomHex(16);
    u.passHash = await hash(password, u.salt);
  }

  const Auth = {
    PLANS,

    current(){
      const s = readSession();
      if (!s) return null;
      const u = users().find(x => x.id === s.uid);
      if (!u){ endSession(); return null; }
      return publicUser(u);
    },

    isDemo(user){ return !!user && (user.demo || user.email === DEMO_EMAIL); },

    plan(user){
      const p = PLANS[user && user.plan] || PLANS.free;
      if (user && user.trialEnds){
        const days = Math.ceil((user.trialEnds - Date.now()) / 864e5);
        if (days <= 0) return { ...PLANS.free, trial:false, expired:true };
        return { ...p, trial:true, daysLeft:days };
      }
      return { ...p, trial:false };
    },

    workspaceKey(uid){ return WS_PREFIX + uid; },

    async register({ name, email, password, company, industry, city, plan, demo }){
      const list = users();
      const e = normEmail(email);
      if (list.some(u => u.email === e)) throw new Error('EMAIL_TAKEN');
      const planId = PLANS[plan] ? plan : 'free';
      const user = {
        id:'u_' + randomHex(8),
        name:String(name).trim(),
        email:e,
        company:String(company || '').trim(),
        industry:industry || '',
        city:String(city || '').trim(),
        plan:planId,
        trialEnds:planId === 'pro' ? Date.now() + TRIAL_DAYS * 864e5 : null,
        demo:!!demo,
        onboarded:!!demo,
        emailVerified:!!demo,
        verifyToken:demo ? null : randomHex(20),
        createdAt:Date.now()
      };
      await setPassword(user, password);
      list.push(user);
      saveUsers(list);
      startSession(user, true);
      return publicUser(user);
    },

    async login(email, password, remember = true){
      const u = users().find(x => x.email === normEmail(email));
      if (!u || u.passHash !== await hash(password, u.salt)) throw new Error('BAD_CREDENTIALS');
      startSession(u, remember);
      return publicUser(u);
    },

    logout(){ endSession(); },

    update(patch){
      const safe = { ...patch };
      ['id', 'email', 'createdAt', 'demo', ...PRIVATE].forEach(k => delete safe[k]);
      return mutateCurrent(u => { Object.assign(u, safe); return publicUser(u); });
    },

    async changePassword(current, next){
      const s = readSession();
      const list = users();
      const u = s && list.find(x => x.id === s.uid);
      if (!u) throw new Error('NO_SESSION');
      if (u.passHash !== await hash(current, u.salt)) throw new Error('BAD_PASSWORD');
      await setPassword(u, next);
      saveUsers(list);
    },

    async deleteAccount(password){
      const s = readSession();
      const list = users();
      const u = s && list.find(x => x.id === s.uid);
      if (!u) throw new Error('NO_SESSION');
      if (u.passHash !== await hash(password, u.salt)) throw new Error('BAD_PASSWORD');
      saveUsers(list.filter(x => x.id !== u.id));
      try { localStorage.removeItem(WS_PREFIX + u.id); } catch (e) {}
      endSession();
    },

    /* Returns the reset token when the email exists (a backend would email it instead). */
    requestReset(email){
      const list = users();
      const u = list.find(x => x.email === normEmail(email));
      if (!u) return null;
      u.resetToken = randomHex(24);
      u.resetExp = Date.now() + RESET_TTL;
      saveUsers(list);
      return u.resetToken;
    },

    checkReset(token){
      const u = users().find(x => x.resetToken && x.resetToken === token);
      return !!u && u.resetExp > Date.now();
    },

    async resetPassword(token, password){
      const list = users();
      const u = list.find(x => x.resetToken && x.resetToken === token);
      if (!u || u.resetExp <= Date.now()) throw new Error('BAD_TOKEN');
      await setPassword(u, password);
      u.resetToken = null;
      u.resetExp = null;
      saveUsers(list);
      return publicUser(u);
    },

    verificationToken(){
      return mutateCurrent(u => {
        if (u.emailVerified) return null;
        u.verifyToken = u.verifyToken || randomHex(20);
        return u.verifyToken;
      });
    },

    verifyEmail(token){
      const list = users();
      const u = list.find(x => x.verifyToken && x.verifyToken === token);
      if (!u) throw new Error('BAD_TOKEN');
      u.emailVerified = true;
      u.verifyToken = null;
      saveUsers(list);
      return publicUser(u);
    },

    safeNext(next){
      return typeof next === 'string' && /^#\/[\w\-/]*$/.test(next) ? next : '';
    },

    /* Call synchronously in <head> of protected pages. */
    guard(authUrl){
      if (Auth.current()) return true;
      const next = Auth.safeNext(location.hash);
      location.replace(`${authUrl}?mode=login${next ? '&next=' + encodeURIComponent(next) : ''}`);
      return false;
    }
  };

  window.NasaqAuth = Auth;
})();
