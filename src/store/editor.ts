import { create } from "zustand";

export type Tool =
  | "brush"
  | "erase"
  | "fill"
  | "select"
  | "collision"
  | "place"
  | "pan";

export type EditorState = {
  tool: Tool;
  activeTile: number;
  activeLayerId: string | null;
  activeObjectType: string | null;
  selectedEntityId: string | null;
  zoom: number;
  panX: number;
  panY: number;
  showGrid: boolean;
  showCollisionOverlay: boolean;
  setTool: (tool: Tool) => void;
  setActiveTile: (i: number) => void;
  setActiveLayer: (id: string | null) => void;
  setActiveObjectType: (type: string | null) => void;
  setSelectedEntity: (id: string | null) => void;
  setZoom: (z: number) => void;
  setPan: (x: number, y: number) => void;
  toggleGrid: () => void;
  toggleCollisionOverlay: () => void;
};

export const useEditor = create<EditorState>((set) => ({
  tool: "brush",
  activeTile: 0,
  activeLayerId: null,
  activeObjectType: null,
  selectedEntityId: null,
  zoom: 1,
  panX: 0,
  panY: 0,
  showGrid: true,
  showCollisionOverlay: false,
  setTool: (tool) => set({ tool }),
  setActiveTile: (activeTile) => set({ activeTile }),
  setActiveLayer: (activeLayerId) => set({ activeLayerId }),
  setActiveObjectType: (activeObjectType) => set({ activeObjectType }),
  setSelectedEntity: (selectedEntityId) => set({ selectedEntityId }),
  setZoom: (zoom) => set({ zoom }),
  setPan: (panX, panY) => set({ panX, panY }),
  toggleGrid: () => set((s) => ({ showGrid: !s.showGrid })),
  toggleCollisionOverlay: () =>
    set((s) => ({ showCollisionOverlay: !s.showCollisionOverlay })),
}));
