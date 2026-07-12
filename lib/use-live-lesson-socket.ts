"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { io, type Socket } from "socket.io-client"
import { getAccessToken } from "@/lib/api-client"
import { BACKEND_URL } from "@/lib/env"
import type { LiveLessonState } from "@/lib/books/types"

type PresencePatch = {
  sessionId: string
  studentId: string
  status: string
  progress?: number
  score?: number | null
  lastSeenAt?: string
  persisted?: boolean
}

type LessonSocketHandlers = {
  onState?: (state: LiveLessonState) => void
  onPresence?: (patch: PresencePatch) => void
  onError?: (message: string) => void
}

type Role = "teacher" | "student"

/**
 * Socket.IO for a live lesson room.
 * Teacher: lesson:subscribe · Student: lesson:join { sessionId }
 */
export function useLiveLessonSocket(
  sessionId: string | null,
  handlers: LessonSocketHandlers = {},
  options: { role?: Role } = {},
) {
  const { role = "teacher" } = options
  const [connected, setConnected] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  useEffect(() => {
    if (!sessionId) return

    const token = getAccessToken()
    if (!token) return

    const socket = io(BACKEND_URL, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
      auth: { token },
      autoConnect: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 8000,
    })
    socketRef.current = socket

    socket.on("connect", () => {
      setConnected(true)
      if (role === "student") {
        socket.emit("lesson:join", { sessionId })
      } else {
        socket.emit("lesson:subscribe", { sessionId })
      }
    })
    socket.on("disconnect", () => setConnected(false))
    socket.on("lesson:state", (state: LiveLessonState) => {
      handlersRef.current.onState?.(state)
    })
    socket.on("lesson:presence", (patch: PresencePatch) => {
      handlersRef.current.onPresence?.(patch)
    })
    socket.on("lesson:error", (payload: { message?: string }) => {
      handlersRef.current.onError?.(payload?.message ?? "Live lesson error")
    })

    return () => {
      socket.removeAllListeners()
      socket.disconnect()
      socketRef.current = null
      setConnected(false)
    }
  }, [sessionId, role])

  const emit = useCallback((event: string, payload?: unknown) => {
    socketRef.current?.emit(event, payload)
  }, [])

  return { connected, emit, socket: socketRef }
}
