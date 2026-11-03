# BOX ANIME HOUSE

Telegram Mini App + Firebase Auth/Firestore with Cloudinary media hosting.

## Status
This is an implementation scaffold, not a deployed production app. Hosting, Firebase Functions, Telegram bot secrets/webhook, admin authorization, Cloudinary setup and end-to-end tests remain required. Publish only content you own or are licensed to distribute.

## Services
- Firebase Authentication: admin sign-in.
- Cloud Firestore: anime catalogue, profiles, referrals, activity and episode metadata.
- Cloudinary: poster and video media. Free-plan quotas and file limits apply.
- Firebase Storage is not used for media in this version, so a Firebase Blaze upgrade is not needed for these uploads.

## Cloudinary setup
1. Create a free account: https://cloudinary.com/users/register/free
2. In the Cloudinary Console, copy the Cloud Name.
3. Open Settings → Upload → Upload presets and create an Unsigned preset.
4. Restrict allowed formats and file sizes where available. Unsigned presets are public: anyone who knows the preset name may upload, so monitor usage and disable/rotate it if abused.
5. Add Cloud Name and preset name to window.BAH_CLOUDINARY in firebase-config.js.
6. Configure the same values as CLOUDINARY_CLOUD_NAME and CLOUDINARY_UPLOAD_PRESET Firebase Functions parameters for Telegram bot uploads.

## Firebase and bot setup
1. Enable Email/Password Authentication and create Firestore.
2. Deploy firestore.rules.
3. Deploy Cloud Functions. Store TELEGRAM_BOT_TOKEN and TELEGRAM_WEBHOOK_SECRET as Firebase secrets; configure ADMIN_TELEGRAM_IDS, CLOUDINARY_CLOUD_NAME and CLOUDINARY_UPLOAD_PRESET as function parameters.
4. Grant the owner's Firebase Auth account the admin custom claim using the trusted Admin SDK helper. Never grant admin privileges from browser code.
5. Set the Telegram webhook to the deployed telegramWebhook HTTPS URL with the same secret token, then configure the Mini App URL in BotFather.
6. Host this folder over HTTPS.

## Upload limits
- Web Admin browser upload is capped at 100 MB per file; Cloudinary quotas/preset limits may be lower.
- Telegram Bot API cloud downloads are capped here at 20 MB. Larger videos must be uploaded via Web Admin.
- Never put Telegram bot tokens, Cloudinary API secrets, or Firebase service-account keys in browser files or GitHub.

## Bot commands
- /help
- /new Title | Year | Genre | Poster URL | Description
- Send a video with caption /episode ANIME_DOCUMENT_ID | Episode title

## Deployment
Install Firebase CLI and function dependencies, configure secrets/parameters, then deploy Functions and Firestore rules. GitHub Pages can host static files if enabled for this repository. Complete live testing before considering the app production-ready.
