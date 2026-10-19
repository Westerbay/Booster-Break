# Pokémon Radio

The app has a persistent audio player with play/pause, previous/next, track selection,
playlist looping and saved volume. Playback starts only after a user action and continues
across client-side navigation. A full page reload stops playback. Closing the panel keeps
the music playing. A slim rectangular strip follows every page, with playback, current
track, next track and playlist controls on one line. Play/pause stays accessible when
collapsed. The playlist and volume open above the strip, with Escape returning keyboard
focus to the playlist button.

No audio is included. Without a playlist, the player displays an empty state.
Only a small JSON playlist is fetched on startup; MP3 sources are assigned only
when playback is requested. A broken track stops with a retryable error instead of causing
a loop through unavailable files. Mobile background/locked-screen playback depends on the
browser and operating system. Some mobile browsers manage volume with hardware controls.

## Add MP3 files locally

1. Place authorized MP3 files directly in `apps/web/public/radio/` (no subfolders).
2. From the repository root, run `bun run radio:index`.
3. Open the radio in the app. If it was already empty, click **Refresh track list**.

Files are sorted naturally by filename, including uppercase `.MP3`. Prefix names with
`01 -`, `02 -`, etc. to choose the order. Track labels come from filenames without the
extension. Spaces, accents and special characters are URL-encoded by the indexer.
Run the indexer again after adding, renaming or removing files. Reload the app to update
an already loaded, nonempty playlist.

MP3 files and the generated `playlist.json` are ignored by Git. The entire audio directory
is excluded from Docker build contexts, so music is never baked into application images.

## Server / Raspberry Pi

Keep the audio in a persistent folder on the server, for example `/opt/booster-break/radio`.
Generate its playlist using Bun and the supplied script:

```sh
bun scripts/radio-library.ts /opt/booster-break/radio
```

The script writes `playlist.json` in that same directory. It only lists regular MP3 files,
ignores subdirectories and symlinks, and atomically replaces the playlist. It requires Bun,
not the app, database or credentials. It can also be run locally before copying the entire
folder to the server.

For the server deployment, copy the supplied `deploy/compose.radio.yml` beside the
existing Compose file. It mounts `./radio` into the web container read-only and fails
explicitly if the host folder does not exist.

Use both files when you deploy or update:

```sh
docker compose -f docker-compose.yml -f compose.radio.yml up -d
```

Replace `docker-compose.yml` with your existing deployment file name if different. Create
the `radio` folder first and ensure files are readable by the nginx container user. Mounting
is read-only inside the container; updates and replacements of the web image preserve the
server's MP3 files. The existing Caddy proxy forwards `/radio/*` to the web container.
The nginx image serves audio directly, including byte-range requests, with missing files
returning 404 instead of the app HTML. No API/database change is needed.

To verify deployment, request `/radio/playlist.json`, then a listed MP3 with a
`Range: bytes=0-1023` header. Expect JSON and an audio response with status 206 respectively.
A missing MP3 must return 404. No deployment is performed by the index command.

Hosting music requires the appropriate distribution rights; a file being downloadable or
available on YouTube does not grant those rights.
