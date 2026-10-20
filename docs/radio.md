# Pokémon Radio

The app has a persistent audio player with play/pause, previous/next, track selection,
playlist looping and saved volume. Playback starts only after a user action and continues
across client-side navigation. A full page reload stops playback. The slim strip follows
every page; playlist and volume controls open above it. Escape closes the panel and returns
focus to its button.

## Add music after deployment

Drop authorized MP3 files directly into the server's `radio` folder. That is all: **no index
command, playlist file, app rebuild or container restart is needed**. nginx lists the folder
as JSON on demand and the app refreshes the list every 30 seconds while visible. Returning
to a stale tab also refreshes it. Adding or removing another file does not reset playback:
the current track is identified by filename, independently of its position in the list.
A removed current track can finish from its existing stream/buffer, but may fail if further
bytes are needed. Selecting a remaining track recovers playback.

Files are sorted naturally by filename, including uppercase `.MP3`. Prefix names with
`01 -`, `02 -`, etc. to choose the order. Labels come from filenames without extensions;
spaces, accents, percent signs and special characters are safely URL-encoded. Only MP3s
are shown in the player. Subdirectories and unfinished `.part` files are ignored. For long
uploads, copy as `track.mp3.part` then rename to `track.mp3` when the copy is complete.
Symbolic links are not supported for audio playback.

No audio is included. An empty directory displays an empty state. The app fetches only a
small directory listing; it assigns an MP3 source only when playback is requested. A broken
track stops with an error instead of causing a retry loop. Background/locked-screen
playback and software volume control depend on the mobile browser and OS.

## One-time server setup

Create a persistent folder beside your server Compose file, for example
`/opt/booster-break/radio`, readable by the nginx container user. This folder is public:
keep only radio audio in it, since its file names are exposed in the directory listing.
MP3 files are served directly by nginx; other file routes and missing tracks return 404.

Copy `deploy/compose.radio.yml` beside the existing Compose file. It mounts `./radio`
read-only and fails explicitly if that folder does not exist. Use both files when deploying
or updating:

```sh
mkdir -p radio
docker compose -f docker-compose.yml -f compose.radio.yml up -d
```

Replace `docker-compose.yml` with your existing deployment file name if different. The
existing Caddy proxy forwards `/radio/*` to the web container. Container/image updates
preserve the host files. No Bun installation, filesystem watcher, writable mount, extra
service, API change or database migration is needed for the radio.

Verify deployment by requesting `/radio/`: expect a JSON array (empty if no MP3s exist).
After copying a file, confirm it appears in that response. Request the MP3 with
`Range: bytes=0-1023`: expect HTTP 206; a missing MP3 must return 404. Repeat a browser
playback check after deployment before declaring the real server verified.

## Local development

Drop MP3 files into `apps/web/public/radio/` and start the usual Vite dev server. Its radio
middleware generates the same directory listing automatically. Audio files remain ignored
by Git and the entire directory is excluded from Docker build contexts. Production images
contain an empty radio directory until the server folder is mounted.

Hosting music requires the appropriate distribution rights; availability on YouTube does
not grant those rights.
