/**
 * Logic Node Component
 * Custom React Flow node for If/Else decisions (diamond shape)
 */

import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const LogicNode = memo(({ data }: NodeProps) => {
  return (
    <div className="relative" style={{ width: 180, height: 120 }}>
      {/* Diamond shape using CSS transform */}
      <Card 
        className="absolute inset-0 border-2 border-[#9333EA] bg-white shadow-lg flex items-center justify-center"
        style={{
          transform: "rotate(45deg)",
        }}
      >
        <div className="transform -rotate-45 text-center">
          <Badge variant="outline" className="border-[#9333EA] text-[#9333EA] mb-2">
            Logic
          </Badge>
          <h3 className="font-semibold text-gray-900 text-sm">{data.label}</h3>
          {data.logic_config?.condition && (
            <p className="text-xs text-gray-600 mt-1">{data.logic_config.condition}</p>
          )}
        </div>
      </Card>
      
      {/* Handles positioned at diamond points */}
      <Handle 
        type="target" 
        position={Position.Top} 
        className="w-3 h-3 bg-[#9333EA]"
        style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }}
      />
      <Handle 
        type="source" 
        position={Position.Right} 
        className="w-3 h-3 bg-[#16A34A]"
        style={{ top: "25%", right: "-6px" }}
        id="true"
      />
      <Handle 
        type="source" 
        position={Position.Bottom} 
        className="w-3 h-3 bg-[#EF4444]"
        style={{ bottom: "-6px", left: "50%", transform: "translateX(-50%)" }}
        id="false"
      />
    </div>
  );
});

LogicNode.displayName = "LogicNode";

