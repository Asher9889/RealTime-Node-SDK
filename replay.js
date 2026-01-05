import fs from "fs";
import net from "net";

const DEVICE_IP = "YOUR_DEVICE_IP";
const PORT = 5005;

const payload = fs.readFileSync("./raw2.bin");

console.log("Payload length:", payload.length);
console.log("First 16 bytes:", payload.slice(0, 16).toString("hex"));
console.log("Last 16 bytes:", payload.slice(-16).toString("hex"));

const socket = new net.Socket();

socket.connect(5005, "192.168.001.037", () => {
  console.log("Connected, sending raw payload");
  socket.write(payload);
});

socket.on("data", (data) => {
  console.log("Response:", data.toString("hex"));
});

socket.on("error", console.error);
socket.on("close", () => console.log("Socket closed"));
