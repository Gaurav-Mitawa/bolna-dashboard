/**
 * Action Node Component
 * Custom React Flow node for action/tool execution
 */

import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const ActionNode = memo(({ data }: NodeProps) => {
  const toolType = data.tool_config?.tool_type || "action";
  
  return (
    <Card className="px-4 py-3 min-w-[200px] border-2 border-[#3B82F6] bg-white shadow-lg">
      <div className="flex items-center gap-2 mb-2">
        <div className="w-3 h-3 rounded-full bg-[#3B82F6]"></div>
        <Badge variant="outline" className="border-[#3B82F6] text-[#3B82F6]">
          Action
        </Badge>
      </div>
      <h3 className="font-semibold text-gray-900 mb-1">{data.label}</h3>
      {data.description && (
        <p className="text-sm text-gray-600">{data.description}</p>
      )}
      {toolType && (
        <p className="text-xs text-gray-500 mt-2">Tool: {toolType}</p>
      )}
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-[#3B82F6]" />
      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-[#3B82F6]" />
    </Card>
  );
});

ActionNode.displayName = "ActionNode";

