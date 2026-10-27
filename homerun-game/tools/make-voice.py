# バタコさんのボイス(「新しい顔よ!」「それっ!」)を合成して js/voice-data.js に書き出す。
#
#   pip install pyopenjtalk-plus numpy
#   python tools/make-voice.py
#
# 音声: HTS Voice "Mei" (c) Nagoya Institute of Technology, CC BY 3.0
import base64, io, os, wave
import numpy as np
import pyopenjtalk

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, '..', 'js', 'voice-data.js')
CLIPS = {
    'face': ('新しい顔よ!', 1.15, 0.0),
    'sore': ('それっ!', 1.1, 2.0),
}
RATE = 24000


def synth(text, speed, half_tone):
    x, sr = pyopenjtalk.tts(text, speed=speed, half_tone=half_tone)
    x = np.asarray(x, dtype=np.float64)
    a = np.abs(x)
    idx = np.where(a > a.max() * 0.02)[0]
    x = x[max(0, idx[0] - int(sr * 0.01)): idx[-1] + int(sr * 0.03)]
    # 48kHz -> 24kHz(ローパスしてから間引く)
    step = sr // RATE
    n = np.arange(-32, 33)
    h = np.sinc(n / step) * np.hamming(len(n))
    x = np.convolve(x, h / h.sum(), mode='same')[::step]
    x = x / np.abs(x).max() * 0.9
    buf = io.BytesIO()
    with wave.open(buf, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes((x * 32767).astype(np.int16).tobytes())
    return buf.getvalue(), len(x) / RATE


lines = [
    "'use strict';",
    '// バタコさんのボイス(tools/make-voice.py で生成)。',
    '// 音声合成: HTS Voice "Mei" (c) Nagoya Institute of Technology, CC BY 3.0',
    'window.HR = window.HR || {};',
    'window.HR.VOICE_DATA = {',
]
for name, (text, speed, half) in CLIPS.items():
    data, dur = synth(text, speed, half)
    print(f'{name}: {text} {dur:.2f}s {len(data)} bytes')
    lines.append(f"  {name}: '{base64.b64encode(data).decode()}',")
lines.append('};')
with open(OUT, 'w') as f:
    f.write('\n'.join(lines) + '\n')
print('wrote', os.path.normpath(OUT))
