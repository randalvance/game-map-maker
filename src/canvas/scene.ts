import { Application, Container, Graphics } from "pixi.js";

export type SceneGraph = {
  app: Application;
  world: Container;
  grid: Graphics;
  tileLayers: Container;
  collisionOverlay: Graphics;
  entities: Container;
  hud: Container;
};

export async function createScene(host: HTMLElement): Promise<SceneGraph> {
  const app = new Application();
  await app.init({
    resizeTo: host,
    backgroundColor: 0x14141a,
    antialias: false,
    autoDensity: true,
    resolution: window.devicePixelRatio || 1,
  });
  host.appendChild(app.canvas);

  const world = new Container();
  app.stage.addChild(world);

  const tileLayers = new Container();
  world.addChild(tileLayers);

  const grid = new Graphics();
  world.addChild(grid);

  const collisionOverlay = new Graphics();
  world.addChild(collisionOverlay);

  const entities = new Container();
  world.addChild(entities);

  const hud = new Container();
  app.stage.addChild(hud);

  return { app, world, grid, tileLayers, collisionOverlay, entities, hud };
}

export function destroyScene(scene: SceneGraph): void {
  try {
    scene.app.destroy(true, { children: true });
  } catch {
    // ignore teardown races
  }
}

export function rebuildTileLayerContainers(
  scene: SceneGraph,
  layerIds: string[],
): Map<string, Container> {
  scene.tileLayers.removeChildren().forEach((c) => c.destroy({ children: true }));
  const out = new Map<string, Container>();
  for (const id of layerIds) {
    const container = new Container();
    scene.tileLayers.addChild(container);
    out.set(id, container);
  }
  return out;
}
