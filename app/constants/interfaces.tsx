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
