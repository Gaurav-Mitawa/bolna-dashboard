How to Verify It Works
Step 1: Start both servers
bash
# Terminal 1 — Backend (Express + auto-polling)
cd d:\Autonoetic_edge\BOLNA-clusterx\BOLNA
npx tsx backend/server.ts
# Terminal 2 — Frontend (Vite dev server)
cd d:\Autonoetic_edge\BOLNA-clusterx\BOLNA\client
npm run dev
Step 2: Watch the backend logs
In Terminal 1, you should see something like:

[DB] MongoDB Atlas connected
[Backend] Call processor API running on http://localhost:5000
[AutoPoll] Polling every 300s
[Poller] Found 3 agents
[Poller] Found 5 new unprocessed calls
[Processor] ✓ abc123 — intent: queries
[Processor] ✓ def456 — intent: booked
[AutoPoll] Initial run — 5 processed, 0 failed out of 5
If you see these [Processor] ✓ lines, the pipeline is working.

Step 3: Test the API directly
In your browser or Postman, hit:

http://localhost:5000/api/processed-calls — should return an array of processed calls with llm_analysis
http://localhost:5000/api/call-bookings — should return only calls where is_booked: true
Step 4: Check the Dashboard
Open the frontend (usually http://localhost:5173) and go to the Dashboard. The Call Intent donut chart should show the 3 categories. If there's data, you'll see the breakdown.

Step 5: Check the Network Tab
Open browser DevTools → Network tab → look for a request to /api/processed-calls. It should return 200 OK with JSON data (the Vite proxy forwards it to port 5000).

Quick Troubleshooting
Problem	What to check
GEMINI_API_KEY not set	Make sure .env has GEMINI_API_KEY=your_key
BOLNA_API_KEY not set	Make sure .env has BOLNA_API_KEY=your_key
MongoDB connection failed	Make sure .env has MONGODB_URI=your_uri and your IP is whitelisted in Atlas
0 new unprocessed calls	All calls already processed, or no completed calls on Bolna
Dashboard shows all Queries	LLM data hasn't been fetched yet — wait for the first poll or check the backend logs for errors


D:\Autonoetic_edge\BOLNA-clusterx\BOLNA>npx tsx backend/server.ts
[dotenv@17.3.1] injecting env (3) from .env -- tip: 🛡️ auth for agents: https://vestauth.com
[DB] MongoDB Atlas connected
[Backend] Call processor API running on http://localhost:5000
[AutoPoll] Polling every 300s
[Poller] Found 3 agents
[Poller] Found 5 new unprocessed calls
[Processor] ✓ e7a066ad-c3e7-41e6-8df4-abe6f1c06497 — intent: queries
[Processor] Waiting 10s before next call...
[Processor] ✓ 0e159729-1190-469a-b8b9-95b0e0acbd7e — intent: queries
[Processor] Waiting 10s before next call...
[Processor] ✓ e480c342-666d-4aba-94b9-ddeec5d3b4de — intent: queries
[Processor] Waiting 10s before next call...
[Processor] ✓ 8e38faa8-2866-468b-908e-5bf45eb0421f — intent: queries
[Processor] Waiting 10s before next call...
[Processor] ✓ 016a0444-6809-4ffd-8efe-66e4f1f22365 — intent: queries
[AutoPoll] Initial run — 5 processed, 0 failed out of 5

