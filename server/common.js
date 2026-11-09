import crypto from 'node:crypto';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import webpush from 'web-push';

function adminApp() {
  if (getApps().length) return getApps()[0];
  const json = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!json) throw Object.assign(new Error('FIREBASE_SERVICE_ACCOUNT_JSON is missing in Vercel'), { status: 503 });
  const serviceAccount = JSON.parse(json);
  return initializeApp({ credential: cert({
    projectId: serviceAccount.project_id,
    clientEmail: serviceAccount.client_email,
    privateKey: serviceAccount.private_key?.replace(/\\n/g, '\n')
  }) });
}
export function database() { return getFirestore(adminApp()); }
export function now() { return FieldValue.serverTimestamp(); }
export function secretMatches(a, b) {
  if (typeof a !== 'string' || !b) return false;
  const x = crypto.createHash('sha256').update(a, 'utf8').digest();
  const y = crypto.createHash('sha256').update(b, 'utf8').digest();
  return crypto.timingSafeEqual(x, y);
}
export function fail(status, message) { throw Object.assign(new Error(message), { status }); }
export async function identity(req) {
  const token = (req.headers.authorization || '').match(/^Bearer (.+)$/)?.[1];
  if (!token) fail(401, 'חסרה התחברות תקינה');
  const user = await getAuth(adminApp()).verifyIdToken(token, true);
  if (user.firebase?.sign_in_provider !== 'anonymous') fail(403, 'נדרשת כניסה אנונימית');
  return user.uid;
}
export async function memberOf(uid) {
  const ref = database().doc(`members/${uid}`);
  const snap = await ref.get();
  if (!snap.exists || typeof snap.data().name !== 'string') fail(403, 'נדרש רישום באמצעות קוד הזמנה');
  return snap.data();
}
export function handle(fn) {
  return async (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (req.method !== 'POST') return res.status(405).json({ error: 'Only POST is supported' });
    try {
      const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
      const uid = await identity(req);
      const result = await fn({ uid, body, req });
      return res.status(200).json(result || { ok: true });
    } catch (err) {
      if (!err.status) console.error(err);
      return res.status(err.status || 500).json({ error: err.status ? err.message : 'שגיאת שרת, נסה שוב' });
    }
  };
}
export async function notifyAvailable(actorUid) {
  const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } = process.env;
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY || !VAPID_SUBJECT) return;
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  const coll = await database().collection('pushSubscriptions').get();
  const payload = JSON.stringify({ title: '🚗 החניה התפנתה', body: 'החניה בבניין פנויה עכשיו' });
  await Promise.allSettled(coll.docs.filter(d => d.data().uid !== actorUid).slice(0, 100).map(async d => {
    try { await webpush.sendNotification(d.data().subscription, payload, { TTL: 180 }); }
    catch (err) {
      if ([404, 410].includes(err.statusCode)) await d.ref.delete();
      else console.error('push delivery failed', err.statusCode || err.message);
    }
  }));
}
