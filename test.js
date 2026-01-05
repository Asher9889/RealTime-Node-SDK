import fs from "fs";
import net from "net";

const payload = fs.readFileSync("raw2.bin");

const socket = new net.Socket();

socket.connect(5005, "192.168.001.037", () => {
    console.log("Connected");
  socket.write(payload);  // NOTHING ELSE
});

socket.on("data", (d) => console.log(d.toString("hex")));
