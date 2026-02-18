/**
 * Customers Table Component
 * Displays contact list with call history and metrics
 * Redesigned to match Image 1 style
 * Fully responsive with mobile card view and desktop table view
 */

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Phone,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Contact } from "@/api/bolnaContacts";
import { useIsMobile } from "@/hooks/use-mobile";

// Backend tag to UI status mapping (9 tags -> 4 UI statuses)
type UIStatus = "purchased" | "converted" | "fresh" | "not_interested";

export type { Contact };

const statusMap: Record<UIStatus, { label: string; className: string }> = {
  purchased: {
    label: "Purchased",
    className: "bg-green-100 text-green-700 border-green-200",
  },
  converted: {
    label: "Converted",
    className: "bg-blue-100 text-blue-700 border-blue-200",
  },
  fresh: {
    label: "Fresh",
    className: "bg-orange-100 text-orange-700 border-orange-200",
  },
  not_interested: {
    label: "Not Interested",
    className: "bg-red-100 text-red-700 border-red-200",
  },
};

// Map 9 backend tags to 4 UI statuses
function mapTagToStatus(tag: string): UIStatus {
  if (tag === "purchased") return "purchased";
  if (tag === "converted" || tag === "follow_up_converted")
    return "converted";
  if (tag === "not_interested" || tag === "follow_up_not_interested")
    return "not_interested";
  // All other tags map to "fresh"
  return "fresh";
}

// Format relative time
function formatRelativeTime(dateString: string): string {
  if (!dateString) return "Never";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  if (diffHours < 24) return `${diffHours} hours ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

interface CustomersTableProps {
  data: Contact[];
  onView: (contact: Contact) => void;
  onEdit?: (contact: Contact) => void;
  onDelete?: (contact: Contact) => void;
}

// Mobile Card Component
function ContactCard({
  contact,
  onView,
}: {
  contact: Contact;
  onView: (contact: Contact) => void;
}) {
  const uiStatus = mapTagToStatus(contact.tag);
  const statusConfig = statusMap[uiStatus];
  const mostRecentCall = contact.call_history?.[0];

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      {/* Header: Avatar + Name + Status */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold flex-shrink-0">
            {contact.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {contact.name}
            </p>
            {contact.is_manual_status && (
              <Badge
                variant="outline"
                className="text-[10px] mt-1 bg-yellow-50 text-yellow-700 border-yellow-200"
              >
                Manual
              </Badge>
            )}
          </div>
        </div>
        <Badge
          className={cn("text-xs font-medium px-2 py-0.5 flex-shrink-0", statusConfig.className)}
        >
          {statusConfig.label}
        </Badge>
      </div>

      {/* Contact Info */}
      <div className="space-y-2 mb-3">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <span className="truncate">{contact.phone || "N/A"}</span>
        </div>
        <div className="flex items-center justify-between">
          <Badge
            className={cn(
              "text-xs font-medium px-2 py-0.5",
              contact.source === "bolna_inbound"
                ? "bg-blue-100 text-blue-700 border-blue-200"
                : "bg-green-100 text-green-700 border-green-200"
            )}
          >
            {contact.source === "bolna_inbound" ? "Inbound" : "Outbound"}
          </Badge>
          {mostRecentCall && (
            <span className="text-xs text-gray-400">
              {formatRelativeTime(mostRecentCall.date)}
            </span>
          )}
        </div>
      </div>

      {/* Call Summary */}
      {mostRecentCall && (
        <div className="bg-gray-50 rounded-lg p-3 mb-3">
          <p className="text-xs text-gray-500 font-medium mb-1">Last Call Summary</p>
          <p className="text-sm text-gray-700 line-clamp-2">
            {mostRecentCall.summary || "No summary available"}
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onView(contact)}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white border-blue-600 h-9"
        >
          <Eye className="h-4 w-4 mr-1.5" />
          View Details
        </Button>
      </div>
    </div>
  );
}

export function CustomersTable({
  data,
  onView,
}: CustomersTableProps) {
  const isMobile = useIsMobile();

  // Mobile Card View
  if (isMobile) {
    return (
      <div className="space-y-3">
        {data.map((contact) => (
          <ContactCard
            key={contact.id}
            contact={contact}
            onView={onView}
          />
        ))}
      </div>
    );
  }

  // Desktop Table View
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Name
              </th>
              <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Contact
              </th>
              <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Status
              </th>
              <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Last Call Summary
              </th>
              <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((row) => {
              const uiStatus = mapTagToStatus(row.tag);
              const statusConfig = statusMap[uiStatus];
              const mostRecentCall = row.call_history?.[0];

              return (
                <tr
                  key={row.id}
                  className="hover:bg-gray-50 transition-colors"
                >
                  {/* Name */}
                  <td className="px-4 lg:px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold flex-shrink-0">
                        {row.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {row.name}
                        </p>
                        {row.is_manual_status && (
                          <Badge
                            variant="outline"
                            className="text-[10px] mt-1 bg-yellow-50 text-yellow-700 border-yellow-200"
                          >
                            Manual
                          </Badge>
                        )}
                      </div>
                    </div>
                  </td>

                  {/* Contact */}
                  <td className="px-4 lg:px-6 py-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        <span className="truncate">{row.phone || "N/A"}</span>
                      </div>
                      <div>
                        <Badge
                          className={cn(
                            "text-xs font-medium px-2 py-0.5",
                            row.source === "bolna_inbound"
                              ? "bg-blue-100 text-blue-700 border-blue-200"
                              : "bg-green-100 text-green-700 border-green-200"
                          )}
                        >
                          {row.source === "bolna_inbound" ? "Inbound" : "Outbound"}
                        </Badge>
                      </div>
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-4 lg:px-6 py-4">
                    <Badge
                      className={cn("text-xs font-medium px-3 py-1", statusConfig.className)}
                    >
                      {statusConfig.label}
                    </Badge>
                  </td>

                  {/* Last Call Summary */}
                  <td className="px-4 lg:px-6 py-4">
                    {mostRecentCall ? (
                      <div className="max-w-[200px] lg:max-w-xs">
                        <p className="text-sm text-gray-700 line-clamp-2">
                          {mostRecentCall.summary || "No summary available"}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatRelativeTime(mostRecentCall.date)}
                        </p>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">No calls yet</span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-4 lg:px-6 py-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onView(row)}
                      className="bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default CustomersTable;
