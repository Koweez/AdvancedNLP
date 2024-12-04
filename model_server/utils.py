import requests
import json
from starcoder.inference import fill_in

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
    completePrompt = 'Here is the file I am working on: \n' + context + '\n\n' + prompt
    body = {'model': model, 'prompt': completePrompt}
    resp = s.post(url, json=body, stream=True)
    for line in resp.iter_lines():
        if line:
            yield json.loads(line.decode('utf-8'))['response']


def autocomplete(before_cursor: str, after_cursor: str):
    # s = requests.Session()
    # model = 'qwen2.5-coder:3b'
    # url = 'http://localhost:11434/api/generate'
    # completePrompt = 'Complete the following code and respond with only the code completion: \n' + context
    # body = {'model': model, 'prompt': completePrompt}
    # resp = s.post(url, json=body, stream=True)
    # for line in resp.iter_lines():
    #     if line:
    #         yield json.loads(line.decode('utf-8'))['response']
    return fill_in(before_cursor, after_cursor, "cpu")
