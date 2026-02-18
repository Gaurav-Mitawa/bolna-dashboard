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
    const res = await fetch(`${BOLNA_API}${endpoint}`, {
        headers: {
            Authorization: `Bearer ${getApiKey()}`,
            "Content-Type": "application/json",
        },
    });
    if (!res.ok) throw new Error(`Bolna API ${res.status}: ${res.statusText}`);
    return res.json() as Promise<T>;
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
    telephony_data?: {
        to_number: string;
        from_number: string;
        call_type: string;
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
    caller_number: string;
    call_duration: number;
    call_timestamp: string;
    transcript: string;
}

/**
 * Poll Bolna for new completed calls that haven't been processed yet.
 */
export async function pollNewCalls(): Promise<NewCall[]> {
    // 1. Get all agents
    const agents = await bolnaGet<BolnaAgent[]>("/v2/agent/all");
    console.log(`[Poller] Found ${agents.length} agents`);

    const newCalls: NewCall[] = [];

    // 2. For each agent, get completed executions
    for (const agent of agents) {
        try {
            const execResponse = await bolnaGet<ExecutionsResponse>(
                `/v2/agent/${agent.id}/executions?page_size=50&status=completed`
            );

            for (const exec of execResponse.data) {
                // Skip if no transcript
                if (!exec.transcript) continue;

                // Check if already in our DB
                const exists = await Call.findOne({ call_id: exec.id });
                if (exists) continue;

                newCalls.push({
                    call_id: exec.id,
                    agent_id: exec.agent_id,
                    caller_number:
                        exec.telephony_data?.from_number ||
                        exec.telephony_data?.to_number ||
                        "",
                    call_duration: exec.conversation_time || 0,
                    call_timestamp: exec.created_at,
                    transcript: exec.transcript,
                });
            }
        } catch (err) {
            console.error(`[Poller] Error fetching agent ${agent.id}:`, err);
        }
    }

    console.log(`[Poller] Found ${newCalls.length} new unprocessed calls`);
    return newCalls;
}
