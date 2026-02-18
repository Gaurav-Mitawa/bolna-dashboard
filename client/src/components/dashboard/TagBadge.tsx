import type { LeadTag } from "@/types";
import { LEAD_TAGS } from "@/types";

// -----------------------------------------------------------------------------
// TAG BADGE COMPONENT
// Individual tag display with count and active state
// -----------------------------------------------------------------------------

interface TagBadgeProps {
  tag: LeadTag;
  count?: number;
  onClick?: () => void;
  isActive?: boolean;
}

export function TagBadge({ tag, count, onClick, isActive }: TagBadgeProps) {
  const tagConfig = LEAD_TAGS[tag];

  return (
    <button
      onClick={onClick}
      className={`
        inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium 
        transition-all duration-200 cursor-pointer border
        ${isActive ? "ring-1 ring-offset-1 ring-slate-300 shadow-sm" : "hover:shadow-sm"}
      `}
      style={{
        backgroundColor: tagConfig.bgColor,
        color: tagConfig.color,
        borderColor: tagConfig.color,
      }}
    >
      <span
        className="w-1.5 h-1.5 rounded-full"
        style={{ backgroundColor: tagConfig.color }}
      />
      {tagConfig.label}
      {count !== undefined && (
        <span className="ml-0.5 px-1 py-0 text-[10px] rounded-full bg-white/50 font-medium">
          {count}
        </span>
      )}
    </button>
  );
}

// -----------------------------------------------------------------------------
// TAGS CONTAINER COMPONENT
// Center-aligned container for multiple tag badges
// -----------------------------------------------------------------------------

interface TagWithCount {
  tag: LeadTag;
  count: number;
  isActive: boolean;
}

interface TagsContainerProps {
  tags: TagWithCount[];
  onTagClick: (tag: LeadTag) => void;
}

export function TagsContainer({ tags, onTagClick }: TagsContainerProps) {
  return (
    <div className="w-full flex justify-center items-center flex-wrap gap-1.5 py-2.5 px-3 bg-white rounded-xl shadow-sm border border-slate-100">
      {tags.map((item) => (
        <TagBadge
          key={item.tag}
          tag={item.tag}
          count={item.count}
          isActive={item.isActive}
          onClick={() => onTagClick(item.tag)}
        />
      ))}
    </div>
  );
}

export default TagBadge;

