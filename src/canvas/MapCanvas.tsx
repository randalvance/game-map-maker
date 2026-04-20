import { useEffect, useRef } from "react";
import type { Container } from "pixi.js";
import { useDocument } from "@/store/document";
import { useEditor } from "@/store/editor";
import {
  handlePointerDown,
  handlePointerMove,
  handlePointerUp,
  cancelStroke,
} from "@/tools/toolDispatcher";
import {
  createScene,
  destroyScene,
  rebuildTileLayerContainers,
  type SceneGraph,
} from "./scene";
import { drawGrid } from "./GridRenderer";
import {
  buildLayer,
  syncLayer,
  type LayerRenderState,
} from "./TileLayerRenderer";
import { drawCollisionOverlay } from "./CollisionOverlayRenderer";
import { syncEntityLayer, type EntityMarker } from "./EntityRenderer";
import { clampCell, screenToCell } from "./coords";

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 8.0;

export function MapCanvas() {
  const hostRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let mounted = true;
    let scene: SceneGraph | null = null;
    let layerStates: Map<string, LayerRenderState> = new Map();
    let layerContainers: Map<string, Container> = new Map();
    const entityMarkers: Map<string, EntityMarker> = new Map();
    let pointerDown = false;
    let lastProject = useDocument.getState().project;
    let lastEditor = useEditor.getState();
    let unsubDoc: (() => void) | null = null;
    let unsubEditor: (() => void) | null = null;

    const applyCamera = () => {
      if (!scene) return;
      const editor = useEditor.getState();
      scene.world.scale.set(editor.zoom);
      scene.world.x = editor.panX;
      scene.world.y = editor.panY;
    };

    const rebuildLayers = (project = useDocument.getState().project) => {
      if (!scene) return;
      layerContainers = rebuildTileLayerContainers(
        scene,
        project.layers.map((l) => l.id),
      );
      layerStates = new Map();
      for (const layer of project.layers) {
        const container = layerContainers.get(layer.id)!;
        const state = buildLayer(container, project.width, project.height, project.tileSize);
        syncLayer(state, layer, layer.visible);
        layerStates.set(layer.id, state);
      }
    };

    const redrawGrid = () => {
      if (!scene) return;
      const p = useDocument.getState().project;
      const e = useEditor.getState();
      drawGrid(scene.grid, {
        width: p.width,
        height: p.height,
        tileSize: p.tileSize,
        visible: e.showGrid,
      });
    };

    const redrawCollision = () => {
      if (!scene) return;
      const p = useDocument.getState().project;
      const e = useEditor.getState();
      drawCollisionOverlay(
        scene.collisionOverlay,
        p.collision,
        p.width,
        p.tileSize,
        e.showCollisionOverlay,
      );
    };

    const syncEntities = () => {
      if (!scene) return;
      const p = useDocument.getState().project;
      const e = useEditor.getState();
      syncEntityLayer(scene.entities, entityMarkers, p.entities, p.tileSize, e.selectedEntityId);
    };

    const hookPointerEvents = (canvas: HTMLCanvasElement) => {
      const getCellFromEvent = (event: PointerEvent) => {
        const rect = canvas.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;
        const editor = useEditor.getState();
        const project = useDocument.getState().project;
        const cell = screenToCell(x, y, editor, project.tileSize);
        return clampCell(cell, project.width, project.height);
      };

      const onDown = (event: PointerEvent) => {
        if (event.button !== 0) return; // left-click only for tools
        canvas.setPointerCapture(event.pointerId);
        pointerDown = true;
        handlePointerDown(getCellFromEvent(event));
      };

      let hoverRaf = 0;
      let latestHover: { x: number; y: number } | null = null;
      const onMove = (event: PointerEvent) => {
        const cell = getCellFromEvent(event);
        latestHover = cell;
        if (!hoverRaf) {
          hoverRaf = requestAnimationFrame(() => {
            hoverRaf = 0;
            useEditor.getState().setHoveredCell(latestHover);
          });
        }
        if (pointerDown) {
          handlePointerMove(cell);
        }
      };

      const onUp = (event: PointerEvent) => {
        if (!pointerDown) return;
        pointerDown = false;
        canvas.releasePointerCapture(event.pointerId);
        handlePointerUp(getCellFromEvent(event));
      };

      const onCancel = () => {
        if (!pointerDown) return;
        pointerDown = false;
        cancelStroke();
      };

      const onWheel = (event: WheelEvent) => {
        event.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const cursorX = event.clientX - rect.left;
        const cursorY = event.clientY - rect.top;
        const editor = useEditor.getState();
        const step = Math.exp(-event.deltaY * 0.001);
        const next = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, editor.zoom * step));
        if (next === editor.zoom) return;
        // anchor zoom at cursor: world point under cursor should not move
        const worldX = (cursorX - editor.panX) / editor.zoom;
        const worldY = (cursorY - editor.panY) / editor.zoom;
        const newPanX = cursorX - worldX * next;
        const newPanY = cursorY - worldY * next;
        useEditor.setState({ zoom: next, panX: newPanX, panY: newPanY });
      };

      // Middle-mouse pan
      let panning = false;
      let panStart: { x: number; y: number; panX: number; panY: number } | null = null;
      const onPanDown = (event: PointerEvent) => {
        if (event.button !== 1) return; // middle only
        event.preventDefault();
        panning = true;
        const editor = useEditor.getState();
        panStart = {
          x: event.clientX,
          y: event.clientY,
          panX: editor.panX,
          panY: editor.panY,
        };
        canvas.setPointerCapture(event.pointerId);
      };
      const onPanMove = (event: PointerEvent) => {
        if (!panning || !panStart) return;
        const dx = event.clientX - panStart.x;
        const dy = event.clientY - panStart.y;
        useEditor.setState({ panX: panStart.panX + dx, panY: panStart.panY + dy });
      };
      const onPanUp = (event: PointerEvent) => {
        if (!panning) return;
        panning = false;
        panStart = null;
        try {
          canvas.releasePointerCapture(event.pointerId);
        } catch {
          // noop
        }
      };

      const onLeave = () => {
        useEditor.getState().setHoveredCell(null);
        onCancel();
      };

      canvas.addEventListener("pointerdown", onDown);
      canvas.addEventListener("pointermove", onMove);
      canvas.addEventListener("pointerup", onUp);
      canvas.addEventListener("pointercancel", onCancel);
      canvas.addEventListener("pointerleave", onLeave);
      canvas.addEventListener("wheel", onWheel, { passive: false });
      canvas.addEventListener("pointerdown", onPanDown);
      canvas.addEventListener("pointermove", onPanMove);
      canvas.addEventListener("pointerup", onPanUp);
      canvas.addEventListener("contextmenu", (e) => e.preventDefault());

      return () => {
        canvas.removeEventListener("pointerdown", onDown);
        canvas.removeEventListener("pointermove", onMove);
        canvas.removeEventListener("pointerup", onUp);
        canvas.removeEventListener("pointercancel", onCancel);
        canvas.removeEventListener("pointerleave", onLeave);
        if (hoverRaf) cancelAnimationFrame(hoverRaf);
        canvas.removeEventListener("wheel", onWheel);
        canvas.removeEventListener("pointerdown", onPanDown);
        canvas.removeEventListener("pointermove", onPanMove);
        canvas.removeEventListener("pointerup", onPanUp);
      };
    };

    let disposePointer: (() => void) | null = null;

    (async () => {
      scene = await createScene(host);
      if (!mounted) {
        destroyScene(scene);
        return;
      }
      applyCamera();
      rebuildLayers();
      redrawGrid();
      redrawCollision();
      syncEntities();
      disposePointer = hookPointerEvents(scene.app.canvas);

      unsubDoc = useDocument.subscribe((state) => {
        if (!scene) return;
        const next = state.project;
        if (next === lastProject) return;

        const layerIdsChanged =
          next.layers.length !== lastProject.layers.length ||
          next.layers.some((l, i) => l.id !== lastProject.layers[i]?.id);
        const dimsChanged =
          next.width !== lastProject.width ||
          next.height !== lastProject.height ||
          next.tileSize !== lastProject.tileSize;

        if (layerIdsChanged || dimsChanged) {
          rebuildLayers(next);
          redrawGrid();
        } else {
          for (const layer of next.layers) {
            const prevLayer = lastProject.layers.find((l) => l.id === layer.id);
            if (prevLayer && prevLayer.tiles === layer.tiles && prevLayer.visible === layer.visible) continue;
            const state = layerStates.get(layer.id);
            if (state) syncLayer(state, layer, layer.visible);
          }
        }

        if (next.collision !== lastProject.collision) {
          redrawCollision();
        }
        if (next.entities !== lastProject.entities) {
          syncEntities();
        }
        lastProject = next;
      });

      unsubEditor = useEditor.subscribe((state) => {
        if (!scene) return;
        if (state.zoom !== lastEditor.zoom || state.panX !== lastEditor.panX || state.panY !== lastEditor.panY) {
          applyCamera();
        }
        if (state.showGrid !== lastEditor.showGrid) {
          redrawGrid();
        }
        if (state.showCollisionOverlay !== lastEditor.showCollisionOverlay) {
          redrawCollision();
        }
        if (state.selectedEntityId !== lastEditor.selectedEntityId) {
          syncEntities();
        }
        lastEditor = state;
      });
    })();

    return () => {
      mounted = false;
      if (disposePointer) disposePointer();
      if (unsubDoc) unsubDoc();
      if (unsubEditor) unsubEditor();
      for (const marker of entityMarkers.values()) marker.container.destroy({ children: true });
      entityMarkers.clear();
      if (scene) destroyScene(scene);
      scene = null;
    };
  }, []);

  return <div ref={hostRef} className="map-canvas-host" />;
}
