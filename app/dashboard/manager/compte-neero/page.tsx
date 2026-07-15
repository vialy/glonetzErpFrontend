"use client"

import { useMemo, useState } from "react"
import { CheckCircle2, Clock3, Loader2, RefreshCw, Smartphone } from "lucide-react"
import { AccountCardsSkeleton } from "@/components/loading/data-skeletons"
import { MobileBackButton } from "@/components/mobile-back-button"
import { DataLoadError } from "@/components/data-load-error"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "@/components/ui/use-toast"
import { useLocale } from "@/hooks/use-locale"
import { useWithdrawalAccounts } from "@/hooks/use-withdrawal-accounts"
import { useAuth } from "@/hooks/use-auth"
import { getApiErrorMessage } from "@/lib/api-error"
import { isApiDataProvider } from "@/lib/data-provider"
import type { TranslationKey } from "@/services/i18n"
import type { WithdrawalAccountRecord, WithdrawalProvider } from "@/domains/withdrawal-accounts/types"
import {
  addWithdrawalAccount,
  resendWithdrawalOtp,
  verifyNeeroWithdrawalAccount,
  verifyWithdrawalAccount,
  type NeeroVerifyResult,
} from "@/services/staff-withdrawal-accounts.service"
import { cn } from "@/lib/utils"

const PROVIDERS: WithdrawalProvider[] = ["neero", "mtn", "orange"]

function formatDay(iso: string, locale: "fr" | "en") {
  return new Date(iso).toLocaleDateString(locale === "en" ? "en-GB" : "fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  })
}

function providerLabel(provider: WithdrawalProvider, t: (k: TranslationKey) => string) {
  if (provider === "neero") return t("mgr_wda_provider_neero")
  if (provider === "mtn") return t("mgr_wda_provider_mtn")
  return t("mgr_wda_provider_orange")
}

function providerHint(provider: WithdrawalProvider, t: (k: TranslationKey) => string) {
  if (provider === "neero") return t("mgr_wda_hint_neero")
  if (provider === "mtn") return t("mgr_wda_hint_mtn")
  return t("mgr_wda_hint_orange")
}

function OtpVerificationCard({
  account,
  onVerified,
}: {
  account: WithdrawalAccountRecord
  onVerified: () => void
}) {
  const { t } = useLocale()
  const [otp, setOtp] = useState("")
  const [verifying, setVerifying] = useState(false)
  const [resending, setResending] = useState(false)

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault()
    if (!/^\d{6}$/.test(otp.trim())) {
      toast({ title: t("mgr_wda_otp_invalid"), variant: "destructive" })
      return
    }
    setVerifying(true)
    try {
      await verifyWithdrawalAccount(account.id, otp.trim())
      setOtp("")
      toast({ title: t("mgr_wda_otp_success") })
      onVerified()
    } catch (err) {
      toast({
        title: t("mgr_wda_otp_error"),
        description: getApiErrorMessage(err, t("mgr_wda_otp_error")),
        variant: "destructive",
      })
    } finally {
      setVerifying(false)
    }
  }

  async function handleResend() {
    setResending(true)
    try {
      await resendWithdrawalOtp(account.id)
      toast({ title: t("mgr_wda_otp_resent") })
    } catch (err) {
      toast({
        title: t("mgr_wda_otp_resend_error"),
        description: getApiErrorMessage(err, t("mgr_wda_otp_resend_error")),
        variant: "destructive",
      })
    } finally {
      setResending(false)
    }
  }

  return (
    <form onSubmit={handleVerify} className="mt-3 space-y-3 border-t border-amber-500/20 pt-3">
      <p className="text-xs text-muted-foreground">{t("mgr_wda_otp_hint")}</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label htmlFor={`otp-${account.id}`} className="text-xs">
            {t("mgr_wda_otp_label")}
          </Label>
          <Input
            id={`otp-${account.id}`}
            inputMode="numeric"
            pattern="\d{6}"
            maxLength={6}
            placeholder="000000"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="font-mono tracking-widest"
          />
        </div>
        <Button type="submit" size="sm" disabled={verifying || otp.length !== 6}>
          {verifying ? <Loader2 className="size-4 animate-spin" /> : t("mgr_wda_otp_submit")}
        </Button>
      </div>
      <Button type="button" variant="ghost" size="sm" className="h-8 px-0 text-xs" disabled={resending} onClick={() => void handleResend()}>
        {resending ? t("mgr_wda_otp_resending") : t("mgr_wda_otp_resend")}
      </Button>
    </form>
  )
}

function accountDisplayLabel(account: WithdrawalAccountRecord): string {
  return account.displayLabel ?? account.holderName ?? account.phoneNumber
}

function AccountCard({
  account,
  locale,
  onUpdated,
  onReplaced,
}: {
  account: WithdrawalAccountRecord
  locale: "fr" | "en"
  onUpdated: () => void
  onReplaced: (provider: WithdrawalProvider) => void
}) {
  const { t } = useLocale()
  const needsOtp = !account.isVerified && (account.provider === "mtn" || account.provider === "orange")
  const [replaceOpen, setReplaceOpen] = useState(false)
  const [replacing, setReplacing] = useState(false)

  async function handleReplace() {
    setReplacing(true)
    try {
      const { deactivateWithdrawalAccount } = await import("@/services/staff-withdrawal-accounts.service")
      await deactivateWithdrawalAccount(account.id)
      setReplaceOpen(false)
      toast({
        title: t("mgr_wda_replace_success"),
        description: t("mgr_wda_replace_success_hint"),
      })
      onReplaced(account.provider)
    } catch (err) {
      toast({
        title: t("mgr_wda_replace_error"),
        description: getApiErrorMessage(err, t("mgr_wda_replace_error")),
        variant: "destructive",
      })
    } finally {
      setReplacing(false)
    }
  }

  return (
    <>
      <div
        className={cn(
          "flex h-full min-w-0 flex-col rounded-xl border p-4",
          account.isVerified ? "border-emerald-500/25 bg-emerald-500/5" : "border-amber-500/25 bg-amber-500/5",
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {providerLabel(account.provider, t)}
            </p>
            <p className="mt-1 font-medium tabular-nums">{account.phoneNumber}</p>
            {account.holderName ? (
              <p className="mt-1 text-sm text-muted-foreground">{account.holderName}</p>
            ) : null}
            <p className="mt-2 truncate text-sm text-muted-foreground">{accountDisplayLabel(account)}</p>
          </div>
          {account.isVerified ? (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="size-3" />
              {t("mgr_wda_verified")}
            </span>
          ) : (
            <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-amber-500/15 px-2.5 py-0.5 text-xs font-medium text-amber-800 dark:text-amber-300">
              <Clock3 className="size-3" />
              {t("mgr_wda_pending")}
            </span>
          )}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          {t("mgr_wda_registered_on")} {formatDay(account.createdAt, locale)}
        </p>
        {needsOtp ? <OtpVerificationCard account={account} onVerified={onUpdated} /> : null}
        <div className="mt-auto pt-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full"
            onClick={() => setReplaceOpen(true)}
          >
            <RefreshCw className="mr-2 size-3.5" />
            {t("mgr_wda_replace")}
          </Button>
        </div>
      </div>

      <AlertDialog open={replaceOpen} onOpenChange={setReplaceOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("mgr_wda_replace_title")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("mgr_wda_replace_desc")
                .replace("{provider}", providerLabel(account.provider, t))
                .replace("{phone}", account.phoneNumber)}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={replacing}>{t("mgr_wda_replace_cancel")}</AlertDialogCancel>
            <AlertDialogAction
              disabled={replacing}
              onClick={(e) => {
                e.preventDefault()
                void handleReplace()
              }}
            >
              {replacing ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  {t("mgr_wda_replacing")}
                </>
              ) : (
                t("mgr_wda_replace_confirm")
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

export default function ManagerWithdrawalAccountsPage() {
  const { t, locale } = useLocale()
  const { phone: sessionPhone } = useAuth()
  const { accounts, loading, error, refresh } = useWithdrawalAccounts()
  const [provider, setProvider] = useState<WithdrawalProvider>("neero")
  const [phone, setPhone] = useState("")
  const [holderName, setHolderName] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [neeroVerified, setNeeroVerified] = useState<NeeroVerifyResult | null>(null)
  const [verifyingNeero, setVerifyingNeero] = useState(false)
  const apiMode = isApiDataProvider()

  const hasVerifiedForProvider = useMemo(() => {
    const map = new Map<WithdrawalProvider, boolean>()
    for (const p of PROVIDERS) {
      map.set(
        p,
        accounts.some((a) => a.provider === p && a.isVerified),
      )
    }
    return map
  }, [accounts])

  const canAddProvider = !hasVerifiedForProvider.get(provider)

  function handleAccountReplaced(nextProvider: WithdrawalProvider) {
    setProvider(nextProvider)
    setPhone("")
    setHolderName("")
    void refresh()
  }

  async function handleVerifyNeero() {
    const phoneNumber = phone.trim()
    if (phoneNumber.length < 6) {
      toast({ title: t("mgr_wda_err_phone"), variant: "destructive" })
      return
    }
    setVerifyingNeero(true)
    try {
      const result = await verifyNeeroWithdrawalAccount(phoneNumber)
      setNeeroVerified(result)
      toast({ title: t("mgr_wda_neero_verified"), description: result.shortInfo })
    } catch (err) {
      setNeeroVerified(null)
      toast({
        title: t("mgr_wda_neero_verify_error"),
        description: getApiErrorMessage(err, t("mgr_wda_neero_verify_error")),
        variant: "destructive",
      })
    } finally {
      setVerifyingNeero(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const phoneNumber = phone.trim()
    if (phoneNumber.length < 6) {
      toast({ title: t("mgr_wda_err_phone"), variant: "destructive" })
      return
    }
    if (provider === "neero" && !neeroVerified) {
      toast({ title: t("mgr_wda_neero_verify_first"), variant: "destructive" })
      return
    }
    if (!canAddProvider) {
      toast({ title: t("mgr_wda_err_duplicate"), variant: "destructive" })
      return
    }
    setSubmitting(true)
    try {
      const created = await addWithdrawalAccount({
        provider,
        phoneNumber,
        holderName: holderName.trim() || undefined,
      })
      setPhone("")
      setHolderName("")
      setNeeroVerified(null)
      await refresh()
      if (created.isVerified) {
        toast({ title: t("mgr_wda_success"), description: t("mgr_wda_success_verified") })
      } else {
        toast({ title: t("mgr_wda_success"), description: t("mgr_wda_success_otp") })
      }
    } catch (err) {
      toast({
        title: t("mgr_wda_error"),
        description: getApiErrorMessage(err, t("mgr_wda_error")),
        variant: "destructive",
      })
    } finally {
      setSubmitting(false)
    }
  }

  if (error && accounts.length === 0 && !loading) {
    return (
      <DataLoadError
        fullScreen
        onRetry={async () => {
          setRetrying(true)
          await refresh()
          setRetrying(false)
        }}
        retrying={retrying}
      />
    )
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-5 pb-28 md:px-6 md:pb-10">
      <MobileBackButton fallbackHref="/dashboard" />

      <header className="mb-6 space-y-2">
        <div className="flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Smartphone className="size-5" />
          </span>
          <div>
            <h1 className="text-xl font-semibold tracking-tight md:text-2xl">{t("mgr_wda_title")}</h1>
            <p className="text-sm text-muted-foreground">{t("mgr_wda_subtitle")}</p>
          </div>
        </div>
      </header>

      {!isApiDataProvider() ? (
        <p className="mb-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200">
          {t("mgr_wda_mock_hint")}
        </p>
      ) : null}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm lg:min-h-[320px]">
          <div className="border-b border-border bg-muted/30 px-4 py-4 sm:px-5">
            <h2 className="text-sm font-semibold">{t("mgr_wda_list_title")}</h2>
          </div>
          <div className="p-4 sm:p-5">
            {loading ? (
              <AccountCardsSkeleton count={2} />
            ) : accounts.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">{t("mgr_wda_empty")}</p>
            ) : (
              <div className="flex flex-row flex-wrap gap-3">
                {accounts.map((account) => (
                  <div key={account.id} className="min-w-[min(100%,280px)] flex-1 basis-[280px]">
                    <AccountCard
                      account={account}
                      locale={locale}
                      onUpdated={() => void refresh()}
                      onReplaced={handleAccountReplaced}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <form
          onSubmit={handleSubmit}
          className="space-y-4 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5 lg:sticky lg:top-4"
        >
          <h2 className="text-sm font-semibold">{t("mgr_wda_add_title")}</h2>
          <p className="text-sm leading-relaxed text-muted-foreground">{providerHint(provider, t)}</p>

          <div className="space-y-2">
            <Label>{t("mgr_wda_provider_label")}</Label>
            <div className="flex flex-row flex-wrap gap-2">
              {PROVIDERS.map((p) => {
                const active = provider === p
                const disabled = hasVerifiedForProvider.get(p)
                return (
                  <button
                    key={p}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      setProvider(p)
                      setNeeroVerified(null)
                    }}
                    className={cn(
                      "min-w-[140px] flex-1 rounded-xl border px-3 py-2.5 text-left text-sm transition-colors",
                      active ? "border-primary bg-primary/5 ring-1 ring-primary/30" : "hover:bg-muted/40",
                      disabled && "cursor-not-allowed opacity-50",
                    )}
                  >
                    <span className="font-medium">{providerLabel(p, t)}</span>
                    {disabled ? (
                      <span className="mt-0.5 block text-[10px] text-muted-foreground">{t("mgr_wda_already_active")}</span>
                    ) : null}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
            <div className="min-w-0 flex-1 space-y-2">
              <Label htmlFor="wda-phone">{t("mgr_wda_phone_label")}</Label>
              <Input
                id="wda-phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder={sessionPhone ?? "6XXXXXXXX"}
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value)
                  setNeeroVerified(null)
                }}
                required
                disabled={!canAddProvider}
              />
            </div>

            <div className="min-w-0 flex-1 space-y-2">
              <Label htmlFor="wda-holder">{t("mgr_wda_holder_label")}</Label>
              <Input
                id="wda-holder"
                type="text"
                autoComplete="name"
                placeholder={t("mgr_wda_holder_optional")}
                value={holderName}
                onChange={(e) => setHolderName(e.target.value)}
                disabled={!canAddProvider}
              />
            </div>
          </div>

          {provider === "neero" ? (
            <div className="space-y-2 rounded-xl border border-sky-500/25 bg-sky-500/5 p-3">
              {neeroVerified ? (
                <p className="flex items-center gap-2 text-sm text-emerald-700 dark:text-emerald-400">
                  <CheckCircle2 className="size-4 shrink-0" />
                  {t("mgr_wda_neero_verified_label")}: {neeroVerified.shortInfo}
                </p>
              ) : (
                <p className="text-xs text-muted-foreground">{t("mgr_wda_neero_verify_hint")}</p>
              )}
              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={verifyingNeero || !canAddProvider || phone.trim().length < 6}
                onClick={() => void handleVerifyNeero()}
              >
                {verifyingNeero ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    {t("mgr_wda_neero_verifying")}
                  </>
                ) : (
                  t("mgr_wda_neero_verify_btn")
                )}
              </Button>
            </div>
          ) : null}

          <Button
            type="submit"
            className="w-full"
            disabled={
              submitting ||
              !canAddProvider ||
              (provider === "neero" && !neeroVerified && apiMode)
            }
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                {t("mgr_wda_submitting")}
              </>
            ) : (
              t("mgr_wda_submit")
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
