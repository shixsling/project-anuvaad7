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
  const { url, id } = JSON.parse(msg.content.toString());
  console.log('========================onAutoBreakVideo=========================', id, url);
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
      fs.unlink(voiceActivityCsvFilePath, (err) => {
        if (err) console.log("error deleting csv", err);
      });
      const formattedSlides = formatSlides(slides);
      channel.ack(msg);
      channel.sendToQueue(
        AUTOMATIC_BREAK_VIDEO_REQUEST_FINISH_QUEUE,
        Buffer.from(JSON.stringify({ id, status: 'success', formattedSlides }))
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
      channel.sendToQueue(
        AUTOMATIC_BREAK_VIDEO_REQUEST_FINISH_QUEUE,
        Buffer.from(JSON.stringify({ id, status: 'failed' }))
      );
      channel.ack(msg);
    });
};

module.exports = onAutoBreakVideo;
