# V3.2 asset inventory

Audit date: 2026-08-14.

## Source

The requested source folder is `/Users/urijelygin/Documents/NEW_SITE/Новая папка 2`. It was treated as read-only. A similarly named folder in Downloads was not used.

- 12 top-level files, approximately 440 MB.
- 7 JPG references: art direction, texture/reveal treatments and the Nikon D700 reference.
- 4 ZIP archives; every archive passed `unzip -tqq` before extraction.
- 1 M3U HLS master. Its relative media playlists are absent, so it cannot serve as the website showreel by itself.
- Archives were extracted to a temporary folder for contact-sheet review; no extracted source file was committed.

## Archive classification

| Archive | Useful visual files | Classification | Decision |
|---|---:|---|---|
| `Архив.zip` | 34 | DaVinci Resolve UI, node graphs, scopes and graded exports | selected for post-production proof |
| `Архив 2.zip` | 14 | 2560×1440 screenshots with a centered 9:16 edit | selected after a centered 810×1440 crop that removes black side bars |
| `Архив 4.zip` | 11 | BTS, production cameras, gimbal and Yuri operating | selected for camera/live credibility; one HEIC auxiliary/depth item rejected |
| `отобранные кадры.zip` | 136 | matched 1920×1080 raw/color stills from nine projects | selected for raw/final comparison and supporting stills |

## Production assets

All website derivatives are optimized WebP files in `public/v3-assets/`.

| Output | Source role | Website use |
|---|---|---|
| `hero-camera-master.webp` | ImageGen master guided by the supplied Nikon D700 reference | retained master |
| `hero-camera-silhouette.webp` | darker derivative of the same master | base camera state in hero |
| `hero-camera-lit.webp` | full-color derivative of the same master | pointer-driven lit camera state |
| `color-sibur-before.webp` / `color-sibur-after.webp` | matched SIBUR raw/color frames | accessible comparison on home and project page |
| `post-davinci-nodes.webp` | real DaVinci Resolve screen | post-production proof |
| `still-grk-stage.webp` | selected GRK graded still | camera capability proof |
| `vertical-podcast.webp` | centered 9:16 crop from the supplied screen capture | portrait-format proof without black bars |
| `bts-broadcast-camera.webp` | supplied live-camera BTS | broadcast proof |
| `bts-gimbal.webp` | supplied gimbal BTS | broadcast/capability proof |
| `bts-operator.webp` | supplied photograph of Yuri at work | authorship/BTS proof |

## Generated hero asset

Mode: reference-guided premium product mockup. The prompt required a recognizable Nikon D700 body, F-mount proportions, top LCD, grip and an AF-S NIKKOR 24–70mm f/2.8G with hood; composition was a 16:10 black studio void with restrained orange and cool rim light, camera weighted to the right, no text, watermark or invented interface. The resulting master was reused for both hero states so the camera identity does not drift between layers.

## Exclusions

- The incomplete M3U was not presented as working video.
- Finder metadata, `.DS_Store`, archive duplicates and the HEIC auxiliary/depth item were excluded.
- Extra Caprigo raw/color derivatives were evaluated and removed from the build because the final interface uses the stronger SIBUR pair.
- No supplied archive or original reference was renamed, overwritten or deleted.
