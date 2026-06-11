"use client"

import { useCallback, useEffect, useRef, useState } from "react"

export type RecorderStatus = "idle" | "recording" | "paused" | "stopped"

function pickMimeType(): string {
  if (typeof MediaRecorder === "undefined") return "audio/webm"
  const types = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"]
  for (const type of types) {
    if (MediaRecorder.isTypeSupported(type)) return type
  }
  return "audio/webm"
}

export function useAudioRecorder() {
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const startedAtRef = useRef(0)
  const pausedTotalRef = useRef(0)
  const pauseStartedRef = useRef(0)
  const statusRef = useRef<RecorderStatus>("idle")

  const [status, setStatus] = useState<RecorderStatus>("idle")
  const setRecorderStatus = useCallback((next: RecorderStatus) => {
    statusRef.current = next
    setStatus(next)
  }, [])
  const [blob, setBlob] = useState<Blob | null>(null)
  const [objectUrl, setObjectUrl] = useState<string | null>(null)
  const objectUrlRef = useRef<string | null>(null)
  const [durationMs, setDurationMs] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
  }, [])

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }, [])

  const revokeUrl = useCallback(() => {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    objectUrlRef.current = null
    setObjectUrl(null)
  }, [])

  const reset = useCallback(async () => {
    clearTimer()
    const rec = recorderRef.current
    if (rec && rec.state !== "inactive") {
      await new Promise<void>((resolve) => {
        rec.onstop = () => resolve()
        try {
          rec.requestData()
        } catch {
          // requestData is optional for some mime types
        }
        rec.stop()
      })
    }
    recorderRef.current = null
    stopStream()
    chunksRef.current = []
    revokeUrl()
    setBlob(null)
    setDurationMs(0)
    setRecorderStatus("idle")
    setError(null)
    startedAtRef.current = 0
    pausedTotalRef.current = 0
    pauseStartedRef.current = 0
  }, [clearTimer, revokeUrl, setRecorderStatus, stopStream])

  useEffect(() => {
    return () => {
      clearTimer()
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        recorderRef.current.stop()
      }
      stopStream()
      if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current)
    }
  }, [clearTimer, stopStream])

  const start = useCallback(async () => {
    try {
      setError(null)
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Recording is not supported in this browser.")
        return false
      }
      await reset()
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      streamRef.current = stream
      const mimeType = pickMimeType()
      const recorder = new MediaRecorder(stream, { mimeType })
      chunksRef.current = []
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data)
      }
      recorderRef.current = recorder
      recorder.start(250)
      if (recorder.state !== "recording") {
        throw new Error("MediaRecorder did not start")
      }
      startedAtRef.current = Date.now()
      timerRef.current = setInterval(() => {
        const paused =
          statusRef.current === "paused" && pauseStartedRef.current
            ? Date.now() - pauseStartedRef.current
            : 0
        setDurationMs(Date.now() - startedAtRef.current - pausedTotalRef.current - paused)
      }, 200)
      setRecorderStatus("recording")
      return true
    } catch {
      setError("Microphone permission is required to record your answer.")
      setRecorderStatus("idle")
      return false
    }
  }, [reset, setRecorderStatus])

  const pause = useCallback(() => {
    const rec = recorderRef.current
    if (!rec || rec.state !== "recording") return
    try {
      rec.pause()
      pauseStartedRef.current = Date.now()
      setRecorderStatus("paused")
    } catch {
      setError("Could not pause recording.")
    }
  }, [setRecorderStatus])

  const resume = useCallback(() => {
    const rec = recorderRef.current
    if (!rec || rec.state !== "paused") return
    try {
      rec.resume()
      if (pauseStartedRef.current) {
        pausedTotalRef.current += Date.now() - pauseStartedRef.current
        pauseStartedRef.current = 0
      }
      setRecorderStatus("recording")
    } catch {
      setError("Could not resume recording.")
    }
  }, [setRecorderStatus])

  const stop = useCallback(async () => {
    const rec = recorderRef.current
    if (!rec || rec.state === "inactive") return null
    clearTimer()
    return new Promise<Blob | null>((resolve) => {
      rec.onstop = () => {
        const mime = rec.mimeType || pickMimeType()
        const nextBlob = new Blob(chunksRef.current, { type: mime })
        const url = URL.createObjectURL(nextBlob)
        objectUrlRef.current = url
        setBlob(nextBlob)
        setObjectUrl(url)
        setRecorderStatus("stopped")
        stopStream()
        recorderRef.current = null
        resolve(nextBlob)
      }
      try {
        rec.requestData()
      } catch {
        // requestData is optional for some mime types
      }
      rec.stop()
    })
  }, [clearTimer, setRecorderStatus, stopStream])

  return {
    status,
    blob,
    objectUrl,
    durationMs,
    error,
    start,
    pause,
    resume,
    stop,
    reset,
    isRecording: status === "recording",
    isPaused: status === "paused",
    hasRecording: status === "stopped" && !!blob,
  }
}
