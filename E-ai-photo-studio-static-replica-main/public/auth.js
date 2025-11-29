<!-- /public/auth.js -->
// why: GIS-only auth + optional server verification.
const GOOGLE_CLIENT_ID = 'REPLACE_WITH_YOUR_GOOGLE_OAUTH_CLIENT_ID'; // REQUIRED
const LS_KEY = 'aips.session';
const EVT = new EventTarget();

function b64urlDecode(str){ str=str.replace(/-/g,'+').replace(/_/g,'/'); const pad=str.length%4? '='.repeat(4-(str.length%4)) : ''; return new TextDecoder().decode(Uint8Array.from(atob(str+pad),c=>c.charCodeAt(0))); }
function decodeJwt(t){ try{ return JSON.parse(b64urlDecode(t.split('.')[1])); }catch{ return null; } }
const readSession = () => { try{ const raw=localStorage.getItem(LS_KEY); return raw? JSON.parse(raw):null; }catch{ return null; } };
const writeSession = (o) => { localStorage.setItem(LS_KEY, JSON.stringify(o||{})); EVT.dispatchEvent(new Event('authchange')); };
const clearSession = () => { localStorage.removeItem(LS_KEY); EVT.dispatchEvent(new Event('authchange')); };

async function ensureGsi(){
  if (window.google?.accounts?.id) return;
  await new Promise((res,rej)=>{ const s=document.createElement('script'); s.src='https://accounts.google.com/gsi/client'; s.async=true; s.defer=true; s.onload=res; s.onerror=()=>rej(new Error('gsi-fail')); document.head.appendChild(s); });
}

async function verifyWithServer(idToken){
  try{
    const r = await fetch('/api/auth/verify', { headers: { Authorization: `Bearer ${idToken}` }});
    if (!r.ok) return null;
    return await r.json();
  }catch{ return null; }
}

export async function initAuth({auto=true} = {}){
  await ensureGsi();
  window.handleCredentialResponse = async (resp) => {
    const id_token = resp.credential;
    const claims = decodeJwt(id_token) || {};
    let session = { id_token, profile: { sub: claims.sub, email: claims.email, name: claims.name, picture: claims.picture }, ts: Date.now() };
    const srv = await verifyWithServer(id_token); // works only if /api/auth/verify exists
    if (srv?.profile) session.profile = { ...session.profile, ...srv.profile };
    if (srv?.plan) session.plan = srv.plan; // {pro, trialEnds}
    writeSession(session);
  };
  google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: window.handleCredentialResponse, auto_select: auto });
}

export function renderButton({ parent = document.body, theme='outline', size='large' } = {}){
  const div = document.createElement('div');
  google.accounts.id.renderButton(div, { theme, size, type:'standard', logo_alignment:'left' });
  parent.appendChild(div);
}
export function promptOneTap(){ google.accounts.id.prompt(()=>{}); }

export function getUser(){ const s=readSession(); return s?.profile || null; }
export function getIdToken(){ const s=readSession(); return s?.id_token || null; }
export function getServerPlan(){ const s=readSession(); return s?.plan || { pro:false, trialEnds:null }; }

export async function startCheckout(){
  const token = getIdToken(); if (!token) throw new Error('not-signed-in');
  const r = await fetch('/api/billing/create', { method:'POST', headers:{ Authorization:`Bearer ${token}` }});
  const j = await r.json(); if (!r.ok) throw new Error(j.error||'checkout failed');
  location.href = j.url;
}
export async function openBillingPortal(){
  const token = getIdToken(); if (!token) throw new Error('not-signed-in');
  const r = await fetch('/api/billing/portal', { method:'POST', headers:{ Authorization:`Bearer ${token}` }});
  const j = await r.json(); if (!r.ok) throw new Error(j.error||'portal failed');
  location.href = j.url;
}

export async function signOut(){
  const u = getUser();
  try{
    if (u?.email && window.google?.accounts?.id?.revoke) await new Promise(r=>google.accounts.id.revoke(u.email, r));
    if (window.google?.accounts?.id?.disableAutoSelect) google.accounts.id.disableAutoSelect();
  } finally { clearSession(); }
}
export function onAuthChange(cb){ const h=()=>cb(getUser()); EVT.addEventListener('authchange',h); setTimeout(h,0); return ()=>EVT.removeEventListener('authchange',h); }
export function requireAuth(redirect='/signin.html'){ const u=getUser(); if(!u) location.replace(redirect); return !!u; }
