"use client"

import { useCallback, useEffect, useState } from "react"
import { orgApi, type OrgBillingInfo } from "@/lib/api"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { CreditCard, Users, GraduationCap } from "lucide-react"
import { cn, formatMoney } from "@/lib/utils"

const STATUS_CLS: Record<string, string> = {
  trialing: "border-sky-200 bg-sky-50 text-sky-700",
  active: "border-emerald-200 bg-emerald-50 text-emerald-700",
  past_due: "border-amber-200 bg-amber-50 text-amber-700",
  canceled: "border-slate-200 bg-slate-50 text-slate-600",
}

const PAY_STATUS_CLS: Record<string, string> = {
  paid: "text-emerald-700",
  pending: "text-slate-600",
  failed: "text-rose-700",
  refunded: "text-amber-700",
}

function formatDate(value: string | null) {
  if (!value) return "—"
  return new Date(value).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export default function OrgBillingSection() {
  const [data, setData] = useState<OrgBillingInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setError(null)
      const result = await orgApi.billing()
      setData(result)
    } catch {
      setError("Failed to load subscription data. Make sure the backend is running.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center text-sm text-slate-500">
        Loading subscription…
      </div>
    )
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-rose-600">
          {error ?? "Subscription data unavailable."}
        </CardContent>
      </Card>
    )
  }

  const { organization: org, subscription: sub, payments } = data
  const status = sub?.status ?? "trialing"

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <div className="rounded-lg bg-slate-100 p-2">
              <CreditCard className="h-5 w-5 text-slate-600" />
            </div>
            <div>
              <p className="text-xs uppercase text-slate-500">Plan</p>
              <p className="text-lg font-semibold capitalize">{sub?.plan ?? org.plan}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-5">
            <p className="text-xs uppercase text-slate-500">Status</p>
            <Badge variant="outline" className={cn("mt-1 capitalize", STATUS_CLS[status])}>
              {status.replace("_", " ")}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <Users className="h-5 w-5 text-slate-400" />
            <div>
              <p className="text-xs uppercase text-slate-500">Student limit</p>
              <p className="text-lg font-semibold">{org.limits.maxStudents}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-3 pt-5">
            <GraduationCap className="h-5 w-5 text-slate-400" />
            <div>
              <p className="text-xs uppercase text-slate-500">Teacher limit</p>
              <p className="text-lg font-semibold">{org.limits.maxTeachers}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Subscription</CardTitle>
          <CardDescription>
            {org.name} · {org.subdomain}.learnix
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs uppercase text-slate-500">Trial ends</p>
            <p className="mt-1 font-medium">
              {formatDate(sub?.trialEndsAt ?? org.trialEndsAt)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">Current period</p>
            <p className="mt-1 font-medium">
              {formatDate(sub?.currentPeriodStart)} — {formatDate(sub?.currentPeriodEnd)}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">Organization status</p>
            <p className="mt-1 font-medium capitalize">{org.status}</p>
          </div>
          <div>
            <p className="text-xs uppercase text-slate-500">Canceled at</p>
            <p className="mt-1 font-medium">{formatDate(sub?.canceledAt ?? null)}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment history</CardTitle>
          <CardDescription>Platform subscription payments for your organization</CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="text-sm text-slate-500">No payments recorded yet.</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-slate-500">
                  <th className="pb-2 pr-4">Period</th>
                  <th className="pb-2 pr-4">Amount</th>
                  <th className="pb-2 pr-4">Status</th>
                  <th className="pb-2">Paid</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-slate-100 last:border-0">
                    <td className="py-2.5 pr-4">{p.periodLabel}</td>
                    <td className="py-2.5 pr-4">
                      {formatMoney(p.amount)} {p.currency}
                    </td>
                    <td className={cn("py-2.5 pr-4 capitalize", PAY_STATUS_CLS[p.status])}>
                      {p.status}
                    </td>
                    <td className="py-2.5">{formatDate(p.paidAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
