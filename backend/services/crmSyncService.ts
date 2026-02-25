import { Customer, CustomerStatus } from "../models/Customer.js";
import { IUser } from "../models/User.js";
import { getAgents, getAgentExecutions } from "./bolnaService.js";
import { normalizePhone } from "../utils/phoneUtils.js";
import mongoose from "mongoose";

/**
 * Service to sync Bolna Agent Executions into CRM Customers
 */
export async function syncBolnaToCrm(user: IUser) {
    console.log(`[CrmSync] Starting sync for user: ${user.email}`);

    try {
        // 1. Fetch all agents
        const agents = await getAgents(user);
        if (!agents || agents.length === 0) {
            console.log(`[CrmSync] No agents found for user ${user.email}`);
            return { processed: 0, updated: 0, created: 0 };
        }

        let totalProcessed = 0;
        let totalCreated = 0;
        let totalUpdated = 0;

        // 2. Iterate through all agents
        for (const agent of agents) {
            try {
                // Fetch executions for this agent
                const executionsResponse = await getAgentExecutions(user, agent.id, { page_size: 50 });
                const executions = executionsResponse.data || [];

                for (const execution of executions) {
                    const telephony = execution.telephony_data;
                    if (!telephony) {
                        console.log(`[CrmSync] Skipping execution ${execution.execution_id} - No telephony data (likely web/preview)`);
                        continue;
                    }

                    // Determine customer phone number
                    const phoneNumber = telephony.call_type === "inbound"
                        ? telephony.from_number
                        : telephony.to_number;

                    if (!phoneNumber) continue;

                    totalProcessed++;

                    // Map Bolna data to CRM Status
                    const status = mapBolnaStatusToCrm(execution);

                    // Extract name if available
                    let name = "Bolna Lead";
                    if (execution.extracted_data?.name) {
                        name = execution.extracted_data.name;
                    } else if (execution.context_details?.name) {
                        name = execution.context_details.name;
                    } else if (execution.telephony_data?.name) {
                        name = execution.telephony_data.name;
                    }

                    // Prepare past conversation entry
                    const conversationEntry = {
                        date: new Date(execution.created_at),
                        summary: execution.extracted_data?.summary || `Call with ${agent.agent_name}`,
                        notes: execution.transcript || "No transcript available",
                    };

                    // Upsert into CRM Customer
                    const normalizedNum = normalizePhone(phoneNumber);

                    // We use findOneAndUpdate with upsert to be atomic and avoid E11000
                    const updateData: any = {
                        name: name, // Update name if it changed
                        updatedAt: new Date()
                    };

                    try {
                        // First check if it exists to decide on status update logic
                        const existing = await Customer.findOne({
                            userId: user._id,
                            phoneNumber: normalizedNum
                        });

                        if (existing) {
                            if (status !== "fresh" && existing.status === "fresh") {
                                updateData.status = status;
                            } else if (status === "booked") {
                                updateData.status = "booked";
                            }

                            // Check if this conversation is already added
                            const alreadyAdded = existing.pastConversations?.some(
                                (c: any) => c.date.getTime() === conversationEntry.date.getTime()
                            );

                            const updateQuery: any = { $set: updateData };
                            if (!alreadyAdded && conversationEntry.notes !== "No transcript available") {
                                updateQuery.$push = { pastConversations: conversationEntry };
                                totalUpdated++;
                            }

                            await Customer.updateOne({ _id: existing._id }, updateQuery);
                        } else {
                            // Create new
                            await Customer.create({
                                userId: user._id,
                                name: name,
                                phoneNumber: normalizedNum,
                                status: status,
                                pastConversations: conversationEntry.notes !== "No transcript available" ? [conversationEntry] : [],
                                createdAt: new Date(execution.created_at),
                            });
                            totalCreated++;
                        }
                    } catch (err: any) {
                        // Handle race conditions where another agent sync might have just created the record
                        if (err.code === 11000) {
                            console.log(`[CrmSync] Race condition for ${normalizedNum}, retrying update...`);
                            // Minimal update on collision
                            await Customer.updateOne(
                                { userId: user._id, phoneNumber: normalizedNum },
                                { $set: { updatedAt: new Date() } }
                            );
                        } else {
                            throw err;
                        }
                    }
                }
            } catch (agentErr: any) {
                console.error(`[CrmSync] Error syncing agent ${agent.id}:`, agentErr.message);
            }
        }

        console.log(`[CrmSync] Finished. Processed: ${totalProcessed}, Created: ${totalCreated}, Updated: ${totalUpdated}`);
        return { processed: totalProcessed, created: totalCreated, updated: totalUpdated };

    } catch (err: any) {
        console.error(`[CrmSync] Global error for user ${user.email}:`, err.message);
        throw err;
    }
}

/**
 * Maps Bolna execution status/intent to CRM CustomerStatus
 */
function mapBolnaStatusToCrm(execution: any): CustomerStatus {
    const status = execution.status;
    const intent = execution.extracted_data?.intent || "";

    if (intent === "booked" || intent.includes("book")) return "booked";
    if (intent === "interested") return "interested";
    if (intent === "not_interested") return "not_interested";

    if (status === "busy" || status === "no-answer") return "NA";
    if (status === "completed") return "interested"; // If completed but intent not clear, mark as interested

    return "fresh";
}
