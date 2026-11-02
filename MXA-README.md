# MR XTORY ANIME (MXA)

Mobile-first anime and movie streaming website.

## Website features
- Responsive mobile-first layout with dark/light themes and five-item bottom navigation
- Supabase email/password authentication
- Published anime/movie catalog, search, genres, seasons and episodes
- Watchlist, favorites and watch progress/history
- Admin Creator Studio for catalog entries, seasons, episodes, posters, banners and thumbnails
- Direct MP4/WebM/MOV/MKV uploads to the `anime-videos` Supabase Storage bucket (current bucket limit: 50 MB per file)
- HLS/MP4 playback where the uploaded/source format is supported
- GitHub Pages deployment workflow on branch `mxa-anime-site`

## Supabase project
Project ref: `lcpnlwqycroerxvbtsnp`  
Project URL: `https://lcpnlwqycroerxvbtsnp.supabase.co`

The browser uses only the Supabase publishable key. Never put a service-role or secret key in frontend code.

## First-time setup
1. Create an account using the email connected to the authorized GitHub account; the configured signup trigger is intended to grant the first admin role.
2. If that account existed before the trigger was configured, verify/assign its admin role in `public.user_roles` from the Supabase SQL editor.
3. Add the final deployed website URL to Supabase Authentication → URL Configuration after deployment is confirmed.
4. Google sign-in is not enabled until the Google provider is configured in Supabase.
5. Upload and publish only videos, artwork and other content that you own or are licensed to distribute.

## Deployment
Pushes to `mxa-anime-site` trigger `.github/workflows/pages.yml`. In repository Settings → Pages, select **GitHub Actions** as the source. A successful workflow and a confirmed Pages URL are required before calling the site live.

## Free-tier note
Supabase Free has storage and bandwidth limits. Video uploads are not unlimited; larger video hosting may require a different approved storage/streaming provider. No paid services should be enabled without the owner's explicit approval.
