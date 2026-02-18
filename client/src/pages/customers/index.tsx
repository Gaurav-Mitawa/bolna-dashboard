import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Filter, Loader2, ChevronLeft, ChevronRight, RefreshCw, Phone, Search } from "lucide-react";
import { CustomersTable, type Contact } from "@/components/customers/CustomersTable";
import { ContactDetailModal } from "@/components/customers/ContactDetailModal";
import { CallSummaryModal } from "@/components/customers/CallSummaryModal";
import { contactsApi } from "@/api/bolnaContacts";
import type { CallHistoryItem } from "@/api/bolnaContacts";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const PAGE_SIZE = 10;

export default function CustomersIndexPage() {
  // State
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  
  // Modal states
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [selectedCall, setSelectedCall] = useState<CallHistoryItem | null>(null);
  const [isCallModalOpen, setIsCallModalOpen] = useState(false);

  // Fetch contacts directly from Bolna API
  const { data: contactsData, isLoading, error: queryError, refetch, isRefetching } = useQuery({
    queryKey: ["bolna-contacts", page, search, statusFilter, sourceFilter],
    queryFn: () =>
      contactsApi.getContacts(page, PAGE_SIZE, {
        search: search || undefined,
        tag: statusFilter !== "all" ? [statusFilter] : undefined,
        source: sourceFilter !== "all" ? [sourceFilter] : undefined,
      }),
    staleTime: 0, // Always fetch fresh data
  });

  // Update last refreshed time on successful fetch
  useEffect(() => {
    if (contactsData && !isLoading) {
      setLastRefreshed(new Date());
    }
  }, [contactsData, isLoading]);

  const contacts = contactsData?.items || [];
  const totalPages = contactsData?.total_pages || 1;
  const totalCount = contactsData?.total || 0;

  // Refresh data from Bolna
  const refreshData = async () => {
    try {
      await refetch();
      toast.success("Data refreshed from Bolna");
    } catch (error) {
      console.error("Refresh error:", error);
      toast.error("Failed to refresh data");
    }
  };

  // Format last refreshed time
  const getLastRefreshedText = () => {
    if (!lastRefreshed) return "Never";
    const diff = Date.now() - lastRefreshed.getTime();
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return "Just now";
    if (minutes === 1) return "1 min ago";
    if (minutes < 60) return `${minutes} mins ago`;
    const hours = Math.floor(minutes / 60);
    if (hours === 1) return "1 hour ago";
    return `${hours} hours ago`;
  };

  // Handle view contact - opens detail modal
  const handleViewContact = useCallback((contact: Contact) => {
    setSelectedContact(contact);
    setIsDetailModalOpen(true);
  }, []);

  // Handle call click from detail modal - opens call summary modal
  const handleCallClick = useCallback((call: CallHistoryItem) => {
    setSelectedCall(call);
    setIsCallModalOpen(true);
  }, []);

  // Handle edit contact - disabled since API-only mode
  const handleEditContact = useCallback((_contact: Contact) => {
    toast.info("Editing contacts is disabled in API-only mode. Data comes directly from Bolna executions.");
  }, []);

  // Handle delete contact - disabled since API-only mode
  const handleDeleteContact = useCallback((_contact: Contact) => {
    toast.info("Deleting contacts is disabled in API-only mode. Data comes directly from Bolna executions.");
  }, []);

  return (
    <div className="space-y-4">
      {/* Header - Responsive */}
      <div className="bg-white border-b border-gray-200 p-4 sm:p-6 rounded-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
              <Users className="h-5 w-5 sm:h-6 sm:w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-lg sm:text-xl font-semibold text-gray-900">Customers Lead</p>
              <p className="text-xs sm:text-sm text-gray-500">
                <span className="hidden sm:inline">View customer interactions from Bolna executions</span>
                <span className="sm:hidden">Bolna customer data</span>
                {lastRefreshed && (
                  <span className="text-gray-400 ml-2 hidden sm:inline">
                    (Last refreshed: {getLastRefreshedText()})
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <div className="relative flex-1 sm:flex-none">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 sm:hidden" />
              <Input 
                placeholder="Search by name or phone..." 
                className="w-full sm:w-64 bg-gray-50 pl-9 sm:pl-3 text-sm"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Button 
              variant="outline" 
              className="h-9 sm:h-10 text-gray-700 gap-1.5 flex-shrink-0 text-sm"
              onClick={refreshData}
              disabled={isRefetching}
              title={`Last refreshed: ${getLastRefreshedText()}`}
            >
              {isRefetching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Filters - Responsive */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-0 bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="flex items-center gap-1 text-sm text-gray-700">
            <Filter className="h-4 w-4 text-gray-500" /> 
            <span className="hidden sm:inline">Filters:</span>
          </span>
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="h-8 w-[130px] sm:w-32 text-sm">
              <SelectValue placeholder="Source: All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Source: All</SelectItem>
              <SelectItem value="bolna_inbound">Bolna Inbound</SelectItem>
              <SelectItem value="bolna_outbound">Bolna Outbound</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-[130px] sm:w-32 text-sm">
              <SelectValue placeholder="Status: All" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Status: All</SelectItem>
              <SelectItem value="purchased">Purchased</SelectItem>
              <SelectItem value="converted">Converted</SelectItem>
              <SelectItem value="fresh">Fresh</SelectItem>
              <SelectItem value="fresh_na">Fresh - NA</SelectItem>
              <SelectItem value="not_interested">Not Interested</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-xs sm:text-sm text-gray-500">
          Showing {contacts.length} of {totalCount} contacts
        </div>
      </div>

      {/* Error Display */}
      {queryError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
          <p className="text-red-700 font-medium text-sm sm:text-base">Error loading contacts</p>
          <p className="text-red-600 text-xs sm:text-sm">{(queryError as Error).message}</p>
          <Button 
            variant="outline" 
            size="sm" 
            className="mt-2"
            onClick={refreshData}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
        </div>
      ) : contacts.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 sm:p-12 text-center">
          <Phone className="h-10 w-10 sm:h-12 sm:w-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No contacts found</h3>
          <p className="text-gray-500 mb-4 text-sm sm:text-base">
            {search || statusFilter !== "all" || sourceFilter !== "all"
              ? "Try adjusting your filters"
              : "No execution data available from Bolna API. Make sure your API key is configured."}
          </p>
          <Button variant="outline" onClick={refreshData} disabled={isRefetching}>
            {isRefetching ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Refresh Data
          </Button>
        </div>
      ) : (
        <CustomersTable 
          data={contacts}
          onView={handleViewContact}
          onEdit={handleEditContact}
          onDelete={handleDeleteContact}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="text-sm"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Previous</span>
          </Button>
          <span className="text-xs sm:text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="text-sm"
          >
            <span className="hidden sm:inline">Next</span>
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Contact Detail Modal */}
      <ContactDetailModal
        contact={selectedContact}
        open={isDetailModalOpen}
        onOpenChange={setIsDetailModalOpen}
        onCallClick={handleCallClick}
      />

      {/* Call Summary Modal */}
      <CallSummaryModal
        isOpen={isCallModalOpen}
        onClose={() => setIsCallModalOpen(false)}
        call={selectedCall}
      />
    </div>
  );
}
