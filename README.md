# קיר חתימות — פרויקט חדש מאפס

## הקבצים
- `worker.js` — האתר, ה-API ושמירת החתימות.
- `wrangler.toml` — הגדרות Cloudflare Worker ו-Durable Object.

## פריסה ראשונה ל-Cloudflare
1. התקן Node.js במחשב.
2. פתח טרמינל בתיקייה שבה נמצאים הקבצים.
3. הרץ: `npx wrangler login`
4. הרץ: `npx wrangler deploy`
5. פתח את כתובת ה-Workers שהפקודה מציגה.

הפרויקט משתמש ב-Durable Objects לשמירה משותפת בין כל המבקרים. בפריסה ראשונה Wrangler ייצור את ה-binding וה-migration שמוגדרים ב-`wrangler.toml`.

## חשוב
- השם ב-`wrangler.toml` הוא `signature-wall-new`. אם רוצים שם אחר, אפשר לשנות את `name`.
- זו מערכת ציבורית: כל חתימה שמפורסמת גלויה לכל המבקרים.
- האתר מגביל את הקיר ל-300 חתימות אחרונות.
