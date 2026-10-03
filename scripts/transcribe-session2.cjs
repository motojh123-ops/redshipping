/**
 * Transcribe the session-2 WhatsApp voice notes (16 kHz mono wav) with
 * transformers.js whisper-base (multilingual). First run downloads the
 * model (~80 MB). Output → session2-transcript.txt
 */
const fs = require('fs');
const path = require('path');

const AUDIO_DIR = 'C:/Users/omara/AppData/Local/Temp/cline/whisper-audio';
const OUT_FILE = 'C:/Users/omara/AppData/Local/Temp/cline/session2-transcript-small.txt';

function readWavAsFloat32(wavPath) {
  const buf = fs.readFileSync(wavPath);
  const dataOffset = 44; // standard PCM16 header produced by ffmpeg
  const numSamples = Math.floor((buf.length - dataOffset) / 2);
  const out = new Float32Array(numSamples);
  for (let i = 0; i < numSamples; i++) {
    out[i] = buf.readInt16LE(dataOffset + i * 2) / 32768;
  }
  return out;
}

async function main() {
  const { pipeline } = require('@xenova/transformers');
  console.log('Loading whisper-small (multilingual, quantized)...');
  const transcriber = await pipeline('automatic-speech-recognition', 'Xenova/whisper-small', {
    quantized: true,
  });
  console.log('Model ready.');

  const files = fs.readdirSync(AUDIO_DIR).filter((f) => f.endsWith('.wav')).sort();
  const results = [];
  for (const f of files) {
    const audio = readWavAsFloat32(path.join(AUDIO_DIR, f));
    console.log(`Transcribing ${f} (${(audio.length / 16000).toFixed(1)}s)...`);
    const res = await transcriber(audio, {
      language: 'arabic',
      task: 'transcribe',
      chunk_length_s: 30,
      stride_length_s: 5,
    });
    const text = (res?.text || '').trim();
    results.push(`===== ${f} =====\n${text}\n`);
    console.log(`  → ${text.slice(0, 90)}`);
  }
  fs.writeFileSync(OUT_FILE, results.join('\n'), 'utf8');
  console.log('WROTE', OUT_FILE);
}

main().catch((e) => {
  console.error('TRANSCRIBE ERROR:', e.message);
  process.exit(1);
});
