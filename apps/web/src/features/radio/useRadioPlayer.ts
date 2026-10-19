import { useCallback, useRef, useState } from 'react'
import type { ChangeEvent, SyntheticEvent } from 'react'
import type { RadioTrack } from './radio-library'

const volumeKey = 'booster-break-radio-volume'

function readVolume() {
  try {
    const saved = localStorage.getItem(volumeKey)
    const volume = saved === null ? 0.35 : Number(saved)
    return Number.isFinite(volume) && volume >= 0 && volume <= 1 ? volume : 0.35
  } catch {
    return 0.35
  }
}

export function useRadioPlayer(tracks: RadioTrack[]) {
  const audio = useRef<HTMLAudioElement | null>(null)
  const request = useRef(0)
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [buffering, setBuffering] = useState(false)
  const [failed, setFailed] = useState(false)
  const [volume, setVolume] = useState(readVolume)
  const [storageFailed, setStorageFailed] = useState(false)
  const track = tracks[index]
  const attachAudio = useCallback((element: HTMLAudioElement | null) => {
    if (!element) {
      request.current++
      audio.current?.pause()
    }
    audio.current = element
  }, [])

  async function playTrack(nextIndex: number) {
    const element = audio.current
    const nextTrack = tracks[nextIndex]
    if (!element || !nextTrack) return
    const currentRequest = ++request.current
    setFailed(false)
    setBuffering(true)
    const source = `${import.meta.env.BASE_URL}radio/${nextTrack.file}`
    if (element.getAttribute('src') !== source || element.error) element.src = source
    element.volume = volume
    setIndex(nextIndex)
    try {
      await element.play()
    } catch {
      if (currentRequest !== request.current) return
      setFailed(true)
      setPlaying(false)
      setBuffering(false)
    }
  }

  function togglePlayback() {
    const element = audio.current
    if (!element || !tracks.length) return
    if (!element.paused || buffering) {
      request.current++
      element.pause()
      setBuffering(false)
      return
    }
    void playTrack(index)
  }

  function next() {
    if (tracks.length) {
      if (audio.current) audio.current.currentTime = 0
      void playTrack((index + 1) % tracks.length)
    }
  }

  function previous() {
    if (tracks.length) {
      if (audio.current) audio.current.currentTime = 0
      void playTrack((index + tracks.length - 1) % tracks.length)
    }
  }

  function selectTrack(event: ChangeEvent<HTMLSelectElement>) {
    void playTrack(Number(event.target.value))
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
    setPlaying(true)
    setBuffering(false)
    setFailed(false)
  }

  function onPause() {
    setPlaying(false)
  }

  function onWaiting() {
    setBuffering(true)
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
  }
}
