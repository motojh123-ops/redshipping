import whisper, json
wav = r"C:\Users\omara\Videos\redshipping\docs\ghh.wav"
out_json = r"C:\Users\omara\Videos\redshipping\docs\ghh_transcript.json"
out_txt = r"C:\Users\omara\Videos\redshipping\docs\ghh_transcript.txt"
print("loading small model...")
model = whisper.load_model("small")
print("transcribing 673s audio (ar)...")
result = model.transcribe(wav, language="ar", fp16=False, verbose=False)
text = result.get("text", "")
segs = result.get("segments", [])
print("TEXT len", len(text))
print(text[:8000])
open(out_txt, "w", encoding="utf-8").write(text)
json.dump({"text": text, "segments": [{"start": s["start"], "end": s["end"], "text": s["text"]} for s in segs]}, open(out_json, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
print("saved", out_json, "segments", len(segs))
