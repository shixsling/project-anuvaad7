const { exec } = require("child_process");
const fs = require("fs");
const path = require("path");
const csvToJson = require("csvtojson");
const uuid = require("uuid").v4;
const OUTPUT_DIRECTORY = "voice-activity-results";

const downloadFile = (url) => {
  return new Promise((resolve, reject) => {
    const targetPath = path.join(
      __dirname,
      `${uuid()}.${url.split(".").pop()}`
    );
    exec(`curl ${url} --output ${targetPath}`, (err) => {
      if (err) {
        return reject(err);
      }
      if (!fs.existsSync(targetPath)) {
        return reject(new Error("Failed to download file"));
      }
      return resolve(targetPath);
    });
  });
};

const detectVoiceActivity = (filePath) => {
  return new Promise((resolve, reject) => {
    const fileName = filePath.split("/").pop().split(".")[0];
    exec(
      `ina_speech_segmenter.py -i ${filePath} -o ${OUTPUT_DIRECTORY} -g false`,
      (err) => {
        if (err) {
          return reject(err);
        }
        return resolve(
          path.join(__dirname, OUTPUT_DIRECTORY, `${fileName}.csv`)
        );
      }
    );
  });
};

const convertCsvToJson = (filePath) => {
  return new Promise((resolve, reject) => {
    csvToJson({ delimiter: "\t" })
      .fromFile(filePath)
      .then((voiceActivity) => {
        return resolve(voiceActivity);
      })
      .catch((err) => {
        return reject(err);
      });
  });
};

const formatSlides = (slides) => {
  let speechTime = slides.filter((slide) => slide.labels === "speech");

  speechTime = speechTime.map((slide) => ({
    ...slide,
    start: Number(slide.start),
    stop: Number(slide.stop),
  }));

  // console.log(speechTime);

  let result = [];

  speechTime.reduce((acc, slide, i) => {
    // console.log(i, acc, slide);
    if (i === 0) {
      if (slide.start === "0.0") {
        if (i === speechTime.length - 1) {
          result.push({
            type: "speech",
            start: slide.start,
            stop: slide.stop,
          });
        }

        return {
          type: "speech",
          start: slide.start,
          stop: slide.stop,
        };
      }

      if (slide.start >= 1) {
        result.push({
          type: "silence",
          start: 0,
          stop: slide.start,
        });

        if (i === speechTime.length - 1) {
          result.push({
            type: "speech",
            start: slide.start,
            stop: slide.stop,
          });
        }

        return {
          type: "speech",
          start: slide.start,
          stop: slide.stop,
        };
      }

      if (i === speechTime.length - 1) {
        result.push({
          type: "speech",
          start: 0,
          stop: slide.stop,
        });
      }

      return {
        type: "speech",
        start: 0,
        stop: slide.stop,
      };
    }

    /////////////////////////////////////////////////////////////////////////////////////////////////////

    if (slide.start - acc.stop > 0 && slide.start - acc.stop < 5) {
      if (slide.start - acc.start >= 15) {
        result.push({
          type: "speech",
          start: acc.start,
          stop: slide.start,
        });
        if (i === speechTime.length - 1) {
          result.push({
            type: "speech",
            start: slide.start,
            stop: slide.stop,
          });
        }
        return { type: "speech", start: slide.start, stop: slide.stop };
      }
      if (slide.stop - acc.start > 15) {
        result.push({
          type: "speech",
          start: acc.start,
          stop: slide.start,
        });
        if (i === speechTime.length - 1) {
          result.push({
            type: "speech",
            start: slide.start,
            stop: slide.stop,
          });
        }
        return { type: "speech", start: slide.start, stop: slide.stop };
      }
      if (slide.stop - acc.start <= 15) {
        if (i === speechTime.length - 1) {
          result.push({
            type: "speech",
            start: acc.start,
            stop: slide.stop,
          });
        }
        return {
          type: "speech",
          start: acc.start,
          stop: slide.stop,
        };
      }
    }

    if (slide.start - acc.stop > 0 && slide.start - acc.stop >= 5) {
      result.push(
        {
          type: "speech",
          start: acc.start,
          stop: acc.stop,
        },
        {
          type: "silence",
          start: acc.stop,
          stop: slide.start,
        }
      );
      if (i === speechTime.length - 1) {
        result.push({
          type: "speech",
          start: slide.start,
          stop: slide.stop,
        });
      }
      return {
        type: "speech",
        start: slide.start,
        stop: slide.stop,
      };
    }

    if (slide.start - acc.stop === 0) {
      if (acc.stop - acc.start >= 15) {
        result.push({
          type: "speech",
          start: acc.start,
          stop: acc.stop,
        });
        if (i === speechTime.length - 1) {
          result.push({ type: "speech", start: slide.start, stop: slide.stop });
        }
        return { type: "speech", start: slide.start, stop: slide.stop };
      }

      if (slide.stop - acc.start > 15) {
        result.push({
          type: "speech",
          start: acc.start,
          stop: acc.stop,
        });
        if (i === speechTime.length - 1) {
          result.push({ type: "speech", start: slide.start, stop: slide.stop });
        }
        return { type: "speech", start: slide.start, stop: slide.stop };
      }

      if (slide.stop - acc.start <= 15) {
        if (i === speechTime.length - 1) {
          result.push({
            type: "speech",
            start: acc.start,
            stop: slide.stop,
          });
        }
        return {
          type: "speech",
          start: acc.start,
          stop: slide.stop,
        };
      }
    }
  }, speechTime[0]);

  if (
    Number(slides[slides.length - 1].stop) !== result[result.length - 1].stop
  ) {
    if (
      Number(slides[slides.length - 1].stop) -
        Number(result[result.length - 1].stop) >=
      1
    ) {
      result.push({
        type: "silence",
        start: Number(result[result.length - 1].stop),
        stop: Number(slides[slides.length - 1].stop),
      });
    } else {
      result[result.length - 1].stop = Number(slides[slides.length - 1].stop);
    }
  }

  result = result.map((r) => {
    return { ...r, length: r.stop - r.start };
  });

  return result;
};

module.exports = {
  downloadFile,
  detectVoiceActivity,
  convertCsvToJson,
  formatSlides,
};
