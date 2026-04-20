import { Container, Sprite, Texture } from "pixi.js";
import type { TileLayer } from "@/model/types";
import { EMPTY_TILE } from "@/model/types";
import { getTileTexture } from "./tilesetTextures";

export type LayerRenderState = {
  sprites: Sprite[];
  tileIds: number[]; // tile index currently rendered per cell, parallel to sprites
  width: number;
  height: number;
  tileSize: number;
};

export function buildLayer(
  container: Container,
  width: number,
  height: number,
  tileSize: number,
): LayerRenderState {
  container.removeChildren().forEach((c) => c.destroy());
  const count = width * height;
  const sprites: Sprite[] = new Array(count);
  const tileIds: number[] = new Array(count).fill(EMPTY_TILE);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const sprite = new Sprite(Texture.EMPTY);
      sprite.x = x * tileSize;
      sprite.y = y * tileSize;
      sprite.width = tileSize;
      sprite.height = tileSize;
      sprite.visible = false;
      container.addChild(sprite);
      sprites[y * width + x] = sprite;
    }
  }

  return { sprites, tileIds, width, height, tileSize };
}

export function syncLayer(
  state: LayerRenderState,
  layer: TileLayer,
  visible: boolean,
): void {
  const { sprites, tileIds } = state;
  for (let i = 0; i < sprites.length; i++) {
    const nextTile = layer.tiles[i];
    if (tileIds[i] === nextTile && sprites[i].visible === (visible && nextTile >= 0)) {
      continue;
    }
    tileIds[i] = nextTile;
    const sprite = sprites[i];
    if (nextTile < 0) {
      sprite.visible = false;
      continue;
    }
    const texture = getTileTexture(nextTile);
    if (texture) {
      sprite.texture = texture;
      sprite.visible = visible;
    } else {
      sprite.visible = false;
    }
  }
}
