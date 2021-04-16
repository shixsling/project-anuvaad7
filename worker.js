const fs = require("fs");
const RABBITMQ_SERVER = process.env.RABBITMQ_SERVER;
const generators = require("@comet-anuvaad/generators");
const rabbitmqService = require("./vendors/rabbitmq");
const { queues } = require("./constants");
const { AUTOMATIC_BREAK_VIDEO_REQUEST_QUEUE, AUTOMATIC_BREAK_VIDEO_REQUEST_FINISH_QUEUE } = queues;
const onAutoBreakVideoHandler = require("./handlers/onAutoBreakVideo");

let channel;
rabbitmqService.createChannel(RABBITMQ_SERVER, (err, ch) => {
  if (err) throw err;
  channel = ch;
  const { server, app } = generators.serverGenerator({
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
  generators.healthcheckRouteGenerator({
    router: app,
    rabbitmqConnection: channel.connection,
  });
  server.listen(4000);
  
  channel.prefetch(1);
  
  channel.assertQueue(AUTOMATIC_BREAK_VIDEO_REQUEST_QUEUE, { durable: true });
  channel.assertQueue(AUTOMATIC_BREAK_VIDEO_REQUEST_FINISH_QUEUE, { durable: true });

  channel.consume(
    AUTOMATIC_BREAK_VIDEO_REQUEST_QUEUE,
    onAutoBreakVideoHandler(channel),
    { noAck: false }
  );
});
