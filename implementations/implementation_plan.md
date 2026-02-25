# LLM Intent Pipeline Integration

Replace client-side keyword matching with the existing Gemini LLM backend pipeline. Automatically process new Bolna call executions and surface LLM-derived intent (`queries`, `booked`, `not_interested`, `follow_up`, `interested`) on the Dashboard and Bookings pages.

## User Review Required

> [!IMPORTANT]
> The LLM prompt intent categories will change from `booking/inquiry/complaint/followup/not_interested/other` to **`queries / booked / not_interested`** for both inbound and outbound calls. This is a breaking change for any existing processed calls in MongoDB — their `llm_analysis.intent` values won't match the new categories. Re-processing them is optional.

> [!WARNING]
> Auto-polling will call the Bolna API + Gemini API every 5 minutes. This is free-tier Gemini, but make sure your Bolna API rate limits can handle it.

---

## Proposed Changes

### Backend — LLM Prompt & Auto-Polling

#### [MODIFY] [llmService.ts](file:///d:/Autonoetic_edge/BOLNA-clusterx/BOLNA/backend/services/llmService.ts)

Update the `SYSTEM_PROMPT` to use the 3 intent categories the user wants:

```diff
- "intent": "one of: booking / inquiry / complaint / followup / not_interested / other",
+ "intent": "one of: queries / booked / not_interested",
```

Also update the [LLMAnalysis](file:///d:/Autonoetic_edge/BOLNA-clusterx/BOLNA/backend/services/llmService.ts#6-17) interface accordingly.

#### [MODIFY] [server.ts](file:///d:/Autonoetic_edge/BOLNA-clusterx/BOLNA/backend/server.ts)

Add a `setInterval` that calls [processNewCalls()](file:///d:/Autonoetic_edge/BOLNA-clusterx/BOLNA/backend/services/callProcessor.ts#9-52) every 5 minutes after server startup, so new Bolna executions are automatically polled and analyzed without manual triggering.

---

### Frontend — Vite Proxy

#### [MODIFY] [vite.config.ts](file:///d:/Autonoetic_edge/BOLNA-clusterx/BOLNA/client/vite.config.ts)

Add a proxy rule so `/api/processed-calls`, `/api/call-bookings`, and `/api/internal/*` route to `http://localhost:5000`.

```ts
server: {
  proxy: {
    '/api/processed-calls': 'http://localhost:5000',
    '/api/call-bookings': 'http://localhost:5000',
    '/api/internal': 'http://localhost:5000',
  }
}
```

---

### Frontend — Dashboard Intent Integration

#### [MODIFY] [Dashboard.tsx](file:///d:/Autonoetic_edge/BOLNA-clusterx/BOLNA/client/src/pages/Dashboard.tsx)

Replace the client-side [extractIntent()](file:///d:/Autonoetic_edge/BOLNA-clusterx/BOLNA/client/src/pages/Dashboard.tsx#38-67) function with a hybrid approach:
1. Fetch processed calls from `/api/processed-calls` (backend LLM pipeline)
2. For calls that have been LLM-analyzed, use `llm_analysis.intent` directly
3. For calls not yet processed, fall back to the existing keyword matching
4. Update the donut chart categories for both modes to: **Queries**, **Booked**, **Not Interested**

---

### Frontend — Bookings Integration

The existing [AIBookings.tsx](file:///d:/Autonoetic_edge/BOLNA-clusterx/BOLNA/client/src/pages/AIBookings.tsx) page already fetches from `/api/call-bookings` and displays LLM-detected bookings. No changes needed there beyond ensuring the Vite proxy routes correctly.

---

## Verification Plan

### Manual Verification
1. Start backend: `npx tsx backend/server.ts` — verify auto-polling logs appear every 5 minutes
2. Open Dashboard — verify donut charts show `Queries / Booked / Not Interested` categories
3. Open AI Bookings page — verify bookings appear after processing
4. Check browser Network tab — `/api/processed-calls` requests should proxy to port 5000
