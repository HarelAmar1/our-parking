# החניה שלנו — גרסת אייפון

הגרסה הזו מותאמת לפרויקט Firebase `parking-b6302`, למסמך `parking/current` ולשדה `updated`.

## העלאה מאייפון
1. שמור את קובץ ZIP באפליקציית "קבצים" ופתח אותו כדי לחלץ את התיקייה.
2. צור מאגר GitHub פרטי ריק בשם `our-parking` (בלי README אוטומטי).
3. דרך Safari, היכנס למאגר, בחר Add file → Upload files.
4. העלה תחילה את הקבצים שבשורש: `index.html`, `package.json`, `vite.config.js`, `firestore.rules`, `README.md` (אפשר גם `.gitignore` אם נוח).
5. צור תיקייה `src` במאגר דרך Add file → Create new file וכתוב בשם הקובץ `src/.gitkeep`; שמור. היכנס ל-`src` → Add file → Upload files, והעלה `main.jsx`, `firebase.js`, `style.css`.
6. באותה דרך צור `public/.gitkeep`, היכנס ל-public והעלה את שלוש תמונות ה-PNG.
7. התחבר ל-Vercel → New Project → Import מאגר GitHub → Vite → Deploy. אין צורך במשתני סביבה.
8. Authentication → Settings → Authorized domains: הוסף את כתובת האתר בדומיין vercel.app (בלי https:// ובלי נתיב) אם נדרש.
9. פתח את האתר ב-Safari → Share → Add to Home Screen.

## בדיקות
- הכנס אימייל וסיסמה שנוצרו ב-Firebase Authentication; ה-UID חייב להיות מסמך ב-members עם השדה name.
- אם החניה פנויה, לחץ "תפסתי את החניה". רק מי שתפס יכול לפנות.
- כללי Firestore כבר פורסמו דרך הקונסול בשיחה. אין צורך להעלות את `firestore.rules` לשרת; הוא מצורף כגיבוי/תיעוד.

**אין להעלות סיסמאות של משתמשים או Firebase Admin / service-account keys.**
