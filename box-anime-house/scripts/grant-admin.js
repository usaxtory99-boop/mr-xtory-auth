// Run from this folder after: gcloud auth application-default login
// Usage: node scripts/grant-admin.js FIREBASE_AUTH_UID
const admin = require("../functions/node_modules/firebase-admin");
const uid = process.argv[2];
if (!uid) {
  console.error("Usage: node scripts/grant-admin.js FIREBASE_AUTH_UID");
  process.exit(1);
}
admin.initializeApp();
(async () => {
  await admin.auth().setCustomUserClaims(uid, { admin: true });
  console.log("Admin claim granted to:", uid);
  process.exit(0);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
