let lastTransId = Math.floor(Math.random() * 60000);

function generateTransId(): string {
  lastTransId = (lastTransId + 1) % 65000;
  if (lastTransId < 1000) lastTransId += 1000;
  return String(lastTransId);
}

export default generateTransId;