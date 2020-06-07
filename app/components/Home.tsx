/* eslint-disable no-console */
import { ipcRenderer } from 'electron';
import log from 'electron-log';
import * as cv from 'opencv4nodejs';
import { fromEvent, Observable, fromEventPattern } from 'rxjs';
import { first, takeUntil, tap } from 'rxjs/operators';
import { Stage, Sprite } from '@inlet/react-pixi';
import React, { useEffect, useRef, useState } from 'react';
import ReactSlider from 'react-slider';
import { Viewport, Rectangle, getGridPositionArray } from './Pixi';
import styles from './Home.css';
import { GridPosition } from '../constants/interfaces';
import {
  defaultMovieInfo,
  getMovieInfo,
  mapRange,
  MovieInfo
} from '../worker_opencv';
import {
  // SCREENWIDTH,
  // SCREENHEIGHT,
  WORLDWIDTH,
  WORLDHEIGHT
} from '../constants/constants';
// import placeHolder from '../resources/Placeholder.png';

const { dialog } = require('electron').remote;

console.log(`OpenCV version: ${cv.version}`);
// for ffmpeg version check app/node_modules/opencv-build/opencv/build/CMakeVars.txt
console.log(`ffmpeg version (manually entered): 3.4.2`);

console.log(Viewport);

const doneReceivingThumbs$ = fromEvent(ipcRenderer, 'receive-thumbs-done').pipe(
  tap(() => console.log(`doneReceivingThumbs`))
);

const receiveThumb$ = fromEvent(ipcRenderer, 'receive-thumb').pipe(
  tap(() => console.log(`receiveThumb`)),
  takeUntil(doneReceivingThumbs$)
);

export default function Home() {
  const refStage = useRef(null);
  const refViewport = useRef(null);
  const refRectangle = useRef(null);

  const [base64Array, setBase64Array] = useState<Array<string>>([]);
  const [gridPositionArray, setGridPositionArray] = useState<
    Array<GridPosition>
  >([]);
  const [amount, setAmount] = useState(20);
  const [columnCount, setColumnCount] = useState(3);
  const [movieInfo, setMovieInfo] = useState<MovieInfo>(defaultMovieInfo);
  const [moviePath, setMoviePath] = useState('');
  const [hoverIndex, setHoverIndex] = useState<number | undefined>(undefined);

  const calculateAndSetGridPositions = (
    thisColumnCount: number,
    thisAmount: number,
    thisMovieInfo: MovieInfo
  ) => {
    const { width = 0, height = 0 } = thisMovieInfo;
    setGridPositionArray(
      getGridPositionArray(
        thisColumnCount,
        window.innerWidth,
        window.innerHeight,
        width,
        height,
        thisAmount
      )
    );
  };

  // on mount
  useEffect(() => {
    console.log('viewport instance: ', refViewport.current);
  }, []);

  // on base64Array change
  useEffect(() => {
    calculateAndSetGridPositions(columnCount, base64Array.length, movieInfo);
  }, [base64Array.length, amount, columnCount]);

  // on path and amount change
  useEffect(() => {
    console.log(moviePath);

    const newMovieInfo = getMovieInfo(moviePath);
    const { frameCount = 0 } = newMovieInfo;
    setMovieInfo(newMovieInfo);
    const frameNumberArray = Array.from(Array(amount).keys()).map(x =>
      mapRange(x, 0, amount - 1, 0, frameCount - 1, true)
    );

    const receiveThumb = receiveThumb$.subscribe(
      result => {
        // console.log('Clicked!');
        const [_, frameNumber, base64OfThumb] = result;
        console.log(frameNumber);
        // console.log(base64OfThumb);
        console.log(base64Array.length);
        // add new thumb to array
        setBase64Array(previousArray => [...previousArray, base64OfThumb]);
      },
      err => console.error('Observer got an error: ', err),
      () => console.log('Observer got a complete notification')
    );

    // ipcRenderer.on('receive-thumbs-done', event => {
    //   log.debug('mainWindow | on receive-thumbs-done');
    //   console.log(receiveThumb);
    //   // receiveThumb.unsubscribe();
    // });

    ipcRenderer.send(
      'message-from-mainWindow-to-opencvWorkerWindow',
      'get-thumbs',
      moviePath,
      frameNumberArray
    );

    return () => receiveThumb.unsubscribe();
  }, [moviePath, amount]);

  const openFile = () => {
    dialog
      .showOpenDialog({ properties: ['openFile'] })
      .then(fileObject => {
        const { filePaths } = fileObject;
        console.log(filePaths[0]);
        setMoviePath(filePaths[0]);
        return undefined;
      })
      .catch(err => console.error(err));
  };

  const onFitClick = async () => {
    console.log(refStage.current);
    console.log(refViewport.current);
    console.log(refRectangle.current);
    // PixiComponentViewport.moveCenter(0, 0);

    const receiveFileDetailsObservable = fromEvent(
      ipcRenderer,
      'receive-file-details'
    );

    ipcRenderer.send(
      'message-from-mainWindow-to-opencvWorkerWindow',
      'get-file-details',
      moviePath
    );
    console.log(receiveFileDetailsObservable);
    const result = await receiveFileDetailsObservable.pipe(first()).toPromise();
    console.log(result);
  };

  const { width, height } = movieInfo;
  // console.log(gridPositionArray);

  return (
    <div
      //  className={styles.container}
      data-tid="container"
    >
      <h2>Home</h2>
      <br />
      <button type="button" onClick={onFitClick}>
        Fit
      </button>
      <button type="button" onClick={openFile}>
        Open video
      </button>
      <ReactSlider
        className={styles.horizontalSlider}
        thumbClassName={styles.exampleThumb}
        trackClassName={styles.exampleTrack}
        renderThumb={(props, state) => <div {...props}>{state.valueNow}</div>}
        defaultValue={20}
        onAfterChange={value => {
          console.log(value);
          if (typeof value === 'number') {
            setBase64Array([]);
            setAmount(value);
            // calculateAndSetGridPositions(columnCount, value, movieInfo);
          }
        }}
      />
      <ReactSlider
        className={styles.horizontalSlider}
        thumbClassName={styles.exampleThumb}
        trackClassName={styles.exampleTrack}
        renderThumb={(props, state) => <div {...props}>{state.valueNow}</div>}
        defaultValue={20}
        min={1}
        onChange={value => {
          if (typeof value === 'number') {
            setColumnCount(value);
            calculateAndSetGridPositions(value, amount, movieInfo);
          }
        }}
      />
      <Stage
        ref={refStage}
        width={700}
        height={500}
        options={{ resizeTo: window }}
      >
        <Viewport
          ref={refViewport}
          screenWidth={window.innerWidth}
          screenHeight={window.innerHeight}
          worldWidth={WORLDWIDTH}
          worldHeight={WORLDHEIGHT}
        >
          <Rectangle
            ref={refRectangle}
            x={0}
            y={0}
            width={window.innerWidth}
            height={window.innerHeight}
            fill={0x222222}
          />
          {gridPositionArray !== undefined &&
            gridPositionArray.length === base64Array.length &&
            base64Array.map((base64, index) => {
              const { x = 0, y = 0, scale = 0 } = gridPositionArray[index];
              return (
                <Sprite
                  key={`img-${index}`}
                  alpha={hoverIndex !== index ? 1 : 0.3}
                  image={base64}
                  scale={{ x: scale, y: scale }}
                  width={width * scale}
                  height={height * scale}
                  x={x}
                  y={y}
                  interactive
                  mouseover={e => {
                    // console.log(e);
                    // console.log(`index: ${index}`);
                    setHoverIndex(index);
                  }}
                />
              );
            })}
        </Viewport>
      </Stage>
    </div>
  );
}
