import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, onSnapshot, runTransaction, serverTimestamp } from 'firebase/firestore';
import { auth, db, configured } from './firebase';
import './style.css';

const parkingRef = db ? doc(db, 'parking', 'current') : null;
const readableError = (error) => {
  if (error?.message === 'TAKEN') return 'החניה כבר נתפסה על ידי שותף אחר.';
  if (error?.message === 'NOT_OWNER') return 'רק מי שתפס את החניה יכול לפנות אותה.';
  if (error?.message === 'MISSING') return 'חסר מסמך parking/current ב-Firestore. יש ליצור אותו לפי ההוראות.';
  if (error?.code === 'auth/invalid-credential') return 'האימייל או הסיסמה שגויים.';
  if (error?.code === 'permission-denied') return 'אין הרשאה. בדוק שהמשתמש נמצא ברשימת השותפים ואת כללי האבטחה.';
  if (error?.code === 'unavailable') return 'אין כרגע חיבור לשרת. נסה שוב כשיש אינטרנט.';
  return error?.message || 'אירעה תקלה. נסה שוב.';
};

function App() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [parking, setParking] = useState(null);
  const [member, setMember] = useState(null);
  const [serverReady, setServerReady] = useState(false);
  const [memberReady, setMemberReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, next => {setUser(next);setAuthReady(true);setMessage('');});
  }, []);

  useEffect(() => {
    setParking(null);setMember(null);setServerReady(false);setMemberReady(false);
    if (!user || !db) return;
    const unsubMember = onSnapshot(doc(db, 'members', user.uid), snap => {
      setMember(snap.exists() ? snap.data() : null);
      setMemberReady(!snap.metadata.fromCache);
    }, err => {setMessage(readableError(err));setMemberReady(false);});
    const unsubParking = onSnapshot(parkingRef, snap => {
      setParking(snap.exists() ? snap.data() : null);
      setServerReady(!snap.metadata.fromCache && !snap.metadata.hasPendingWrites);
    }, err => {setMessage(readableError(err));setServerReady(false);});
    return () => {unsubMember();unsubParking();};
  }, [user]);

  const login = async e => {
    e.preventDefault();setBusy(true);setMessage('');
    try { await signInWithEmailAndPassword(auth, email.trim(), password);setPassword(''); }
    catch (error) {setMessage(readableError(error));}
    finally {setBusy(false);}
  };

  const changeParking = async occupy => {
    if (!user || !serverReady || !memberReady || !member?.name) return;
    setBusy(true);setMessage('');
    try {
      await runTransaction(db, async transaction => {
        const snapshot = await transaction.get(parkingRef);
        if (!snapshot.exists()) throw new Error('MISSING');
        const current = snapshot.data();
        if (occupy) {
          if (current.occupied) throw new Error('TAKEN');
          transaction.update(parkingRef, { occupied: true, occupiedBy: user.uid, occupiedByName: member.name, updated: serverTimestamp() });
        } else {
          if (!current.occupied || current.occupiedBy !== user.uid) throw new Error('NOT_OWNER');
          transaction.update(parkingRef, { occupied: false, occupiedBy: '', occupiedByName: '', updated: serverTimestamp() });
        }
      });
    } catch (error) {setMessage(readableError(error));}
    finally {setBusy(false);}
  };

  const occupied = parking?.occupied === true;
  const mine = occupied && parking.occupiedBy === user?.uid;
  const ready = !!parking && !!member?.name && memberReady && serverReady;
  const time = parking?.updated?.toDate?.();
  return <main className="page"><section className="shell">
    <header className="top"><div className="brandIcon">P</div><div><h1>החניה שלנו</h1><p>פשוט לדעת אם יש מקום</p></div></header>
    {!configured ? <div className="notice">יש להגדיר את פרטי Firebase בקובץ <code>.env</code> לפני הרצה.</div>
    : !authReady ? <div className="card">מתחבר...</div>
    : !user ? <div className="card"><h2>כניסה לשותפים</h2><p className="muted">נכנסים עם החשבון שהוגדר לכם.</p>
      <form onSubmit={login}><label>כתובת אימייל<input type="email" autoComplete="username" required value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@example.com" dir="ltr" /></label>
      <label>סיסמה<input type="password" autoComplete="current-password" required value={password} onChange={e=>setPassword(e.target.value)} /></label>
      <button className="primary" disabled={busy}>{busy?'מתחבר...':'כניסה'}</button></form></div>
    : <><div className="profile"><span>שלום, {member?.name || user.email}</span><button className="link" onClick={()=>signOut(auth)}>התנתקות</button></div>
      <div className={'card status ' + (ready ? occupied ? 'red' : 'green' : 'neutral')}>
        <div className="symbol">{ready ? occupied ? '🚘' : '✓' : '…'}</div>
        <div className="eyebrow">סטטוס החניה</div>
        <h2>{!memberReady?'בודקים הרשאות...':!member?.name?'אין הרשאה לחשבון':!ready?'מתחברים לשרת...':occupied?'החניה תפוסה':'החניה פנויה'}</h2>
        <p>{ready ? occupied ? (mine?'אתה חונה כרגע בחניה':`${parking.occupiedByName} חונה כרגע בחניה`) : 'אפשר להיכנס ולחנות' : 'נדרש חיבור עדכני לשרת כדי להציג מצב אמין'}</p>
      </div>
      {ready && !occupied && <button className="primary action" disabled={busy} onClick={()=>changeParking(true)}>{busy?'מעדכן...':'🚗  תפסתי את החניה'}</button>}
      {ready && mine && <button className="secondary action" disabled={busy} onClick={()=>changeParking(false)}>{busy?'מעדכן...':'פיניתי את החניה'}</button>}
      {ready && occupied && !mine && <div className="hint">רק {parking.occupiedByName} יכול/ה לפנות את החניה.</div>}
      {time && ready && <div className="updated">עודכן לאחרונה: {time.toLocaleString('he-IL',{dateStyle:'short',timeStyle:'short'})}</div>}
      {!ready && memberReady && !member?.name && <div className="notice">החשבון מחובר, אך אינו ברשימת השותפים המורשים. יש להוסיף את ה-UID שלו ל-members.</div>}
    </>}
    {!!message && <div className="error" role="alert">{message}</div>}
    <footer>חניה אחת. כל השותפים מעודכנים.</footer>
  </section></main>;
}

createRoot(document.getElementById('root')).render(<App />);
