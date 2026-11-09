# החניה שלנו — כניסה עם שם בלבד

Firebase Project: `parking-b6302` / Firestore `parking/current`.

## לפני פרסום
1. Firebase Authentication → Sign-in method → Anonymous → Enabled.
2. Firebase Firestore → Rules: replace current rules with `firestore.rules`, then Publish.
3. If the parking spot is currently occupied by the **old email/password account**, release it from the old live site first; otherwise only a Firebase console admin can reset it to unoccupied.
4. Run `npm install && npm run build`, then push to GitHub. Vercel should redeploy automatically.
5. Test on a new browser or private tab first, enter a name, claim and release the spot.

## Important security limitation
Anyone who knows the public app URL can create an anonymous account and enter any name. This is **not** verification of roommate identity. Same name on a new device is a different account and cannot release the old device's claim. Clearing browser storage may similarly lose the anonymous account. For a private roommates-only app, introduce an invitation system or individually provisioned accounts.

## Data structure
`members/{anonymousUID}`: `{ name: string }` created on first use.
`parking/current`: `{ occupied: boolean, occupiedBy: string, occupiedByName: string, updated: timestamp }`.
