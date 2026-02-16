import tempfile
import os
from faster_whisper import WhisperModel

_model = None


def get_model() -> WhisperModel:
    """Lazy-load the faster-whisper model (base, CPU)."""
    global _model
    if _model is None:
        _model = WhisperModel("base", device="cpu", compute_type="int8")
    return _model


def transcribe_audio(audio_bytes: bytes, filename: str = "audio.webm") -> str:
    """
    Transcribe audio bytes to text using faster-whisper.
    Writes to a temp file since faster-whisper needs a file path.
    """
    suffix = os.path.splitext(filename)[1] or ".webm"
    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(audio_bytes)
        tmp_path = tmp.name

    try:
        model = get_model()
        segments, info = model.transcribe(tmp_path, beam_size=5)
        transcript = " ".join(segment.text.strip() for segment in segments)
        return transcript
    finally:
        os.unlink(tmp_path)
