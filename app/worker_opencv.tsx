import { ipcRenderer } from 'electron';
import * as cv from 'opencv4nodejs';
import log from 'electron-log';

import { VideoCaptureProperties } from './constants/openCVProperties';

export const defaultMovieInfo = {
  frameCount: 0,
  width: 100,
  height: 100
};

export interface MovieInfo {
  frameCount?: number;
  width?: number;
  height?: number;
}

export const getMovieInfo = (filePath: string): MovieInfo => {
  try {
    const vid = new cv.VideoCapture(filePath);
    const frameCount = vid.get(VideoCaptureProperties.CAP_PROP_FRAME_COUNT);
    const width = vid.get(VideoCaptureProperties.CAP_PROP_FRAME_WIDTH);
    const height = vid.get(VideoCaptureProperties.CAP_PROP_FRAME_HEIGHT);

    return {
      frameCount,
      width,
      height
    };
  } catch (e) {
    console.error(e);
  }
  return {};
};

export const mapRange = (value, low1, high1, low2, high2, returnInt = true) => {
  // special case, prevent division by 0
  if (high1 - low1 === 0) {
    return 0;
  }
  // * 1.0 added to force float division
  let newValue =
    low2 + (high2 - low2) * (((value - low1) * 1.0) / (high1 - low1));
  newValue = Math.round(newValue * 1000 + Number.EPSILON) / 1000; // rounds the number with 3 decimals
  let limitedNewValue = Math.min(Math.max(newValue, low2), high2);
  if (returnInt) {
    limitedNewValue = Math.round(limitedNewValue);
  }
  return limitedNewValue;
};

export const getThumbs = (
  filePath: string,
  frameNumberArray: number[]
): void => {
  // const base64Array: string[] = [];
  try {
    const vid = new cv.VideoCapture(filePath);
    vid.read();

    frameNumberArray.map(frameNumber => {
      vid.set(VideoCaptureProperties.CAP_PROP_POS_FRAMES, frameNumber);
      const mat = vid.read();
      if (mat.empty === false) {
        // show image
        // console.log(mat);
        // const matScaled = mat.resizeToMax(960);
        const outBase64 = cv.imencode('.jpg', mat).toString('base64'); // Perform base64 encoding
        // base64Array.push(`data:image/jpeg;base64,${outBase64}`);
        const outBase64String = `data:image/jpeg;base64,${outBase64}`;
        ipcRenderer.send(
          'message-from-opencvWorkerWindow-to-mainWindow',
          'receive-thumb',
          frameNumber,
          outBase64String
        );
      } else {
        console.log('opencvWorkerWindow | frame is empty');
      }
      return undefined;
    });
    // frameNumberArray.map(async frameNumber => {
    //   vid.set(VideoCaptureProperties.CAP_PROP_POS_FRAMES, frameNumber);
    //   const mat = await vid.readAsync();
    //   if (mat.empty === false) {
    //     // show image
    //     console.log(mat);
    //     const matScaled = mat.resizeToMax(960);
    //     const outBase64 = cv.imencode('.jpg', matScaled).toString('base64'); // Perform base64 encoding
    //     base64Array.push(`data:image/jpeg;base64,${outBase64}`);
    //   } else {
    //     console.log('opencvWorkerWindow | frame is empty');
    //   }
    //   return undefined;
    // });
  } catch (e) {
    console.error(e);
  }
  ipcRenderer.send(
    'message-from-opencvWorkerWindow-to-mainWindow',
    'receive-thumbs-done'
  );
  return undefined;
};

ipcRenderer.on('get-file-details', (event, path) => {
  log.debug('opencvWorkerWindow | on get-file-details');
  // log.debug(fileId);
  log.debug(`opencvWorkerWindow | ${path}`);
  const movieInfo = getMovieInfo(path);
  console.log(movieInfo);
  ipcRenderer.send(
    'message-from-opencvWorkerWindow-to-mainWindow',
    'receive-file-details',
    movieInfo
  );
});

ipcRenderer.on('get-thumbs', (event, path, frameNumberArray) => {
  log.debug('opencvWorkerWindow | on get-thumbs');
  // log.debug(fileId);
  log.debug(`opencvWorkerWindow | ${path}`);
  getThumbs(path, frameNumberArray);
  // console.log(base64Array);
});
