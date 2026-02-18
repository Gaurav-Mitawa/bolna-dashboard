/**
 * Hook for contacts CRUD operations.
 * Handles fetching, creating, updating, and deleting contacts.
 */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { authFetchJson } from '@/lib/api';
import type { Contact, ContactFilter } from '../types';
import { toast } from 'sonner';

interface ContactsResponse {
  contacts: Contact[];
  total: number;
}

export function useContacts(page: number = 1, pageSize: number = 50, filters?: ContactFilter) {
  const queryClient = useQueryClient();

  // Fetch contacts
  const { data, isLoading, error } = useQuery({
    queryKey: ['contacts', page, pageSize, filters],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
      });
      
      if (filters?.search) {
        params.append('search', filters.search);
      }
      
      if (filters?.tag?.length) {
        filters.tag.forEach(tag => params.append('tag', tag));
      }
      
      const response = await authFetchJson<ContactsResponse>(
        `/api/contacts?${params.toString()}`
      );
      return response;
    },
    staleTime: 30000,
  });

  // Delete contact mutation
  const deleteMutation = useMutation({
    mutationFn: async (contactId: string) => {
      await authFetchJson(`/api/contacts/${contactId}`, { method: 'DELETE' });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['contacts'] });
      toast.success('Contact deleted successfully');
    },
    onError: (error: any) => {
      toast.error(error?.message || 'Failed to delete contact');
    },
  });

  return {
    contacts: data?.contacts || [],
    total: data?.total || 0,
    isLoading,
    error,
    deleteContact: deleteMutation.mutate,
    isDeleting: deleteMutation.isPending,
  };
}

