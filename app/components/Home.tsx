/* eslint-disable no-console */
import { ipcRenderer } from 'electron';
import log from 'electron-log';
import * as cv from 'opencv4nodejs';
import { fromEvent, animationFrameScheduler } from 'rxjs';
import { first, takeUntil, tap, bufferTime, delay } from 'rxjs/operators';
import * as PIXI from 'pixi.js';
import { Viewport } from 'pixi-viewport';
import React, { useEffect, useRef, useState } from 'react';
import ReactSlider from 'react-slider';
import InitialImage from '../../internals/img/js.png';
import { getGridPositionArray } from './Pixi';
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

let app: PIXI.Application;
let viewport: Viewport;

export default function Home() {
  const refStage = useRef();
  const refViewport = useRef();
  const refRectangle = useRef();
  const myCanvas = useRef();

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
    const thisGridPositionArray = getGridPositionArray(
      thisColumnCount,
      window.innerWidth,
      window.innerHeight,
      width,
      height,
      thisAmount
    );

    setGridPositionArray(thisGridPositionArray);
    console.log(viewport);
    if (viewport.children.length > 0) {
      viewport.children.map((child, index) => {
        child.position.set(
          thisGridPositionArray[index]?.x,
          thisGridPositionArray[index]?.y
        );
        // child.scale.set(thisGridPositionArray[index]?.scale);
        return undefined;
      });
    }
  };

  // on mount
  useEffect(() => {
    app = new PIXI.Application({
      width: 300,
      height: 200,
      backgroundColor: 0x00ff00,
      resolution: window.devicePixelRatio || 1,
      view: myCanvas.current // getContext('2d')
    });
    // create viewport
    viewport = new Viewport({
      screenWidth: window.innerWidth,
      screenHeight: window.innerHeight,
      worldWidth: 1000,
      worldHeight: 1000,

      interaction: app.renderer.plugins.interaction // the interaction module is important for wheel to work properly when renderer.view is placed or scaled
    });

    console.log(viewport);
    // add the viewport to the stage
    app.stage.addChild(viewport);

    // activate plugins
    // viewport.on('clicked', () => {
    //   console.log('clicked');
    //   // viewport.fitWorld();
    //   viewport.fit();
    //   viewport.moveCenter(viewport.screenWidth / 2, viewport.screenHeight / 2);
    // });

    viewport
      .drag()
      .pinch()
      .wheel()
      // .clamp({ direction: 'all' })
      // .clampZoom({ minScale: 0.5, maxScale: 1 })
      .decelerate({
        friction: 0.8
      });

    window.addEventListener('resize', () =>
      viewport.resize(window.innerWidth, window.innerHeight)
    );

    // add a red box
    const sprite = viewport.addChild(new PIXI.Sprite(PIXI.Texture.WHITE));
    sprite.tint = 0xff0000;
    sprite.width = sprite.height = 100;
    sprite.position.set(100, 100);

    // // load the texture we need
    // app.loader.add('bunny', InitialImage).load((loader, resources) => {
    //   // This creates a texture from a 'bunny.png' image
    //   const bunny = new PIXI.Sprite(resources.bunny.texture);

    //   // Setup the position of the bunny
    //   bunny.x = app.renderer.width / 2;
    //   bunny.y = app.renderer.height / 2;

    //   // Rotate around the center
    //   bunny.anchor.x = 0.5;
    //   bunny.anchor.y = 0.5;

    //   // Add the bunny to the scene we are building
    //   viewport.addChild(bunny);

    //   // Listen for frame updates
    //   app.ticker.add(() => {
    //     // each frame we spin the bunny around a bit
    //     bunny.rotation += 0.01;
    //   });
    // });
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
    const { width, height } = newMovieInfo;
    const gPA = getGridPositionArray(
      columnCount,
      window.innerWidth,
      window.innerHeight,
      width,
      height,
      amount
    );
    if (frameCount !== 0) {
      const frameNumberArray = Array.from(Array(amount).keys()).map(x =>
        mapRange(x, 0, amount - 1, 0, frameCount - 1, true)
      );
      const emptyThumbArray = frameNumberArray.map((item, index) => {
        // add a red box
        const sprite = viewport.addChild(new PIXI.Sprite(PIXI.Texture.WHITE));
        // sprite.tint = 0x0000ff;
        const { x = 0, y = 0, scale = 0 } = gPA[index];
        sprite.alpha = 0.3;
        sprite.width = width * scale;
        sprite.height = height * scale;
        sprite.position.set(x, y);
        return {
          spriteRef: sprite,
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
              const newTexture = PIXI.Texture.from(
                receivedThumbArray[thumbIndex].base64
              );
              receivedThumbArray[thumbIndex].spriteRef = thumb.spriteRef;
              receivedThumbArray[thumbIndex].spriteRef.texture = newTexture;
              receivedThumbArray[thumbIndex].spriteRef.alpha = 1;

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
    // console.log(refStage.current);
    // console.log(refViewport.current);
    // console.log(refRectangle.current);
    // PixiComponentViewport.moveCenter(0, 0);

    console.log(app);
    console.log(viewport);
    viewport.fit();
    viewport.moveCenter(viewport.screenWidth / 2, viewport.screenHeight / 2);

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

  // console.log(gridPositionArray);

  return (
    <div
      //  className={styles.container}
      data-tid="container"
    >
      <canvas ref={myCanvas} />
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
            setThumbArray([]); // delete all thumbs
            viewport.removeChildren(); // delete all sprites
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
      {/* <Stage
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
      </Stage> */}
    </div>
  );
}
