/**
 * Single contact row component.
 * Displays contact information with actions.
 */

import { TableCell, TableRow as UITableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Edit, Trash, Phone } from 'lucide-react';
import type { Contact } from './types';

interface TableRowProps {
  contact: Contact;
  onEdit: (contact: Contact) => void;
  onDelete: (contactId: string) => void;
  onCall: (contact: Contact) => void;
}

export function TableRow({ contact, onEdit, onDelete, onCall }: TableRowProps) {
  const getTagColor = (tag: string) => {
    const colors: Record<string, string> = {
      fresh: 'bg-green-100 text-green-800',
      'follow-up': 'bg-blue-100 text-blue-800',
      converted: 'bg-purple-100 text-purple-800',
      'not interested': 'bg-gray-100 text-gray-800',
    };
    return colors[tag.toLowerCase()] || 'bg-gray-100 text-gray-800';
  };

  return (
    <UITableRow>
      <TableCell className="font-medium">{contact.name}</TableCell>
      <TableCell>{contact.email}</TableCell>
      <TableCell>{contact.phone}</TableCell>
      <TableCell>{contact.company_name || '-'}</TableCell>
      <TableCell>
        <Badge className={getTagColor(contact.tag)}>{contact.tag}</Badge>
      </TableCell>
      <TableCell>
        <Badge variant="outline">{contact.source}</Badge>
      </TableCell>
      <TableCell>
        {contact.last_call_date
          ? new Date(contact.last_call_date).toLocaleDateString()
          : '-'}
      </TableCell>
      <TableCell>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(contact)}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onCall(contact)}>
              <Phone className="h-4 w-4 mr-2" />
              Call Now
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => onDelete(contact.id)}
              className="text-red-600"
            >
              <Trash className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </TableCell>
    </UITableRow>
  );
}

