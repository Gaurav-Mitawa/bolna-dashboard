/**
 * Customers Table Component
 * Displays CRM customers with status and conversation history
 * Fully responsive with mobile card view and desktop table view
 */

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Phone, Mail, Eye, Edit2, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CrmCustomer } from "@/api/crm";
import { useIsMobile } from "@/hooks/use-mobile";

const statusMap: Record<string, { label: string; className: string }> = {
  fresh: { label: "Fresh", className: "bg-orange-100 text-orange-700 border-orange-200" },
  interested: { label: "Interested", className: "bg-blue-100 text-blue-700 border-blue-200" },
  not_interested: { label: "Not Interested", className: "bg-red-100 text-red-700 border-red-200" },
  booked: { label: "Booked", className: "bg-green-100 text-green-700 border-green-200" },
  NA: { label: "N/A", className: "bg-gray-100 text-gray-700 border-gray-200" },
};

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
  data: CrmCustomer[];
  onView: (customer: CrmCustomer) => void;
  onEdit?: (customer: CrmCustomer) => void;
  onDelete?: (customer: CrmCustomer) => void;
}

function ContactCard({
  contact,
  onView,
  onEdit,
  onDelete,
}: {
  contact: CrmCustomer;
  onView: (c: CrmCustomer) => void;
  onEdit?: (c: CrmCustomer) => void;
  onDelete?: (c: CrmCustomer) => void;
}) {
  const statusConfig = statusMap[contact.status] || statusMap.fresh;
  const conversations = contact.pastConversations || [];
  const lastConversation = conversations.length > 0 ? conversations[conversations.length - 1] : null;

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold flex-shrink-0">
            {contact.name.charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-gray-900 truncate">{contact.name}</p>
            {contact.email && (
              <p className="text-xs text-gray-500 truncate">{contact.email}</p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge
            className={cn("text-xs font-medium px-2 py-0.5 flex-shrink-0 whitespace-nowrap", statusConfig.className)}
          >
            {statusConfig.label}
          </Badge>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-blue-600" onClick={() => onEdit?.(contact)}>
              <Edit2 className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-red-600" onClick={() => onDelete?.(contact)}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="space-y-1 mb-3">
        <div className="flex items-center gap-2 text-sm text-gray-700">
          <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
          <span className="truncate">{contact.phoneNumber || "N/A"}</span>
        </div>
        {lastConversation && (
          <p className="text-xs text-gray-400 pl-6">
            Last: {formatRelativeTime(lastConversation.date)}
          </p>
        )}
      </div>

      {lastConversation?.summary && (
        <div className="bg-gray-50 rounded-lg p-3 mb-3 text-left">
          <p className="text-xs text-gray-500 font-medium mb-1">Last Conversation</p>
          <p className="text-sm text-gray-700 line-clamp-2">{lastConversation.summary}</p>
        </div>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={() => onView(contact)}
        className="w-full bg-[#F15E04] hover:bg-[#d94f04] text-white border-[#F15E04] h-9"
      >
        <Eye className="h-4 w-4 mr-1.5" />
        View Details
      </Button>
    </div>
  );
}

export function CustomersTable({ data, onView, onEdit, onDelete }: CustomersTableProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div className="space-y-3">
        {data.map((contact) => (
          <ContactCard key={contact._id} contact={contact} onView={onView} onEdit={onEdit} onDelete={onDelete} />
        ))}
      </div>
    );
  }

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
                Last Conversation
              </th>
              <th className="px-4 lg:px-6 py-3 text-right text-xs font-semibold text-gray-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map((row) => {
              const statusConfig = statusMap[row.status] || statusMap.fresh;
              const conversations = row.pastConversations || [];
              const lastConversation =
                conversations.length > 0 ? conversations[conversations.length - 1] : null;

              return (
                <tr key={row._id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 lg:px-6 py-4 text-left">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-semibold flex-shrink-0">
                        {row.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{row.name}</p>
                        {row.email && (
                          <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <Mail className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate max-w-[140px]">{row.email}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-4 lg:px-6 py-4 text-left">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                      <span className="truncate">{row.phoneNumber || "N/A"}</span>
                    </div>
                  </td>

                  <td className="px-4 lg:px-6 py-4 text-left">
                    <Badge
                      className={cn("text-xs font-medium px-3 py-1", statusConfig.className)}
                    >
                      {statusConfig.label}
                    </Badge>
                  </td>

                  <td className="px-4 lg:px-6 py-4 text-left">
                    {lastConversation?.summary ? (
                      <div className="max-w-[200px] lg:max-w-xs">
                        <p className="text-sm text-gray-700 line-clamp-2">
                          {lastConversation.summary}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatRelativeTime(lastConversation.date)}
                        </p>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">No conversations yet</span>
                    )}
                  </td>

                  <td className="px-4 lg:px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onView(row)}
                        className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                        title="View Details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onEdit?.(row)}
                        className="h-8 w-8 text-slate-500 hover:bg-slate-50"
                        title="Edit Lead"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete?.(row)}
                        className="h-8 w-8 text-gray-400 hover:text-red-600 hover:bg-red-50"
                        title="Delete Lead"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>

                    </div>
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
