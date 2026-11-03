# BOX ANIME HOUSE

Telegram Mini App + Firebase-backed anime catalogue and web admin starter.

## Included
- Mobile-first anime home, genre filters, search, details, episode player, history, profile, theme switcher, support link, top-user list and referral UI.
- Web admin page for anime metadata and episode uploads.
- Firebase Firestore and Storage security rules.
- Telegram WebApp SDK integration and client call to a server-side `verifyTelegramInitData` callable function.

## Important status
This is the first application scaffold, not a deployed production service. Firebase configuration, Cloud Functions, bot webhook/token, admin custom claim, and hosting still need to be configured. The preview catalogue is sample content, not a licensed anime library.

## Firebase setup
1. Open the existing Firebase project (previously named **MR XTORY ANIME**) or create a dedicated project for BOX ANIME HOUSE.
2. Register a Web App and copy its config into `firebase-config.js`.
3. Enable Authentication (Email/Password for the web admin), Firestore Database, and Storage.
4. Deploy `firestore.rules` and `storage.rules`.
5. Deploy the Cloud Functions in the `functions/` folder (to be added in the backend phase), including Telegram init-data verification. Do not trust `initDataUnsafe` alone.
6. Grant the owner account the Firebase custom claim `admin: true` using a trusted Admin SDK script or secured server function. Never let a browser set its own admin claim.
7. Add the Telegram bot username in `firebase-config.js`; configure the bot's Mini App URL in BotFather.
8. Host this folder over HTTPS. GitHub Pages can serve the static Mini App at `/box-anime-house/` if Pages is enabled for the repository.

## Admin uploads
The web admin accepts smaller MP4/WebM uploads to Firebase Storage and writes episode metadata to Firestore. For large video libraries, use a dedicated video CDN/transcoding service. The Telegram bot upload path needs a server-side webhook and a bot token stored as a secret; never put the token in client-side files.

## User ranking
The starter increments visible-session activity periodically. A production ranking should validate and cap activity on the server to prevent client manipulation.

## Referral
A 10-digit code is generated when a Telegram user profile is created. Referral attribution must be finalized server-side to prevent self-referrals and duplicate rewards.