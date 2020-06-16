import React from 'react';
import { Graphics, Text } from 'pixi.js';
import { Viewport as PixiViewport } from 'pixi-viewport';
import { GridPosition, Props } from '../constants/interfaces';

// export const Viewport = (props: Props) => {
//   const app = useApp();
//   // console.log(app);
//   return <PixiComponentViewport app={app} {...props} />;
// };

// interface PixiComponentProps {
//   app: PIXI.Application;
// }

export const getGridPosition = (
  columnCount: number,
  screenWidth: number,
  screenHeight: number,
  width: number,
  height: number,
  amount: number,
  index: number
) => {
  const scale = screenWidth / columnCount / width;
  const scaledWidth = width * scale;
  const scaledHeight = height * scale;
  const x = (index % columnCount) * scaledWidth;
  const y = Math.floor(index / columnCount) * scaledHeight;

  // console.log(`index: ${index}, x: ${x}, y: ${y}, scale: ${scale}`);
  return {
    x,
    y,
    scale
  };
};

export const getGridPositionArray = (
  columnCount: number,
  screenWidth: number,
  screenHeight: number,
  width: number,
  height: number,
  amount: number
): Array<GridPosition> => {
  const gridPositionArray: Array<GridPosition> = [];
  for (let index = 0; index < amount; index += 1) {
    gridPositionArray.push(
      getGridPosition(
        columnCount,
        screenWidth,
        screenHeight,
        width,
        height,
        amount,
        index
      )
    );
  }
  // console.log(gridPositionArray);
  return gridPositionArray;
};
