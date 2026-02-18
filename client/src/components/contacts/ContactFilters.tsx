import { Button } from "@/components/ui/button";
import type { LeadTag } from "@/types";

// -----------------------------------------------------------------------------
// FILTER TYPES
// -----------------------------------------------------------------------------

export type SourceFilterKey = "fresh" | "webchat" | "csv" | "pms";

// Tag configuration for contacts (CSS classes)
export const TAG_CONFIG: Record<LeadTag, { label: string; color: string }> = {
  fresh: {
    label: "Fresh",
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  fresh_na: {
    label: "Fresh - NA",
    color: "bg-amber-50 text-amber-700 border-amber-200",
  },
  converted: {
    label: "Converted",
    color: "bg-blue-50 text-blue-700 border-blue-200",
  },
  follow_up: {
    label: "Follow-up",
    color: "bg-purple-50 text-purple-700 border-purple-200",
  },
  follow_up_interested: {
    label: "Follow-up - Interested",
    color: "bg-cyan-50 text-cyan-700 border-cyan-200",
  },
  follow_up_not_interested: {
    label: "Follow-up - NI",
    color: "bg-orange-50 text-orange-700 border-orange-200",
  },
  follow_up_converted: {
    label: "Follow-up - Converted",
    color: "bg-green-50 text-green-700 border-green-200",
  },
  not_interested: {
    label: "Not Interested",
    color: "bg-red-50 text-red-700 border-red-200",
  },
  purchased: {
    label: "Purchased",
    color: "bg-teal-50 text-teal-700 border-teal-200",
  },
};

// -----------------------------------------------------------------------------
// CONTACT FILTERS COMPONENT
// Two-tier filter system: Source + Status/Tags
// -----------------------------------------------------------------------------

interface ContactFiltersProps {
  sourceFilters: SourceFilterKey[];
  statusFilters: LeadTag[];
  onToggleSource: (key: SourceFilterKey) => void;
  onToggleStatus: (tag: LeadTag) => void;
  onClearSources: () => void;
  onClearStatuses: () => void;
}

export function ContactFilters({
  sourceFilters,
  statusFilters,
  onToggleSource,
  onToggleStatus,
  onClearSources,
  onClearStatuses,
}: ContactFiltersProps) {
  const sourceOptions: { key: SourceFilterKey; label: string; icon: string }[] = [
    { key: "fresh", label: "Fresh Leads", icon: "🌱" },
    { key: "webchat", label: "Webchat", icon: "💬" },
    { key: "csv", label: "CSV Import", icon: "📄" },
    { key: "pms", label: "PMS Sync", icon: "🏨" },
  ];

  return (
    <div className="flex flex-col gap-3 p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
      {/* Source Filters Row */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-slate-500 mr-2 uppercase tracking-wide">
          Source:
        </span>
        {sourceOptions.map((item) => {
          const active = sourceFilters.includes(item.key);
          return (
            <Button
              key={item.key}
              variant={active ? "default" : "outline"}
              size="sm"
              onClick={() => onToggleSource(item.key)}
              className={`rounded-full text-xs px-3 h-8 transition-all ${
                active
                  ? "bg-orange-500 hover:bg-orange-600 text-white shadow-sm"
                  : "hover:border-orange-300 hover:text-orange-600"
              }`}
            >
              <span className="mr-1">{item.icon}</span> {item.label}
            </Button>
          );
        })}
        {sourceFilters.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearSources}
            className="text-xs text-slate-400 hover:text-slate-600 h-8"
          >
            Clear
          </Button>
        )}
      </div>

      {/* Status/Tag Filters Row */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-slate-500 mr-2 uppercase tracking-wide">
          Status:
        </span>
        {Object.entries(TAG_CONFIG).map(([tag, config]) => {
          const active = statusFilters.includes(tag as LeadTag);
          return (
            <Button
              key={tag}
              variant="outline"
              size="sm"
              onClick={() => onToggleStatus(tag as LeadTag)}
              className={`rounded-full text-xs px-3 h-7 transition-all border ${
                active
                  ? `${config.color} ring-2 ring-offset-1 ring-slate-300`
                  : "bg-white hover:bg-slate-50"
              }`}
            >
              {config.label}
            </Button>
          );
        })}
        {statusFilters.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearStatuses}
            className="text-xs text-slate-400 hover:text-slate-600 h-7"
          >
            Clear
          </Button>
        )}
      </div>
    </div>
  );
}

export default ContactFilters;

