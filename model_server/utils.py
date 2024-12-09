import requests
import json

from pydantic import BaseModel

class PromptRequest(BaseModel):
    prompt: str
    context: str
    
class CompletionRequest(BaseModel):
    context_before: str
    context_after: str

def predict(prompt: str, context: str):
    s = requests.Session()
    model = 'qwen2.5-coder:3b'
    url = 'http://localhost:11434/api/generate'
    completePrompt = f"Here is the file I am working on \n{context}\n\n Here is my question, answer it using the code if necessary\n {prompt}\n"
    body = {'model': model, 'prompt': completePrompt}
    resp = s.post(url, json=body, stream=True)
    for line in resp.iter_lines():
        if line:
            yield json.loads(line.decode('utf-8'))['response']


def autocomplete(before_cursor: str, after_cursor: str):
    print(f"context before: {before_cursor}")
    print(f"context after: {after_cursor}")
    
    s = requests.Session()
    model = 'qwen2.5-coder:3b-base'
    url = 'http://localhost:11434/api/generate'
    prompt = f"<|fim_prefix|>{before_cursor}<|fim_suffix|>{after_cursor}<|fim_middle|>"
    body = {'model': model, 'prompt': prompt}
    resp = s.post(url, json=body, stream=True)
    res = ''
    
    for line in resp.iter_lines():
        if line == '\n' and res != '':
            return res
        if line:
            res += json.loads(line.decode('utf-8'))['response']
    return res
