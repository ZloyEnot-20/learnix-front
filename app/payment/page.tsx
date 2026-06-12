"use client"

import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { IELTSLogo } from "@/components/ielts-logo"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, Crown, ArrowLeft } from "lucide-react"
import Link from "next/link"

export default function PaymentPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const [selectedPlan, setSelectedPlan] = useState<"monthly" | "yearly">("monthly")

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login")
    }
    if (user?.isPremium) {
      router.push("/dashboard")
    }
  }, [user, isLoading, router])

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    )
  }

  const plans = {
    monthly: {
      price: 29.99,
      period: "month",
      savings: null,
    },
    yearly: {
      price: 299.99,
      period: "year",
      savings: "Save 17%",
    },
  }

  const features = [
    "Unlimited access to Reading tests",
    "Unlimited access to Listening tests",
    "Unlimited access to Writing tests",
    "Book Speaking test sessions",
    "Detailed performance analytics",
    "Progress tracking and insights",
    "Practice with real IELTS questions",
    "Instant scoring and feedback",
    "Study materials and resources",
    "24/7 customer support",
  ]

  const handlePayment = () => {
    // Mock payment processing - will be replaced with Stripe
    alert(`Processing payment for ${selectedPlan} plan...`)
    // Simulate successful payment
    setTimeout(() => {
      alert("Payment successful! Your account has been upgraded to Premium.")
      router.push("/dashboard")
    }, 1000)
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

      <main className="container mx-auto px-6 py-12 max-w-6xl">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 mb-4">
            <Crown className="w-8 h-8 text-yellow-600" />
            <h1 className="text-4xl font-bold">Upgrade to Premium</h1>
          </div>
          <p className="text-xl text-muted-foreground">
            Unlock all IELTS test sections and accelerate your preparation
          </p>
        </div>

        {/* Plan Selection */}
        <div className="flex justify-center gap-4 mb-12">
          <Button
            variant={selectedPlan === "monthly" ? "default" : "outline"}
            onClick={() => setSelectedPlan("monthly")}
            className={selectedPlan === "monthly" ? "bg-primary hover:bg-primary/90" : ""}
          >
            Monthly
          </Button>
          <Button
            variant={selectedPlan === "yearly" ? "default" : "outline"}
            onClick={() => setSelectedPlan("yearly")}
            className={selectedPlan === "yearly" ? "bg-primary hover:bg-primary/90" : ""}
          >
            Yearly
            {plans.yearly.savings && (
              <Badge className="ml-2 bg-green-500 hover:bg-green-600" variant="secondary">
                {plans.yearly.savings}
              </Badge>
            )}
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          {/* Pricing Card */}
          <Card className="border-2 border-primary">
            <CardHeader className="text-center pb-8">
              <div className="mb-4">
                <Crown className="w-16 h-16 mx-auto text-yellow-600" />
              </div>
              <CardTitle className="text-3xl mb-2">Premium Plan</CardTitle>
              <CardDescription>Full access to all IELTS test sections</CardDescription>
              <div className="mt-6">
                <div className="flex items-baseline justify-center gap-2">
                  <span className="text-5xl font-bold">${plans[selectedPlan].price}</span>
                  <span className="text-muted-foreground">/ {plans[selectedPlan].period}</span>
                </div>
                {selectedPlan === "yearly" && (
                  <p className="text-sm text-green-600 font-medium mt-2">Save $60 per year</p>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <Button onClick={handlePayment} className="w-full bg-primary hover:bg-primary/90 h-12 text-lg">
                Upgrade Now
              </Button>
              <p className="text-xs text-center text-muted-foreground mt-4">
                Secure payment processing. Cancel anytime.
              </p>
            </CardContent>
          </Card>

          {/* Features Card */}
          <Card>
            <CardHeader>
              <CardTitle>What's Included</CardTitle>
              <CardDescription>Everything you need to ace your IELTS exam</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3">
                {features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="mt-0.5">
                      <Check className="w-5 h-5 text-green-600" />
                    </div>
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Comparison Table */}
        <div className="mt-16 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Free vs Premium</h2>
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-4 font-semibold">Feature</th>
                      <th className="text-center p-4 font-semibold">Free</th>
                      <th className="text-center p-4 font-semibold">Premium</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    <tr>
                      <td className="p-4">Reading Tests</td>
                      <td className="text-center p-4">1 test</td>
                      <td className="text-center p-4 text-green-600 font-semibold">Unlimited</td>
                    </tr>
                    <tr>
                      <td className="p-4">Listening Tests</td>
                      <td className="text-center p-4">1 test</td>
                      <td className="text-center p-4 text-green-600 font-semibold">Unlimited</td>
                    </tr>
                    <tr>
                      <td className="p-4">Writing Tests</td>
                      <td className="text-center p-4">-</td>
                      <td className="text-center p-4 text-green-600 font-semibold">Unlimited</td>
                    </tr>
                    <tr>
                      <td className="p-4">Speaking Test Booking</td>
                      <td className="text-center p-4">-</td>
                      <td className="text-center p-4 text-green-600 font-semibold">✓</td>
                    </tr>
                    <tr>
                      <td className="p-4">Performance Analytics</td>
                      <td className="text-center p-4">Basic</td>
                      <td className="text-center p-4 text-green-600 font-semibold">Advanced</td>
                    </tr>
                    <tr>
                      <td className="p-4">Study Materials</td>
                      <td className="text-center p-4">Limited</td>
                      <td className="text-center p-4 text-green-600 font-semibold">Full Access</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* FAQ Section */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Can I cancel anytime?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Yes, you can cancel your subscription at any time. You'll continue to have access until the end of
                  your billing period.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What payment methods do you accept?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  We accept all major credit cards, debit cards, and digital payment methods through our secure payment
                  processor.
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Is there a money-back guarantee?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Yes, we offer a 7-day money-back guarantee. If you're not satisfied with Premium, contact us for a
                  full refund.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
