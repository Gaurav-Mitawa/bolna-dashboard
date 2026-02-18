import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getContacts, createContact, deleteContact, updateContact } from "@/api/contacts";
import { ContactDetailModal } from "@/components/contacts/ContactDetailModal";
import type { LeadTag } from "@/types";
import type { Contact } from "@/api/v2/contacts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Users, Upload, Download, Search, Plus, Loader2, Trash2, Eye, Pencil } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function ContactsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [tagFilter, setTagFilter] = useState<string>("all");
  const [sourceFilter, setSourceFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch contacts from backend
  const { data: contactsData, isLoading, error, refetch } = useQuery({
    queryKey: ['contacts', tagFilter, searchQuery],
    queryFn: () => getContacts({
      tag: tagFilter === 'all' ? undefined : tagFilter as LeadTag,
      search: searchQuery || undefined
    }),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  // Cast contacts to the expected type
  const contacts = contactsData as Contact[] | undefined;

  // Filter by source on frontend (if backend doesn't support it)
  const filteredContacts = useMemo(() => {
    if (!contacts) return [];
    return contacts.filter(contact => 
      sourceFilter === 'all' || contact.source === sourceFilter
    );
  }, [contacts, sourceFilter]);

  // Create contact mutation
  const createMutation = useMutation({
    mutationFn: createContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      setIsCreateOpen(false);
      toast({ title: "Contact created successfully ✅" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to create contact", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  // Delete contact mutation
  const deleteMutation = useMutation({
    mutationFn: deleteContact,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast({ title: "Contact deleted successfully" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to delete contact", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  // Update contact mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateContact(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      setIsEditOpen(false);
      setSelectedContact(null);
      toast({ title: "Contact updated successfully ✅" });
    },
    onError: (error: Error) => {
      toast({ 
        title: "Failed to update contact", 
        description: error.message,
        variant: "destructive" 
      });
    }
  });

  // Handlers
  const handleViewContact = (contact: Contact) => {
    setSelectedContact(contact);
    setIsDetailOpen(true);
  };

  const handleEditContact = (contact: Contact) => {
    setSelectedContact(contact);
    setIsEditOpen(true);
  };

  const handleUpdateContact = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedContact) return;
    
    const formData = new FormData(e.currentTarget);
    updateMutation.mutate({
      id: selectedContact.id,
      data: {
        name: formData.get('name') as string,
        email: formData.get('email') as string,
        phone: formData.get('phone') as string,
        tag: formData.get('tag') as LeadTag,
        source: formData.get('source') as string,
      }
    });
  };

  const handleCreateContact = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    createMutation.mutate({
      name: formData.get('name') as string,
      email: formData.get('email') as string,
      phone: formData.get('phone') as string,
      tag: formData.get('tag') as LeadTag,
      source: formData.get('source') as string,
    });
  };

  // Map tag to status badge style
  const getStatusBadgeClass = (tag: string) => {
    const styles: Record<string, string> = {
      'converted': 'bg-blue-100 text-blue-700 border-blue-200',
      'purchased': 'bg-green-100 text-green-700 border-green-200',
      'fresh': 'bg-orange-100 text-orange-700 border-orange-200',
      'Fresh-NA': 'bg-amber-100 text-amber-700 border-amber-200',
      'Not Interested': 'bg-red-100 text-red-700 border-red-200',
      'Follow-up': 'bg-purple-100 text-purple-700 border-purple-200',
    };
    return styles[tag] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  // Format tag display name
  const formatTagName = (tag: string) => {
    const names: Record<string, string> = {
      'converted': 'Converted',
      'purchased': 'Purchased',
      'fresh': 'Fresh',
      'Fresh-NA': 'Fresh - NA',
      'Not Interested': 'Not Interested',
      'Follow-up': 'Follow-up',
    };
    return names[tag] || tag;
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 p-4 rounded-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="h-12 w-12 rounded-xl bg-blue-600 text-white flex items-center justify-center">
              <Users className="h-6 w-6" />
            </span>
            <div>
              <p className="text-xl font-semibold text-gray-900">Contacts Lead</p>
              <p className="text-sm text-gray-500">Manage and track customer interactions and leads</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search guests..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 w-64 bg-gray-50"
              />
            </div>
            <Button variant="outline" className="h-9 text-gray-700 gap-1">
              <Upload className="h-4 w-4" />
              Import
            </Button>
            <Button variant="outline" className="h-9 text-gray-700 gap-1">
              <Download className="h-4 w-4" />
              Export
            </Button>
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="h-9 bg-[#F97316] hover:bg-[#ea6a0d]" onClick={() => setIsCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Contact
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                  <DialogTitle>Create New Contact</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateContact} className="space-y-4 mt-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Full Name *
                    </label>
                    <Input name="name" required placeholder="John Doe" />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Email Address *
                    </label>
                    <Input name="email" type="email" required placeholder="john@example.com" />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Phone Number *
                    </label>
                    <Input name="phone" required placeholder="+1 (555) 123-4567" />
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Status/Tag *
                    </label>
                    <Select name="tag" defaultValue="fresh">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fresh">Fresh</SelectItem>
                        <SelectItem value="Follow-up">Follow-up</SelectItem>
                        <SelectItem value="converted">Converted</SelectItem>
                        <SelectItem value="Not Interested">Not Interested</SelectItem>
                        <SelectItem value="Fresh-NA">Fresh - NA</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium text-gray-700 mb-2 block">
                      Source
                    </label>
                    <Select name="source" defaultValue="pms">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pms">PMS</SelectItem>
                        <SelectItem value="website">Website</SelectItem>
                        <SelectItem value="csv">CSV Upload</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => setIsCreateOpen(false)}
                      className="flex-1"
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="submit" 
                      className="flex-1 bg-[#F97316] hover:bg-[#ea6a0d]"
                      disabled={createMutation.isPending}
                    >
                      {createMutation.isPending ? (
                        <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...</>
                      ) : (
                        'Create Contact'
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center justify-between bg-white border border-gray-200 rounded-xl p-3 shadow-sm">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-sm text-gray-700">
            <Search className="h-4 w-4 text-gray-500" /> Filters:
          </span>
          
          <Select value={sourceFilter} onValueChange={setSourceFilter}>
            <SelectTrigger className="h-8 text-sm text-gray-700 bg-white w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Source: All</SelectItem>
              <SelectItem value="pms">PMS</SelectItem>
              <SelectItem value="website">Website</SelectItem>
              <SelectItem value="csv">CSV Upload</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={tagFilter} onValueChange={setTagFilter}>
            <SelectTrigger className="h-8 text-sm text-gray-700 bg-white w-[150px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Status: All</SelectItem>
              <SelectItem value="fresh">Fresh</SelectItem>
              <SelectItem value="Follow-up">Follow-up</SelectItem>
              <SelectItem value="converted">Converted</SelectItem>
              <SelectItem value="Not Interested">Not Interested</SelectItem>
              <SelectItem value="Fresh-NA">Fresh - NA</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="text-sm text-gray-500">
          Showing {filteredContacts?.length || 0} of {contacts?.length || 0} contacts
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-card rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center h-96">
            <Loader2 className="h-12 w-12 animate-spin text-gray-400 mb-4" />
            <p className="text-gray-500">Loading contacts...</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center h-96">
            <p className="text-red-500 font-medium mb-4">Failed to load contacts</p>
            <Button onClick={() => refetch()} variant="outline">
              Try Again
            </Button>
          </div>
        ) : !filteredContacts || filteredContacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-96">
            <p className="text-gray-400 text-lg mb-2">No contacts found</p>
            <p className="text-gray-500 text-sm">
              {searchQuery || tagFilter !== 'all' 
                ? 'Try adjusting your filters'
                : 'Click "Add Contact" to create your first contact'}
            </p>
          </div>
        ) : (
          <table className="min-w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Contact</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Last Call Summary</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredContacts.map((contact) => (
                <tr key={contact.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="text-sm font-semibold text-gray-900">{contact.name}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 text-sm text-gray-700">
                      <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span>{contact.phone}</span>
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
                      <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                      <span>{contact.email}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={cn("text-xs border font-medium", getStatusBadgeClass(contact.tag))}>
                      {formatTagName(contact.tag)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    <p className="text-sm text-gray-800 line-clamp-2">
                      {(contact as any).last_call_summary || 'No calls yet'}
                    </p>
                    {(contact as any).last_contacted_at && (
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date((contact as any).last_contacted_at).toLocaleString()}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Button 
                        size="sm" 
                        className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white px-3"
                        onClick={() => handleViewContact(contact)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <button 
                        className="p-2 rounded-md text-green-600 hover:bg-green-50"
                        onClick={() => handleEditContact(contact)}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button 
                        className="p-2 rounded-md text-red-600 hover:bg-red-50"
                        onClick={() => {
                          if (confirm(`Delete ${contact.name}?`)) {
                            deleteMutation.mutate(contact.id);
                          }
                        }}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* View Contact Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Contact Details</DialogTitle>
          </DialogHeader>
          {selectedContact && (
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Name</label>
                <p className="text-sm text-gray-900 mt-1">{selectedContact.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Email</label>
                <p className="text-sm text-gray-900 mt-1">{selectedContact.email}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Phone</label>
                <p className="text-sm text-gray-900 mt-1">{selectedContact.phone}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Status/Tag</label>
                <div className="mt-1">
                  <Badge className={cn("text-xs border font-medium", getStatusBadgeClass(selectedContact.tag))}>
                    {formatTagName(selectedContact.tag)}
                  </Badge>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Source</label>
                <p className="text-sm text-gray-900 mt-1">{selectedContact.source}</p>
              </div>
              {(selectedContact as any).last_call_summary && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Last Call Summary</label>
                  <p className="text-sm text-gray-900 mt-1">{(selectedContact as any).last_call_summary}</p>
                </div>
              )}
              {(selectedContact as any).last_contacted_at && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Last Contacted</label>
                  <p className="text-sm text-gray-900 mt-1">
                    {new Date((selectedContact as any).last_contacted_at).toLocaleString()}
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Contact Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Contact</DialogTitle>
          </DialogHeader>
          {selectedContact && (
            <form onSubmit={handleUpdateContact} className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Full Name *
                </label>
                <Input name="name" required defaultValue={selectedContact.name} />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Email Address *
                </label>
                <Input name="email" type="email" required defaultValue={selectedContact.email} />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Phone Number *
                </label>
                <Input name="phone" required defaultValue={selectedContact.phone} />
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Status/Tag *
                </label>
                <Select name="tag" defaultValue={selectedContact.tag}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="fresh">Fresh</SelectItem>
                    <SelectItem value="Follow-up">Follow-up</SelectItem>
                    <SelectItem value="converted">Converted</SelectItem>
                    <SelectItem value="Not Interested">Not Interested</SelectItem>
                    <SelectItem value="Fresh-NA">Fresh - NA</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Source
                </label>
                <Select name="source" defaultValue={selectedContact.source}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pms">PMS</SelectItem>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="csv">CSV Upload</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-3 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setIsEditOpen(false);
                    setSelectedContact(null);
                  }}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  className="flex-1 bg-[#F97316] hover:bg-[#ea6a0d]"
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? (
                    <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Updating...</>
                  ) : (
                    'Update Contact'
                  )}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Contact Detail Modal */}
      <ContactDetailModal
        contact={selectedContact}
        open={isDetailOpen}
        onOpenChange={setIsDetailOpen}
        onEdit={() => {
          setIsDetailOpen(false);
          if (selectedContact) {
            handleEditContact(selectedContact);
          }
        }}
      />
    </div>
  );
}
