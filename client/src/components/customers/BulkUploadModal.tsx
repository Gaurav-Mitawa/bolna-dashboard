import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { crmApi } from "@/api/crm";
import { Upload, CheckCircle2, AlertCircle, Download } from "lucide-react";
import { useState, useRef, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface BulkUploadModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

type Stage = "idle" | "preview" | "uploading" | "result";

interface ValidRow {
    name: string;
    phoneNumber: string;    // normalized E.164
    email: string;
    status: string;
    originalPhone: string;  // raw value from CSV, shown in preview
}

interface InvalidRow {
    name: string;
    originalPhone: string;
    reason: string;
    rowIndex: number;
}

interface ImportResult {
    inserted: number;
    skipped: number;
}

// ─── Phone normalizer ────────────────────────────────────────────────────────
//
// Handles all of these formats:
//   9876543210          → +919876543210  (10-digit, no prefix)
//   919876543210        → +919876543210  (12-digit, no +)
//   +919876543210       → +919876543210  (already correct)
//   09876543210         → +919876543210  (leading zero)
//   9.876543e+9         → +919876543210  (Excel scientific notation)
//   98765-43210         → +919876543210  (hyphens)
//   < 10 digits / not 6-9 start → invalid

function normalizePhone(raw: string): { normalized: string | null; reason?: string } {
    let val = String(raw ?? "").trim();
    if (!val) return { normalized: null, reason: "Empty phone number" };

    // Excel scientific notation (e.g. 9.876543E+9)
    if (/[eE]/.test(val) && /^\d/.test(val)) {
        const num = Number(val);
        if (!isNaN(num) && isFinite(num)) val = Math.round(num).toString();
    }

    // Strip hyphens, spaces, dots, parentheses
    val = val.replace(/[\s\-\.\(\)]/g, "");

    // Already correct Indian E.164: +91 followed by 10 digits starting 6-9
    if (/^\+91[6-9]\d{9}$/.test(val)) return { normalized: val };

    // Valid non-Indian E.164 (e.g. +1…, +44…)
    if (/^\+[1-9]\d{6,14}$/.test(val) && !val.startsWith("+91"))
        return { normalized: val };

    // Has +91 prefix but something wrong
    if (val.startsWith("+91")) {
        const digits = val.slice(3);
        if (digits.length !== 10)
            return { normalized: null, reason: `+91 must be followed by 10 digits (got ${digits.length})` };
        if (!/^[6-9]/.test(digits))
            return { normalized: null, reason: "Indian mobile must start with 6–9" };
        return { normalized: "+91" + digits };
    }

    // 12 digits: 91XXXXXXXXXX (no +)
    if (/^91\d{10}$/.test(val)) {
        const digits = val.slice(2);
        if (!/^[6-9]/.test(digits))
            return { normalized: null, reason: "Indian mobile must start with 6–9" };
        return { normalized: "+91" + digits };
    }

    // 10 digits (Indian, no prefix)
    if (/^\d{10}$/.test(val)) {
        if (!/^[6-9]/.test(val))
            return { normalized: null, reason: "Indian mobile must start with 6–9" };
        return { normalized: "+91" + val };
    }

    // 11 digits with leading zero: 09876543210
    if (/^0\d{10}$/.test(val)) {
        const stripped = val.slice(1);
        if (!/^[6-9]/.test(stripped))
            return { normalized: null, reason: "Indian mobile must start with 6–9" };
        return { normalized: "+91" + stripped };
    }

    // Pure digits but too short
    if (/^\d+$/.test(val) && val.length < 10)
        return { normalized: null, reason: `Too short (${val.length} digits, need 10+)` };

    return { normalized: null, reason: `Unrecognized format: "${raw}"` };
}

// ─── Minimal CSV parser ───────────────────────────────────────────────────────
// Handles quoted fields, CRLF, standard comma-separated values.

function parseCSV(text: string): string[][] {
    const rows: string[][] = [];
    let row: string[] = [];
    let field = "";
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (inQuotes) {
            if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
            else if (ch === '"') inQuotes = false;
            else field += ch;
        } else {
            if (ch === '"') { inQuotes = true; }
            else if (ch === ",") { row.push(field.trim()); field = ""; }
            else if (ch === "\n" || ch === "\r") {
                if (ch === "\r" && text[i + 1] === "\n") i++;
                row.push(field.trim()); field = "";
                if (row.some(f => f)) rows.push(row);
                row = [];
            } else { field += ch; }
        }
    }
    row.push(field.trim());
    if (row.some(f => f)) rows.push(row);
    return rows;
}

// ─── Column detection ─────────────────────────────────────────────────────────

const PHONE_KEYWORDS = ["phone", "mobile", "number", "contact", "mob", "cell", "phonenumber"];
const NAME_KEYWORDS  = ["name", "customer", "lead", "person", "client", "fullname"];

function detectColumn(headers: string[], keywords: string[]): string | null {
    for (const h of headers) {
        const norm = h.toLowerCase().replace(/[\s_\-]/g, "");
        if (keywords.some(k => norm.includes(k))) return h;
    }
    return null;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BulkUploadModal({ open, onOpenChange, onSuccess }: BulkUploadModalProps) {
    const [stage, setStage]           = useState<Stage>("idle");
    const [file, setFile]             = useState<File | null>(null);
    const [validRows, setValidRows]   = useState<ValidRow[]>([]);
    const [invalidRows, setInvalidRows] = useState<InvalidRow[]>([]);
    const [result, setResult]         = useState<ImportResult | null>(null);
    const [headers, setHeaders]       = useState<string[]>([]);
    const [needColumnPick, setNeedColumnPick] = useState(false);
    const [pickedPhoneCol, setPickedPhoneCol] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const reset = () => {
        setStage("idle");
        setFile(null);
        setValidRows([]);
        setInvalidRows([]);
        setResult(null);
        setHeaders([]);
        setNeedColumnPick(false);
        setPickedPhoneCol(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    // ── Parse + normalize the file ───────────────────────────────────────────

    const processCSV = useCallback(async (f: File, forcedPhoneCol?: string) => {
        const text = await f.text();
        const allRows = parseCSV(text);

        if (allRows.length < 2) {
            toast.error("CSV has no data rows");
            return;
        }

        const hdrs = allRows[0];
        setHeaders(hdrs);

        const pCol = forcedPhoneCol ?? detectColumn(hdrs, PHONE_KEYWORDS);
        const nCol = detectColumn(hdrs, NAME_KEYWORDS);

        // Can't auto-detect phone column → ask user
        if (!pCol) {
            setNeedColumnPick(true);
            setStage("idle");
            return;
        }

        setNeedColumnPick(false);

        const pIdx     = hdrs.indexOf(pCol);
        const nIdx     = nCol ? hdrs.indexOf(nCol) : -1;
        const emailIdx = hdrs.findIndex(h => h.toLowerCase().includes("email"));
        const statusIdx = hdrs.findIndex(h => h.toLowerCase().includes("status"));

        const valid: ValidRow[]   = [];
        const invalid: InvalidRow[] = [];

        allRows.slice(1).forEach((row, i) => {
            const rawPhone = row[pIdx] ?? "";
            const name     = ((nIdx >= 0 ? row[nIdx] : "") ?? "").trim();
            const email    = ((emailIdx  >= 0 ? row[emailIdx]  : "") ?? "").trim();
            const status   = ((statusIdx >= 0 ? row[statusIdx] : "fresh") ?? "fresh").trim() || "fresh";

            if (!name) {
                invalid.push({ name: "(no name)", originalPhone: rawPhone, reason: "Name is required", rowIndex: i + 2 });
                return;
            }

            const { normalized, reason } = normalizePhone(rawPhone);
            if (!normalized) {
                invalid.push({ name, originalPhone: rawPhone, reason: reason ?? "Invalid phone", rowIndex: i + 2 });
                return;
            }

            valid.push({ name, phoneNumber: normalized, email, status, originalPhone: rawPhone });
        });

        setValidRows(valid);
        setInvalidRows(invalid);
        setStage("preview");
    }, []);

    // ── File selected ────────────────────────────────────────────────────────

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        if (!f.name.toLowerCase().endsWith(".csv")) {
            toast.error("Please select a .csv file");
            return;
        }
        if (f.size > 5 * 1024 * 1024) {
            toast.error("File exceeds 5 MB limit");
            return;
        }
        setFile(f);
        await processCSV(f);
    };

    // ── Column manually picked ────────────────────────────────────────────────

    const handleColumnPick = async (col: string) => {
        setPickedPhoneCol(col);
        setNeedColumnPick(false);
        if (file) await processCSV(file, col);
    };

    // ── Confirm import ────────────────────────────────────────────────────────

    const handleImport = async () => {
        if (!validRows.length) return;
        setStage("uploading");
        try {
            const res = await crmApi.bulkUploadRows(validRows);
            setResult(res);
            setStage("result");
            onSuccess?.();
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Import failed");
            setStage("preview");
        }
    };

    // ── Template download ─────────────────────────────────────────────────────

    const handleDownloadTemplate = () => {
        const csv = [
            "name,phoneNumber,email,status",
            "John Doe,9876543210,john@example.com,fresh",
            "Jane Smith,+919123456789,jane@example.com,interested",
        ].join("\n");
        const a = document.createElement("a");
        a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
        a.download = "crm_upload_template.csv";
        a.click();
    };

    // ─────────────────────────────────────────────────────────────────────────

    return (
        <Dialog open={open} onOpenChange={(o) => { if (!o) reset(); onOpenChange(o); }}>
            <DialogContent className="max-w-2xl p-0 overflow-hidden">

                {/* ── Header ── */}
                <div className="flex items-center gap-3 bg-[#F15E04] text-white px-4 py-3">
                    <div className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center">
                        <Upload className="h-5 w-5" />
                    </div>
                    <DialogHeader>
                        <DialogTitle className="text-white text-base">
                            {stage === "idle"     && "Bulk Lead Upload"}
                            {stage === "preview"  && `Preview — ${validRows.length} valid · ${invalidRows.length} skipped`}
                            {stage === "uploading" && "Importing…"}
                            {stage === "result"   && "Import Complete"}
                        </DialogTitle>
                    </DialogHeader>
                </div>

                <div className="p-5 space-y-4">

                    {/* ══ IDLE ══════════════════════════════════════════════════ */}
                    {stage === "idle" && (
                        <>
                            <p className="text-sm text-slate-600">
                                Upload a CSV file. Phone numbers are auto-normalized — supports 10-digit,
                                +91, 91XXXXXXXX, leading zero, Excel scientific notation, and hyphenated formats.
                            </p>

                            {/* Drop zone */}
                            <div
                                className="border-2 border-dashed rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-colors border-slate-200 hover:border-orange-300 hover:bg-orange-50/30"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="hidden"
                                    accept=".csv"
                                    onChange={handleFileChange}
                                />
                                <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center">
                                    <Upload className="h-6 w-6 text-slate-400" />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm font-medium text-slate-800">Click to select a CSV file</p>
                                    <p className="text-xs text-slate-400 mt-0.5">Max 5 MB · Columns auto-detected</p>
                                </div>
                            </div>

                            {/* Column picker (shown only when auto-detect failed) */}
                            {needColumnPick && headers.length > 0 && (
                                <div className="border rounded-lg p-4 bg-amber-50 border-amber-200 space-y-2">
                                    <p className="text-sm font-medium text-amber-800">
                                        Couldn't auto-detect the phone column. Pick it:
                                    </p>
                                    <div className="flex gap-2 flex-wrap">
                                        {headers.map(h => (
                                            <Button
                                                key={h}
                                                size="sm"
                                                variant="outline"
                                                className="border-amber-300 text-amber-800 hover:bg-amber-100"
                                                onClick={() => handleColumnPick(h)}
                                            >
                                                {h}
                                            </Button>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <div className="flex justify-between items-center pt-1">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="gap-2 text-slate-600 border-slate-200"
                                    onClick={handleDownloadTemplate}
                                >
                                    <Download className="h-4 w-4" /> Download Template
                                </Button>
                                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                    Cancel
                                </Button>
                            </div>
                        </>
                    )}

                    {/* ══ PREVIEW ═══════════════════════════════════════════════ */}
                    {stage === "preview" && (
                        <>
                            {/* Summary pills */}
                            <div className="flex gap-3">
                                <div className="flex-1 flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                                    <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                                    <span className="text-sm font-semibold text-green-700">
                                        {validRows.length} valid row{validRows.length !== 1 ? "s" : ""}
                                    </span>
                                </div>
                                {invalidRows.length > 0 && (
                                    <div className="flex-1 flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                                        <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                                        <span className="text-sm font-semibold text-red-600">
                                            {invalidRows.length} row{invalidRows.length !== 1 ? "s" : ""} will be skipped
                                        </span>
                                    </div>
                                )}
                            </div>

                            {/* Preview table */}
                            <div className="border rounded-lg overflow-hidden">
                                <div className="max-h-72 overflow-y-auto">
                                    <table className="w-full text-xs">
                                        <thead className="bg-slate-50 sticky top-0 z-10">
                                            <tr>
                                                <th className="text-left px-3 py-2 font-medium text-slate-500 w-1/3">Name</th>
                                                <th className="text-left px-3 py-2 font-medium text-slate-500 w-1/2">Phone (normalized)</th>
                                                <th className="text-left px-3 py-2 font-medium text-slate-500">Status</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {/* Valid rows — green */}
                                            {validRows.slice(0, 50).map((row, i) => (
                                                <tr key={`v${i}`} className="bg-green-50/50">
                                                    <td className="px-3 py-1.5 text-slate-800 truncate max-w-[120px]">{row.name}</td>
                                                    <td className="px-3 py-1.5">
                                                        <span className="font-mono text-green-700">{row.phoneNumber}</span>
                                                        {row.originalPhone !== row.phoneNumber && (
                                                            <span className="text-slate-400 ml-2 text-[10px]">
                                                                ← {row.originalPhone}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-3 py-1.5 text-slate-500">{row.status}</td>
                                                </tr>
                                            ))}
                                            {/* Invalid rows — red */}
                                            {invalidRows.slice(0, 20).map((row, i) => (
                                                <tr key={`i${i}`} className="bg-red-50/60">
                                                    <td className="px-3 py-1.5 text-slate-600">{row.name}</td>
                                                    <td className="px-3 py-1.5">
                                                        <span className="font-mono text-red-400 line-through">{row.originalPhone || "(empty)"}</span>
                                                    </td>
                                                    <td className="px-3 py-1.5 text-red-500 italic">{row.reason}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    {(validRows.length > 50 || invalidRows.length > 20) && (
                                        <p className="text-[11px] text-slate-400 px-3 py-2 border-t bg-slate-50">
                                            Showing first 50 valid + 20 invalid. All {validRows.length} valid rows will be imported.
                                        </p>
                                    )}
                                </div>
                            </div>

                            {invalidRows.length > 0 && (
                                <p className="text-xs text-slate-500">
                                    {invalidRows.length} row{invalidRows.length !== 1 ? "s" : ""} skipped due to invalid or missing phone numbers.
                                </p>
                            )}

                            <div className="flex justify-between items-center pt-1">
                                <Button type="button" variant="outline" className="text-slate-600" onClick={reset}>
                                    ← Pick different file
                                </Button>
                                <Button
                                    onClick={handleImport}
                                    className="bg-[#F15E04] hover:bg-[#d94f04]"
                                    disabled={validRows.length === 0}
                                >
                                    Import {validRows.length} valid row{validRows.length !== 1 ? "s" : ""}
                                </Button>
                            </div>
                        </>
                    )}

                    {/* ══ UPLOADING ═════════════════════════════════════════════ */}
                    {stage === "uploading" && (
                        <div className="flex flex-col items-center gap-4 py-10">
                            <div className="h-10 w-10 border-4 border-[#F15E04] border-t-transparent rounded-full animate-spin" />
                            <p className="text-sm text-slate-600">Importing {validRows.length} leads…</p>
                        </div>
                    )}

                    {/* ══ RESULT ════════════════════════════════════════════════ */}
                    {stage === "result" && result && (
                        <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-green-50 border border-green-100 rounded-lg p-4 flex items-center gap-3">
                                    <CheckCircle2 className="h-6 w-6 text-green-600" />
                                    <div>
                                        <div className="text-2xl font-bold text-green-700">{result.inserted}</div>
                                        <div className="text-xs text-green-600">Leads Added</div>
                                    </div>
                                </div>
                                <div className="bg-slate-50 border border-slate-100 rounded-lg p-4 flex items-center gap-3">
                                    <AlertCircle className="h-6 w-6 text-slate-400" />
                                    <div>
                                        <div className="text-2xl font-bold text-slate-600">
                                            {result.skipped + invalidRows.length}
                                        </div>
                                        <div className="text-xs text-slate-500">Skipped</div>
                                    </div>
                                </div>
                            </div>

                            {invalidRows.length > 0 && (
                                <p className="text-xs text-slate-500">
                                    {invalidRows.length} row{invalidRows.length !== 1 ? "s" : ""} skipped due to invalid phone numbers.
                                    {result.skipped > 0 && ` ${result.skipped} duplicate${result.skipped !== 1 ? "s" : ""} skipped by server.`}
                                </p>
                            )}

                            <Button
                                className="w-full bg-[#F15E04] hover:bg-[#d94f04]"
                                onClick={() => { reset(); onOpenChange(false); }}
                            >
                                Done
                            </Button>
                        </div>
                    )}

                </div>
            </DialogContent>
        </Dialog>
    );
}
