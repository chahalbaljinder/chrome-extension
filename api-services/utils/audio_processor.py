import torch
import soundfile as sf
import numpy as np
from transformers import Wav2Vec2ForCTC, Wav2Vec2Processor

class AudioProcessor:
    def __init__(self):
        self.processor = Wav2Vec2Processor.from_pretrained("facebook/wav2vec2-base-960h")
        self.model = Wav2Vec2ForCTC.from_pretrained("facebook/wav2vec2-base-960h")
    
    async def process_audio(self, audio_path):
        try:
            # Load audio
            speech_array, sampling_rate = sf.read(audio_path)
            
            # Convert stereo to mono if needed
            if len(speech_array.shape) > 1:
                speech_array = speech_array[:, 0]
            
            # Resample to 16kHz if needed
            if sampling_rate != 16000:
                # Implement resampling logic here
                pass
            
            # Process audio
            inputs = self.processor(
                speech_array,
                sampling_rate=16000,
                return_tensors="pt",
                padding=True
            )
            
            # Get transcription
            with torch.no_grad():
                logits = self.model(inputs.input_values).logits
                predicted_ids = torch.argmax(logits, dim=-1)
                transcription = self.processor.batch_decode(predicted_ids)[0]
            
            return transcription
            
        except Exception as e:
            raise Exception(f"Error processing audio: {str(e)}")
