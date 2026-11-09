
import crypto from 'node:crypto';
import { handle, database, fail, memberOf, now } from '../server/common.js';

export default handle(async ({ uid, body }) => {
  await memberOf(uid);

  const action = body.action || 'subscribe';
  const subscription = body.subscription;

  if (
      !subscription ||
      typeof subscription.endpoint !== 'string' ||
      !subscription.endpoint.startsWith('https://') ||
      subscription.endpoint.length > 2048
  ) {
    fail(400, 'נתוני התראה לא תקינים');
  }

  const id = crypto
      .createHash('sha256')
      .update(subscription.endpoint)
      .digest('hex');

  const ref = database().doc(`pushSubscriptions/${id}`);

  if (action === 'unsubscribe') {
    await database().runTransaction(async tx => {
      const snap = await tx.get(ref);

      if (snap.exists) {
        if (snap.data().uid !== uid) {
          fail(403, 'אין הרשאה להסיר מנוי של משתמש אחר');
        }

        tx.delete(ref);
      }
    });

    return { ok: true };
  }

  if (action !== 'subscribe') {
    fail(400, 'פעולה לא מוכרת');
  }

  if (
      !subscription.keys?.p256dh ||
      !subscription.keys?.auth ||
      JSON.stringify(subscription).length > 4096
  ) {
    fail(400, 'נתוני התראה לא תקינים');
  }

  await database().runTransaction(async tx => {
    const snap = await tx.get(ref);

    if (snap.exists && snap.data().uid !== uid) {
      fail(403, 'המנוי שייך למשתמש אחר');
    }

    tx.set(ref, {
      uid,
      subscription,
      updatedAt: now()
    });
  });

  return { ok: true };
});
