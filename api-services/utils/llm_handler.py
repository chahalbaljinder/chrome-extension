from anthropic import Anthropic
import os

class LLMHandler:
    def __init__(self):
        self.client = Anthropic(api_key=os.getenv("ANTHROPIC_API_KEY"))
    
    async def get_response(self, text):
        try:
            message = self.client.messages.create(
                model="codegemma:2B",
                max_tokens=1000,
                temperature=0.7,
                system="You are a helpful assistant in a voice chat. Keep responses concise and conversational.",
                messages=[
                    {
                        "role": "user",
                        "content": text
                    }
                ]
            )
            
            return message.content
            
        except Exception as e:
            raise Exception(f"Error getting LLM response: {str(e)}")