/**
 * Agent Builder Types
 * Type definitions for generative agent configuration
 */

export interface BuilderAgentConfig {
  name: string;
  description: string;
  logo_url?: string;
  primary_color?: string;
  services: string[];
  tone?: string;
  system_prompt: string;
  nodes: NodeConfig[];
  entry_node_id: string;
  tools: ToolConfig[];
  triggers: TriggerConfig[];
  source_url?: string;
  generated_from_prompt?: string;
  version: string;
}

export interface NodeConfig {
  node_id: string;
  node_type: "trigger" | "action" | "logic" | "handoff";
  label: string;
  description?: string;
  tool_config?: ToolConfig;
  logic_config?: LogicNodeConfig;
  trigger_event?: string;
  next_nodes: string[];
}

export interface ToolConfig {
  tool_type: "google_calendar" | "whatsapp_sender" | "stripe_payment" | "handoff";
  name: string;
  description: string;
  parameters: Record<string, any>;
  enabled: boolean;
}

export interface LogicNodeConfig {
  condition: string;
  true_path: string;
  false_path: string;
}

export interface TriggerConfig {
  type: string;
  event: string;
  parameters?: Record<string, any>;
}

