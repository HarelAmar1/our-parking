
import {
  handle, database, fail, memberOf,
  secretMatches, now, notifyAvailable
} from '../server/common.js';

const MAX_ATTEMPTS = 5;
const LOCK_TIME = 15 * 60 * 1000;

export default handle(async ({ uid, body }) => {
  const member = await memberOf(uid);
  const action = body.action;

  if (!['occupy', 'release', 'forceRelease'].includes(action)) {
    fail(400, 'פעולה לא מוכרת');
  }

  const db = database();
  const parkingRef = db.doc('parking/current');
  const attemptsRef = db.doc(`managerAttempts/${uid}`);

  const result = await db.runTransaction(async tx => {
    // All reads must happen before any writes.
    const parkingSnap = await tx.get(parkingRef);
    const attemptsSnap = action === 'forceRelease'
        ? await tx.get(attemptsRef)
        : null;

    if (!parkingSnap.exists) {
      fail(404, 'לא נמצא parking/current');
    }

    const state = parkingSnap.data();

    if (action === 'occupy') {
      if (state.occupied) fail(409, 'החניה כבר תפוסה');

      tx.update(parkingRef, {
        occupied: true,
        occupiedBy: uid,
        occupiedByName: member.name,
        updated: now()
      });

      return { released: false };
    }

    if (!state.occupied) {
      fail(409, 'החניה כבר פנויה');
    }

    if (action === 'release' && state.occupiedBy !== uid) {
      fail(403, 'רק מי שתפס את החניה יכול לפנות אותה');
    }

    if (action === 'forceRelease') {
      const currentTime = Date.now();
      const previous = attemptsSnap.exists
          ? attemptsSnap.data()
          : {};

      if (previous.lockedUntil > currentTime) {
        return {
          error: 429,
          message: 'יותר מדי ניסיונות. נסה שוב בעוד 15 דקות.'
        };
      }

      const windowStart =
          previous.windowStart > currentTime - LOCK_TIME
              ? previous.windowStart
              : currentTime;

      const attempts = windowStart === previous.windowStart
          ? (previous.count || 0)
          : 0;

      const validCode = secretMatches(
          body.managerCode,
          process.env.MANAGER_CODE
      );

      if (!validCode) {
        const nextCount = attempts + 1;
        const locked = nextCount >= MAX_ATTEMPTS;

        tx.set(attemptsRef, {
          count: nextCount,
          windowStart,
          lockedUntil: locked ? currentTime + LOCK_TIME : 0
        });

        return {
          error: locked ? 429 : 403,
          message: locked
              ? 'הגעת למספר הניסיונות המרבי. נסה שוב בעוד 15 דקות.'
              : 'קוד המנהל שגוי'
        };
      }

      // A successful manager action clears failed attempts.
      tx.delete(attemptsRef);
    }

    tx.update(parkingRef, {
      occupied: false,
      occupiedBy: '',
      occupiedByName: '',
      updated: now()
    });

    return { released: true };
  });

  // Return errors after the transaction commits the attempt count.
  if (result.error) {
    fail(result.error, result.message);
  }

  if (result.released) {
    await notifyAvailable(uid).catch(err =>
        console.error('Notification error', err)
    );
  }

  return { ok: true };
});
