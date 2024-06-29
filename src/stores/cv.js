import html from "choo/html";
import cv from "@techstark/opencv-js";
import { css } from "@emotion/css";

const videoCss = css`
  position: absolute;
  top: 100px;
  left: 0;
  width: 10px;
  height: 10px;
  opacity: 0;
`;


export default function (state, emitter) {
  let video = html`<video id="webcam" autoplay muted playsinline width="640" height="480" class=${ videoCss }></video>`;
  document.body.appendChild(video);
  state.videoElement = video;
  state.showCamera = false;
  let streaming = false;
  let flow;

  window.initCv = function () {
    if (streaming) {
      return;
    }
    emitter.emit("start capture")

    let p = new P5() // {width: window.innerWidth, height:window.innerHeight, mode: 'P2D'}
    let hydraInited = false;
    let canvas;

    p.setup = () => {
      canvas = p.createCanvas(640, 480);
      p.pixelDensity(1);
    };

    p.draw = () => {
      if (typeof s1 !== 'undefined' && hydraInited === false) {
        console.log(p.canvas)
        s1.init({ src: p.canvas });
        hydraInited = true;
      }
      
      p.clear();
      if (flow === undefined) {
        return;
      }

      const W = flow.cols;
      const H = flow.rows;
      p.scale(p.width / W, p.height / H);

      p.noStroke();
      p.fill(0);
      p.rect(0, 0, flow.cols, flow.rows);

      p.noStroke();
      for (let i = 0; i < flow.rows; i+=10) {
        for (let j = 0; j < flow.cols; j+=10) {
          p.fill(p.map(flow.data32F[(j+i*flow.cols) * 2 + 0], -1, 1, 0, 255, true),
          p.map(flow.data32F[(j+i*flow.cols) * 2 + 1], 1, -1, 0, 255, true), 0)
          p.rect(j,i,11,11)
        }
      }
    };
  }
  emitter.on("start capture", () => {
    // Check if webcam access is supported.
    function getUserMediaSupported() {
      return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
    }
    if (getUserMediaSupported()) {
    } else {
      console.warn("getUserMedia() is not supported by your browser");
      return;
    }
    
    // getUsermedia parameters to force video but not audio.
    const constraints = {
      video: true,
      width: 640,
      height: 480,
    };

    // Activate the webcam stream.
    navigator.mediaDevices.getUserMedia(constraints).then(function (stream) {
      video.srcObject = stream;
      video.addEventListener("loadeddata", runOpticalFlow);
      streaming = true;
    });

    function runOpticalFlow() {
      s0.init({ src: video });
      // src(s0).layer(src(s1).luma()).out()
      // src(o1).mask(osc(.2,1).thresh(.01,0))
      // .modulate(src(s1).scale(1,-1).brightness(-.5),.02)
      // .layer(osc(6,0.1,1.5).mask(shape(4,.3,0)))
      // .out(o1)
      // src(s0).scale(1,-1).layer(o1).out()

      let cap = new cv.VideoCapture(video);

      // take first frame and find corners in it
      let oldFrame = new cv.Mat(video.height, video.width, cv.CV_8UC4);
      cap.read(oldFrame);
      let oldGray = new cv.Mat();
      cv.cvtColor(oldFrame, oldGray, cv.COLOR_RGB2GRAY);

      let frame = new cv.Mat(video.height, video.width, cv.CV_8UC4);
      let frameGray = new cv.Mat();
      flow = new cv.Mat();
      
      let count = 0;

      const FPS = 30;
      function processVideo() {
        try {
          state.cvError = "";
          if (!streaming) {
            // clean and stop.
            frame.delete();
            oldGray.delete();
            return;
          }
          let begin = Date.now();

          // start processing.
          cap.read(frame);
          // console.log("reading");
          cv.cvtColor(frame, frameGray, cv.COLOR_RGBA2GRAY);

          // calculate optical flow
          cv.calcOpticalFlowFarneback(oldGray, frameGray, flow, 0.5, 3, 20, 3, 5, 1.2, 0);

 // console.log(flow.cols, flow.rows, flow.data32F[0]);
          
          frameGray.copyTo(oldGray);

          let delay = 1000 / FPS - (Date.now() - begin);
          setTimeout(processVideo, Math.max(0, delay));
          state.count = count++;
        } catch (err) {
          console.log(err);
          state.cvError = err;
        }
      }

      // schedule the first one.
      setTimeout(processVideo, 0);
    }
  });
}
