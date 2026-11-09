import { handle, database, fail, secretMatches, now } from '../server/common.js';

export default handle(async ({ uid, body }) => {
  const cleanName = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : '';
  if (!cleanName || cleanName.length > 30) fail(400, 'יש להזין שם בן 1 עד 30 תווים');
  const ref = database().doc(`members/${uid}`);
  // Existing registered members are grandfathered in (migration).
  const snap = await ref.get();
  if (snap.exists) fail(409, 'המשתמש הזה כבר רשום. ניתן לשנות את שמו בהגדרות.');
  if (!secretMatches(body.inviteCode, process.env.INVITE_CODE)) fail(403, 'קוד ההזמנה אינו נכון');
  await database().runTransaction(async tx => {
    const existing = await tx.get(ref);
    if (existing.exists) fail(409, 'המשתמש כבר רשום');
    tx.create(ref, { name: cleanName, createdAt: now() });
  });
  return { ok: true };
});
