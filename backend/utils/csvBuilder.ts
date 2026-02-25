import { ICustomer } from "../models/Customer.js";
import { normalizePhone } from "./phoneUtils.js";

/**
 * Converts Customer documents → Bolna-compliant CSV Buffer.
 * Required: contact_number (E.164)
 * Custom: first_name, full_name, history, status (used as agent context variables)
 */
export function buildCampaignCsv(customers: ICustomer[]): Buffer {
  if (!customers || customers.length === 0) {
    throw new Error("No customers provided to build CSV");
  }

  const header = "contact_number,first_name,full_name,history,status";

  const rows = customers.map((c) => {
    const lastConvo = c.pastConversations?.slice(-1)[0];
    const history = lastConvo
      ? `${lastConvo.summary || ""}. ${lastConvo.notes || ""}`.trim().replace(/\.$/, "")
      : "No previous conversation";

    const firstName = c.name.split(" ")[0];
    const fullName = c.name;

    // Escape fields that might contain commas or quotes
    const escape = (val: string) => {
      const str = String(val ?? "");
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    };

    return [
      escape(normalizePhone(c.phoneNumber)),  // E.164 — MANDATORY for Bolna
      escape(firstName),
      escape(fullName),
      escape(history),
      escape(c.status),
    ].join(",");
  });

  const csv = [header, ...rows].join("\n");
  return Buffer.from(csv, "utf-8");
}
