import { useState, useEffect, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users,
  Filter,
  Loader2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Search,
  Plus,
  Upload,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { CustomersTable } from "@/components/customers/CustomersTable";
import type { CrmCustomer } from "@/api/crm";
import { crmApi } from "@/api/crm";
import { ContactDetailModal } from "@/components/customers/ContactDetailModal";
import { AddLeadModal } from "@/components/customers/AddLeadModal";
import { BulkUploadModal } from "@/components/customers/BulkUploadModal";
import { EditLeadModal } from "@/components/customers/EditLeadModal";
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
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const [selectedContact, setSelectedContact] = useState<CrmCustomer | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkUploadModalOpen, setIsBulkUploadModalOpen] = useState(false);
  const [contactToEdit, setContactToEdit] = useState<CrmCustomer | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const {
    data: contactsData,
    isLoading,
    error: queryError,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["crm-customers", page, search, statusFilter],
    queryFn: () =>
      crmApi.getAll({
        page,
        limit: PAGE_SIZE,
        search: search || undefined,
        status: statusFilter !== "all" ? (statusFilter as any) : undefined,
      }),
    staleTime: 0,
  });

  useEffect(() => {
    if (contactsData && !isLoading) {
      setLastRefreshed(new Date());
    }
  }, [contactsData, isLoading]);

  const customers = contactsData?.customers || [];
  const totalCount = contactsData?.total || 0;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const refreshData = async () => {
    try {
      await refetch();
      toast.success("Data refreshed");
    } catch {
      toast.error("Failed to refresh data");
    }
  };

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

  const handleViewContact = useCallback((contact: CrmCustomer) => {
    setSelectedContact(contact);
    setIsDetailModalOpen(true);
  }, []);

  const handleEditContact = (contact: CrmCustomer) => {
    setContactToEdit(contact);
    setIsEditModalOpen(true);
  };

  const handleDeleteContact = async (contact: CrmCustomer) => {
    if (window.confirm(`Are you sure you want to delete ${contact.name}?`)) {
      try {
        await crmApi.delete(contact._id);
        toast.success("Lead deleted successfully");
        refetch();
      } catch (err: any) {
        toast.error(err.response?.data?.message || "Failed to delete lead");
      }
    }
  };
  const handleSyncBolna = async () => {
    const toastId = toast.loading("Syncing with Bolna...");
    try {
      const result = await crmApi.syncBolna();
      if (result.success) {
        toast.success(`Sync complete! Created: ${result.data.created}, Updated: ${result.data.updated}`, { id: toastId });
        refetch();
      } else {
        toast.error("Sync failed", { id: toastId });
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || "Failed to sync with Bolna", { id: toastId });
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 sm:p-6 rounded-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="h-10 w-10 sm:h-12 sm:w-12 rounded-xl bg-blue-600 text-white flex items-center justify-center flex-shrink-0">
              <Users className="h-5 w-5 sm:h-6 sm:w-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-lg sm:text-xl font-semibold text-gray-900">CRM Customers</p>
              <p className="text-xs sm:text-sm text-gray-500">
                <span className="hidden sm:inline">Manage your lead pipeline</span>
                <span className="sm:hidden">Lead pipeline</span>
                {lastRefreshed && (
                  <span className="text-gray-400 ml-2 hidden sm:inline">
                    (Last refreshed: {getLastRefreshedText()})
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <Button
              className="h-9 sm:h-10 bg-blue-600 hover:bg-blue-700 text-white gap-1.5"
              onClick={() => setIsAddModalOpen(true)}
            >
              <Plus className="h-4 w-4" />
              <span>Add Lead</span>
            </Button>
            <Button
              variant="outline"
              className="h-9 sm:h-10 text-gray-700 gap-1.5 border-gray-300"
              onClick={() => setIsBulkUploadModalOpen(true)}
            >
              <Upload className="h-4 w-4" />
              <span>Bulk Upload</span>
            </Button>
            <Button
              variant="outline"
              className="h-9 sm:h-10 text-blue-600 border-blue-200 hover:bg-blue-50 gap-1.5"
              onClick={handleSyncBolna}
            >
              <RefreshCw className="h-4 w-4" />
              <span>Sync from Bolna</span>
            </Button>
            <Button
              variant="ghost"
              className="h-9 sm:h-10 text-gray-500 gap-1.5 p-2"
              onClick={refreshData}
              disabled={isRefetching}
            >
              <RefreshCw className={cn("h-4 w-4", isRefetching && "animate-spin")} />
            </Button>
          </div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-1">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name or phone..."
              className="pl-9 bg-gray-50 text-sm h-9 border-gray-200"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-[160px] text-sm border-gray-200 focus:ring-blue-500">
                <SelectValue placeholder="Status Filter" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="fresh">Fresh</SelectItem>
                <SelectItem value="interested">Interested</SelectItem>
                <SelectItem value="not_interested">Not Interested</SelectItem>
                <SelectItem value="booked">Booked</SelectItem>
                <SelectItem value="queries">Queries</SelectItem>
                <SelectItem value="NA">N/A</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="text-xs sm:text-sm text-gray-500 font-medium">
          {totalCount} total customers
        </div>
      </div>

      {/* Error Display */}
      {queryError && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
          <p className="text-red-700 font-medium text-sm">Error loading customers</p>
          <p className="text-red-600 text-xs">{(queryError as Error).message}</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={refreshData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      )}

      {/* Table */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20 bg-white border border-gray-100 rounded-xl">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      ) : customers.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-8 sm:p-16 text-center shadow-sm">
          <div className="h-16 w-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
            <Users className="h-8 w-8 text-gray-300" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No leads found
          </h3>
          <p className="text-gray-500 mb-6 max-w-sm mx-auto text-sm">
            {search || statusFilter !== "all"
              ? "We couldn't find any leads matching your current filters. Try resetting them."
              : "Your lead pipeline is empty. Start by adding a single lead or uploading a CSV file."}
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => setIsAddModalOpen(true)}>
              <Plus className="h-4 w-4 mr-2" /> Add Lead
            </Button>
            <Button variant="outline" onClick={() => setIsBulkUploadModalOpen(true)}>
              <Upload className="h-4 w-4 mr-2" /> Bulk Upload
            </Button>
          </div>
        </div>
      ) : (
        <CustomersTable
          data={customers}
          onView={handleViewContact}
          onEdit={handleEditContact}
          onDelete={handleDeleteContact}
        />
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="text-gray-600 hover:bg-gray-50"
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm font-medium text-gray-900 px-3 py-1 bg-gray-100 rounded-md">
              {page}
            </span>
            <span className="text-xs sm:text-sm text-gray-400">
              of {totalPages}
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
            className="text-gray-600 hover:bg-gray-50"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Modals */}
      <ContactDetailModal
        contact={selectedContact}
        open={isDetailModalOpen}
        onOpenChange={setIsDetailModalOpen}
      />

      <AddLeadModal
        open={isAddModalOpen}
        onOpenChange={setIsAddModalOpen}
        onSuccess={() => refetch()}
      />

      <BulkUploadModal
        open={isBulkUploadModalOpen}
        onOpenChange={setIsBulkUploadModalOpen}
        onSuccess={() => refetch()}
      />

      <EditLeadModal
        customer={contactToEdit}
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
