import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { crmApi } from "@/api/crm";
import { Upload, FileText, X, CheckCircle2, AlertCircle } from "lucide-react";
import { useState, useRef } from "react";
import { cn } from "@/lib/utils";

interface BulkUploadModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

interface UploadResult {
    inserted: number;
    skipped: number;
    validationErrors: { row: string; reason: string }[];
}

export function BulkUploadModal({ open, onOpenChange, onSuccess }: BulkUploadModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [result, setResult] = useState<UploadResult | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            if (selectedFile.name.endsWith(".csv")) {
                setFile(selectedFile);
                setResult(null);
            } else {
                toast.error("Please select a valid .csv file");
            }
        }
    };

    const clearFile = () => {
        setFile(null);
        setResult(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleUpload = async () => {
        if (!file) return;

        setIsUploading(true);
        try {
            const response = await crmApi.bulkUpload(file);
            setResult(response as any);
            toast.success("Bulk upload complete");
            onSuccess?.();
        } catch (error: any) {
            toast.error(error.response?.data?.message || "Bulk upload failed");
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg p-0 overflow-hidden">
                <div className="flex items-center gap-3 bg-[#F15E04] text-white px-4 py-3">
                    <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center">
                        <Upload className="h-5 w-5" />
                    </div>
                    <DialogHeader>
                        <DialogTitle className="text-white">Bulk Lead Upload</DialogTitle>
                    </DialogHeader>
                </div>

                <div className="p-5 space-y-4">
                    {!result ? (
                        <>
                            <div className="text-sm text-slate-600">
                                Upload a CSV file with your leads. Ensure columns include <b>name</b> and <b>phoneNumber</b> (or phone).
                            </div>

                            <div
                                className={cn(
                                    "border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors",
                                    file ? "border-[#F15E04] bg-orange-50" : "border-slate-200 hover:border-slate-300"
                                )}
                                onClick={() => !file && fileInputRef.current?.click()}
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept=".csv"
                                    onChange={handleFileChange}
                                />

                                {file ? (
                                    <>
                                        <FileText className="h-10 w-10 text-[#F15E04]" />
                                        <div className="text-sm font-medium text-slate-900">{file.name}</div>
                                        <div className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="text-red-500 hover:text-red-600 hover:bg-red-50 mt-1"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                clearFile();
                                            }}
                                        >
                                            <X className="h-4 w-4 mr-1" /> Remove
                                        </Button>
                                    </>
                                ) : (
                                    <>
                                        <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                                            <Upload className="h-6 w-6 text-slate-400" />
                                        </div>
                                        <div className="text-sm font-medium text-slate-900">Click to select CSV file</div>
                                        <div className="text-xs text-slate-500">Max file size: 5MB</div>
                                    </>
                                )}
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                    Cancel
                                </Button>
                                <Button
                                    onClick={handleUpload}
                                    className="bg-[#F15E04] hover:bg-[#d94f04]"
                                    disabled={!file || isUploading}
                                >
                                    {isUploading ? "Uploading..." : "Start Upload"}
                                </Button>
                            </div>
                        </>
                    ) : (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-green-50 border border-green-100 rounded-lg p-3 flex items-center gap-3">
                                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                                    <div>
                                        <div className="text-xl font-bold text-green-700">{result.inserted}</div>
                                        <div className="text-xs text-green-600">Leads Added</div>
                                    </div>
                                </div>
                                <div className="bg-slate-50 border border-slate-100 rounded-lg p-3 flex items-center gap-3">
                                    <AlertCircle className="h-5 w-5 text-slate-500" />
                                    <div>
                                        <div className="text-xl font-bold text-slate-700">{result.skipped}</div>
                                        <div className="text-xs text-slate-600">Skipped (Dupes)</div>
                                    </div>
                                </div>
                            </div>

                            {result.validationErrors.length > 0 && (
                                <div className="space-y-2">
                                    <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                        Validation Issues ({result.validationErrors.length})
                                    </div>
                                    <div className="max-h-32 overflow-y-auto border rounded-md p-2 bg-slate-50 space-y-1">
                                        {result.validationErrors.map((err, i) => (
                                            <div key={i} className="text-[11px] text-slate-600 border-b last:border-0 pb-1">
                                                <span className="font-medium">{err.row}:</span> {err.reason}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <Button
                                className="w-full bg-[#F15E04] hover:bg-[#d94f04]"
                                onClick={() => onOpenChange(false)}
                            >
                                Close
                            </Button>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
