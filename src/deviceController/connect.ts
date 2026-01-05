import net from "net";

export function enrollViaTcp(deviceIp: string, payload: Buffer) {
  return new Promise<string>((resolve, reject) => {
    const socket = new net.Socket();
    const chunks: any[] = [];

    socket.connect(5005, deviceIp, () => {
      console.log("Connected to device");
      socket.write(payload);
    });

    socket.on("data", (data) => {
      chunks.push(data);
      console.log("Device response chunk:", data);
    });

    socket.on("close", () => {
      const res = Buffer.concat(chunks);
      resolve(res.toString("utf8"));
    });

    socket.on("error", reject);

    setTimeout(() => {
      socket.end();
    }, 8000);
  });
}
