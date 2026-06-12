"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "@/lib/auth-context"
import { IELTSLogo } from "@/components/ielts-logo"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { ArrowLeft, Clock, User, CheckCircle2, AlertCircle } from "lucide-react"
import Link from "next/link"

interface TimeSlot {
  time: string
  available: boolean
  examiner?: string
}

export default function SpeakingBookingPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())
  const [selectedTime, setSelectedTime] = useState<string | null>(null)
  const [hasCompletedTests, setHasCompletedTests] = useState(true)

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login")
    }
    // Check if user has completed Reading, Listening, and Writing tests
    // Mock check - replace with actual logic
    // setHasCompletedTests(true)
  }, [user, isLoading, router])

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    )
  }

  // Mock time slots for the selected date
  const timeSlots: TimeSlot[] = [
    { time: "09:00 AM", available: true, examiner: "Dr. Sarah Johnson" },
    { time: "09:30 AM", available: false },
    { time: "10:00 AM", available: true, examiner: "Prof. Michael Chen" },
    { time: "10:30 AM", available: true, examiner: "Dr. Sarah Johnson" },
    { time: "11:00 AM", available: false },
    { time: "11:30 AM", available: true, examiner: "Dr. Emily Brown" },
    { time: "02:00 PM", available: true, examiner: "Prof. Michael Chen" },
    { time: "02:30 PM", available: true, examiner: "Dr. Emily Brown" },
    { time: "03:00 PM", available: false },
    { time: "03:30 PM", available: true, examiner: "Dr. Sarah Johnson" },
    { time: "04:00 PM", available: true, examiner: "Prof. Michael Chen" },
    { time: "04:30 PM", available: true, examiner: "Dr. Emily Brown" },
  ]

  const handleBooking = () => {
    if (!selectedDate || !selectedTime) {
      alert("Please select a date and time slot")
      return
    }

    const slot = timeSlots.find((s) => s.time === selectedTime)
    alert(
      `Booking confirmed!\n\nDate: ${selectedDate.toLocaleDateString()}\nTime: ${selectedTime}\nExaminer: ${slot?.examiner}\n\nYou will receive a confirmation email shortly.`,
    )
    router.push("/dashboard")
  }

  if (!hasCompletedTests) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
        <header className="bg-white border-b">
          <div className="container mx-auto px-6 py-4 flex items-center justify-between">
            <IELTSLogo />
            <Link href="/dashboard">
              <Button variant="outline">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </header>

        <main className="container mx-auto px-6 py-12 max-w-2xl">
          <Card className="border-orange-500">
            <CardHeader>
              <div className="flex items-center gap-3 mb-2">
                <AlertCircle className="w-8 h-8 text-orange-500" />
                <CardTitle>Complete Other Tests First</CardTitle>
              </div>
              <CardDescription>
                You need to complete the Reading, Listening, and Writing tests before booking a Speaking test session.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 mb-6">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span>Reading Test - Not Completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span>Listening Test - Not Completed</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span>Writing Test - Not Completed</span>
                </div>
              </div>
              <Link href="/dashboard">
                <Button className="w-full bg-primary hover:bg-primary/90">Go to Dashboard</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="bg-white border-b">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <IELTSLogo />
          <Link href="/dashboard">
            <Button variant="outline">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-6 py-8 max-w-6xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Book Speaking Test Session</h1>
          <p className="text-muted-foreground">Schedule a one-on-one speaking test with a certified IELTS examiner</p>
        </div>

        {/* Test Information */}
        <Card className="mb-8 bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Speaking Test Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Duration</p>
                <p className="font-semibold">11-14 minutes</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Format</p>
                <p className="font-semibold">3 parts (Interview, Speech, Discussion)</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Mode</p>
                <p className="font-semibold">Video Call</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Calendar Section */}
          <Card>
            <CardHeader>
              <CardTitle>Select Date</CardTitle>
              <CardDescription>Choose a date for your speaking test</CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                disabled={(date) => date < new Date() || date > new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)}
                className="rounded-md border"
              />
            </CardContent>
          </Card>

          {/* Time Slots Section */}
          <Card>
            <CardHeader>
              <CardTitle>Available Time Slots</CardTitle>
              <CardDescription>
                {selectedDate ? selectedDate.toLocaleDateString() : "Select a date to view available slots"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {selectedDate ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {timeSlots.map((slot) => (
                    <button
                      key={slot.time}
                      onClick={() => slot.available && setSelectedTime(slot.time)}
                      disabled={!slot.available}
                      className={`w-full p-4 rounded-lg border-2 text-left transition-all ${
                        selectedTime === slot.time
                          ? "border-primary bg-primary/5"
                          : slot.available
                            ? "border-gray-200 hover:border-gray-300 bg-white"
                            : "border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Clock className="w-5 h-5" />
                          <div>
                            <p className="font-semibold">{slot.time}</p>
                            {slot.available && slot.examiner && (
                              <p className="text-sm text-muted-foreground flex items-center gap-1">
                                <User className="w-3 h-3" />
                                {slot.examiner}
                              </p>
                            )}
                          </div>
                        </div>
                        {slot.available ? (
                          <Badge variant="secondary" className="bg-green-100 text-green-700">
                            Available
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-gray-200 text-gray-600">
                            Booked
                          </Badge>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>Please select a date to view available time slots</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Booking Summary */}
        {selectedDate && selectedTime && (
          <Card className="mt-8 border-primary">
            <CardHeader>
              <CardTitle>Booking Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-3 gap-6 mb-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Date</p>
                  <p className="font-semibold">{selectedDate.toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Time</p>
                  <p className="font-semibold">{selectedTime}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Examiner</p>
                  <p className="font-semibold">{timeSlots.find((s) => s.time === selectedTime)?.examiner}</p>
                </div>
              </div>
              <Button onClick={handleBooking} className="w-full bg-primary hover:bg-primary/90 h-12 text-lg">
                Confirm Booking
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Important Notes */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Important Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Please join the video call 5 minutes before your scheduled time</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Ensure you have a stable internet connection and a quiet environment</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>You can reschedule or cancel up to 24 hours before your appointment</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>A confirmation email with the video call link will be sent to you</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>Have a valid ID ready for verification at the start of the test</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
