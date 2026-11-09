import { handle, database, fail, memberOf } from '../server/common.js';
export default handle(async ({ uid, body }) => {
  await memberOf(uid);
  const cleanName = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : '';
  if (!cleanName || cleanName.length > 30) fail(400, 'יש להזין שם בן 1 עד 30 תווים');
  const parkingRef = database().doc('parking/current');
  const memberRef = database().doc(`members/${uid}`);
  await database().runTransaction(async tx => {
    const parking = await tx.get(parkingRef);
    tx.update(memberRef, { name: cleanName });
    if (parking.exists && parking.data().occupied && parking.data().occupiedBy === uid) {
      tx.update(parkingRef, { occupiedByName: cleanName });
    }
  });
  return { ok: true };
});
