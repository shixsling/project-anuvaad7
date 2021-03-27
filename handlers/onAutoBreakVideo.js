const fs = require("fs");
const {
  downloadFile,
  detectVoiceActivity,
  convertCsvToJson,
  formatSlides,
} = require("../utils");
const { queues } = require("../constants");
const { AUTOMATIC_BREAK_VIDEO_REQUEST_FINISH_QUEUE } = queues;

const onAutoBreakVideo = (channel) => (msg) => {
  console.log('========================onAutoBreakVideo=========================');
  const { url, id } = JSON.parse(msg.content.toString());
  let downloadedFilePath;
  let voiceActivityCsvFilePath;
  return downloadFile(url)
    .then((p) => {
      downloadedFilePath = p;
      return detectVoiceActivity(downloadedFilePath);
    })
    .then((p) => {
      voiceActivityCsvFilePath = p;
      fs.unlink(downloadedFilePath, (err) => {
        if (err) console.log("error deleting video", err);
      });
      return convertCsvToJson(voiceActivityCsvFilePath);
    })
    .then((slides) => {
      console.log('slides', slides);
      fs.unlink(voiceActivityCsvFilePath, (err) => {
        if (err) console.log("error deleting csv", err);
      });
      const formattedSlides = formatSlides(slides);
      console.log(formattedSlides);
      channel.ack(msg);
      channel.sendToQueue(
        AUTOMATIC_BREAK_VIDEO_REQUEST_FINISH_QUEUE,
        Buffer.from(JSON.stringify({ id, formattedSlides }))
      );
    })
    .catch((err) => {
      console.log('===================onAutoBreakVideo============================', err);
      fs.unlink(downloadedFilePath, (err) => {
        if (err) console.log("error deleting video", err);
      });
      fs.unlink(voiceActivityCsvFilePath, (err) => {
        if (err) console.log("error deleting csv", err);
      });
      if (err) console.log("error auto break video", err);
      channel.ack(msg);
    });
};

module.exports = onAutoBreakVideo;
