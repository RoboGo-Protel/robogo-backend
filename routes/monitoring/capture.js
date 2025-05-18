const { getLastFrame } = require("./camera"); // pastikan path sesuai

module.exports = (req, res) => {
  const frame = getLastFrame();

  if (!frame) {
    res.writeHead(503);
    return res.end("No frame available yet");
  }

  res.writeHead(200, {
    "Content-Type": "image/jpeg",
    "Content-Length": frame.length,
  });

  res.end(frame);
};
