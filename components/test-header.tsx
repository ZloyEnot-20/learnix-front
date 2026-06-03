"use client"

import { IELTSLogo } from "./ielts-logo"
import { Wifi, Bell, Menu } from "lucide-react"
import { Button } from "@/components/ui/button"

interface TestHeaderProps {
  testTakerId?: string
  showAudioIndicator?: boolean
  timer?: string
  onHelp?: () => void
  onHide?: () => void
}

export function TestHeader({
  testTakerId = "Test taker ID",
  showAudioIndicator = false,
  timer,
  onHelp,
  onHide,
}: TestHeaderProps) {
  return (
    <header
      className={`flex items-center justify-between px-6 py-4 border-b ${timer ? "bg-[#2C2C2C] text-white" : "bg-white"}`}
    >
      <div className="flex items-center gap-4">
        <IELTSLogo />
        <div className="flex items-center gap-2">
          <span className={timer ? "text-white" : "text-foreground"}>{testTakerId}</span>
          {showAudioIndicator && (
            <div className="flex items-center gap-1 text-sm">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span>Audio is playing</span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-4">
        {timer && (
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 bg-white/20 rounded" />
            <span className="font-semibold">{timer}</span>
          </div>
        )}
        {onHelp && onHide && (
          <div className="flex gap-2">
            <Button
              onClick={onHelp}
              variant="secondary"
              size="sm"
              className="bg-[#5B9BD5] text-white hover:bg-[#4A8AC4]"
            >
              Help ?
            </Button>
            <Button
              onClick={onHide}
              variant="secondary"
              size="sm"
              className="bg-[#7F7F7F] text-white hover:bg-[#6E6E6E]"
            >
              Hide
            </Button>
          </div>
        )}
        {!timer && (
          <>
            <Wifi className="w-5 h-5" />
            <Bell className="w-5 h-5" />
            <Menu className="w-5 h-5" />
          </>
        )}
      </div>
    </header>
  )
}
