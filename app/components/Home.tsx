/* eslint-disable no-console */
import { ipcRenderer } from 'electron';
import log from 'electron-log';
import * as cv from 'opencv4nodejs';
import { fromEvent, animationFrameScheduler } from 'rxjs';
import { first, takeUntil, tap, bufferTime, delay } from 'rxjs/operators';
import * as PIXI from 'pixi.js';
import { Stage, Sprite, Text } from '@inlet/react-pixi';
import React, { useEffect, useRef, useState } from 'react';
import ReactSlider from 'react-slider';
import { Viewport, Rectangle, FastText, getGridPositionArray } from './Pixi';
import styles from './Home.css';
import {
  GridPosition,
  Thumb,
  ThumbOptionOverlay
} from '../constants/interfaces';
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
  tap(() => console.log(`doneReceivingThumbs`)),
  delay(1000)
);

const receiveThumb$ = fromEvent(ipcRenderer, 'receive-thumb').pipe(
  tap(() => console.log(`receiveThumb`)),
  // bufferCount(5),
  bufferTime(200, animationFrameScheduler),
  takeUntil(doneReceivingThumbs$)
);

export default function Home() {
  const refStage = useRef(null);
  const refViewport = useRef(null);
  const refRectangle = useRef(null);

  const [thumbArray, setThumbArray] = useState<Array<Thumb>>([]);
  const [gridPositionArray, setGridPositionArray] = useState<
    Array<GridPosition>
  >([]);
  const [amount, setAmount] = useState(20);
  const [columnCount, setColumnCount] = useState(3);
  const [movieInfo, setMovieInfo] = useState<MovieInfo>(defaultMovieInfo);
  const [moviePath, setMoviePath] = useState('');
  const [hoverIndex, setHoverIndex] = useState<number | undefined>(undefined);
  const [textSize, setTextSize] = useState(20);
  const [thumbOptions, setThumbOptions] = useState<ThumbOptionOverlay>({
    show: false
  });

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

  // on thumbArray change
  useEffect(() => {
    calculateAndSetGridPositions(columnCount, thumbArray.length, movieInfo);
  }, [thumbArray.length, amount, columnCount]);

  // on path and amount change
  useEffect(() => {
    console.log(moviePath);

    const newMovieInfo = getMovieInfo(moviePath);
    const { frameCount = 0 } = newMovieInfo;
    setMovieInfo(newMovieInfo);
    if (frameCount !== 0) {
      const frameNumberArray = Array.from(Array(amount).keys()).map(x =>
        mapRange(x, 0, amount - 1, 0, frameCount - 1, true)
      );
      const emptyThumbArray = frameNumberArray.map(item => {
        return {
          frameNumber: item,
          base64: 'data:image/jpeg;base64,'
        };
      });
      setThumbArray(emptyThumbArray);

      const receiveThumb = receiveThumb$.subscribe(
        result => {
          console.log(result);
          const receivedThumbArray = result.map(item => {
            const [_, frameNumber, base64OfThumb] = item;
            console.log(frameNumber);
            return {
              base64: base64OfThumb,
              frameNumber
            };
          });
          setThumbArray(previousArray => {
            const newArray = previousArray.map(thumb => {
              const thumbIndex = receivedThumbArray.findIndex(item => {
                return item.frameNumber === thumb.frameNumber;
              });
              if (thumbIndex < 0) {
                return thumb;
              }
              return receivedThumbArray[thumbIndex];
            });
            // console.log(base64OfThumb);
            // console.log(thumbArray.length);
            // add new thumb to array
            console.log(thumbArray);
            console.log(receivedThumbArray);
            console.log(newArray);
            return newArray;
          });
          // setThumbArray(newArray);
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
    }
  }, [moviePath, amount]);

  const openFile = () => {
    dialog
      .showOpenDialog({ properties: ['openFile'] })
      .then(fileObject => {
        const { filePaths } = fileObject;
        console.log(filePaths[0]);
        setThumbArray([]);
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
      {thumbOptions.show && (
        <div
          className={styles.thumbOptions}
          style={{
            position: 'absolute',
            left: thumbOptions.gridPosition?.x,
            top: thumbOptions.gridPosition?.y
          }}
        >
          {thumbOptions.frameNumber}
        </div>
      )}
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
        max={1000}
        onAfterChange={value => {
          console.log(value);
          if (typeof value === 'number') {
            setThumbArray([]);
            setAmount(value);
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
      <ReactSlider
        className={styles.horizontalSlider}
        thumbClassName={styles.exampleThumb}
        trackClassName={styles.exampleTrack}
        renderThumb={(props, state) => <div {...props}>{state.valueNow}</div>}
        defaultValue={20}
        min={1}
        onChange={value => {
          if (typeof value === 'number') {
            setTextSize(value);
          }
        }}
      />
      <Stage
        ref={refStage}
        width={700}
        height={500}
        options={{ resizeTo: window }}
        // onMouseMove={e => {
        //   console.log(e.target);
        //   // console.log(`index: ${index}`);
        //   // setHoverIndex(index);
        // }}
      >
        <Viewport
          // ref={refViewport}
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
            gridPositionArray.length === thumbArray.length &&
            thumbArray.map(({ base64 = undefined, frameNumber }, index) => {
              const { x = 0, y = 0, scale = 0 } = gridPositionArray[index];
              return (
                <>
                  <Sprite
                    key={frameNumber}
                    alpha={hoverIndex !== index ? 1 : 0.3}
                    image={base64}
                    scale={{ x: scale, y: scale }}
                    width={width * scale}
                    height={height * scale}
                    x={x}
                    y={y}
                    interactive
                    click={e => {
                      console.log(e);
                      console.log(e.data);
                      console.log(e.data.global);
                      // console.log(`index: ${index}`);
                      setThumbOptions({
                        show: !thumbOptions.show,
                        frameNumber,
                        gridPosition: gridPositionArray[index]
                      });
                    }}
                    mouseover={e => {
                      // console.log(e);
                      // console.log(`index: ${index}`);
                      setHoverIndex(index);
                    }}
                  />
                  <Rectangle
                    ref={refRectangle}
                    x={x}
                    y={y}
                    width={(width * scale) / 4}
                    height={(height * scale) / 4}
                    fill={0x00ff00}
                    mouseover={e => {
                      console.log(e);
                      // console.log(`index: ${index}`);
                      // setHoverIndex(index);
                    }}
                  />
                  <Text
                    text={frameNumber.toString()}
                    // anchor={0.5}
                    x={x}
                    y={y}
                    style={
                      new PIXI.TextStyle({
                        align: 'left',
                        fontFamily: 'sans-serif',
                        fontSize: textSize * scale,
                        fontWeight: '300',
                        fill: '0xff0000'
                        // fill: ['#ffffff', '#00ff99'], // gradient
                        // stroke: '#01d27e',
                        // strokeThickness: 5,
                        // letterSpacing: 20,
                        // dropShadow: true,
                        // dropShadowColor: '#ccced2',
                        // dropShadowBlur: 4,
                        // dropShadowAngle: Math.PI / 6,
                        // dropShadowDistance: 6,
                        // wordWrap: true,
                        // wordWrapWidth: 440
                      })
                    }
                  />
                </>
              );
            })}
        </Viewport>
      </Stage>
    </div>
  );
}
