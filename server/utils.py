import requests
import json

from pydantic import BaseModel
from prompts import get_prompt


class PromptRequest(BaseModel):
    prompt: str
    files: dict[str, str]
    
class CompletionRequest(BaseModel):
    context: str

def predict(prompt: str, files: dict[str, str]):
    s = requests.Session()
    model = 'qwen2.5-coder:3b'
    url = 'http://localhost:11434/api/generate'
    body = {'model': model, 'prompt': get_prompt(prompt, files)}
    resp = s.post(url, json=body, stream=True)
    for line in resp.iter_lines():
        if line:
            yield json.loads(line.decode('utf-8'))['response']


def autocomplete(context: str):
    s = requests.Session()
    model = 'qwen2.5-coder:3b'
    url = 'http://localhost:11434/api/generate'
    completePrompt = 'Complete the following code and respond with only the code completion: \n' + context
    body = {'model': model, 'prompt': completePrompt}
    resp = s.post(url, json=body, stream=True)
    for line in resp.iter_lines():
        if line:
            yield json.loads(line.decode('utf-8'))['response']
