from pydantic import BaseModel

class PromptRequest(BaseModel):
    prompt: str
    context: str
    
class CompletionRequest(BaseModel):
    context: str

def predict(prompt: str, context: str):
    return f"Received prompt: '{prompt}' with context length: {len(context)} characters."

def autocomplete(context: str):
    return f"Received autocomplete request with context length: {len(context)} characters."
