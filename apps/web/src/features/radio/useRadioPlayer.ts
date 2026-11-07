import { useCallback, useRef, useState } from 'react'
import { z } from 'zod'
import type { ChangeEvent, SyntheticEvent } from 'react'
import type { RadioTrack } from './radio-library'

const volumeKey = 'booster-break-radio-volume'
const volumeSchema = z.number().min(0).max(1)

function readVolume() {
  try {
    const saved = localStorage.getItem(volumeKey)
    const volume = volumeSchema.safeParse(saved === null ? 0.35 : Number(saved))
    return volume.success ? volume.data : 0.35
  } catch {
    return 0.35
  }
}

export function useRadioPlayer(tracks: RadioTrack[]) {
  const audio = useRef<HTMLAudioElement | null>(null)
  const request = useRef(0)
  const [selectedTrack, setSelectedTrack] = useState<RadioTrack>()
  const [playing, setPlaying] = useState(false)
  const [buffering, setBuffering] = useState(false)
  const [failed, setFailed] = useState(false)
  const [volume, setVolume] = useState(readVolume)
  const [storageFailed, setStorageFailed] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const [duration, setDuration] = useState(0)
  const [shuffle, setShuffle] = useState(false)
  const [repeat, setRepeat] = useState(false)
  const [queuedFiles, setQueuedFiles] = useState<string[]>([])
  const track = selectedTrack ?? tracks[0]
  const index = tracks.findIndex((candidate) => candidate.file === track?.file)
  const queue = queuedFiles.flatMap(
    (file) => tracks.find((candidate) => candidate.file === file) ?? [],
  )
  const attachAudio = useCallback((element: HTMLAudioElement | null) => {
    if (!element) {
      request.current++
      audio.current?.pause()
    }
    audio.current = element
  }, [])

  async function playTrack(nextTrack: RadioTrack | undefined) {
    const element = audio.current
    if (!element || !nextTrack) return
    const currentRequest = ++request.current
    setFailed(false)
    setBuffering(true)
    const source = `${import.meta.env.BASE_URL}radio/${nextTrack.file}`
    if (element.getAttribute('src') !== source || element.error) {
      setElapsed(0)
      setDuration(0)
      setPlaying(false)
      element.src = source
    }
    element.volume = volume
    setSelectedTrack(nextTrack)
    try {
      await element.play()
      if (currentRequest === request.current && !element.paused) onPlaying()
    } catch {
      if (currentRequest !== request.current) return
      setFailed(true)
      setPlaying(false)
      setBuffering(false)
    }
  }

  function togglePlayback() {
    const element = audio.current
    if (!element || !track) return
    if (!element.paused || buffering) {
      request.current++
      element.pause()
      setBuffering(false)
      return
    }
    void playTrack(track)
  }

  function next() {
    const queued = queue[0]
    if (queued) {
      selectTrack(queued)
      return
    }
    if (!tracks.length) {
      setPlaying(false)
      setBuffering(false)
      return
    }
    if (shuffle && tracks.length > 1) {
      const candidates = tracks.filter((candidate) => candidate.file !== track?.file)
      selectTrack(candidates[Math.floor(Math.random() * candidates.length)])
      return
    }
    selectTrack(tracks[(index + 1) % tracks.length])
  }

  function previous() {
    if (tracks.length) {
      const previousIndex =
        index < 0 ? tracks.length - 1 : (index + tracks.length - 1) % tracks.length
      selectTrack(tracks[previousIndex])
    }
  }

  function selectTrack(nextTrack: RadioTrack) {
    if (audio.current && nextTrack.file === track?.file) {
      audio.current.currentTime = 0
      setElapsed(0)
    }
    setQueuedFiles((files) => files.filter((file) => file !== nextTrack.file))
    void playTrack(nextTrack)
  }

  function toggleQueue(file: string) {
    setQueuedFiles((files) =>
      files.includes(file) ? files.filter((entry) => entry !== file) : [...files, file],
    )
  }

  function seek(event: ChangeEvent<HTMLInputElement>) {
    const element = audio.current
    if (!element || !duration || !element.seekable.length) return
    element.currentTime = Number(event.target.value)
    setElapsed(Math.floor(element.currentTime))
  }

  function onTimeUpdate(event: SyntheticEvent<HTMLAudioElement>) {
    setElapsed(Math.floor(event.currentTarget.currentTime))
  }

  function onDurationChange(event: SyntheticEvent<HTMLAudioElement>) {
    const nextDuration = event.currentTarget.duration
    setDuration(Number.isFinite(nextDuration) ? nextDuration : 0)
  }

  function onEnded() {
    if (repeat && track) {
      selectTrack(track)
      return
    }
    next()
  }

  function changeVolume(event: ChangeEvent<HTMLInputElement>) {
    const nextVolume = Number(event.target.value)
    setVolume(nextVolume)
    if (audio.current) audio.current.volume = nextVolume
    try {
      localStorage.setItem(volumeKey, String(nextVolume))
      setStorageFailed(false)
    } catch {
      setStorageFailed(true)
    }
  }

  function onPlaying() {
    if (!audio.current || audio.current.paused) return
    setPlaying(true)
    setBuffering(false)
    setFailed(false)
  }

  function onPause(event: SyntheticEvent<HTMLAudioElement>) {
    if (!event.currentTarget.paused) return
    setPlaying(false)
  }

  function onWaiting() {
    if (!audio.current?.paused) setBuffering(true)
  }

  function onError(event: SyntheticEvent<HTMLAudioElement>) {
    // Ignore an obsolete error event after another source has already been selected.
    if (!event.currentTarget.error) return
    request.current++
    setFailed(true)
    setPlaying(false)
    setBuffering(false)
  }

  return {
    attachAudio,
    track,
    playing,
    buffering,
    failed,
    volume,
    storageFailed,
    elapsed,
    duration,
    shuffle,
    repeat,
    queue,
    toggleShuffle: () => setShuffle((value) => !value),
    toggleRepeat: () => setRepeat((value) => !value),
    toggleQueue,
    seek,
    togglePlayback,
    next,
    previous,
    selectTrack,
    changeVolume,
    onPlaying,
    onPause,
    onWaiting,
    onEnded,
    onTimeUpdate,
    onDurationChange,
    onError,
  }
}
