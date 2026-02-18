

const BOLNA_API_BASE = 'https://api.bolna.ai';

/**
 * Get Bolna API key from environment variable
 */
export function getBolnaApiKey(): string | null {
  return import.meta.env.BOLNA_API_KEY || import.meta.env.VITE_BOLNA_API_KEY || null;
}

/**
 * Check if Bolna API key is configured
 */
export function isBolnaConfigured(): boolean {
  const key = getBolnaApiKey();
  return !!key && key.length > 10;
}

/**
 * Bolna API fetch wrapper
 */
async function bolnaFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const apiKey = getBolnaApiKey();

  if (!apiKey) {
    throw new Error('Bolna API key not configured. Please add VITE_BOLNA_API_KEY to your .env file.');
  }

  const url = `${BOLNA_API_BASE}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `API Error: ${response.status}`);
  }

  return response.json();
}

// ============================================
// Types based on Bolna API documentation
// ============================================

export interface BolnaUser {
  id: string;
  name: string;
  email: string;
  wallet: number;
  concurrency: {
    max: number;
    current: number;
  };
}

export interface BolnaAgent {
  id: string;
  agent_name: string;
  agent_type: string;
  agent_status: 'seeding' | 'processed';
  created_at: string;
  updated_at: string;
  tasks?: any[];
  agent_prompts?: {
    task_1?: {
      system_prompt: string;
    };
  };
}

export interface BolnaExecution {
  id: string;
  agent_id: string;
  batch_id?: string;
  conversation_time: number;
  total_cost: number;
  status: 'completed' | 'call-disconnected' | 'no-answer' | 'busy' | 'failed' | 'in-progress' | 'canceled' | 'balance-low' | 'queued' | 'ringing' | 'initiated' | 'prepared';
  error_message?: string;
  answered_by_voice_mail: boolean;
  transcript?: string;
  created_at: string;
  updated_at: string;
  cost_breakdown?: {
    llm: number;
    network: number;
    platform: number;
    synthesizer: number;
    transcriber: number;
  };
  telephony_data?: {
    duration: string;
    to_number: string;
    from_number: string;
    recording_url?: string;
    call_type: 'outbound' | 'inbound';
    provider: string;
    hangup_by?: string;
    hangup_reason?: string;
  };
  extracted_data?: Record<string, any>;
  context_details?: Record<string, any>;
}

export interface BolnaExecutionsResponse {
  page_number: number;
  page_size: number;
  total: number;
  has_more: boolean;
  data: BolnaExecution[];
}

export interface BolnaBatch {
  batch_id: string;
  agent_id?: string;
  name?: string;
  status: string;
  humanized_created_at?: string;
  from_phone_number?: string;
  file_name?: string;
  valid_contacts?: number;
  total_contacts?: number;
  execution_status?: Record<string, number>;
  scheduled_at?: string;
  created_at: string;
  updated_at: string;
}

export interface BolnaPhoneNumber {
  id: string;
  phone_number: string;
  telephony_provider: string;
  agent_id: string | null;
}

export interface BolnaKnowledgebase {
  id: string;
  name: string;
  status: string;
  file_type: string;
  created_at: string;
}

export interface BolnaVoice {
  id: string;
  name: string;
  provider: string;
  language: string;
  accent?: string;
  gender?: string;
}

// ============================================
// API Functions
// ============================================

/**
 * User APIs
 */
export const userApi = {
  /** Get current user info including wallet balance */
  getMe: () => bolnaFetch<BolnaUser>('/user/me'),
};

/**
 * Agent APIs (v2)
 */
export const agentApi = {
  /** List all agents */
  getAll: () => bolnaFetch<BolnaAgent[]>('/v2/agent/all'),

  /** Get single agent by ID */
  get: (agentId: string) => bolnaFetch<BolnaAgent>(`/v2/agent/${agentId}`),

  /** Create a new agent */
  create: (data: Partial<BolnaAgent>) =>
    bolnaFetch<BolnaAgent>('/v2/agent', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  /** Update an agent */
  update: (agentId: string, data: Partial<BolnaAgent>) =>
    bolnaFetch<BolnaAgent>(`/v2/agent/${agentId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  /** Patch update an agent */
  patch: (agentId: string, data: Partial<BolnaAgent>) =>
    bolnaFetch<BolnaAgent>(`/v2/agent/${agentId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  /** Delete an agent */
  delete: (agentId: string) =>
    bolnaFetch<void>(`/v2/agent/${agentId}`, {
      method: 'DELETE',
    }),

  /** Stop all queued calls for an agent */
  stopQueuedCalls: (agentId: string) =>
    bolnaFetch<void>(`/v2/agent/${agentId}/stop`, {
      method: 'POST',
    }),
};

/**
 * Executions APIs (Call History)
 */
export interface ExecutionsParams {
  page_number?: number;
  page_size?: number;
  status?: string;
  call_type?: 'inbound' | 'outbound';
  provider?: string;
  answered_by_voice_mail?: boolean;
  batch_id?: string;
  from?: string;
  to?: string;
}

export const executionsApi = {
  /** Get all executions for an agent */
  getByAgent: (agentId: string, params: ExecutionsParams = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const query = searchParams.toString();
    return bolnaFetch<BolnaExecutionsResponse>(
      `/v2/agent/${agentId}/executions${query ? `?${query}` : ''}`
    );
  },

  /** Get a single execution by ID */
  get: (executionId: string) =>
    bolnaFetch<BolnaExecution>(`/v2/execution/${executionId}`),

  /** Get all executions (across all agents)
   *  Note: Bolna has no global /executions endpoint.
   *  We aggregate by fetching executions per-agent.
   */
  getAll: async (params: ExecutionsParams = {}): Promise<BolnaExecutionsResponse> => {
    try {
      // Fetch all agents first
      const agents = await agentApi.getAll();

      // Fetch executions for each agent in parallel
      const perAgentResults = await Promise.all(
        agents.map(agent =>
          executionsApi.getByAgent(agent.id, params)
            .then(res => res.data || [])
            .catch(() => [] as BolnaExecution[])
        )
      );

      const allExecutions = perAgentResults.flat();

      return {
        page_number: 1,
        page_size: allExecutions.length,
        total: allExecutions.length,
        has_more: false,
        data: allExecutions,
      };
    } catch (error) {
      console.error('Error fetching all executions:', error);
      return { page_number: 1, page_size: 0, total: 0, has_more: false, data: [] };
    }
  },
};

/**
 * Calls API (Make outbound calls)
 */
export interface MakeCallParams {
  agent_id: string;
  recipient_phone_number: string;
  from_phone_number?: string;
  context?: Record<string, any>;
}

export const callsApi = {
  /** Make an outbound call */
  make: (params: MakeCallParams) =>
    bolnaFetch<{ execution_id: string }>('/call', {
      method: 'POST',
      body: JSON.stringify(params),
    }),

  /** Stop a queued/scheduled call */
  stop: (executionId: string) =>
    bolnaFetch<void>(`/call/${executionId}/stop`, {
      method: 'POST',
    }),
};

/**
 * Batches API (Campaign calling)
 */
export const batchesApi = {
  /** Get all batches for an agent (official endpoint: GET /batches/{agent_id}/all) */
  getByAgent: (agentId: string) =>
    bolnaFetch<BolnaBatch[]>(`/batches/${agentId}/all`),

  /** Get a single batch */
  get: (batchId: string) =>
    bolnaFetch<BolnaBatch>(`/batch/${batchId}`),

  /** Get batch executions */
  getExecutions: (batchId: string, params: ExecutionsParams = {}) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    });
    const query = searchParams.toString();
    return bolnaFetch<BolnaExecutionsResponse>(
      `/batch/${batchId}/executions${query ? `?${query}` : ''}`
    );
  },

  /** Schedule a batch (requires multipart/form-data per Bolna API docs) */
  schedule: async (batchId: string, scheduledAt: string): Promise<BolnaBatch> => {
    const apiKey = getBolnaApiKey();
    if (!apiKey) throw new Error('Bolna API key not configured.');

    const formData = new FormData();
    formData.append('scheduled_at', scheduledAt);

    const response = await fetch(`${BOLNA_API_BASE}/batches/${batchId}/schedule`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        // Do NOT set Content-Type — browser sets it with boundary for FormData
      },
      body: formData,
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Schedule API ${response.status}: ${errBody}`);
    }

    return response.json();
  },

  /** Stop a batch */
  stop: (batchId: string) =>
    bolnaFetch<void>(`/batches/${batchId}/stop`, {
      method: 'POST',
    }),

  /** Delete a batch */
  delete: (batchId: string) =>
    bolnaFetch<void>(`/batches/${batchId}`, {
      method: 'DELETE',
    }),
};

/**
 * Phone Numbers API
 */
export const phoneNumbersApi = {
  /** List all phone numbers */
  getAll: () => bolnaFetch<BolnaPhoneNumber[]>('/phone-numbers/all'),

  /** Search available numbers */
  search: (params: { country?: string; region?: string; pattern?: string }) => {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value) searchParams.append(key, value);
    });
    return bolnaFetch<any[]>(`/phone-numbers/search?${searchParams.toString()}`);
  },

  /** Buy a phone number */
  buy: (phoneNumber: string, provider: string) =>
    bolnaFetch<BolnaPhoneNumber>('/phone-numbers/buy', {
      method: 'POST',
      body: JSON.stringify({ phone_number: phoneNumber, provider }),
    }),

  /** Delete a phone number */
  delete: (phoneNumberId: string) =>
    bolnaFetch<void>(`/phone-numbers/${phoneNumberId}`, {
      method: 'DELETE',
    }),
};

/**
 * Knowledgebase API
 */
export const knowledgebaseApi = {
  /** List all knowledgebases */
  getAll: () => bolnaFetch<BolnaKnowledgebase[]>('/knowledgebase/all'),

  /** Get a single knowledgebase */
  get: (kbId: string) => bolnaFetch<BolnaKnowledgebase>(`/knowledgebase/${kbId}`),

  /** Delete a knowledgebase */
  delete: (kbId: string) =>
    bolnaFetch<void>(`/knowledgebase/${kbId}`, {
      method: 'DELETE',
    }),
};

/**
 * Voice API
 */
export const voiceApi = {
  /** List all available voices */
  getAll: () => bolnaFetch<BolnaVoice[]>('/voice/all'),
};

/**
 * Inbound API
 */
export const inboundApi = {
  /** Set agent for inbound calls on a phone number */
  setAgent: (phoneNumberId: string, agentId: string) =>
    bolnaFetch<void>('/inbound/agent', {
      method: 'POST',
      body: JSON.stringify({ phone_number_id: phoneNumberId, agent_id: agentId }),
    }),

  /** Remove agent from inbound */
  unlink: (phoneNumberId: string) =>
    bolnaFetch<void>(`/inbound/unlink/${phoneNumberId}`, {
      method: 'POST',
    }),
};

// Export all APIs
export const bolnaApi = {
  user: userApi,
  agents: agentApi,
  executions: executionsApi,
  calls: callsApi,
  batches: batchesApi,
  phoneNumbers: phoneNumbersApi,
  knowledgebase: knowledgebaseApi,
  voice: voiceApi,
  inbound: inboundApi,
};

export default bolnaApi;
