import os
import sys
import whisper

sys.stdout.reconfigure(encoding='utf-8')

files = [
    r"C:\Users\omara\Downloads\WhatsApp Ptt 2026-10-22 at 12.56.07 PM.ogg",
    r"C:\Users\omara\Downloads\WhatsApp Ptt 2026-10-22 at 12.57.48 PM.ogg",
    r"C:\Users\omara\Downloads\WhatsApp Ptt 2026-10-22 at 12.57.58 PM.ogg",
    r"C:\Users\omara\Downloads\WhatsApp Ptt 2026-10-22 at 12.58.07 PM.ogg",
    r"C:\Users\omara\Downloads\WhatsApp Ptt 2026-10-22 at 1.00.46 PM.ogg",
    r"C:\Users\omara\Downloads\WhatsApp Ptt 2026-10-22 at 3.46.00 PM.ogg"
]

print("Loading whisper small...", flush=True)
model = whisper.load_model("small")

out_lines = []
for f in files:
    fname = os.path.basename(f)
    print(f"Transcribing {fname}...", flush=True)
    res = model.transcribe(f, language="ar", temperature=0.0)
    text = res["text"].strip()
    print(f"--> {fname}: {text}\n", flush=True)
    out_lines.append(f"### {fname}\n{text}\n")

with open(r"c:\Users\omara\Videos\redshipping\docs\whisper_small_transcripts.txt", "w", encoding="utf-8") as out:
    out.write("\n".join(out_lines))

print("DONE_SMALL")
