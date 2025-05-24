const http = require("http");

let clients = [];
let lastFrame = null;

const startCameraStream = () => {
  const req = http.request(
    {
      hostname: "192.168.238.17",
      port: 80,
      path: "/stream",
      method: "GET",
      headers: {
        Connection: "keep-alive",
      },
    },
    (res) => {
      let buffer = Buffer.alloc(0);

      res.on("data", (chunk) => {
        buffer = Buffer.concat([buffer, chunk]);

        const start = buffer.indexOf(Buffer.from([0xff, 0xd8])); // JPEG SOI
        const end = buffer.indexOf(Buffer.from([0xff, 0xd9])); // JPEG EOI

        if (start !== -1 && end !== -1 && end > start) {
          const frame = buffer.slice(start, end + 2);
          lastFrame = frame; // ✅ Simpan frame terakhir
          buffer = buffer.slice(end + 2); // buang bagian yang sudah diambil

          // teruskan ke klien
          clients.forEach((client) => client.write(frame));
        }
      });

      res.on("end", () => {
        console.log("ESP32 stream ended. Reconnecting...");
        setTimeout(startCameraStream, 1000);
      });
    }
  );

  req.on("error", (err) => {
    console.error("Failed to connect to ESP32:", err.message);
    setTimeout(startCameraStream, 3000);
  });

  req.end();
};

startCameraStream();

const streamHandler = (req, res) => {
  console.log("Client connected to stream");

  res.writeHead(200, {
    "Content-Type": "multipart/x-mixed-replace; boundary=--frame",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
    Pragma: "no-cache",
  });

  clients.push(res);

  req.on("close", () => {
    console.log("Client disconnected");
    clients = clients.filter((client) => client !== res);
  });
};

module.exports = {
  streamHandler,
  getLastFrame: () => lastFrame,
};
