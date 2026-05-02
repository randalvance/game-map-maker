import { create } from "zustand";
import { v4 as uuidv4 } from "uuid";
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
  ensureProjectId: () => string;
};

export const useDocument = create<DocumentState>((set, get) => ({
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
  ensureProjectId: () => {
    const { project, dirty } = get();
    if (project.projectId) return project.projectId;
    const id = uuidv4();
    // Minting an ID is editorial bookkeeping, not user data — preserve dirty as-is.
    set({ project: { ...project, projectId: id }, dirty });
    return id;
  },
}));

export const documentActions = {
  getProject: () => useDocument.getState().project,
  setProject: (p: MapProject) => useDocument.getState().setProject(p),
  replaceProject: (p: MapProject) => useDocument.getState().replaceProject(p),
  markClean: () => useDocument.getState().markClean(),
  ensureProjectId: () => useDocument.getState().ensureProjectId(),
};
