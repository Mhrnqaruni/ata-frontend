import test from 'node:test';
import assert from 'node:assert/strict';
import {encodeWav} from '../src/pages/family/dictationAudio.js';
test('WAV uses the real sample rate and mono PCM frames',async()=>{
  const blob=encodeWav([new Float32Array([0,1,-1,.5])],48000);
  const data=new DataView(await blob.arrayBuffer());
  assert.equal(data.getUint32(24,true),48000);assert.equal(data.getUint16(22,true),1);
  assert.equal(data.getUint32(40,true),8);assert.equal(data.getInt16(46,true),32767);assert.equal(data.getInt16(48,true),-32768);
});
test('long recordings and unsupported sample rates fail before upload',()=>{
  assert.throws(()=>encodeWav([new Float32Array(8000*61)],8000));
  assert.throws(()=>encodeWav([],192000));
});
