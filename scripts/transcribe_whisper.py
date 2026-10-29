import os
import sys
import whisper

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

files = [
    r"C:\Users\omara\Downloads\WhatsApp Ptt 2026-10-22 at 12.56.07 PM.ogg",
    r"C:\Users\omara\Downloads\WhatsApp Ptt 2026-10-22 at 12.57.48 PM.ogg",
    r"C:\Users\omara\Downloads\WhatsApp Ptt 2026-10-22 at 12.57.58 PM.ogg",
    r"C:\Users\omara\Downloads\WhatsApp Ptt 2026-10-22 at 12.58.07 PM.ogg",
    r"C:\Users\omara\Downloads\WhatsApp Ptt 2026-10-22 at 1.00.46 PM.ogg",
    r"C:\Users\omara\Downloads\WhatsApp Ptt 2026-10-22 at 3.46.00 PM.ogg"
]

print("Loading whisper base model...", flush=True)
model = whisper.load_model("base")

results = []

for f in files:
    fname = os.path.basename(f)
    print(f"\n--- Transcribing: {fname} ---", flush=True)
    try:
        res = model.transcribe(f, language="ar")
        text = res["text"].strip()
        print(f"Result: {text}", flush=True)
        results.append(f"## {fname}\n{text}\n")
    except Exception as e:
        print(f"Error: {e}", flush=True)
        results.append(f"## {fname}\nError: {e}\n")

output_path = r"c:\Users\omara\Videos\redshipping\docs\transcribed_voices_2026_10_22.txt"
with open(output_path, "w", encoding="utf-8") as out:
    out.write("\n".join(results))

print(f"\nAll done! Saved to {output_path}", flush=True)
