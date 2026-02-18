/**
 * Main Contacts Table component.
 * Displays contacts with search, filters, and actions.
 * 
 * This is the NEW modular version - replaces ContactTable.tsx
 */
import { useState } from 'react';
// ...
// const [page, setPage] = useState(1);
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableHead,
  TableHeader,
  TableRow as UITableRow,
} from '@/components/ui/table';
import { TableHeader as ContactsTableHeader } from './TableHeader';
import { TableRow } from './TableRow';
import { useContacts } from './hooks/useContacts';
import { useContactFilters } from './hooks/useContactFilters';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { ErrorMessage } from '@/components/shared/ErrorMessage';
import { EmptyState } from '@/components/shared/EmptyState';
import { Users } from 'lucide-react';
import type { Contact } from './types';

export function ContactTable() {
  const [page] = useState(1);
  const { filters, setSearch } = useContactFilters();
  const { contacts, total, isLoading, error, deleteContact } = useContacts(page, 50, filters);

  const handleEdit = (contact: Contact) => {
    // TODO: Open edit modal
    console.log('Edit contact:', contact);
  };

  const handleDelete = (contactId: string) => {
    if (confirm('Are you sure you want to delete this contact?')) {
      deleteContact(contactId);
    }
  };

  const handleCall = (contact: Contact) => {
    // TODO: Initiate call
    console.log('Call contact:', contact);
  };

  const handleAddContact = () => {
    // TODO: Open add contact modal
    console.log('Add contact');
  };

  const handleExport = () => {
    // TODO: Export contacts to CSV
    console.log('Export contacts');
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <LoadingSpinner />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <ErrorMessage message="Failed to load contacts" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <ContactsTableHeader
          searchValue={filters.search || ''}
          onSearchChange={setSearch}
          onAddContact={handleAddContact}
          onExport={handleExport}
          totalCount={total}
        />

        {contacts.length === 0 ? (
          <EmptyState
            title="No contacts found"
            description="Add your first contact to get started"
            icon={<Users className="h-12 w-12" />}
            action={{
              label: 'Add Contact',
              onClick: handleAddContact,
            }}
          />
        ) : (
          <Table>
            <TableHeader>
              <UITableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead>Company</TableHead>
                <TableHead>Tag</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Last Call</TableHead>
                <TableHead>Actions</TableHead>
              </UITableRow>
            </TableHeader>
            <TableBody>
              {contacts.map(contact => (
                <TableRow
                  key={contact.id}
                  contact={contact}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  onCall={handleCall}
                />
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export default ContactTable;

