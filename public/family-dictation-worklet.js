class FamilyDictationRecorder extends AudioWorkletProcessor {
  constructor() {
    super();
    this.pending = [];
    this.size = 0;
    this.recording = true;
    this.port.onmessage = () => {
      this.recording = false;
      this.flush();
      this.port.postMessage({ done: true });
    };
  }
  flush() {
    if (!this.size) return;
    const samples = new Float32Array(this.size);
    let offset = 0;
    for (const part of this.pending) {
      samples.set(part, offset);
      offset += part.length;
    }
    this.port.postMessage({ samples }, [samples.buffer]);
    this.pending = [];
    this.size = 0;
  }
  process(inputs) {
    const channel = inputs[0]?.[0];
    if (this.recording && channel) {
      this.pending.push(channel.slice());
      this.size += channel.length;
      if (this.size >= 4096) this.flush();
    }
    return true;
  }
}
registerProcessor("family-dictation-recorder", FamilyDictationRecorder);
