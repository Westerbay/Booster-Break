import { useId, useState, type FormEvent, type MouseEvent } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { LogInIcon, LogOutIcon, UserIcon } from 'lucide-react'
import type { AuthMeResponse } from '@tcg-collection/shared'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { toast } from '@/features/toast/toast-store'
import { useDevLoginMutationOption } from '@/lib/mutations/auth'
import { m } from '@/paraglide/messages'
import { fetchAuthProviders, fetchHealth, getApiUrl } from '../lib/api'
import { GithubIcon } from './GithubIcon'
import { SlackIcon } from './SlackIcon'

interface AuthNavCardProps {
  auth?: AuthMeResponse
  isPending: boolean
  onLogout: () => void
  isLoggingOut: boolean
}

export function AuthNavCard({ auth, isPending, onLogout, isLoggingOut }: AuthNavCardProps) {
  const [isStartingSignIn, setIsStartingSignIn] = useState(false)
  const authProviders = useQuery({
    queryKey: ['auth', 'providers'],
    queryFn: fetchAuthProviders,
    enabled: !auth?.authenticated,
    retry: false,
    staleTime: Infinity,
  })

  const handleOAuthSignIn = async (provider: 'slack' | 'github') => {
    if (isStartingSignIn) {
      return
    }

    setIsStartingSignIn(true)

    try {
      await fetchHealth()
      window.location.assign(getApiUrl(`/auth/${provider}/start`))
    } catch {
      toast.show(m.api_unable_reach())
      setIsStartingSignIn(false)
    }
  }

  if (isPending) {
    return (
      <div className="flex h-11 items-center gap-2 px-2" aria-hidden="true">
        <div className="size-7 rounded-md bg-sidebar-foreground/12" />
        <div className="h-2.5 w-16 rounded-sm bg-sidebar-foreground/18" />
      </div>
    )
  }

  if (!auth?.authenticated) {
    if (authProviders.data?.developmentAuthEnabled) {
      return <DevelopmentAuthForm />
    }

    return <SignInDialog onSignIn={handleOAuthSignIn} isStartingSignIn={isStartingSignIn} />
  }

  const playerName = auth.user.displayName ?? auth.user.pseudo
  const logoutLabel = isLoggingOut ? m.auth_signing_out() : m.auth_sign_out()

  return (
    <div className="flex min-w-0 items-center justify-between gap-1">
      <div className="flex min-w-0 items-center gap-2 pl-2">
        {auth.user.avatarUrl ? (
          <img
            src={auth.user.avatarUrl}
            alt=""
            className="size-7 shrink-0 rounded-[2px] object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex size-7 shrink-0 items-center justify-center rounded-[2px] border border-sidebar-border bg-secondary text-primary">
            <UserIcon className="size-4" aria-hidden="true" />
          </div>
        )}

        <p className="truncate text-sm font-semibold" title={playerName}>
          {playerName}
        </p>
      </div>

      <Button
        type="button"
        variant="ghost"
        size="icon-lg"
        aria-label={logoutLabel}
        title={logoutLabel}
        onClick={onLogout}
        disabled={isLoggingOut}
      >
        <LogOutIcon aria-hidden="true" />
      </Button>
    </div>
  )
}

function DevelopmentAuthForm() {
  const [devPseudo, setDevPseudo] = useState('')
  const devPseudoInputId = useId()
  const queryClient = useQueryClient()
  const devLoginMutation = useMutation(useDevLoginMutationOption(queryClient))

  const handleDevLoginSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const pseudo = devPseudo.trim()

    if (!pseudo || devLoginMutation.isPending) {
      return
    }

    devLoginMutation.mutate(pseudo, {
      onError: () => {
        toast.show(m.auth_dev_login_failed())
      },
      onSuccess: () => {
        setDevPseudo('')
      },
    })
  }

  const loginLabel = devLoginMutation.isPending ? m.auth_dev_logging_in() : m.auth_dev_login()

  return (
    <form className="grid grid-cols-[minmax(0,1fr)_auto] gap-1" onSubmit={handleDevLoginSubmit}>
      <label htmlFor={devPseudoInputId} className="sr-only">
        {m.auth_dev_pseudo_label()}
      </label>
      <input
        id={devPseudoInputId}
        type="text"
        value={devPseudo}
        placeholder={m.auth_dev_pseudo_placeholder()}
        autoComplete="nickname"
        autoCapitalize="none"
        className="h-11 min-w-0 rounded-md border border-sidebar-border bg-sidebar px-2 text-base text-sidebar-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-sidebar-ring md:text-sm"
        disabled={devLoginMutation.isPending}
        onChange={(event) => setDevPseudo(event.target.value)}
      />
      <Button
        type="submit"
        variant="outline"
        size="icon-lg"
        aria-label={loginLabel}
        title={loginLabel}
        disabled={!devPseudo.trim() || devLoginMutation.isPending}
      >
        <LogInIcon aria-hidden="true" />
      </Button>
    </form>
  )
}

interface SignInDialogProps {
  isStartingSignIn: boolean
  onSignIn: (provider: 'slack' | 'github') => void | Promise<void>
}

function SignInDialog({ isStartingSignIn, onSignIn }: SignInDialogProps) {
  const handleSlackSignInClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    void onSignIn('slack')
  }

  const handleGithubSignInClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault()
    void onSignIn('github')
  }

  return (
    <Dialog>
      <DialogTrigger
        render={<Button variant="outline" size="lg" className="w-full justify-start px-2" />}
      >
        <LogInIcon aria-hidden="true" />
        {m.auth_open_sign_in()}
      </DialogTrigger>
      <DialogContent closeLabel={m.auth_close_sign_in()} className="gap-5 p-5 sm:max-w-xl sm:p-6">
        <DialogHeader className="pr-8">
          <DialogTitle className="text-xl font-black">{m.auth_sign_in()}</DialogTitle>
          <DialogDescription>{m.auth_choose_provider()}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <a
            href={getApiUrl('/auth/slack/start')}
            onClick={handleSlackSignInClick}
            aria-disabled={isStartingSignIn}
            className="group flex min-h-44 cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card p-5 text-center text-card-foreground shadow-sm transition-[transform,box-shadow,border-color,background-color] duration-200 hover:-translate-y-0.5 hover:border-foreground/25 hover:bg-muted/45 hover:shadow-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-0 aria-disabled:pointer-events-none aria-disabled:opacity-60 motion-reduce:transform-none motion-reduce:transition-none"
          >
            <span className="flex size-20 items-center justify-center rounded-xl bg-background ring-1 ring-border transition-transform duration-200 group-hover:scale-105 motion-reduce:transform-none motion-reduce:transition-none">
              <SlackIcon className="size-14" />
            </span>
            <span className="flex flex-col gap-1">
              <span className="text-base font-black">Slack</span>
              <span className="text-xs font-semibold text-muted-foreground">
                {isStartingSignIn ? m.auth_signing_in() : m.auth_sign_in_slack()}
              </span>
            </span>
          </a>
          <a
            href={getApiUrl('/auth/github/start')}
            onClick={handleGithubSignInClick}
            aria-disabled={isStartingSignIn}
            className="group flex min-h-44 cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border border-border bg-card p-5 text-center text-card-foreground shadow-sm transition-[transform,box-shadow,border-color,background-color] duration-200 hover:-translate-y-0.5 hover:border-foreground/25 hover:bg-muted/45 hover:shadow-md focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-0 aria-disabled:pointer-events-none aria-disabled:opacity-60 motion-reduce:transform-none motion-reduce:transition-none"
          >
            <span className="flex size-20 items-center justify-center rounded-xl bg-background ring-1 ring-border transition-transform duration-200 group-hover:scale-105 motion-reduce:transform-none motion-reduce:transition-none">
              <GithubIcon className="size-14" />
            </span>
            <span className="flex flex-col gap-1">
              <span className="text-base font-black">GitHub</span>
              <span className="text-xs font-semibold text-muted-foreground">
                {isStartingSignIn ? m.auth_signing_in() : m.auth_sign_in_github()}
              </span>
            </span>
          </a>
        </div>
      </DialogContent>
    </Dialog>
  )
}
