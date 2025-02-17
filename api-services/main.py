from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import os
from utils.audio_processor import AudioProcessor
from utils.llm_handler import LLMHandler
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["chrome-extension://*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize processors
audio_processor = AudioProcessor()
llm_handler = LLMHandler()

class TextRequest(BaseModel):
    text: str

@app.post("/stt")
async def speech_to_text(audio: UploadFile = File(...)):
    try:
        # Save uploaded audio temporarily
        with open("temp_audio.wav", "wb") as temp_file:
            content = await audio.read()
            temp_file.write(content)
        
        # Process audio
        transcription = await audio_processor.process_audio("temp_audio.wav")
        
        return {"transcription": transcription}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        # Clean up temporary file
        if os.path.exists("temp_audio.wav"):
            os.remove("temp_audio.wav")

@app.post("/llm")
async def get_llm_response(request: TextRequest):
    try:
        response = await llm_handler.get_response(request.text)
        return {"response": response}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))