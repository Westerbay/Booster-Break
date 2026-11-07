import { useRef, useState, type KeyboardEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  ChevronDownIcon,
  MinusIcon,
  PauseIcon,
  PlayIcon,
  PlusIcon,
  RadioIcon,
  Repeat1Icon,
  SearchIcon,
  ShuffleIcon,
  SkipBackIcon,
  SkipForwardIcon,
  Volume2Icon,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { useLocale } from '@/features/i18n/useLocale'
import { m } from '@/paraglide/messages'
import { fetchRadioLibrary, radioRefreshIntervalMs, type RadioTrack } from './radio-library'
import { useRadioPlayer } from './useRadioPlayer'
import './radio.css'

const emptyTracks: RadioTrack[] = []

function formatTrackTime(seconds: number) {
  const minutes = Math.floor(seconds / 60)
  const remainder = Math.floor(seconds % 60)
  return `${minutes}:${String(remainder).padStart(2, '0')}`
}

export function RadioPlayer() {
  const { locale } = useLocale()
  const [open, setOpen] = useState(false)
  const [showQueue, setShowQueue] = useState(false)
  const [search, setSearch] = useState('')
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
    track,
    playing,
    buffering,
    failed,
    duration,
    elapsed,
    queue,
    attachAudio,
    onEnded,
    onPlaying,
    onPause,
    onWaiting,
    onError,
    onTimeUpdate,
    onDurationChange,
    togglePlayback,
    next,
    seek,
    toggleShuffle,
    shuffle,
    previous,
    toggleRepeat,
    repeat,
    volume,
    changeVolume,
    selectTrack,
    toggleQueue,
    storageFailed,
  } = useRadioPlayer(tracks)
  const busy = playing || buffering
  const playLabel = busy ? m.radio_pause() : m.radio_play()
  const toggleLabel = open ? m.radio_close() : m.radio_open()
  const PlayStateIcon = busy ? PauseIcon : PlayIcon
  const currentTime = formatTrackTime(elapsed)
  const totalTime = duration ? formatTrackTime(duration) : '–:–'
  const query = search.trim().toLocaleLowerCase(locale)
  const visibleTracks = showQueue
    ? queue
    : tracks.filter((entry) => entry.title.toLocaleLowerCase(locale).includes(query))
  const queuedFiles = new Set(queue.map((entry) => entry.file))

  let status = playing ? m.radio_playing() : m.radio_paused()
  if (buffering) status = m.radio_buffering()
  if (failed) status = m.radio_playback_error()
  if (library.isError) status = m.radio_load_error()

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

  return (
    <section className="radio-player" aria-label={m.radio_title()} onKeyDown={handleKeyDown}>
      <audio
        ref={attachAudio}
        preload="none"
        onEnded={onEnded}
        onPlaying={onPlaying}
        onPause={onPause}
        onWaiting={onWaiting}
        onError={onError}
        onTimeUpdate={onTimeUpdate}
        onDurationChange={onDurationChange}
      />

      <Button
        ref={toggleButton}
        className="radio-toggle"
        size="icon-lg"
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label={toggleLabel}
        title={toggleLabel}
        aria-expanded={open}
        aria-controls="radio-panel"
        data-playing={playing}
      >
        {open ? (
          <ChevronDownIcon className="size-5" aria-hidden="true" />
        ) : (
          <RadioIcon className="size-5" aria-hidden="true" />
        )}
      </Button>

      <div id="radio-panel" className="radio-panel" hidden={!open}>
        <header className="radio-panel-header">
          <h2>{m.radio_title()}</h2>
        </header>
        {track ? (
          <div className="radio-playback">
            <strong className="radio-title">{track.title}</strong>
            {!failed && !library.isError ? (
              <span className="radio-status" role="status">
                {status}
              </span>
            ) : null}
            <input
              type="range"
              min="0"
              max={Math.max(1, Math.floor(duration))}
              step="1"
              value={Math.min(elapsed, Math.floor(duration))}
              disabled={duration < 1}
              onChange={seek}
              aria-label={m.radio_position()}
              aria-valuetext={m.radio_position_value({ current: currentTime, total: totalTime })}
            />
            <div className="radio-times" aria-hidden="true">
              <span>{currentTime}</span>
              <span>{totalTime}</span>
            </div>
            <div className="radio-transport">
              <Button
                variant="ghost"
                size="icon-lg"
                type="button"
                onClick={toggleShuffle}
                disabled={tracks.length < 2}
                aria-label={m.radio_shuffle()}
                aria-pressed={shuffle}
                title={m.radio_shuffle()}
              >
                <ShuffleIcon aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon-lg"
                type="button"
                onClick={previous}
                disabled={!tracks.length}
                aria-label={m.radio_previous()}
                title={m.radio_previous()}
              >
                <SkipBackIcon aria-hidden="true" />
              </Button>
              <Button
                size="icon-lg"
                type="button"
                onClick={togglePlayback}
                aria-label={playLabel}
                title={playLabel}
              >
                <PlayStateIcon aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon-lg"
                type="button"
                onClick={next}
                disabled={!tracks.length}
                aria-label={m.radio_next()}
                title={m.radio_next()}
              >
                <SkipForwardIcon aria-hidden="true" />
              </Button>
              <Button
                variant="ghost"
                size="icon-lg"
                type="button"
                onClick={toggleRepeat}
                aria-label={m.radio_repeat()}
                aria-pressed={repeat}
                title={m.radio_repeat()}
              >
                <Repeat1Icon aria-hidden="true" />
              </Button>
            </div>
            <div className="radio-volume">
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
              <span aria-hidden="true">{Math.round(volume * 100)} %</span>
            </div>
          </div>
        ) : null}
        {tracks.length ? (
          <div className="radio-library">
            <div className="radio-library-controls">
              <Button
                variant="ghost"
                size="lg"
                type="button"
                aria-pressed={!showQueue}
                onClick={() => setShowQueue(false)}
              >
                {m.radio_library()} <span>{tracks.length}</span>
              </Button>
              <Button
                variant="ghost"
                size="lg"
                type="button"
                aria-pressed={showQueue}
                onClick={() => setShowQueue(true)}
              >
                {m.radio_queue()} <span>{queue.length}</span>
              </Button>
            </div>
            {!showQueue ? (
              <label className="radio-search">
                <SearchIcon aria-hidden="true" />
                <span className="sr-only">{m.radio_search()}</span>
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={m.radio_search()}
                />
              </label>
            ) : null}
            {visibleTracks.length ? (
              <ul className="radio-track-list">
                {visibleTracks.map((entry) => {
                  const queued = queuedFiles.has(entry.file)
                  const QueueIcon = queued ? MinusIcon : PlusIcon
                  const queueLabel = queued
                    ? m.radio_remove_queue({ name: entry.title })
                    : m.radio_add_queue({ name: entry.title })
                  return (
                    <li key={entry.file} data-current={entry.file === track?.file}>
                      <Button
                        variant="ghost"
                        type="button"
                        className="radio-track"
                        aria-current={entry.file === track?.file ? 'true' : undefined}
                        onClick={() => selectTrack(entry)}
                      >
                        {entry.title}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-lg"
                        type="button"
                        onClick={() => toggleQueue(entry.file)}
                        aria-label={queueLabel}
                        title={queueLabel}
                      >
                        <QueueIcon aria-hidden="true" />
                      </Button>
                    </li>
                  )
                })}
              </ul>
            ) : (
              <p className="radio-message">
                {showQueue ? m.radio_queue_empty() : m.radio_no_matches()}
              </p>
            )}
          </div>
        ) : library.isError ? null : (
          <p className="radio-message">
            {library.isFetching ? m.radio_loading() : m.radio_empty()}
          </p>
        )}
        {library.isError || failed ? (
          <p className="radio-message" role="alert">
            {status}
          </p>
        ) : null}
        {storageFailed ? (
          <p className="radio-message" role="status">
            {m.radio_storage_error()}
          </p>
        ) : null}
        {!tracks.length && !library.isFetching ? (
          <Button
            className="m-3 mt-0"
            variant="outline"
            size="lg"
            type="button"
            onClick={() => void library.refetch()}
          >
            {m.radio_refresh()}
          </Button>
        ) : null}
      </div>
    </section>
  )
}
