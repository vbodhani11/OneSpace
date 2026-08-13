# OneSpace ✦

**OneSpace** is a personal productivity app built for people who want one clean place to manage their tasks, journal their thoughts, and stay on top of their schedule — all wrapped in a beautiful dark space-themed UI.

🔗 **Live App:** [https://onespaceapp.netlify.app](https://onespaceapp.netlify.app/login)

---

## What You Can Do

- **Dashboard** — See your active tasks floating in your personal space. Drag and drop tasks into the bin to mark them complete.
- **Tasks** — Create, manage, and organize your tasks with priorities and due dates.
- **Calendar** — Visualize your schedule and keep track of upcoming events.
- **Journal** — Write private journal entries to capture thoughts, ideas, or daily reflections.
- **Profile & Settings** — Customize your experience and manage your account.
- **Invite System** — Invite collaborators with email-bound links that expire after seven days.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript |
| Build Tool | Vite |
| Styling | Tailwind CSS |
| Animations | Framer Motion |
| Drag & Drop | dnd-kit |
| Backend & Auth | Supabase |
| Forms | React Hook Form + Zod |
| Routing | React Router v7 |
| Deployment | Netlify |

---

## Project Structure

```
src/
├── components/       # Reusable UI components
├── contexts/         # Auth and Theme context providers
├── hooks/            # Custom React hooks
├── lib/              # Supabase client and utilities
├── pages/            # App pages (Dashboard, Tasks, Calendar, Journal, etc.)
├── types/            # TypeScript type definitions
└── main.tsx          # App entry point
```

---

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anonymous/public API key |

The `send-space-invite` Edge Function also requires `RESEND_API_KEY`. Set `APP_URL`
and `RESEND_FROM_EMAIL` for the deployed environment instead of relying on local
defaults.

---

## Development checks

```bash
npm ci
npm run check
```

`npm run check` runs ESLint, the Vitest security/UI suite, TypeScript, and the
production build. GitHub Actions runs the same command for every pull request.

## Database changes

Supabase schema changes are versioned under `supabase/migrations`. Apply the
collaboration-security migration before deploying frontend code that uses tokenized
invitations. Review and test it in a local or preview database first; do not apply it
directly to production without a backup and rollout plan.

---

## License

No license is granted for redistribution.
