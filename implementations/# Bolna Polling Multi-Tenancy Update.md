# Bolna Polling Multi-Tenancy Update

The goal is to finalize the transition of the Bolna background polling system from a legacy single-tenant design (using a global API key) to a fully multi-tenant architecture. This ensures each user's data is fetched using their own encrypted API key and only for active subscribers.

## User Review Required

> [!NOTE]
> The background poller will now only run for users with an `active` subscription status. Users with `inactive` or `expired` status will not have their Bolna executions polled automatically.

> [!IMPORTANT]
> The global `BOLNA_API_KEY` in [.env](file:///D:/Autonoetic_edge/BOLNA-clusterx/BOLNA/bolna%20main/.env) will become essentially obsolete for the background poller after these changes.

## Proposed Changes

### Backend Services

#### [MODIFY] [bolnaService.ts](file:///D:/Autonoetic_edge/BOLNA-clusterx/BOLNA/bolna%20main/backend/services/bolnaService.ts)
- Update [getApiKey](file:///D:/Autonoetic_edge/BOLNA-clusterx/BOLNA/bolna%20main/backend/services/bolnaService.ts#19-24) to handle both the [User](file:///D:/Autonoetic_edge/BOLNA-clusterx/BOLNA/bolna%20main/backend/services/scheduler.ts#7-27) object and a direct encrypted string to avoid type issues and bugs in calling code.

#### [MODIFY] [scheduler.ts](file:///D:/Autonoetic_edge/BOLNA-clusterx/BOLNA/bolna%20main/backend/services/scheduler.ts)
- Update `User.find` query to only include users with `bolnaApiKey` AND `subscriptionStatus: "active"`.
- Fix the bug where [getApiKey](file:///D:/Autonoetic_edge/BOLNA-clusterx/BOLNA/bolna%20main/backend/services/bolnaService.ts#19-24) was called with the wrong argument.
- Update the poll interval to 15 minutes (or as requested by the user, currently 5).

#### [MODIFY] [callProcessor.ts](file:///D:/Autonoetic_edge/BOLNA-clusterx/BOLNA/bolna%20main/backend/services/callProcessor.ts)
- Verify [processNewCalls](file:///D:/Autonoetic_edge/BOLNA-clusterx/BOLNA/bolna%20main/backend/services/callProcessor.ts#39-203) correctly handles all database operations scoped to the provided `userId`. (Already done, but will double-check).

## Verification Plan

### Automated Tests
- No existing automated tests were found for these services. I will verify via console logs after restarting the backend.

### Manual Verification
1. **Restart Backend**: Run `npm run dev:backend` or `npx tsx backend/server.ts`.
2. **Observe Logs**:
    - Verify "Found X users with Bolna API Key" includes only active subscribers.
    - Verify no "Bolna API key not configured" errors for valid users.
    - Verify polling starts correctly for each user.
3. **Database Check**: Check the `calls` and `contacts` collections in MongoDB to ensure data is saved with correct `userId` fields.
