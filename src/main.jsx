import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { onAuthStateChanged, signInAnonymously, signOut } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db } from './firebase';
import './style.css';

const parkingRef = doc(db, 'parking', 'current');
const memberRef = (uid) => doc(db, 'members', uid);
const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function humanError(err) {
  if (err?.message === 'Failed to fetch') return 'לא הצלחנו להגיע לשרת. בדוק חיבור אינטרנט ופרסום ב־Vercel.';
  if (err?.code === 'permission-denied') return 'אין הרשאת גישה לנתונים. ודא שפורסמו כללי Firestore של גרסה 2.';
  return err?.message || 'משהו השתבש. נסה שוב.';
}

async function api(path, payload) {
  const current = auth.currentUser;
  if (!current) throw new Error('עדיין לא התחברת');
  const token = await current.getIdToken();
  const res = await fetch(`/api/${path}`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || `שגיאת שרת ${res.status}`);
  return json;
}

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(char => char.charCodeAt(0)));
}

function App() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [member, setMember] = useState(null);
  const [memberReady, setMemberReady] = useState(false);
  const [parking, setParking] = useState(null);
  const [serverReady, setServerReady] = useState(false);
  const [name, setName] = useState('');
  const [inviteCode, setInviteCode] = useState('');
  const [managerCode, setManagerCode] = useState('');
  const [editing, setEditing] = useState(false);
  const [showManager, setShowManager] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [info, setInfo] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  useEffect(() => onAuthStateChanged(auth, async (next) => {
    try {
      if (next && !next.isAnonymous) { await signOut(auth); return; }
      if (!next) { setUser(null); await signInAnonymously(auth); return; }
      setUser(next);
      setAuthReady(true);
    } catch (err) { setMessage(humanError(err)); setAuthReady(true); }
  }), []);

  useEffect(() => {
    setMember(null); setMemberReady(false);
    if (!user) return;
    return onSnapshot(memberRef(user.uid), { includeMetadataChanges: true }, snap => {
      setMember(snap.exists() ? snap.data() : null);
      setMemberReady(!snap.metadata.fromCache && !snap.metadata.hasPendingWrites);
    }, err => { setMessage(humanError(err)); setMemberReady(false); });
  }, [user]);

  useEffect(() => {
    setNotificationsEnabled(false);
    if (!user || !member?.name || !memberReady) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return;
    let cancelled = false;
    navigator.serviceWorker.getRegistration()
      .then(async reg => {
        const subscription = reg ? await reg.pushManager.getSubscription() : null;
        if (!cancelled) {
          setNotificationsEnabled(Boolean(subscription && Notification.permission === 'granted'));
        }
      })
      .catch(() => { if (!cancelled) setNotificationsEnabled(false); });
    return () => { cancelled = true; };
  }, [user?.uid, member?.name, memberReady]);

  useEffect(() => {
    setParking(null); setServerReady(false);
    if (!user || !member?.name || !memberReady) return;
    return onSnapshot(parkingRef, { includeMetadataChanges: true }, snap => {
      setParking(snap.exists() ? snap.data() : null);
      setServerReady(!snap.metadata.fromCache && !snap.metadata.hasPendingWrites);
    }, err => { setMessage(humanError(err)); setServerReady(false); });
  }, [user, member?.name, memberReady]);

  async function perform(work) {
    setBusy(true); setMessage(''); setInfo('');
    try { await work(); }
    catch (err) { setMessage(humanError(err)); }
    finally { setBusy(false); }
  }

  async function register(e) {
    e.preventDefault();
    const cleanName = name.trim().replace(/\s+/g, ' ');
    if (!cleanName || !inviteCode.trim()) return;
    await perform(async () => { await api('register', { name: cleanName, inviteCode: inviteCode.trim() }); setInviteCode(''); });
  }
  async function updateName(e) {
    e.preventDefault();
    await perform(async () => { await api('profile', { name: name.trim() }); setEditing(false); setInfo('השם עודכן'); });
  }
  async function changeParking(action) {
    await perform(async () => {
      await api('parking', { action, ...(action === 'forceRelease' ? { managerCode: managerCode.trim() } : {}) });
      setManagerCode(''); setShowManager(false);
      setInfo(action === 'occupy' ? 'החניה סומנה כתפוסה' : 'החניה שוחררה');
    });
  }
  async function switchAccount() {
    if (parking?.occupiedBy === user?.uid && parking?.occupied) {
      setMessage('החניה כרגע רשומה עליך. פנה אותה קודם כדי לא לאבד את אפשרות השחרור.'); return;
    }
    if (!window.confirm('מעבר למשתמש חדש יוצר מזהה חדש למכשיר. תצטרך להזין שוב שם וקוד דירה. להמשיך?')) return;
    await perform(async () => { setUser(null); setMember(null); await signOut(auth); setName(''); setInviteCode(''); });
  }
  async function enableNotifications() {
    await perform(async () => {
      if (!vapidKey) throw new Error('מפתח ההתראות טרם הוגדר ב־Vercel.');
      if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) {
        throw new Error('המכשיר לא תומך בהתראות Web Push. באייפון יש להתקין את האפליקציה למסך הבית (iOS 16.4 ומעלה).');
      }
      if (/iPhone|iPad|iPod/.test(navigator.userAgent) && !window.matchMedia('(display-mode: standalone)').matches && !navigator.standalone) {
        throw new Error('באייפון יש לפתוח את האפליקציה מתוך האייקון במסך הבית לפני הפעלת ההתראות.');
      }
      if (Notification.permission === 'denied') throw new Error('ההתראות חסומות בהגדרות המכשיר.');
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') throw new Error('לא אושרה הרשאה להתראות');
      const reg = await navigator.serviceWorker.ready;
      const existing = await reg.pushManager.getSubscription();
      const subscription = existing || await reg.pushManager.subscribe({
        userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidKey)
      });
      await api('notifications', { action: 'subscribe', subscription: subscription.toJSON() });
      setNotificationsEnabled(true);
      setInfo('התראות הופעלו! תקבל עדכון כשהחניה תתפנה.');
    });
  }

  async function disableNotifications() {
    await perform(async () => {
      if (!('serviceWorker' in navigator)) throw new Error('המכשיר אינו תומך בהתראות');
      const reg = await navigator.serviceWorker.getRegistration();
      const subscription = reg ? await reg.pushManager.getSubscription() : null;
      if (subscription) {
        await api('notifications', { action: 'unsubscribe', subscription: subscription.toJSON() });
        const removed = await subscription.unsubscribe();
        if (!removed) throw new Error('לא הצלחנו לבטל את מנוי ההתראות במכשיר. נסה שוב.');
      }
      setNotificationsEnabled(false);
      setInfo('ההתראות כובו בהצלחה');
    });
  }

  const occupied = parking?.occupied === true;
  const mine = occupied && parking.occupiedBy === user?.uid;
  const ready = !!parking && !!member?.name && memberReady && serverReady;
  const time = parking?.updated?.toDate?.();

  return <main className="page" dir="rtl"><section className="shell">
    <header className="top"><div className="brandIcon">P</div><div><h1>החניה שלנו</h1><p>פשוט לדעת אם יש מקום</p></div></header>
    {!authReady ? <div className="card">מתחברים...</div>
      : !user ? <div className="card">לא הצלחנו להתחבר. נסה לרענן את העמוד.</div>
      : !memberReady ? <div className="card">בודקים את הפרטים שלך...</div>
      : !member ? <div className="card"><h2>ברוך הבא!</h2><p className="muted">הכנס את שמך ואת קוד ההזמנה שקיבלת מהשותפים. צריך לעשות זאת רק פעם אחת במכשיר.</p>
        <form onSubmit={register}><label>השם שלך<input maxLength={30} required value={name} onChange={e => setName(e.target.value)} placeholder="לדוגמה: הראל" /></label>
        <label>קוד הכניסה לדירה<input type="password" required autoComplete="off" value={inviteCode} onChange={e => setInviteCode(e.target.value)} placeholder="קוד מהשותפים" /></label>
        <button className="primary" disabled={busy || !name.trim() || !inviteCode.trim()}>{busy ? 'נרשם...' : 'בוא ניכנס'}</button></form></div>
      : <>
        <div className="profile"><span>שלום, {member.name}</span><span className="muted-small">מחובר</span></div>
        <div className={'card status ' + (ready ? occupied ? 'red' : 'green' : 'neutral')}>
          <div className="symbol">{ready ? occupied ? '🚘' : '✓' : '…'}</div>
          <div className="eyebrow">סטטוס החניה</div>
          <h2>{!ready ? 'מתחברים לשרת...' : occupied ? 'החניה תפוסה' : 'החניה פנויה'}</h2>
          <p>{ready ? occupied ? mine ? 'אתה חונה כרגע בחניה' : `${parking.occupiedByName} חונה כרגע בחניה` : 'אפשר להיכנס ולחנות' : 'נדרש חיבור עדכני לשרת כדי להציג מצב אמין'}</p>
        </div>
        {ready && !occupied && <button className="primary action" disabled={busy} onClick={() => changeParking('occupy')}>{busy ? 'מעדכן...' : '🚗  תפסתי את החניה'}</button>}
        {ready && mine && <button className="secondary action" disabled={busy} onClick={() => changeParking('release')}>{busy ? 'מעדכן...' : 'פיניתי את החניה'}</button>}
        {ready && occupied && !mine && <div className="hint">רק מי שתפס את החניה יכול לפנות אותה. במקרה חירום אפשר להשתמש בקוד מנהל.</div>}
        {time && ready && <div className="updated">עודכן לאחרונה: {time.toLocaleString('he-IL', {dateStyle:'short', timeStyle:'short'})}</div>}
        <div className="card extras">
          <h3>הגדרות</h3>
          {editing ? <form onSubmit={updateName}><label>השם החדש<input maxLength={30} value={name} onChange={e => setName(e.target.value)} required /></label>
            <button className="primary" disabled={busy || !name.trim()}>שמור שם</button><button type="button" className="secondary" onClick={() => setEditing(false)}>ביטול</button></form>
          : <button className="secondary" disabled={busy} onClick={() => { setName(member.name); setEditing(true); }}>✏️ שינוי השם שלי</button>}
          <button className="secondary" disabled={busy} onClick={switchAccount}>🔁 החלפת משתמש במכשיר</button>
          <button className="secondary" disabled={busy || !ready} onClick={notificationsEnabled ? disableNotifications : enableNotifications}>
            {busy ? 'מעדכן...' : notificationsEnabled ? '🔕 כבה התראות' : '🔔 הפעל התראה כשהחניה מתפנה'}
          </button>
          {ready && occupied && <><button className="secondary" onClick={() => setShowManager(!showManager)}>🔐 שחרור חירום למנהל</button>
            {showManager && <div className="manager"><label>קוד מנהל<input type="password" autoComplete="off" value={managerCode} onChange={e => setManagerCode(e.target.value)} placeholder="קוד חירום" /></label>
              <button className="primary" disabled={busy || !managerCode.trim()} onClick={() => changeParking('forceRelease')}>שחרר את החניה</button></div>}</>}
        </div>
      </>}
    {message && <div className="error" role="alert">{message}</div>}
    {info && <div className="success" role="status">{info}</div>}
    <footer>חניה אחת. כל השותפים מעודכנים.</footer>
  </section></main>;
}

createRoot(document.getElementById('root')).render(<App />);