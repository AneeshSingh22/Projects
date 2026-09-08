"use client"

import { useActionState } from "react"
import { authenticate, type AuthState } from "./actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const INITIAL: AuthState = { step: "email", email: "" }

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(authenticate, INITIAL)
  const onCodeStep = state.step === "code"

  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Plate</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          {onCodeStep
            ? "Enter the 6-digit code from your email."
            : "Sign in with your email address."}
        </p>

        <form action={formAction} className="mt-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              readOnly={onCodeStep}
              defaultValue={state.email}
              placeholder="you@example.com"
            />
          </div>

          {onCodeStep && (
            <div className="space-y-2">
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                name="code"
                // inputMode numeric + one-time-code lets iOS offer the code
                // straight from the notification, which is most of the reason
                // codes beat magic links on a phone.
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                pattern="\d{6}"
                required
                autoFocus
                placeholder="123456"
              />
            </div>
          )}

          {state.error && (
            <p role="alert" className="text-destructive text-sm">
              {state.error}
            </p>
          )}
          {state.notice && !state.error && (
            <p className="text-muted-foreground text-sm">{state.notice}</p>
          )}

          <Button
            type="submit"
            name="intent"
            value={onCodeStep ? "verify" : "send"}
            className="w-full"
            disabled={pending}
          >
            {pending ? "Working…" : onCodeStep ? "Sign in" : "Email me a code"}
          </Button>

          {onCodeStep && (
            <Button
              type="submit"
              name="intent"
              value="reset"
              variant="ghost"
              className="w-full"
              disabled={pending}
            >
              Use a different email
            </Button>
          )}
        </form>
      </div>
    </main>
  )
}
