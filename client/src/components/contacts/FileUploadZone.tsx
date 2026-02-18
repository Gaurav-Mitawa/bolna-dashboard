import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Upload, FileSpreadsheet } from "lucide-react";

// -----------------------------------------------------------------------------
// FILE UPLOAD ZONE COMPONENT
// Drag & drop area for CSV/XLSX file uploads
// -----------------------------------------------------------------------------

interface FileUploadZoneProps {
  isDragging: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function FileUploadZone({
  isDragging,
  onDragOver,
  onDragLeave,
  onDrop,
  onFileInput,
}: FileUploadZoneProps) {
  return (
    <div
      className={`rounded-2xl border-2 border-dashed p-4 transition-all ${
        isDragging
          ? "border-orange-400 bg-orange-50"
          : "border-slate-200 bg-white"
      }`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center">
            <Upload className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <p className="font-medium text-slate-800 text-sm">Import from PMS</p>
            <p className="text-xs text-slate-500">
              Drag CSV/XLSX or click to upload guest data
            </p>
          </div>
        </div>
        <div>
          <Input
            type="file"
            className="hidden"
            id="file-upload"
            accept=".csv,.xlsx"
            onChange={onFileInput}
          />
          <label htmlFor="file-upload">
            <Button
              variant="outline"
              size="sm"
              className="h-9 rounded-xl border-orange-200 text-orange-600 hover:bg-orange-50 cursor-pointer"
              asChild
            >
              <span>
                <FileSpreadsheet className="w-4 h-4 mr-1.5" /> Select File
              </span>
            </Button>
          </label>
        </div>
      </div>
    </div>
  );
}

export default FileUploadZone;

