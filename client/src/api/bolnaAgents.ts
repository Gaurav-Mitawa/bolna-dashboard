/**
 * Bolna Agents API Service
 * Manages voice AI agents using Bolna API
 */
import { agentApi, executionsApi, BolnaAgent } from "@/lib/bolnaApi";

export interface Agent {
  id: string;
  name: string;
  agent_type: string;
  status: 'processed' | 'seeding';
  language: string;
  voice_provider: string;
  voice_name: string;
  system_prompt: string;
  created_at: string;
  updated_at: string;
  is_active: boolean;
}

export interface AgentStats {
  total_calls: number;
  success_rate: number;
  avg_duration: number; // in seconds
  total_minutes: number;
  calls_handled: number;
}

export interface AgentWithStats extends Agent {
  stats: AgentStats;
}

export interface CreateAgentData {
  name: string;
  language: string;
  voice_provider: 'elevenlabs' | 'polly' | 'deepgram';
  voice_id: string;
  system_prompt: string;
}

/**
 * Fetch all agents with their statistics
 */
export async function getAllAgents(): Promise<AgentWithStats[]> {
  try {
    // Fetch all agents from Bolna
    const bolnaAgents = await agentApi.getAll();

    // Fetch executions to calculate stats
    const executionsResponse = await executionsApi.getAll({ page_size: 1000 });
    const executions = executionsResponse.data || [];

    // Transform and calculate stats for each agent
    const agentsWithStats = await Promise.all(
      bolnaAgents.map(async (bolnaAgent: BolnaAgent) => {
        // Get detailed agent info
        let agentDetails;
        try {
          agentDetails = await agentApi.get(bolnaAgent.id);
        } catch {
          agentDetails = bolnaAgent;
        }

        // Calculate stats from executions
        const agentExecutions = executions.filter(
          (ex) => ex.agent_id === bolnaAgent.id
        );

        const totalCalls = agentExecutions.length;

        // Only count calls that have actually been attempted (exclude prepared/queued)
        const attemptedCalls = agentExecutions.filter(
          (ex) => !['prepared', 'queued', 'initiated'].includes(ex.status)
        );
        const completedCalls = agentExecutions.filter(
          (ex) => ex.status === 'completed'
        ).length;
        const successRate = attemptedCalls.length > 0
          ? (completedCalls / attemptedCalls.length) * 100
          : 0;

        // Use conversation_time first, fallback to telephony_data.duration
        const totalDuration = agentExecutions.reduce(
          (sum, ex) => {
            const convTime = ex.conversation_time || 0;
            const telDuration = ex.telephony_data?.duration
              ? parseFloat(ex.telephony_data.duration)
              : 0;
            return sum + (convTime > 0 ? convTime : telDuration);
          },
          0
        );

        // Extract language and voice from agent details
        const language = extractLanguage(agentDetails);
        const voiceInfo = extractVoiceInfo(agentDetails);

        return {
          id: bolnaAgent.id,
          name: bolnaAgent.agent_name,
          agent_type: bolnaAgent.agent_type || 'other',
          status: bolnaAgent.agent_status || 'processed',
          language,
          voice_provider: voiceInfo.provider,
          voice_name: voiceInfo.name,
          system_prompt: extractSystemPrompt(agentDetails),
          created_at: bolnaAgent.created_at,
          updated_at: bolnaAgent.updated_at,
          is_active: true, // Default to active, will be updated based on usage
          stats: {
            total_calls: totalCalls,
            success_rate: Math.round(successRate),
            avg_duration: totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0,
            total_minutes: Math.round(totalDuration / 60),
            calls_handled: totalCalls,
          },
        };
      })
    );

    return agentsWithStats;
  } catch (error) {
    console.error("Error fetching agents:", error);
    throw error;
  }
}

/**
 * Get agent details by ID
 */
export async function getAgentDetails(agentId: string): Promise<AgentWithStats> {
  try {
    const agent = await agentApi.get(agentId);

    // Fetch executions for this agent
    const executionsResponse = await executionsApi.getAll({
      page_size: 1000,
    });
    const executions = executionsResponse.data || [];

    const agentExecutions = executions.filter(
      (ex) => ex.agent_id === agentId
    );

    const totalCalls = agentExecutions.length;
    const attemptedCalls = agentExecutions.filter(
      (ex) => !['prepared', 'queued', 'initiated'].includes(ex.status)
    );
    const completedCalls = agentExecutions.filter(
      (ex) => ex.status === 'completed'
    ).length;
    const successRate = attemptedCalls.length > 0
      ? (completedCalls / attemptedCalls.length) * 100
      : 0;

    const totalDuration = agentExecutions.reduce(
      (sum, ex) => {
        const convTime = ex.conversation_time || 0;
        const telDuration = ex.telephony_data?.duration
          ? parseFloat(ex.telephony_data.duration)
          : 0;
        return sum + (convTime > 0 ? convTime : telDuration);
      },
      0
    );

    const language = extractLanguage(agent);
    const voiceInfo = extractVoiceInfo(agent);

    return {
      id: agent.id,
      name: agent.agent_name,
      agent_type: agent.agent_type || 'other',
      status: agent.agent_status || 'processed',
      language,
      voice_provider: voiceInfo.provider,
      voice_name: voiceInfo.name,
      system_prompt: extractSystemPrompt(agent),
      created_at: agent.created_at,
      updated_at: agent.updated_at,
      is_active: true,
      stats: {
        total_calls: totalCalls,
        success_rate: Math.round(successRate),
        avg_duration: totalCalls > 0 ? Math.round(totalDuration / totalCalls) : 0,
        total_minutes: Math.round(totalDuration / 60),
        calls_handled: totalCalls,
      },
    };
  } catch (error) {
    console.error("Error fetching agent details:", error);
    throw error;
  }
}

/**
 * Create a new voice agent
 */
export async function createAgent(data: CreateAgentData): Promise<Agent> {
  try {
    // Create agent via Bolna API
    const result = await agentApi.create({
      agent_name: data.name,
      agent_type: 'other',
      tasks: [{
        task_type: 'conversation',
        tools_config: {
          llm_agent: {
            agent_type: 'simple_llm_agent',
            agent_flow_type: 'streaming',
            routes: null,
            llm_config: {
              provider: 'openai',
              model: 'gpt-4.1-mini',
              temperature: 0.1,
            },
          },
          synthesizer: {
            provider: data.voice_provider,
            provider_config: {
              voice: data.voice_id,
              voice_id: data.voice_id,
              model: getVoiceModel(data.voice_provider),
            },
            stream: true,
          },
          transcriber: {
            provider: 'deepgram',
            model: 'nova-3',
            language: data.language,
            stream: true,
          },
          input: {
            provider: 'twilio',
            format: 'wav',
          },
          output: {
            provider: 'twilio',
            format: 'wav',
          },
        },
        toolchain: {
          execution: 'parallel',
          pipelines: [['transcriber', 'llm', 'synthesizer']],
        },
      }],
      agent_prompts: {
        task_1: {
          system_prompt: data.system_prompt,
        },
      },
    });

    return {
      id: result.id,
      name: data.name,
      agent_type: 'other',
      status: 'processed',
      language: data.language,
      voice_provider: data.voice_provider,
      voice_name: data.voice_id,
      system_prompt: data.system_prompt,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      is_active: true,
    };
  } catch (error) {
    console.error("Error creating agent:", error);
    throw error;
  }
}

/**
 * Update agent status (active/paused)
 */
export async function updateAgentStatus(
  agentId: string,
  isActive: boolean
): Promise<void> {
  try {
    // Note: Bolna API doesn't have a direct status update endpoint
    // This is a placeholder - you might need to implement based on your backend
    console.log(`Updating agent ${agentId} status to ${isActive ? 'active' : 'paused'}`);
  } catch (error) {
    console.error("Error updating agent status:", error);
    throw error;
  }
}

/**
 * Get aggregated statistics across all agents
 */
export async function getAgentsStats(): Promise<{
  total_calls: number;
  active_agents: number;
  total_agents: number;
  success_rate: number;
  total_minutes: number;
}> {
  try {
    const agents = await getAllAgents();

    const totalCalls = agents.reduce((sum, agent) => sum + agent.stats.total_calls, 0);
    const totalMinutes = agents.reduce((sum, agent) => sum + agent.stats.total_minutes, 0);
    const activeAgents = agents.filter((agent) => agent.is_active).length;

    const avgSuccessRate = agents.length > 0
      ? agents.reduce((sum, agent) => sum + agent.stats.success_rate, 0) / agents.length
      : 0;

    return {
      total_calls: totalCalls,
      active_agents: activeAgents,
      total_agents: agents.length,
      success_rate: Math.round(avgSuccessRate),
      total_minutes: totalMinutes,
    };
  } catch (error) {
    console.error("Error fetching agents stats:", error);
    return {
      total_calls: 0,
      active_agents: 0,
      total_agents: 0,
      success_rate: 0,
      total_minutes: 0,
    };
  }
}

// Helper functions
function extractLanguage(agent: any): string {
  const transcriber = agent.tasks?.[0]?.tools_config?.transcriber;
  const langMap: Record<string, string> = {
    'en': 'English (US)',
    'hi': 'Hindi',
    'es': 'Spanish',
    'fr': 'French',
  };
  return langMap[transcriber?.language] || 'English (US)';
}

function extractVoiceInfo(agent: any): { provider: string; name: string } {
  const synthesizer = agent.tasks?.[0]?.tools_config?.synthesizer;
  const provider = synthesizer?.provider || 'elevenlabs';
  const voiceId = synthesizer?.provider_config?.voice_id || 'default';

  const voiceNames: Record<string, Record<string, string>> = {
    elevenlabs: {
      'V9LCAAi4tTlqe9JadbCo': 'Nila',
      'default': 'Nila',
    },
    polly: {
      'Matthew': 'Matthew',
      'default': 'Matthew',
    },
    deepgram: {
      'Asteria': 'Asteria',
      'default': 'Asteria',
    },
  };

  return {
    provider,
    name: voiceNames[provider]?.[voiceId] || voiceId,
  };
}

function extractSystemPrompt(agent: any): string {
  return agent.agent_prompts?.task_1?.system_prompt || '';
}

function getVoiceModel(provider: string): string {
  const models: Record<string, string> = {
    elevenlabs: 'eleven_turbo_v2_5',
    polly: 'generative',
    deepgram: 'aura-asteria-en',
  };
  return models[provider] || 'eleven_turbo_v2_5';
}
