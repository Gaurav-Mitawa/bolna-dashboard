// removed unused imports
// removed unused variable purchasedCount

// --- TYPES (Shared State) ---

export type AgentRole = "main" | "followup" | "inbound" | "outbound";

// Extended Tag type matching the expanded lead status system
// Covers full lead lifecycle from first contact to final outcome
export type Tag =
  | "fresh"                    // New untouched lead
  | "fresh_na"                 // Attempted call, no answer
  | "converted"                // Showed interest, ready for follow-up
  | "follow_up"                // Generic follow-up needed
  | "follow_up_interested"     // Follow-up: positive response
  | "follow_up_not_interested" // Follow-up: negative response
  | "follow_up_converted"      // Follow-up: converted to next stage
  | "not_interested"           // Dead lead - explicitly declined (alias: ni)
  | "purchased"                // Final success - made purchase
  | "ni";                      // Legacy alias for not_interested

export type CallResult = "answered" | "no_answer" | "declined" | "converted_to_purchase";

export interface Contact {
  id: string;
  name: string;
  email: string;
  phone: string;
  personalization: Record<string, any>;
  tags: Tag[];
  sum1: number;
  followUpSummaries: Array<{ timestamp: string; summary: string; agentRole: string }>;
  purchased: boolean;
  lastContactedAt?: string;
  noAnswerCount: number;
}

export interface AgentJob {
  jobId: string;
  role: AgentRole;
  status: "running" | "completed" | "stopped";
  options: any;
  logs: Array<{ timestamp: string; message: string; type: "info" | "call" | "error" }>;
}

export interface Metrics {
  callQuality: { good: number; warn: number; bad: number };
  revenue: { inbound: number; outbound: number; total: number };
}

// --- STATE MACHINE UTILS ---
// Handles lead tag transitions based on call outcomes
// Supports the expanded tag system with follow-up sub-states

export const getNextTag = (
  currentTag: Tag,
  result: CallResult,
  interested: boolean,
  noAnswerCount: number,
  maxNoAnswers = 3
): Tag => {
  // Terminal states - no further transitions
  if (currentTag === "purchased") return "purchased";
  if (currentTag === "not_interested" || currentTag === "ni") return "not_interested";

  // Conversion to purchase - always transitions to purchased
  if (result === "converted_to_purchase") return "purchased";

  // Explicit decline - mark as not interested
  if (result === "declined") return "not_interested";

  // No answer handling
  if (result === "no_answer") {
    if (noAnswerCount >= maxNoAnswers) return "not_interested";
    return "fresh_na";
  }

  // Answered call logic - depends on current state and interest
  if (result === "answered") {
    // Fresh leads
    if (currentTag === "fresh" || currentTag === "fresh_na") {
      return interested ? "converted" : "not_interested";
    }

    // Follow-up calls - use detailed follow-up sub-states
    if (currentTag === "converted" || currentTag === "follow_up") {
      if (interested) return "follow_up_interested";
      return "follow_up_not_interested";
    }

    // Follow-up interested → can convert or purchase
    if (currentTag === "follow_up_interested") {
      return interested ? "follow_up_converted" : "follow_up_not_interested";
    }

    // Follow-up converted → ready for purchase
    if (currentTag === "follow_up_converted") {
      return interested ? "purchased" : "follow_up_not_interested";
    }
  }

  return currentTag;
};


// --- MOCK DATABASE ---

const SEED_CONTACTS: Contact[] = [
  {
    id: "g-1001",
    name: "Sarah Johnson",
    email: "sarah.j@example.com",
    phone: "+1 (555) 123-4567",
    personalization: { roomType: "Deluxe Suite", specialRequests: "Late check-in" },
    tags: ["fresh"],
    sum1: 1200,
    followUpSummaries: [],
    purchased: false,
    noAnswerCount: 0
  },
  {
    id: "g-1002",
    name: "Michael Chen",
    email: "m.chen@corporate.co",
    phone: "+1 (555) 987-6543",
    personalization: { roomType: "Standard King", conference: "TechSummit 2025" },
    tags: ["fresh_na"],
    sum1: 5400,
    followUpSummaries: [{ timestamp: "2024-11-24T10:00:00Z", summary: "Left voicemail", agentRole: "main" }],
    purchased: false,
    noAnswerCount: 1,
    lastContactedAt: "2024-11-24T10:00:00Z"
  },
  {
    id: "g-1003",
    name: "Emma Wilson",
    email: "emma.w@startup.io",
    phone: "+1 (555) 456-7890",
    personalization: { interestedIn: "Spa Package" },
    tags: ["converted"], // Ready for follow-up
    sum1: 0,
    followUpSummaries: [{ timestamp: "2024-11-28T14:30:00Z", summary: "Interested in Spa details", agentRole: "main" }],
    purchased: false,
    noAnswerCount: 0
  },
  {
    id: "g-1004",
    name: "James Rodriguez",
    email: "james.r@global.net",
    phone: "+1 (555) 234-5678",
    personalization: { previousGuest: true },
    tags: ["purchased"],
    sum1: 850,
    followUpSummaries: [],
    purchased: true,
    noAnswerCount: 0
  },
  {
    id: "g-1005",
    name: "Lisa Patel",
    email: "lisa.p@techsolutions.com",
    phone: "+1 (555) 876-5432",
    personalization: { referral: "Mike" },
    tags: ["ni"],
    sum1: 0,
    followUpSummaries: [],
    purchased: false,
    noAnswerCount: 3
  },
  {
    id: "g-1006",
    name: "David Kim",
    email: "d.kim@mail.com",
    phone: "+1 (555) 111-2222",
    personalization: { roomType: "Family Suite" },
    tags: ["fresh"],
    sum1: 2000,
    followUpSummaries: [],
    purchased: false,
    noAnswerCount: 0
  }
];

class MockServer {
  private contacts: Contact[] = [...SEED_CONTACTS];
  private activeJobs: AgentJob[] = [];
  private listeners: Array<(event: any) => void> = [];

  // --- API SIMULATION ---

  async getContacts(): Promise<Contact[]> {
    return new Promise(resolve => setTimeout(() => resolve([...this.contacts]), 400));
  }

  async getContact(id: string): Promise<Contact | undefined> {
    const contact = this.contacts.find(c => c.id === id);
    return new Promise(resolve => setTimeout(() => resolve(contact ? { ...contact } : undefined), 200));
  }

  async importContacts(newContacts: Partial<Contact>[]): Promise<number> {
    const added = newContacts.map((c, i) => ({
      id: `g-new-${Date.now()}-${i}`,
      name: c.name || "Unknown",
      email: c.email || "",
      phone: c.phone || "",
      personalization: c.personalization || {},
      tags: ["fresh"] as Tag[],
      sum1: c.sum1 || 0,
      followUpSummaries: [],
      purchased: false,
      noAnswerCount: 0
    }));
    this.contacts = [...this.contacts, ...added];
    return new Promise(resolve => setTimeout(() => resolve(added.length), 800));
  }

  async getMetrics(filterAgent: "inbound" | "outbound" | "total"): Promise<Metrics> {
    // Simulate dynamic metrics based on contacts state
    // removed unused variable purchasedCount
    const totalRev = this.contacts.reduce((acc, c) => acc + (c.purchased ? c.sum1 : 0), 0);

    let metrics: Metrics = {
      callQuality: { good: 65, warn: 25, bad: 10 },
      revenue: { inbound: 0, outbound: 0, total: 0 }
    };

    if (filterAgent === "inbound") {
      metrics.revenue = { inbound: totalRev * 0.4, outbound: 0, total: totalRev * 0.4 };
    } else if (filterAgent === "outbound") {
      metrics.revenue = { inbound: 0, outbound: totalRev * 0.6, total: totalRev * 0.6 };
    } else {
      metrics.revenue = { inbound: totalRev * 0.4, outbound: totalRev * 0.6, total: totalRev };
    }

    return new Promise(resolve => setTimeout(() => resolve(metrics), 300));
  }

  async runAgent(role: AgentRole, options: any): Promise<{ jobId: string }> {
    const jobId = `job-${Date.now()}`;
    const job: AgentJob = {
      jobId,
      role,
      status: "running",
      options,
      logs: [{ timestamp: new Date().toISOString(), message: `Agent ${role} started`, type: "info" }]
    };
    this.activeJobs.push(job);

    // Start Simulation Loop
    this.simulateAgentLoop(jobId);

    return new Promise(resolve => setTimeout(() => resolve({ jobId }), 500));
  }

  async stopAgent(jobId: string): Promise<boolean> {
    const job = this.activeJobs.find(j => j.jobId === jobId);
    if (job) {
      job.status = "stopped";
      job.logs.push({ timestamp: new Date().toISOString(), message: "Agent stopped by user", type: "info" });
      this.emitEvent({ type: "job_update", jobId, job });
    }
    return Promise.resolve(true);
  }

  async createCall(payload: { contactId: string; agentRole: AgentRole; summary: string; result: CallResult; interested: boolean }): Promise<Contact> {
    const contactIndex = this.contacts.findIndex(c => c.id === payload.contactId);
    if (contactIndex === -1) throw new Error("Contact not found");

    const contact = this.contacts[contactIndex];

    // 1. Update No Answer Count
    if (payload.result === "no_answer") {
      contact.noAnswerCount += 1;
    } else if (payload.result === "answered") {
      contact.noAnswerCount = 0; // Reset on answer? Or keep history? Resetting for demo.
    }

    // 2. State Machine Transition
    const currentTag = contact.tags[0] || "fresh";
    const newTag = getNextTag(currentTag, payload.result, payload.interested, contact.noAnswerCount);

    contact.tags = [newTag]; // Single tag model for now
    contact.lastContactedAt = new Date().toISOString();

    // 3. Update Summary
    contact.followUpSummaries.push({
      timestamp: new Date().toISOString(),
      summary: payload.summary,
      agentRole: payload.agentRole
    });

    // 4. Update Purchase Status
    if (newTag === "purchased") {
      contact.purchased = true;
      // Simulate revenue bump if sum1 was 0?
      if (contact.sum1 === 0) contact.sum1 = 1500;
    }

    this.contacts[contactIndex] = contact;
    return Promise.resolve({ ...contact });
  }

  // --- INTERNAL SIMULATION ---

  private simulateAgentLoop(jobId: string) {
    const interval = setInterval(() => {
      const job = this.activeJobs.find(j => j.jobId === jobId);
      if (!job || job.status !== "running") {
        clearInterval(interval);
        return;
      }

      // Pick a random contact to "call"
      const eligibleContacts = this.contacts.filter(c => !c.purchased && !c.tags.includes("ni"));
      if (eligibleContacts.length === 0) {
        job.logs.push({ timestamp: new Date().toISOString(), message: "No eligible contacts remaining.", type: "info" });
        job.status = "completed";
        this.emitEvent({ type: "job_update", jobId, job });
        clearInterval(interval);
        return;
      }

      const contact = eligibleContacts[Math.floor(Math.random() * eligibleContacts.length)];

      // Simulate Call Result
      const outcomes: CallResult[] = ["answered", "no_answer", "declined", "converted_to_purchase"];
      const result = outcomes[Math.floor(Math.random() * outcomes.length)];
      const interested = Math.random() > 0.5;

      // Log
      const logMsg = `Calling ${contact.name} (${contact.phone})... Result: ${result}`;
      job.logs.push({ timestamp: new Date().toISOString(), message: logMsg, type: "call" });
      this.emitEvent({ type: "job_log", jobId, log: job.logs[job.logs.length - 1] });

      // Execute Call Logic (State Machine)
      this.createCall({
        contactId: contact.id,
        agentRole: job.role,
        summary: `Auto-call: ${result}`,
        result,
        interested
      }).then(updatedContact => {
        this.emitEvent({ type: "contact_update", contact: updatedContact });
      });

    }, 4000); // Every 4 seconds
  }

  // --- EVENTS ---

  subscribe(callback: (event: any) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  private emitEvent(event: any) {
    this.listeners.forEach(l => l(event));
  }
}

export const mockServer = new MockServer();

