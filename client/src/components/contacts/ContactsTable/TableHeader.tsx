/**
 * Table header with search and filters.
 * Provides search input and filter controls for contacts table.
 */
import { SearchInput } from '@/components/shared/SearchInput';
import { Button } from '@/components/ui/button';
import { Plus, Download } from 'lucide-react';

interface TableHeaderProps {
  searchValue: string;
  onSearchChange: (value: string) => void;
  onAddContact: () => void;
  onExport: () => void;
  totalCount: number;
}

export function TableHeader({
  searchValue,
  onSearchChange,
  onAddContact,
  onExport,
  totalCount,
}: TableHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
      <div className="flex-1 w-full sm:w-auto">
        <SearchInput
          value={searchValue}
          onChange={onSearchChange}
          placeholder="Search contacts by name, email, or phone..."
        />
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onExport}>
          <Download className="h-4 w-4 mr-2" />
          Export
        </Button>
        <Button size="sm" onClick={onAddContact}>
          <Plus className="h-4 w-4 mr-2" />
          Add Contact
        </Button>
      </div>

      <div className="text-sm text-gray-500">
        {totalCount} contact{totalCount !== 1 ? 's' : ''}
      </div>
    </div>
  );
}

