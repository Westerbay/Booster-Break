import { useRef, useState, type KeyboardEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ChevronDownIcon,
  ListMusicIcon,
  Volume2Icon,
  PauseIcon,
  PlayIcon,
  SkipBackIcon,
  SkipForwardIcon,
} from 'lucide-react'
import { useLocale } from '@/features/i18n/useLocale'
import { m } from '@/paraglide/messages'
import { fetchRadioLibrary, radioRefreshIntervalMs, type RadioTrack } from './radio-library'
import { useRadioPlayer } from './useRadioPlayer'
import './radio.css'

const emptyTracks: RadioTrack[] = []

export function RadioPlayer() {
  useLocale()
  const [open, setOpen] = useState(false)
  const toggleButton = useRef<HTMLButtonElement>(null)
  const library = useQuery({
    queryKey: ['radio-library'],
    queryFn: fetchRadioLibrary,
    staleTime: radioRefreshIntervalMs,
    refetchInterval: radioRefreshIntervalMs,
    retry: false,
    meta: { suppressToast: true },
  })
  const tracks = library.data ?? emptyTracks
  const {
    attachAudio,
    index,
    track,
    playing,
    buffering,
    failed,
    volume,
    storageFailed,
    togglePlayback,
    next,
    previous,
    selectTrack,
    changeVolume,
    onPlaying,
    onPause,
    onWaiting,
    onError,
  } = useRadioPlayer(tracks)
  const playLabel = playing || buffering ? m.radio_pause() : m.radio_play()
  let status = track?.title ?? m.radio_empty_short()
  if (library.isLoading) status = m.radio_loading()
  if (buffering) status = m.radio_buffering()
  if (failed) status = m.radio_playback_error()
  if (library.isError) status = m.radio_load_error()

  function togglePanel() {
    setOpen((value) => !value)
  }

  function closePanel() {
    setOpen(false)
    toggleButton.current?.focus()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === 'Escape' && open) {
      event.stopPropagation()
      closePanel()
    }
  }

  function retryLibrary() {
    void library.refetch()
  }

  return (
    <section className="radio-player" aria-label={m.radio_title()} onKeyDown={handleKeyDown}>
      <audio
        ref={attachAudio}
        preload="none"
        onEnded={next}
        onPlaying={onPlaying}
        onPause={onPause}
        onWaiting={onWaiting}
        onError={onError}
      />
      <div className="radio-strip" data-playing={playing || buffering}>
        <button
          className="radio-play"
          type="button"
          onClick={togglePlayback}
          disabled={!track}
          aria-label={playLabel}
          title={playLabel}
        >
          {playing || buffering ? (
            <PauseIcon aria-hidden="true" />
          ) : (
            <PlayIcon aria-hidden="true" />
          )}
        </button>
        <span className="radio-now" title={status}>
          <span className="radio-title">{track?.title ?? m.radio_title()}</span>
        </span>
        <button
          className="radio-next"
          type="button"
          onClick={next}
          disabled={!tracks.length}
          aria-label={m.radio_next()}
          title={m.radio_next()}
        >
          <SkipForwardIcon aria-hidden="true" />
        </button>
        <button
          ref={toggleButton}
          className="radio-toggle"
          type="button"
          onClick={togglePanel}
          aria-label={m.radio_title()}
          title={open ? m.radio_close() : m.radio_track()}
          aria-expanded={open}
          aria-controls="radio-panel"
        >
          {open ? <ChevronDownIcon aria-hidden="true" /> : <ListMusicIcon aria-hidden="true" />}
        </button>
      </div>
      <span className="sr-only" role="status">
        {status}
      </span>
      <div id="radio-panel" className="radio-panel" hidden={!open}>
        {tracks.length ? (
          <>
            <label htmlFor="radio-track">{m.radio_track()}</label>
            <select id="radio-track" value={track?.file ?? ''} onChange={selectTrack}>
              {index < 0 && track ? (
                <option value={track.file} disabled>
                  {track.title} ({m.radio_unavailable()})
                </option>
              ) : null}
              {tracks.map((track) => (
                <option key={track.file} value={track.file}>
                  {track.title}
                </option>
              ))}
            </select>
            <div className="radio-controls">
              <button
                type="button"
                onClick={previous}
                aria-label={m.radio_previous()}
                title={m.radio_previous()}
              >
                <SkipBackIcon aria-hidden="true" />
              </button>
              <label htmlFor="radio-volume" title={m.radio_volume()}>
                <Volume2Icon aria-hidden="true" />
                <span className="sr-only">{m.radio_volume()}</span>
              </label>
              <input
                id="radio-volume"
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={changeVolume}
                aria-valuetext={`${Math.round(volume * 100)} %`}
              />
            </div>
          </>
        ) : (
          <p>{library.isFetching ? m.radio_loading() : m.radio_empty()}</p>
        )}
        {library.isError || failed ? <p role="alert">{status}</p> : null}
        {storageFailed ? <p role="status">{m.radio_storage_error()}</p> : null}
        {!tracks.length && !library.isFetching ? (
          <button className="radio-retry" type="button" onClick={retryLibrary}>
            {m.radio_refresh()}
          </button>
        ) : null}
      </div>
    </section>
  )
}
