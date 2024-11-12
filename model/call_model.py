import requests
import json

s = requests.Session()

model = 'qwen2.5-coder:3b'
url = 'http://localhost:11434/api/generate'
prompt = 'Why is the sky blue ?'

body = {'model': model, 'prompt': prompt}

resp = s.post(url, json=body, stream=True)

for line in resp.iter_lines():
    if line:
        print(json.loads(line.decode('utf-8'))['response'], end='', flush=True)
