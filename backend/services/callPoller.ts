/**
 * Bolna API Poller — server-side
 * Fetches completed executions from Bolna, returns only unprocessed ones.
 */
import { Call } from "../models/Call.js";

const BOLNA_API = "https://api.bolna.ai";

function getApiKey(): string {
    const key = process.env.BOLNA_API_KEY;
    if (!key) throw new Error("BOLNA_API_KEY not set in .env");
    return key;
}

async function bolnaGet<T>(endpoint: string): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

    try {
        const res = await fetch(`${BOLNA_API}${endpoint}`, {
            headers: {
                Authorization: `Bearer ${getApiKey()}`,
                "Content-Type": "application/json",
            },
            signal: controller.signal
        });
        if (!res.ok) throw new Error(`Bolna API ${res.status}: ${res.statusText}`);
        return await res.json() as T;
    } finally {
        clearTimeout(timeout);
    }
}

interface BolnaAgent {
    id: string;
    agent_name: string;
}

interface BolnaExecution {
    id: string;
    agent_id: string;
    status: string;
    conversation_time: number;
    transcript?: string;
    created_at: string;
    total_cost?: number;
    cost_breakdown?: {
        llm: number;
        network: number;
        platform: number;
        synthesizer: number;
        transcriber: number;
    };
    extracted_data?: Record<string, any>;
    telephony_data?: {
        to_number: string;
        from_number: string;
        call_type: string;
        recording_url?: string;
    };
}

interface ExecutionsResponse {
    data: BolnaExecution[];
    total: number;
    has_more: boolean;
}

export interface NewCall {
    call_id: string;
    agent_id: string;
    agent_name: string;
    caller_number: string;
    call_duration: number;
    call_timestamp: string;
    transcript: string;
    call_direction: string;
    total_cost: number;
    cost_breakdown: any;
    recording_url: string;
    extracted_data: any;
}

/**
 * Poll Bolna for new completed calls that haven't been processed yet.
 */
export async function pollNewCalls(): Promise<NewCall[]> {
    // 1. Get all agents
    const agents = await bolnaGet<BolnaAgent[]>("/v2/agent/all");
    console.log(`[Poller] Found ${agents.length} agents`);

    // Create a map of agent_id -> agent_name
    const agentMap = new Map<string, string>();
    agents.forEach(a => agentMap.set(a.id, a.agent_name));

    const newCalls: NewCall[] = [];

    // 2. For each agent, get ALL executions (pagination)
    for (const agent of agents) {
        let page = 1;
        let hasMore = true;

        while (hasMore) {
            try {
                console.log(`[Poller] Fetching calls for agent ${agent.agent_name} (Page ${page})...`);
                // Removed status=completed to get ALL history (failed, busy, etc.)
                const execResponse = await bolnaGet<ExecutionsResponse>(
                    `/v2/agent/${agent.id}/executions?page_size=50&page_number=${page}`
                );

                const executions = execResponse.data || [];
                hasMore = execResponse.has_more;
                if (!executions.length) hasMore = false; // Safety check

                for (const exec of executions) {
                    // Check if already in our DB and processed
                    const exists = await Call.findOne({ call_id: exec.id });
                    if (exists && exists.processed) continue;

                    // Determine customer number based on direction
                    const direction = exec.telephony_data?.call_type || "inbound";
                    let customerNumber = "";
                    if (direction === "outbound") {
                        customerNumber = exec.telephony_data?.to_number || "";
                    } else {
                        customerNumber = exec.telephony_data?.from_number || "";
                    }

                    // Fallback if empty
                    if (!customerNumber) {
                        customerNumber = exec.telephony_data?.from_number || exec.telephony_data?.to_number || "";
                    }

                    newCalls.push({
                        call_id: exec.id,
                        agent_id: exec.agent_id,
                        agent_name: agentMap.get(exec.agent_id) || "Unknown Agent",
                        caller_number: customerNumber,
                        call_duration: exec.conversation_time || 0,
                        call_timestamp: exec.created_at,
                        transcript: exec.transcript || "", // Allow empty transcript
                        call_direction: direction,
                        total_cost: exec.total_cost || 0,
                        cost_breakdown: exec.cost_breakdown || null,
                        recording_url: exec.telephony_data?.recording_url || "",
                        extracted_data: exec.extracted_data || null
                    });
                }

                page++;
                // Safety break to prevent infinite loops in case of API issues
                if (page > 100) {
                    console.warn(`[Poller] Reached 100 pages for agent ${agent.agent_name}, stopping safety break.`);
                    hasMore = false;
                }

            } catch (err) {
                console.error(`[Poller] Error fetching agent ${agent.id} page ${page}:`, err);
                hasMore = false; // Stop on error
            }
        }
    }

    console.log(`[Poller] Found ${newCalls.length} new unprocessed calls`);
    return newCalls;
}

/**
 * Sync calls for a specific phone number across all agents.
 * This is useful for on-demand population of a customer's history.
 */
export async function syncCallsForPhone(phoneNumber: string): Promise<NewCall[]> {
    const agents = await bolnaGet<BolnaAgent[]>("/v2/agent/all");
    const agentMap = new Map<string, string>();
    agents.forEach(a => agentMap.set(a.id, a.agent_name));

    const normalizedTarget = phoneNumber.replace(/\s+/g, '').replace(/^\+/, '');
    console.log(`[Sync] Normalized target: ${normalizedTarget}`);

    // Fetch executions for all agents in parallel
    const allAgentResults = await Promise.all(agents.map(async (agent) => {
        const agentCalls: NewCall[] = [];
        let page = 1;
        let hasMore = true;

        while (hasMore && page <= 3) { // Limit to 3 pages per agent for on-demand sync (150 calls)
            try {
                const execResponse = await bolnaGet<ExecutionsResponse>(
                    `/v2/agent/${agent.id}/executions?page_size=50&page_number=${page}`
                );

                const executions = execResponse.data || [];
                hasMore = execResponse.has_more;
                if (!executions.length) hasMore = false;

                for (const exec of executions) {
                    const direction = exec.telephony_data?.call_type || "inbound";
                    const to = exec.telephony_data?.to_number || "";
                    const from = exec.telephony_data?.from_number || "";

                    const normalizedTo = to.replace(/\s+/g, '').replace(/^\+/, '');
                    const normalizedFrom = from.replace(/\s+/g, '').replace(/^\+/, '');

                    const isMatch = (normalizedTo === normalizedTarget) || (normalizedFrom === normalizedTarget);

                    if (isMatch) {
                        agentCalls.push({
                            call_id: exec.id,
                            agent_id: exec.agent_id,
                            agent_name: agentMap.get(exec.agent_id) || "Unknown Agent",
                            caller_number: phoneNumber,
                            call_duration: exec.conversation_time || 0,
                            call_timestamp: exec.created_at,
                            transcript: exec.transcript || "",
                            call_direction: direction,
                            total_cost: exec.total_cost || 0,
                            cost_breakdown: exec.cost_breakdown || null,
                            recording_url: exec.telephony_data?.recording_url || "",
                            extracted_data: exec.extracted_data || null
                        });
                    }
                }
                page++;
            } catch (err) {
                console.error(`[Sync] Error fetching agent ${agent.id} page ${page}:`, err);
                hasMore = false;
            }
        }
        return agentCalls;
    }));

    const finalCalls = allAgentResults.flat();
    console.log(`[Sync] Found ${finalCalls.length} calls for ${phoneNumber}`);
    return finalCalls;
}
