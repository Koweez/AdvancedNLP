from pydantic import BaseModel

class PromptRequest(BaseModel):
    prompt: str
    context: str
    
def predict(prompt: str, context: str):
    return f"Received prompt: '{prompt}' with context length: {len(context)} characters."
