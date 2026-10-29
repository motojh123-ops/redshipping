import os
import subprocess
import speech_recognition as sr

files = [
    r"C:\Users\omara\Downloads\WhatsApp Ptt 2026-10-22 at 12.56.07 PM.ogg",
    r"C:\Users\omara\Downloads\WhatsApp Ptt 2026-10-22 at 12.57.48 PM.ogg",
    r"C:\Users\omara\Downloads\WhatsApp Ptt 2026-10-22 at 12.57.58 PM.ogg",
    r"C:\Users\omara\Downloads\WhatsApp Ptt 2026-10-22 at 12.58.07 PM.ogg",
    r"C:\Users\omara\Downloads\WhatsApp Ptt 2026-10-22 at 1.00.46 PM.ogg",
    r"C:\Users\omara\Downloads\WhatsApp Ptt 2026-10-22 at 3.46.00 PM.ogg"
]

r = sr.Recognizer()
lines = []

for f in files:
    fname = os.path.basename(f)
    wav_path = os.path.join(r"c:\Users\omara\Videos\redshipping\scratch", fname.replace(".ogg", ".wav"))
    os.makedirs(r"c:\Users\omara\Videos\redshipping\scratch", exist_ok=True)
    cmd = f'ffmpeg -y -i "{f}" -ar 16000 -ac 1 "{wav_path}"'
    subprocess.run(cmd, shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    recognized = ""
    for lang in ["ar-EG", "ar-SA"]:
        try:
            with sr.AudioFile(wav_path) as src:
                audio = r.record(src)
                t = r.recognize_google(audio, language=lang)
                if t:
                    recognized = t
                    break
        except Exception:
            pass
            
    lines.append(f"### {fname}\n{recognized}\n")
    if os.path.exists(wav_path):
        try: os.remove(wav_path)
        except: pass

with open(r"c:\Users\omara\Videos\redshipping\docs\google_speech_transcripts.txt", "w", encoding="utf-8") as out:
    out.write("\n".join(lines))

print("DONE_GOOGLE_SPEECH")
