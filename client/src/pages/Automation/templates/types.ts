import { Node, Edge } from "reactflow";

export interface FlowTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  nodes: Node[];
  edges: Edge[];
}
