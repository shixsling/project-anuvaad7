const fs = require("fs");
const RABBITMQ_SERVER = process.env.RABBITMQ_SERVER;
const videowikiGenerators = require("@videowiki/generators");
const rabbitmqService = require("./vendors/rabbitmq");
const { queues } = require("./constants");
const { AUTOMATIC_BREAK_VIDEO_REQUEST_QUEUE } = queues;
const onAutoBreakVideoHandler = require("./handlers/onAutoBreakVideo");

let channel;
rabbitmqService.createChannel(RABBITMQ_SERVER, (err, ch) => {
  if (err) throw err;
  channel = ch;
  const { server, app } = videowikiGenerators.serverGenerator({
    uploadLimit: 50,
  });
  channel.on("error", (err) => {
    console.log("RABBITMQ ERROR", err);
    process.exit(1);
  });
  channel.on("close", () => {
    console.log("RABBITMQ CLOSE");
    process.exit(1);
  });
  videowikiGenerators.healthcheckRouteGenerator({
    router: app,
    rabbitmqConnection: channel.connection,
  });
  server.listen(4000);
  channel.prefetch(1);
  channel.assertQueue(AUTOMATIC_BREAK_VIDEO_REQUEST_QUEUE, { durable: true });
  // channel.sendToQueue(
  //   AUTOMATIC_BREAK_VIDEO_REQUEST_QUEUE,
  //   Buffer.from(
  //     JSON.stringify({
  //       videoUrl:
  //         "https://tailoredvideowiki.s3-eu-west-1.amazonaws.com/static/vocals.mp3",
  //       articleId: "1",
  //     })
  //   )
  // );
  channel.consume(
    AUTOMATIC_BREAK_VIDEO_REQUEST_QUEUE,
    onAutoBreakVideoHandler(channel),
    { noAck: false }
  );
});
