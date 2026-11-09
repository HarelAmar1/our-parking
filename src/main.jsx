import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { onAuthStateChanged, signInAnonymously, signOut } from 'firebase/auth';
import { doc, onSnapshot, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import './style.css';

const parkingRef = doc(db, 'parking', 'current');

function readableError(error) {
  if (error?.message === 'TAKEN') return 'החניה כבר נתפסה על ידי שותף אחר.';
  if (error?.message === 'NOT_OWNER') return 'רק מי שתפס את החניה יכול לפנות אותה.';
  if (error?.message === 'MISSING') return 'לא נמצא מסמך parking/current ב-Firestore.';
  if (error?.code === 'permission-denied') return 'הפעולה נחסמה. ודא שפרסמת את כללי Firestore החדשים.';
  if (error?.code === 'auth/operation-not-allowed') return 'יש להפעיל Anonymous ב-Firebase Authentication.';
  if (error?.code === 'unavailable') return 'אין חיבור לשרת כרגע. נסה שוב כשיש אינטרנט.';
  return error?.message || 'אירעה תקלה, נסה שוב.';
}

function App() {
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [member, setMember] = useState(null);
  const [memberReady, setMemberReady] = useState(false);
  const [parking, setParking] = useState(null);
  const [serverReady, setServerReady] = useState(false);
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    return onAuthStateChanged(auth, async (next) => {
      try {
        if (next && !next.isAnonymous) {
          // Migration from the older email/password version.
          await signOut(auth);
          return;
        }
        if (!next) {
          await signInAnonymously(auth);
          return;
        }
        setUser(next);
        setAuthReady(true);
      } catch (error) {
        setMessage(readableError(error));
        setAuthReady(true);
      }
    });
  }, []);

  useEffect(() => {
    setMember(null);
    setMemberReady(false);
    if (!user) return;
    return onSnapshot(
        doc(db, 'members', user.uid),
        { includeMetadataChanges: true },
        (snap) => {
          setMember(snap.exists() ? snap.data() : null);
      setMemberReady(
          !snap.metadata.fromCache &&
          !snap.metadata.hasPendingWrites
      );
      }, (err) => { setMessage(readableError(err)); setMemberReady(false); });
  }, [user]);

  useEffect(() => {
    setParking(null);
    setServerReady(false);
    if (!user || !member?.name || !memberReady) return;
    return onSnapshot(parkingRef, (snap) => {
      setParking(snap.exists() ? snap.data() : null);
      setServerReady(!snap.metadata.fromCache && !snap.metadata.hasPendingWrites);
    }, (err) => { setMessage(readableError(err)); setServerReady(false); });
  }, [user, member?.name, memberReady]);

  const register = async (event) => {
    event.preventDefault();
    const cleanName = name.trim().replace(/\s+/g, ' ');
    if (!user || !cleanName || cleanName.length > 30) return;
    setBusy(true);
    setMessage('');
    try {
      await setDoc(doc(db, 'members', user.uid), { name: cleanName });
    } catch (error) {
      setMessage(readableError(error));
    } finally {
      setBusy(false);
    }
  };

  const changeParking = async (occupy) => {
    if (!user || !member?.name || !memberReady || !serverReady) return;
    setBusy(true);
    setMessage('');
    try {
      await runTransaction(db, async (tx) => {
        const snap = await tx.get(parkingRef);
        if (!snap.exists()) throw new Error('MISSING');
        const current = snap.data();
        if (occupy) {
          if (current.occupied) throw new Error('TAKEN');
          tx.update(parkingRef, {
            occupied: true, occupiedBy: user.uid,
            occupiedByName: member.name, updated: serverTimestamp()
          });
        } else {
          if (!current.occupied || current.occupiedBy !== user.uid) throw new Error('NOT_OWNER');
          tx.update(parkingRef, {
            occupied: false, occupiedBy: '', occupiedByName: '', updated: serverTimestamp()
          });
        }
      });
    } catch (error) {
      setMessage(readableError(error));
    } finally {
      setBusy(false);
    }
  };

  const occupied = parking?.occupied === true;
  const mine = occupied && parking.occupiedBy === user?.uid;
  const ready = !!parking && !!member?.name && memberReady && serverReady;
  const time = parking?.updated?.toDate?.();

  return <main className="page" dir="rtl"><section className="shell">
    <header className="top"><div className="brandIcon">P</div><div><h1>החניה שלנו</h1><p>פשוט לדעת אם יש מקום</p></div></header>
    {!authReady ? <div className="card">מתחברים...</div>
      : !user ? <div className="card">לא הצלחנו להתחבר. נסה לרענן את העמוד.</div>
      : !memberReady ? <div className="card">בודקים את הפרטים שלך...</div>
      : !member ? <div className="card"><h2>ברוך הבא!</h2><p className="muted">איך קוראים לך? צריך להכניס שם רק בפעם הראשונה במכשיר הזה.</p>
        <form onSubmit={register}><label>השם שלך<input autoComplete="nickname" maxLength={30} required value={name} onChange={e => setName(e.target.value)} placeholder="לדוגמה: הראל" /></label>
          <button className="primary" disabled={busy || !name.trim()}>{busy ? 'שומר...' : 'בוא ניכנס'}</button></form></div>
      : <><div className="profile"><span>שלום, {member.name}</span><span className="muted-small">מחובר</span></div>
        <div className={'card status ' + (ready ? occupied ? 'red' : 'green' : 'neutral')}>
          <div className="symbol">{ready ? occupied ? '🚘' : '✓' : '…'}</div>
          <div className="eyebrow">סטטוס החניה</div>
          <h2>{!ready ? 'מתחברים לשרת...' : occupied ? 'החניה תפוסה' : 'החניה פנויה'}</h2>
          <p>{ready ? occupied ? mine ? 'אתה חונה כרגע בחניה' : `${parking.occupiedByName} חונה כרגע בחניה` : 'אפשר להיכנס ולחנות' : 'נדרש חיבור עדכני לשרת כדי להציג מצב אמין'}</p>
        </div>
        {ready && !occupied && <button className="primary action" disabled={busy} onClick={() => changeParking(true)}>{busy ? 'מעדכן...' : '🚗  תפסתי את החניה'}</button>}
        {ready && mine && <button className="secondary action" disabled={busy} onClick={() => changeParking(false)}>{busy ? 'מעדכן...' : 'פיניתי את החניה'}</button>}
        {ready && occupied && !mine && <div className="hint">רק מי שתפס את החניה מהמכשיר שלו יכול לפנות אותה.</div>}
        {time && ready && <div className="updated">עודכן לאחרונה: {time.toLocaleString('he-IL', {dateStyle:'short',timeStyle:'short'})}</div>}
      </>}
    {message && <div className="error" role="alert">{message}</div>}
    <footer>חניה אחת. כל השותפים מעודכנים.</footer>
  </section></main>;
}

createRoot(document.getElementById('root')).render(<App />);
