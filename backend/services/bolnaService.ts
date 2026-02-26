/**
 * Bolna Service — Per-user API key operations.
 * Handles agents, phone numbers, and batch campaign management.
 * Uses the user's own encrypted Bolna API key from MongoDB.
 *
 * NOTE: This is separate from callPoller.ts which uses a global BOLNA_API_KEY env var
 * for the background call-processing pipeline.
 */
import axios from "axios";
import FormData from "form-data";
import { decrypt } from "../utils/encrypt.js";
import { IUser } from "../models/User.js";

const BOLNA_HOST = "https://api.bolna.ai";

// Get decrypted API key for a user or from an encrypted string
export function getApiKey(input: any): string {
  // If input is a string, assume it's the encrypted key
  if (typeof input === "string") return decrypt(input);
  // Otherwise, assume it's a User object
  if (!input || !input.bolnaApiKey) throw new Error("Bolna API key not configured");
  return decrypt(input.bolnaApiKey);
}

// Validate a raw (unencrypted) API key by calling Bolna agents list
export async function validateApiKey(rawApiKey: string): Promise<boolean> {
  // Developer bypass key for testing without a real Bolna account
  if (rawApiKey === "bolna_dev_test") {
    console.log("[BolnaService] Using developer bypass key");
    return true;
  }

  try {
    console.log("[BolnaService] Validating API key with V2 endpoint...");
    const response = await axios.get(`${BOLNA_HOST}/v2/agent/all`, {
      headers: { Authorization: `Bearer ${rawApiKey}` },
      timeout: 15000,
    });
    return response.status === 200;
  } catch (err: any) {
    console.error("[BolnaService] validateApiKey Error:", {
      status: err.response?.status,
      data: err.response?.data,
      message: err.message,
      code: err.code,
      url: err.config?.url
    });
    if (err.response?.status === 401) return false;
    throw new Error(`Bolna API validation failed: ${err.message}. ${err.code || ""}`);
  }
}

// Fetch all agents for this user's Bolna account
export async function getAgents(user: IUser): Promise<any[]> {
  const apiKey = getApiKey(user);
  const response = await axios.get(`${BOLNA_HOST}/v2/agent/all`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    timeout: 15000,
  });
  return response.data;
}

// Fetch all phone numbers for this user's Bolna account
export async function getPhoneNumbers(user: IUser): Promise<any[]> {
  const apiKey = getApiKey(user);
  const response = await axios.get(`${BOLNA_HOST}/phone-numbers/all`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    timeout: 15000,
  });
  return response.data;
}

// Step 1: Create (upload) batch
export async function createBatch(
  user: IUser,
  agentId: string,
  csvBuffer: Buffer,
  filename = "campaign.csv",
  fromPhoneNumber?: string
): Promise<{ batch_id: string; state: string;[key: string]: any }> {
  const apiKey = getApiKey(user);
  const form = new FormData();
  form.append("agent_id", agentId);
  if (fromPhoneNumber) {
    form.append("from_phone_number", fromPhoneNumber);
  }
  form.append("file", csvBuffer, { filename, contentType: "text/csv" });

  console.log("[BolnaService] createBatch REQUEST:", {
    url: `${BOLNA_HOST}/batches`,
    agent_id: agentId,
    from_phone_number: fromPhoneNumber,
    filename: filename
  });

  try {
    const response = await axios.post(`${BOLNA_HOST}/batches`, form, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...form.getHeaders(),
      },
      timeout: 30000,
    });
    return response.data;
  } catch (err: any) {
    if (err.response) {
      console.error("[BolnaService] createBatch ERROR response:", {
        status: err.response.status,
        data: err.response.data,
        headers: err.response.headers
      });
    } else {
      console.error("[BolnaService] createBatch ERROR (no response):", err.message);
    }
    throw err;
  }
}

// Step 2: Schedule batch — scheduledAt must be ISO 8601 string
export async function scheduleBatch(
  user: IUser,
  batchId: string,
  scheduledAt: string
): Promise<any> {
  const apiKey = getApiKey(user);
  const form = new FormData();
  form.append("scheduled_at", scheduledAt);

  const response = await axios.post(
    `${BOLNA_HOST}/batches/${batchId}/schedule`,
    form,
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        ...form.getHeaders(),
      },
      timeout: 15000,
    }
  );
  return response.data;
}

// Step 3: Get batch status
export async function getBatchStatus(user: IUser, batchId: string): Promise<any> {
  const apiKey = getApiKey(user);
  const response = await axios.get(`${BOLNA_HOST}/batches/${batchId}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    timeout: 15000,
  });
  return response.data;
}

// Step 3b: Stop a running/scheduled batch
export async function stopBatch(user: IUser, batchId: string): Promise<any> {
  const apiKey = getApiKey(user);
  const response = await axios.post(`${BOLNA_HOST}/batches/${batchId}/stop`, {}, {
    headers: { Authorization: `Bearer ${apiKey}` },
    timeout: 15000,
  });
  return response.data;
}

// Step 4: Get execution results for a batch
export async function getBatchExecutions(user: IUser, batchId: string): Promise<any> {
  const apiKey = getApiKey(user);
  const response = await axios.get(`${BOLNA_HOST}/batches/${batchId}/executions`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    timeout: 15000,
  });
  return response.data;
}

// Fetch all executions for a specific agent
export async function getAgentExecutions(user: IUser, agentId: string, params: any = {}): Promise<any> {
  const apiKey = getApiKey(user);
  const response = await axios.get(`${BOLNA_HOST}/v2/agent/${agentId}/executions`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    params,
    timeout: 15000,
  });
  return response.data;
}
