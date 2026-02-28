import "@testing-library/jest-dom";
import { vi } from "vitest";

// Mock do React Flow
vi.mock("reactflow", () => ({
  default: vi.fn(() => null),
  Handle: vi.fn(() => null),
  Position: { Left: "left", Right: "right", Top: "top", Bottom: "bottom" },
  MarkerType: { ArrowClosed: "arrowClosed" },
  useNodesState: vi.fn(() => [[], vi.fn()]),
  useEdgesState: vi.fn(() => [[], vi.fn()]),
  addEdge: vi.fn(),
}));

// Mock do trpc
vi.mock("@/lib/trpc", () => ({
  trpc: {
    visualFlows: {
      list: { useQuery: vi.fn(() => ({ data: [], refetch: vi.fn() })) },
      create: { useMutation: vi.fn(() => ({ mutate: vi.fn() })) },
      update: { useMutation: vi.fn(() => ({ mutate: vi.fn() })) },
      delete: { useMutation: vi.fn(() => ({ mutate: vi.fn() })) },
      toggle: { useMutation: vi.fn(() => ({ mutate: vi.fn() })) },
    },
    automation: {
      list: { useQuery: vi.fn(() => ({ data: [] })) },
    },
    uraMenus: {
      list: { useQuery: vi.fn(() => ({ data: [] })) },
    },
  },
}));

// Mock do sonner
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock do useFlowImportWorker
vi.mock("@/hooks/useFlowImportWorker", () => ({
  useFlowImportWorker: vi.fn(() => ({
    isProcessing: false,
    progress: 0,
    parseJSON: vi.fn(),
    convertN8N: vi.fn(),
  })),
}));
