import os
import sys
import subprocess
import speech_recognition as sr

# Set stdout/stderr encoding to utf-8
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

r = sr.Recognizer()
results = []

for f in files:
    fname = os.path.basename(f)
    print(f"Processing: {fname}", flush=True)
    wav_path = f.replace(".ogg", ".wav")
    
    # Convert to 16kHz mono wav
    cmd = f'ffmpeg -y -i "{f}" -ar 16000 -ac 1 "{wav_path}"'
    subprocess.run(cmd, shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    text = ""
    # Try ar-EG first, then ar-SA
    for lang in ["ar-EG", "ar-SA"]:
        try:
            with sr.AudioFile(wav_path) as source:
                audio = r.record(source)
                text = r.recognize_google(audio, language=lang)
                if text:
                    break
        except sr.UnknownValueError:
            pass
        except Exception as e:
            text = f"Error: {e}"
            break
            
    if not text:
        text = "[لم يتم التعرف على صوت واضح أو التسجيل صامت/قصير جداً]"
        
    print(f"Result for {fname}: {text}\n", flush=True)
    results.append(f"## {fname}\n{text}\n")
    
    if os.path.exists(wav_path):
        try:
            os.remove(wav_path)
        except:
            pass

output_path = r"c:\Users\omara\Videos\redshipping\docs\transcribed_voices_2026_10_22.txt"
with open(output_path, "w", encoding="utf-8") as out:
    out.write("\n".join(results))

print(f"Saved all transcripts to {output_path}", flush=True)
