/* eslint-disable no-console */
import * as cv from 'opencv4nodejs';
import { Stage, Sprite } from '@inlet/react-pixi';
import React, { useEffect, useState } from 'react';
import {
  defaultMovieInfo,
  getMovieInfo,
  getThumbs,
  mapRange,
  MovieInfo
} from './OpencvWorker';
// import placeHolder from '../resources/Placeholder.png';

const { dialog } = require('electron').remote;

console.log(`OpenCV version: ${cv.version}`);
// for ffmpeg version check app/node_modules/opencv-build/opencv/build/CMakeVars.txt
console.log(`ffmpeg version (manually entered): 3.4.2`);

export default function Home() {
  const [base64Array, setBase64Array] = useState<Array<string>>([]);
  const [movieInfo, setMovieInfo] = useState<MovieInfo>(defaultMovieInfo);

  // on mount
  useEffect(() => {}, []);

  const showVideo = (path: string) => {
    console.log(path);

    const { frameCount } = movieInfo;
    const amount = 10;

    setMovieInfo(getMovieInfo(path));
    const frameNumberArray = Array.from(Array(amount).keys()).map(x =>
      mapRange(x, 0, amount - 1, 0, frameCount, true)
    );

    const tempArray: string[] = getThumbs(path, frameNumberArray);
    console.log(tempArray);

    setBase64Array(tempArray);
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

  const { width, height } = movieInfo;
  const scale = 0.1;

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
        {base64Array.map((base64, index) => (
          <Sprite
            key={`img-${index}`}
            image={base64}
            scale={{ x: scale, y: scale }}
            width={width * scale}
            height={height * scale}
            x={0}
            y={height * scale * index}
          />
        ))}
      </Stage>
    </div>
  );
}
