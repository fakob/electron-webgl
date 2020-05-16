import { Viewport } from 'pixi-viewport';
import { PixiComponent } from '@inlet/react-pixi';
import {
  SCREENWIDTH,
  SCREENHEIGHT,
  WORLDWIDTH,
  WORLDHEIGHT
} from '../constants/constants';

export default PixiComponent('Viewport', {
  create: () => {
    const viewport = new Viewport({
      screenWidth: SCREENWIDTH,
      screenHeight: SCREENHEIGHT,
      worldWidth: WORLDWIDTH,
      worldHeight: WORLDHEIGHT
    });
    viewport.on('drag-start', () => console.log('drag-start'));
    viewport.on('drag-end', () => console.log('drag-end'));
    viewport.on('clicked', () => {
      viewport.fit();
      console.log('clicked');
    });

    viewport
      .clamp({
        direction: 'all',
        left: -WORLDWIDTH * 0.1,
        right: WORLDWIDTH * 1.9,
        top: -WORLDHEIGHT * 0.1,
        bottom: WORLDHEIGHT * 1.9
      })
      .drag()
      .pinch()
      .wheel()
      .decelerate({
        friction: 0.8
      });

    //viewport.scaled = 30;
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
