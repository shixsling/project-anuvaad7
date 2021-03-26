const fs = require("fs");
const {
  downloadFile,
  detectVoiceActivity,
  convertCsvToJson,
  formatSlides,
} = require("../utils");
const { queues } = require("../constants");
const { AUTOMATIC_BREAK_VIDEO_FINISH_QUEUE } = queues;

const onAutoBreakVideo = (channel) => (msg) => {
  const { videoUrl, articleId } = JSON.parse(msg.content.toString());
  let downloadedFilePath;
  let voiceActivityCsvFilePath;
  return downloadFile(videoUrl)
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
      return formatSlides(slides);
    })
    .then((formattedSlides) => {
      channel.ack(msg);
      console.log(formattedSlides);
      channel.sendToQueue(
        AUTOMATIC_BREAK_VIDEO_FINISH_QUEUE,
        Buffer.from(JSON.stringify({ articleId, formattedSlides }))
      );
    })
    .catch((err) => {
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
