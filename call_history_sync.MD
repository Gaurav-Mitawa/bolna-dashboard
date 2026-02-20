# Implementation Plan - Enable Full Call History Sync

The goal is to modify [backend/services/callPoller.ts](file:///d:/Autonoetic_edge/BOLNA-clusterx/BOLNA/backend/services/callPoller.ts) to fetch **all** past agent executions from the Bolna API, not just the most recent 50. This ensures the `/customers` page has complete history.

## User Review Required
> [!IMPORTANT]
> This change will cause the server to fetch *all* historical data on the next poll cycle. Depending on the account history size, this might take a few moments and make many API calls.

## Proposed Changes

### Backend

#### [MODIFY] [callPoller.ts](file:///d:/Autonoetic_edge/BOLNA-clusterx/BOLNA/backend/services/callPoller.ts)
- Update [pollNewCalls](file:///d:/Autonoetic_edge/BOLNA-clusterx/BOLNA/backend/services/callPoller.ts#76-143) to loop through pages.
- Use `has_more` field from the API response to determine when to stop.
- Increment `page_number` in each iteration.
- Remove `status=completed` filter? **Decision:** Yes, remove it to capture all call attempts (failed, busy, etc.) for a complete log.

## Verification Plan

### Manual Verification
1.  Restart the backend server.
2.  Observe console logs to see "Fetching page 1", "Fetching page 2", etc.
3.  Check the "Customers" page in the frontend.
4.  Verify that a customer with old calls now shows their full history in the "Contact Details" modal.
