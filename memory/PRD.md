# Cluster X - AI Agent Analytics Dashboard PRD

## Original Problem Statement
Create a landing page for AI Agent analytics dashboard before the login/signup page. The landing page should:
- Be minimalistic, inspired by ringg.ai competitor
- Have phone number input to receive demo call from AI agent (connected to Bolna API)
- Show industries section including BFSI, Healthcare, Logistics, Education, E-commerce, HR & Recruitment
- Use light theme with orange brand color
- Keep product name as "Cluster X"

## Architecture
- **Frontend**: React + TypeScript + Vite + TailwindCSS
- **Backend**: Express.js + TypeScript
- **Database**: MongoDB
- **Voice AI**: Bolna API integration
- **Auth**: Google OAuth

## User Personas
1. **Business Decision Makers**: Looking to automate voice operations
2. **Ops Managers**: Need lead qualification and customer support automation
3. **Sales Teams**: Want to scale outreach with AI voice agents

## Core Requirements (Static)
- [x] Landing page before login/signup
- [x] Phone input with country code selector
- [x] Demo call feature (Bolna API integration)
- [x] Industries showcase (BFSI, Healthcare, Logistics, Education, E-commerce, HR)
- [x] Features section
- [x] Stats section
- [x] Navigation to login page
- [x] Light theme with orange brand color

## What's Been Implemented (Jan 2026)

### Landing Page (v1.0) - 27 Jan 2026
- Created `/app/client/src/pages/LandingPage.tsx`
- Hero section with phone number input and country code selector
- Stats bar: 10,000+ Concurrent Calls, 99.9% Uptime, 20+ Languages
- Industries section: BFSI, Healthcare, Logistics, Education, E-commerce, HR & Recruitment
- Features section: Smart Lead Qualification, Multi-language Support, Real-time Analytics, Instant Deployment
- CTA section and footer
- Navigation to login page

### Backend Demo Call API - 27 Jan 2026
- Created `/app/backend/routes/demoRoutes.ts`
- POST `/api/demo/call` endpoint
- Phone number validation (E.164 format)
- Bolna API integration for triggering calls
- Proper error handling (503 for unconfigured service)

### App Routing Updates - 27 Jan 2026
- Updated `/app/client/src/App.tsx` to show landing page for unauthenticated users
- Updated `/app/backend/server.ts` to mount demo routes

## Environment Configuration
Required in `.env`:
```
DEMO_AGENT_ID=<your-bolna-agent-id>
DEMO_BOLNA_API_KEY=<your-bolna-api-key>
DEMO_FROM_PHONE_NUMBER=<optional-caller-id>
```

## Prioritized Backlog

### P0 - Critical (Next Session)
- Configure actual Bolna demo agent credentials
- Test end-to-end demo call flow

### P1 - High Priority
- Add testimonials/social proof section
- Add pricing section
- Mobile responsiveness improvements
- Add animations/micro-interactions

### P2 - Medium Priority
- Lead capture and storage in database
- Analytics tracking for landing page
- A/B testing setup
- SEO optimization

## Next Tasks
1. User needs to provide Bolna API credentials (DEMO_AGENT_ID, DEMO_BOLNA_API_KEY)
2. Configure demo agent in Bolna dashboard
3. Test demo call flow with real phone number
4. Add custom tagline/value proposition when provided
