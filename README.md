# PLH Command Center

A mobile-first construction project management app for a solo project coordinator managing 7+ residential builds simultaneously. Replaces scattered Google Sheets with a unified system that surfaces priorities, tracks follow-ups automatically, prevents tasks from dying in "waiting" status, and generates boss-ready exports.

**Single user. No billing. No real-time. MVP.**

## Live Demo

- **Production:** https://plh-command-center-oqpv.vercel.app
- **Repository:** https://github.com/justinrivera47/plh-command-center

---

## Tech Stack

| Layer | Tech | Purpose |
|-------|------|---------|
| Framework | React 18 + TypeScript | UI |
| Build | Vite | Fast dev + builds |
| Styling | Tailwind CSS | Utility-first, mobile-first |
| UI Primitives | Radix UI | Accessible headless components |
| Server State | TanStack Query | Caching, refetching, optimistic updates |
| UI State | Zustand | Lightweight global UI state |
| Forms | React Hook Form + Zod | Validation, type-safe schemas |
| Routing | React Router v6 | Browser history routing |
| Backend / DB | Supabase | Auth, Postgres, Row Level Security |
| Hosting | Vercel | Auto-deploy on push |
| Export | SheetJS (xlsx) | Client-side .xlsx generation |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Supabase account

### Installation

```bash
# Clone the repository
git clone https://github.com/justinrivera47/plh-command-center.git
cd plh-command-center

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env

# Add your Supabase credentials to .env
# VITE_SUPABASE_URL=your_supabase_url
# VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Start development server
npm run dev
```

### Supabase Setup

1. Create a new Supabase project
2. Go to SQL Editor
3. Run the contents of `supabase/schema.sql`
4. Enable Row Level Security (already in schema)
5. Configure Authentication:
   - Enable Email provider
   - Add your Vercel URL to Redirect URLs: `https://your-app.vercel.app/**`
   - Add localhost for development: `http://localhost:5173/**`

---

## Project Structure

```
plh-command-center/
├── public/
├── src/
│   ├── components/
│   │   ├── auth/           # Login, SignUp pages
│   │   ├── layout/         # AppShell, Header, BottomTabBar, Sidebar
│   │   ├── onboarding/     # Onboarding wizard steps
│   │   ├── war-room/       # War Room view + TaskCard
│   │   ├── projects/       # Project list + detail
│   │   ├── quotes/         # Quote tracker
│   │   ├── vendors/        # Vendor database
│   │   ├── quick-entry/    # FAB + entry forms
│   │   ├── messages/       # Message composer
│   │   ├── boss-view/      # Boss view + export
│   │   ├── settings/       # Settings page
│   │   └── shared/         # Reusable components
│   ├── hooks/              # Custom React hooks
│   ├── lib/                # Utilities, types, constants
│   └── stores/             # Zustand stores
├── supabase/
│   └── schema.sql          # Database schema
└── ...config files
```

---

## Features

### Core Views

- **War Room** (`/war-room`) - Priority dashboard showing all tasks needing attention
- **Projects** (`/projects`) - List of all projects with expandable details
- **Quotes** (`/quotes`) - Quote comparison tracker by trade/project
- **Vendors** (`/vendors`) - Vendor database with contact info and ratings

### Key Functionality

- **Quick Entry FAB** - Fast data entry for quotes, status updates, RFIs, calls, vendors
- **Inline Editing** - Edit any field in place with auto-save
- **Stall Detection** - Automatic prompts when tasks aren't moving
- **Follow-up Tracking** - Visual indicators for overdue follow-ups
- **Blocking Chain** - Track which tasks are blocking others
- **Message Templates** - Pre-built templates for common communications
- **Boss View** - Executive summary with project health indicators
- **Excel Export** - Generate .xlsx reports for stakeholders

---

## Database Schema

### Core Tables

| Table | Purpose |
|-------|---------|
| `user_profiles` | User settings and preferences |
| `projects` | Construction projects |
| `vendors` | Vendor/subcontractor database |
| `rfis` | Tasks and RFIs (Request for Information) |
| `quotes` | Quote tracking per trade/vendor |
| `trade_categories` | Reference list of trades (31 seeded) |
| `message_templates` | Communication templates (8 seeded) |
| `change_log` | Audit trail for all changes |
| `rfi_activity_log` | Status change history for RFIs |

### Status Enums

**Project Status:** `active` → `on_hold` → `completed` → `archived`

**RFI Status:** `open` → `waiting_on_client` | `waiting_on_vendor` | `waiting_on_contractor` | `waiting_on_me` → `completed` | `dead`

**Quote Status:** `pending` → `quoted` → `approved` | `declined` → `contract_sent` → `signed` → `in_progress` → `completed`

---

## Development Phases

### Phase 1: Foundation ✅
- [x] Project scaffold with Vite + React + TypeScript
- [x] Tailwind CSS configuration
- [x] Supabase schema and client setup
- [x] Authentication (login/signup)
- [x] Protected routes
- [x] Vercel deployment

### Phase 2: Onboarding 🔄 (In Progress)
- [x] Role selection step
- [ ] Add Projects step (rapid entry for multiple projects)
- [ ] First Fire step (create first urgent RFI)
- [ ] Import or Skip step (CSV import option)
- [x] Completion step
- [ ] CSV Import flow

### Phase 3: Core App Shell
- [ ] App layout (mobile tab bar, desktop sidebar)
- [ ] War Room view with stats and filters
- [ ] Task cards with status badges
- [ ] Stall prompts
- [ ] TanStack Query setup
- [ ] Zustand store

### Phase 4: Projects + Quotes + Vendors
- [ ] Project list with expandable cards
- [ ] Project detail with tabs (Tasks, Quotes, Budget, Activity)
- [ ] Quote tracker grouped by trade
- [ ] Vendor database with search and filters
- [ ] Vendor profile pages

### Phase 5: Data Entry + Audit Trail
- [ ] Quick Entry FAB and modal
- [ ] Log Quote form
- [ ] Status Update form
- [ ] New RFI form
- [ ] Call Log form
- [ ] New Vendor form
- [ ] Inline editing component
- [ ] Change log recording

### Phase 6: Communication + Stall Detection
- [ ] Message templates
- [ ] Message composer modal
- [ ] Stall detection logic
- [ ] Auto-prompts for stalled tasks

### Phase 7: Boss View + Export
- [ ] Boss view dashboard
- [ ] Project health indicators
- [ ] Budget progress bars
- [ ] Excel export with SheetJS

### Phase 8: Settings + Polish
- [ ] Settings page
- [ ] Follow-up preferences
- [ ] Trade category management
- [ ] Empty states
- [ ] Error handling
- [ ] Loading skeletons
- [ ] Responsive QA

---

## Responsive Breakpoints

| Breakpoint | Width | Layout |
|------------|-------|--------|
| Mobile | default (375px+) | Bottom tab bar, stacked layouts, FAB |
| Tablet | `md:` (768px+) | Wider cards, labels on tab bar |
| Desktop | `lg:` (1280px+) | Left sidebar, header bar, multi-column |

---

## Environment Variables

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

## Scripts

```bash
npm run dev      # Start development server
npm run build    # Build for production
npm run preview  # Preview production build
npm run lint     # Run ESLint
```

---

## Out of Scope (MVP)

These features are explicitly excluded from the MVP:

- Email integration / forwarding / parsing
- AI/LLM parsing
- Multi-user / team access
- Real-time subscriptions
- Push notifications
- Billing / payments
- Google Sheets API
- Calendar integration
- File attachments
- Gantt charts
- Offline-first / service workers
- Native mobile app
- Horizontal CSV transposition
- Blocking chain visual diagram

---

## Contributing

This is a single-user MVP. For questions or issues, open a GitHub issue.

---

## License

Private project - All rights reserved.
