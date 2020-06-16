import { Sprite } from "pixi.js";

export interface GridPosition {
  x: number;
  y: number;
  scale: number;
}

export interface Props {
  children: React.ReactNode;
  screenWidth: number;
  screenHeight: number;
  worldWidth: number;
  worldHeight: number;
}

export interface Thumb {
  spriteRef: Sprite;
  base64: string;
  frameNumber: number;
}

export interface ThumbOptionOverlay {
  show: boolean;
  frameNumber?: number;
  gridPosition?: GridPosition;
}
