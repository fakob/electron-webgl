import React from 'react';
import { Graphics } from 'pixi.js';
import { Viewport as PixiViewport } from 'pixi-viewport';
import { PixiComponent, useApp } from '@inlet/react-pixi';
import { GridPosition, Props } from '../constants/interfaces';

export const Viewport = (props: Props) => {
  const app = useApp();
  // console.log(app);
  return <PixiComponentViewport app={app} {...props} />;
};

interface PixiComponentProps {
  app: PIXI.Application;
}

const PixiComponentViewport = PixiComponent('Viewport', {
  create: (props: PixiComponentProps & Props) => {
    const viewport = new PixiViewport({
      screenWidth: props.screenWidth,
      screenHeight: props.screenHeight,
      worldWidth: props.worldWidth,
      worldHeight: props.worldHeight,
      ticker: props.app.ticker,
      interaction: props.app.renderer.plugins.interaction
      // the interaction module is important for wheel to work properly when renderer.view is placed or scaled
    });
    //viewport.on("drag-start", () => console.log("drag-start"));
    //viewport.on("drag-end", () => console.log("drag-end"));
    viewport.on('clicked', () => {
      console.log('clicked');
      // viewport.fitWorld();
      viewport.fit();
      viewport.moveCenter(props.screenWidth / 2, props.screenHeight / 2);
    });

    viewport
      .drag()
      .pinch()
      .wheel()
      // .clamp({ direction: 'all' })
      // .clampZoom({ minScale: 0.5, maxScale: 1 })
      .decelerate({
        friction: 0.8
      });

    // viewport.clamp({ direction: 'all' });

    return viewport;
  },
  applyProps: (instance, oldProps, newProps) => {
    console.log('applyProps');
  },
  didMount: () => {
    console.log('didMount');
  },
  willUnmount: () => {
    console.log('willUnmount');
  }
});

export const Rectangle = PixiComponent('Rectangle', {
  create: props => new Graphics(),
  applyProps: (instance, _, props) => {
    const { x, y, width, height, fill } = props;
    instance.clear();
    instance.beginFill(fill);
    instance.drawRect(x, y, width, height);
    instance.endFill();
  }
});

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
  return gridPositionArray;
};
