import net from "net";

export function enrollViaTcp(deviceIp: string, payload: Buffer) {
  return new Promise<void>((resolve, reject) => {
    const socket = new net.Socket();
 
    socket.connect(5005, deviceIp, () => {
      console.log("Connected to device");
    //   socket.write(payload);
    });

    socket.on("data", (data) => {
      console.log("Device response:", data);
      socket.destroy();
      resolve();
    });

    socket.on("error", reject);
  });
}
