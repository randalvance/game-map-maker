import { create } from "zustand";
import { createNewProject } from "@/model/project";
import type { MapProject, TileLayer } from "@/model/types";

type DocumentState = {
  project: MapProject;
  dirty: boolean;
  setProject: (project: MapProject) => void;
  replaceProject: (project: MapProject) => void;
  markClean: () => void;
  markDirty: () => void;
  updateLayer: (layerId: string, updater: (layer: TileLayer) => TileLayer) => void;
};

export const useDocument = create<DocumentState>((set) => ({
  project: createNewProject(),
  dirty: false,
  setProject: (project) => set({ project, dirty: true }),
  replaceProject: (project) => set({ project, dirty: false }),
  markClean: () => set({ dirty: false }),
  markDirty: () => set({ dirty: true }),
  updateLayer: (layerId, updater) =>
    set((s) => ({
      project: {
        ...s.project,
        layers: s.project.layers.map((l) => (l.id === layerId ? updater(l) : l)),
      },
      dirty: true,
    })),
}));

export const documentActions = {
  getProject: () => useDocument.getState().project,
  setProject: (p: MapProject) => useDocument.getState().setProject(p),
  replaceProject: (p: MapProject) => useDocument.getState().replaceProject(p),
  markClean: () => useDocument.getState().markClean(),
};
