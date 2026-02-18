/**
 * Trigger Node Component
 * Custom React Flow node for trigger events
 */

import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const TriggerNode = memo(({ data }: NodeProps) => {
  return (
    <Card className="px-4 py-3 min-w-[200px] border-2 border-[#F15E04] bg-white shadow-lg">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 rounded-full bg-[#F15E04]"></div>
        <Badge variant="outline" className="border-[#F15E04] text-[#F15E04]">
          Trigger
        </Badge>
      </div>
      <h3 className="font-semibold text-gray-900 mb-1">{data.label}</h3>
      {data.description && (
        <p className="text-sm text-gray-600">{data.description}</p>
      )}
      {data.trigger_event && (
        <p className="text-xs text-gray-500 mt-2">Event: {data.trigger_event}</p>
      )}
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-[#F15E04]" />
    </Card>
  );
});

TriggerNode.displayName = "TriggerNode";

