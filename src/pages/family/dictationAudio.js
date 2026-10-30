/** Encode mono PCM at the ACTUAL context rate, never a guessed device rate. */
export function encodeWav(chunks, rate) {
  const count = chunks.reduce((sum, part) => sum + part.length, 0);
  if (
    !Number.isInteger(rate) ||
    rate < 8000 ||
    rate > 96000 ||
    count > rate * 60 ||
    44 + count * 2 > 10 * 1024 * 1024
  )
    throw new Error("Recording exceeds supported duration or sample rate.");
  const buffer = new ArrayBuffer(44 + count * 2),
    view = new DataView(buffer);
  const word = (at, text) =>
    [...text].forEach((letter, i) =>
      view.setUint8(at + i, letter.charCodeAt(0)),
    );
  word(0, "RIFF");
  view.setUint32(4, 36 + count * 2, true);
  word(8, "WAVE");
  word(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  word(36, "data");
  view.setUint32(40, count * 2, true);
  let offset = 44;
  for (const chunk of chunks)
    for (const value of chunk) {
      const sample = Math.max(-1, Math.min(1, value));
      view.setInt16(offset, sample < 0 ? sample * 32768 : sample * 32767, true);
      offset += 2;
    }
  return new Blob([buffer], { type: "audio/wav" });
}
export const canDictate = () =>
  !!(
    globalThis.isSecureContext &&
    navigator.mediaDevices?.getUserMedia &&
    globalThis.AudioContext &&
    globalThis.AudioWorkletNode
  );
export async function recordAudio(signal, onLimit) {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { channelCount: 1 },
    video: false,
  });
  if (signal.aborted) {
    stream.getTracks().forEach((track) => track.stop());
    throw new Error("Recording cancelled.");
  }
  const context = new AudioContext();
  let node;
  const release = () => {
    stream.getTracks().forEach((track) => track.stop());
    node?.disconnect();
    void context.close();
  };
  try {
    await context.audioWorklet.addModule("/family-dictation-worklet.js");
    if (signal.aborted) throw new Error("Recording cancelled.");
    node = new AudioWorkletNode(context, "family-dictation-recorder");
    const source = context.createMediaStreamSource(stream);
    source.connect(node);
    node.connect(context.destination);
    await context.resume();
    const maximum = Math.min(
      context.sampleRate * 60,
      Math.floor((10 * 1024 * 1024 - 44) / 2),
    );
    const chunks = [];
    let length = 0,
      limitReached = false,
      finishResolve;
    node.port.onmessage = (event) => {
      if (event.data.samples) {
        const available = maximum - length;
        const samples = event.data.samples.slice(0, Math.max(0, available));
        chunks.push(samples);
        length += samples.length;
        if (length >= maximum && !limitReached) {
          limitReached = true;
          onLimit();
        }
      }
      if (event.data.done) finishResolve?.();
    };
    let finished = false;
    const cancel = () => {
      if (finished) return;
      finished = true;
      release();
    };
    signal.addEventListener("abort", cancel, { once: true });
    return {
      cancel,
      async stop() {
        if (finished) throw new Error("Recording already stopped.");
        await new Promise((resolve) => {
          finishResolve = resolve;
          node.port.postMessage("stop");
          setTimeout(resolve, 500);
        });
        finished = true;
        release();
        return encodeWav(chunks, context.sampleRate);
      },
    };
  } catch (error) {
    release();
    throw error;
  }
}
