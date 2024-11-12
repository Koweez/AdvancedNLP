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
    body = {'model': model, 'prompt': prompt}
    resp = s.post(url, json=body, stream=True)
    whole_response = ''
    for line in resp.iter_lines():
        if line:
            whole_response += json.loads(line.decode('utf-8'))['response']
    return whole_response


def autocomplete(context: str):
    return f"Received autocomplete request with context length: {len(context)} characters."
