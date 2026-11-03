const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret, defineString } = require("firebase-functions/params");
const admin = require("firebase-admin");
const crypto = require("crypto");

admin.initializeApp();
const db = admin.firestore();
const BOT_TOKEN = defineSecret("TELEGRAM_BOT_TOKEN");
const WEBHOOK_SECRET = defineSecret("TELEGRAM_WEBHOOK_SECRET");
const ADMIN_TELEGRAM_IDS = defineString("ADMIN_TELEGRAM_IDS", { default: "" });
const CLOUDINARY_CLOUD_NAME = defineString("CLOUDINARY_CLOUD_NAME", { default: "" });
const CLOUDINARY_UPLOAD_PRESET = defineString("CLOUDINARY_UPLOAD_PRESET", { default: "" });

function verifyInitData(initData, botToken) {
  const params = new URLSearchParams(initData || "");
  const receivedHash = params.get("hash");
  if (!receivedHash) return null;
  params.delete("hash");
  const authDate = Number(params.get("auth_date") || 0);
  if (!authDate || Math.abs(Date.now() / 1000 - authDate) > 86400) return null;
  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => key + "=" + value)
    .join("\n");
  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const calculated = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  const a = Buffer.from(calculated, "hex");
  const b = Buffer.from(receivedHash, "hex");
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  try { return JSON.parse(params.get("user") || "null"); } catch { return null; }
}

exports.verifyTelegramInitData = onCall({ secrets: [BOT_TOKEN], region: "us-central1" }, async (request) => {
  const initData = request.data && request.data.initData;
  if (typeof initData !== "string" || initData.length > 8192) {
    throw new HttpsError("invalid-argument", "Telegram initData is required.");
  }
  const tgUser = verifyInitData(initData, BOT_TOKEN.value());
  if (!tgUser || !tgUser.id) throw new HttpsError("unauthenticated", "Telegram verification failed. Reopen the Mini App from Telegram.");
  const uid = "tg_" + String(tgUser.id);
  const userRef = db.collection("users").doc(uid);
  const snap = await userRef.get();
  const displayName = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(" ").slice(0, 80);
  if (!snap.exists) {
    const code = String(crypto.randomInt(1000000000, 10000000000));
    const startParam = String(tgUser.start_param || "");
    const data = {
      telegramId: String(tgUser.id),
      username: String(tgUser.username || "").slice(0, 64),
      displayName,
      referralCode: code,
      referralCount: 0,
      activeSeconds: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };
    await userRef.set(data);
    if (/^\d{10}$/.test(startParam)) {
      const refQuery = await db.collection("users").where("referralCode", "==", startParam).limit(1).get();
      if (!refQuery.empty && refQuery.docs[0].id !== uid) {
        const referrer = refQuery.docs[0];
        const referralId = startParam + "_" + uid;
        const referralRef = db.collection("referrals").doc(referralId);
        await db.runTransaction(async (tx) => {
          const existing = await tx.get(referralRef);
          if (existing.exists) return;
          tx.set(referralRef, {
            referralCode: startParam,
            referrerUid: referrer.id,
            inviteeUid: uid,
            createdAt: admin.firestore.FieldValue.serverTimestamp()
          });
          tx.update(referrer.ref, { referralCount: admin.firestore.FieldValue.increment(1) });
        });
      }
    }
  } else {
    await userRef.set({
      username: String(tgUser.username || "").slice(0, 64),
      displayName,
      lastSeen: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }
  const token = await admin.auth().createCustomToken(uid);
  return { token, profile: { uid, telegramId: String(tgUser.id), displayName, username: tgUser.username || "" } };
});

async function telegram(method, body, token) {
  const response = await fetch("https://api.telegram.org/bot" + token + "/" + method, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  });
  const data = await response.json();
  if (!data.ok) throw new Error(data.description || "Telegram API error");
  return data.result;
}
async function reply(chatId, text, token) {
  return telegram("sendMessage", { chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }, token);
}
function parsePipe(text) { return text.split("|").map(x => x.trim()); }
async function uploadToCloudinary(buffer, filename, mimeType) {
  const cloud = CLOUDINARY_CLOUD_NAME.value();
  const preset = CLOUDINARY_UPLOAD_PRESET.value();
  if (!cloud || !preset) throw new Error("Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME and CLOUDINARY_UPLOAD_PRESET.");
  const form = new FormData();
  form.append("file", new Blob([buffer], { type: mimeType || "video/mp4" }), filename);
  form.append("upload_preset", preset);
  form.append("folder", "box-anime-house/episodes");
  const response = await fetch("https://api.cloudinary.com/v1_1/" + encodeURIComponent(cloud) + "/video/upload", { method: "POST", body: form });
  const result = await response.json();
  if (!response.ok || !result.secure_url) throw new Error(result.error?.message || "Cloudinary upload failed.");
  return result.secure_url;
}

exports.recordActivity = onCall({ region: "us-central1" }, async (request) => {
  if (!request.auth) throw new HttpsError("unauthenticated", "Sign in first.");
  const userRef = db.collection("users").doc(request.auth.uid);
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(userRef);
    if (!snap.exists) throw new HttpsError("not-found", "User profile not found.");
    const last = snap.data().lastActivityAt;
    const now = admin.firestore.Timestamp.now();
    if (!last || now.toMillis() - last.toMillis() >= 14000) {
      const nextSeconds = Number(snap.data().activeSeconds || 0) + 15;
      tx.update(userRef, {
        activeSeconds: nextSeconds,
        lastSeen: now,
        lastActivityAt: now
      });
      tx.set(db.collection("leaderboard").doc(request.auth.uid), {
        displayName: String(snap.data().displayName || "Anime fan").slice(0, 80),
        username: String(snap.data().username || "").slice(0, 64),
        activeSeconds: nextSeconds,
        updatedAt: now
      }, { merge: true });
    }
  });
  return { ok: true };
});

exports.telegramWebhook = onRequest({
  secrets: [BOT_TOKEN, WEBHOOK_SECRET],
  region: "us-central1",
  timeoutSeconds: 300,
  memory: "1GiB"
}, async (req, res) => {
  if (req.method !== "POST") return res.status(405).send("POST only");
  if (req.get("X-Telegram-Bot-Api-Secret-Token") !== WEBHOOK_SECRET.value()) return res.status(401).send("Unauthorized");
  const token = BOT_TOKEN.value();
  try {
    const update = req.body || {};
    const message = update.message;
    if (!message || !message.chat) return res.status(200).send("ok");
    const chatId = message.chat.id;
    const senderId = String(message.from && message.from.id || "");
    const adminIds = ADMIN_TELEGRAM_IDS.value().split(",").map(x => x.trim()).filter(Boolean);
    const isAdmin = adminIds.includes(senderId);
    const text = String(message.text || message.caption || "").trim();

    if (text === "/start" || text.startsWith("/start ")) {
      return await reply(chatId, "Welcome to <b>BOX ANIME HOUSE</b>!\nOpen the Mini App from the menu button to explore anime.\n\nAdmin commands: /help", token), res.status(200).send("ok");
    }
    if (text === "/help") {
      const help = "BOX ANIME HOUSE Admin Bot\n\n/new Title | Year | Genre | Poster URL | Description\n\nSend a video with caption:\n/episode ANIME_DOCUMENT_ID | Episode title\n\nOnly authorized admin Telegram IDs can publish.";
      return await reply(chatId, help, token), res.status(200).send("ok");
    }
    if (!isAdmin) {
      await reply(chatId, "This bot is public for viewing. Upload commands are restricted to the administrator.", token);
      return res.status(200).send("ok");
    }
    if (text.startsWith("/new ")) {
      const parts = parsePipe(text.slice(5));
      if (parts.length < 4 || !parts[0]) {
        await reply(chatId, "Format:\n/new Title | Year | Genre | Poster URL | Description", token);
        return res.status(200).send("ok");
      }
      const ref = await db.collection("anime").add({
        title: parts[0].slice(0, 120),
        year: (parts[1] || "").slice(0, 8),
        genre: (parts[2] || "").slice(0, 80),
        poster: parts[3],
        description: (parts[4] || "").slice(0, 1500),
        episodes: [],
        published: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      await reply(chatId, "Published: <b>" + parts[0].replace(/[&<>]/g, "") + "</b>\nAnime ID: <code>" + ref.id + "</code>", token);
      return res.status(200).send("ok");
    }
    if (message.video && text.startsWith("/episode ")) {
      const parts = parsePipe(text.slice(9));
      const animeId = parts[0];
      const episodeTitle = parts[1] || "Episode";
      if (!animeId || !/^[A-Za-z0-9_-]{10,80}$/.test(animeId)) {
        await reply(chatId, "Caption format:\n/episode ANIME_DOCUMENT_ID | Episode title", token);
        return res.status(200).send("ok");
      }
      const animeRef = db.collection("anime").doc(animeId);
      const animeSnap = await animeRef.get();
      if (!animeSnap.exists) {
        await reply(chatId, "Anime ID not found. Create it with /new first.", token);
        return res.status(200).send("ok");
      }
      if (Number(message.video.file_size || 0) > 20 * 1024 * 1024) {\n        await reply(chatId, "This Telegram bot upload route currently supports videos up to 20 MB. Use the Web Admin upload or a dedicated video CDN for larger files.", token);\n        return res.status(200).send("ok");\n      }\n      const fileId = message.video.file_id;
      const fileInfo = await telegram("getFile", { file_id: fileId }, token);
      const fileUrl = "https://api.telegram.org/file/bot" + token + "/" + fileInfo.file_path;
      const download = await fetch(fileUrl);
      if (!download.ok) throw new Error("Could not download video from Telegram.");
      const bytes = Buffer.from(await download.arrayBuffer());
      if (bytes.length > 20 * 1024 * 1024) {
        await reply(chatId, "This bot upload route currently supports videos up to 20 MB. Use the Web Admin upload or a dedicated video CDN for larger files.", token);
        return res.status(200).send("ok");
      }
      const safeName = Date.now() + "_" + fileId.replace(/[^a-zA-Z0-9_-]/g, "") + ".mp4";
      const videoUrl = await uploadToCloudinary(bytes, safeName, message.video.mime_type || "video/mp4");
      const oldEpisodes = animeSnap.data().episodes || [];
      oldEpisodes.push({ title: episodeTitle.slice(0, 120), videoUrl, createdAt: new Date().toISOString() });
      await animeRef.update({ episodes: oldEpisodes, updatedAt: admin.firestore.FieldValue.serverTimestamp() });
      await reply(chatId, "Episode uploaded and published!\nAnime: <b>" + String(animeSnap.data().title).replace(/[&<>]/g, "") + "</b>\nEpisode: " + episodeTitle.replace(/[&<>]/g, ""), token);
      return res.status(200).send("ok");
    }
    if (message.video && isAdmin) {
      await reply(chatId, "Add this caption to publish the video:\n/episode ANIME_DOCUMENT_ID | Episode title\n\nUse /help for all commands.", token);
      return res.status(200).send("ok");
    }
    await reply(chatId, "Use /help to see available commands.", token);
    return res.status(200).send("ok");
  } catch (error) {
    console.error("Telegram webhook error", error);
    try { await reply(req.body?.message?.chat?.id, "Something went wrong while processing that request. Check function logs.", token); } catch (_) {}
    return res.status(200).send("ok");
  }
});