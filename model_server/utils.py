import requests
import json

from pydantic import BaseModel


class PromptRequest(BaseModel):
    prompt: str
    context: str
    
class CompletionRequest(BaseModel):
    context: str

def predict(prompt: str, context: str):
    s = requests.Session()
    model = 'qwen2.5-coder:3b'
    url = 'http://localhost:11434/api/generate'
    completePrompt = 'Here is the file I am working on: \n' + context + '\n\n' + prompt
    body = {'model': model, 'prompt': completePrompt}
    resp = s.post(url, json=body, stream=True)
    for line in resp.iter_lines():
        if line:
            yield json.loads(line.decode('utf-8'))['response']


def autocomplete(context: str):
    return f"Received autocomplete request with context length: {len(context)} characters."
