# MR XTORY ANIME (MXA)

Mobile-first anime catalog and playback website.

## Included
- Responsive dark/light interface with mobile bottom navigation
- Supabase email/password auth
- Published catalog, series/movie browsing, search, genres, details
- Watchlist and watch history / progress
- Admin Creator Studio for titles, seasons, episodes and authorized video sources
- HLS and MP4 playback
- GitHub Pages workflow

## Supabase project
Project ref: lcpnlwqycroerxvbtsnp

The website uses only the public publishable key. Never add a Supabase service-role or secret key to client-side code.

## First-time setup
1. In Supabase Authentication → URL Configuration, add the deployed GitHub Pages URL to the allowed redirect URLs.
2. Assign the first trusted admin account the `admin` role in `public.user_roles` from the Supabase SQL editor.
3. Publish only content and video sources you own or are licensed to distribute.

## Deployment
GitHub Actions deploys the website when commits are pushed to `mxa-anime-site`. In repository Settings → Pages, select **GitHub Actions** as the source if required.
