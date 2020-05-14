/* eslint-disable no-console */
import * as cv from 'opencv4nodejs';
import * as PIXI from 'pixi.js';
import { Stage, Sprite } from '@inlet/react-pixi';
import React, { useEffect, useState } from 'react';
import placeHolder from '../resources/Placeholder.png';

import { VideoCaptureProperties } from '../constants/openCVProperties';

const { dialog } = require('electron').remote;

console.log(`OpenCV version: ${cv.version}`);
// for ffmpeg version check app/node_modules/opencv-build/opencv/build/CMakeVars.txt
console.log(`ffmpeg version (manually entered): 3.4.2`);

export default function Home() {
  const [htmlImg] = useState('');

  let bunny: PIXI.Sprite;
  const canvas = document.getElementById('myCanvas') as HTMLCanvasElement;

  const app = new PIXI.Application({
    // view: canvas,
    backgroundColor: 0x1099bb
  });
  const loader = PIXI.Loader.shared; // PixiJS exposes a premade instance for you to use.
  document.body.appendChild(app.view);

  // on mount
  useEffect(() => {
    // create a new Sprite from an image path
    // create a second texture
    const texture = PIXI.Texture.from(placeHolder);
    bunny = new PIXI.Sprite(texture);

    // center the sprite's anchor point
    bunny.anchor.set(0.5);

    // move the sprite to the center of the screen
    bunny.x = app.screen.width / 2;
    bunny.y = app.screen.height / 2;

    app.stage.addChild(bunny);

    // Listen for animate update
    app.ticker.add(delta => {
      // just for fun, let's rotate mr rabbit a little
      // delta is 1 if running at 100% performance
      // creates frame-independent transformation
      bunny.rotation += 0.1 * delta;
    });
  }, []);

  const showVideo = (path: string) => {
    console.log(path);

    const vid = new cv.VideoCapture(path);
    const lengthInFrames =
      vid.get(VideoCaptureProperties.CAP_PROP_FRAME_COUNT) - 1;
    console.log(lengthInFrames);

    const frameToCapture = Math.round(lengthInFrames / 2);
    console.log(frameToCapture);
    vid.set(VideoCaptureProperties.CAP_PROP_POS_FRAMES, frameToCapture);
    console.log(vid.get(VideoCaptureProperties.CAP_PROP_POS_FRAMES));
    if (
      frameToCapture !== vid.get(VideoCaptureProperties.CAP_PROP_POS_FRAMES)
    ) {
      // playhead not at correct position, use ratio instead
      vid.set(VideoCaptureProperties.CAP_PROP_POS_AVI_RATIO, 0.5);
    }

    // read frame from capture
    vid
      .readAsync()
      .then(mat => {
        // show image
        console.log(mat);
        const matScaled = mat.resizeToMax(960);
        const outBase64 = cv.imencode('.jpg', matScaled).toString('base64'); // Perform base64 encoding
        // setHtmlImg(`data:image/jpeg;base64,${outBase64}`);

        loader
          .add('frame', `data:image/jpeg;base64,${outBase64}`)
          .load((_1, resources) => {
            bunny.texture = resources.frame.texture;
          });

        return undefined;
      })
      .catch(err => console.error(err));
  };

  const openFile = () => {
    dialog
      .showOpenDialog({ properties: ['openFile'] })
      .then(fileObject => {
        const { filePaths } = fileObject;
        console.log(filePaths[0]);
        showVideo(filePaths[0]);
        return undefined;
      })
      .catch(err => console.error(err));
  };

  return (
    <div
      //  className={styles.container}
      data-tid="container"
    >
      <h2>Home</h2>
      <br />
      <button type="button" onClick={openFile}>
        Open video
      </button>
      <Stage>
        <Sprite image={placeHolder} x={10} y={10} />
      </Stage>
      {/* <canvas id="myCanvas" /> */}
      <img alt="" src={htmlImg} />
    </div>
  );
}
