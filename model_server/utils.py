import asyncio
import aiohttp
import json

from pydantic import BaseModel

class PromptRequest(BaseModel):
    prompt: str
    context: str
    
class CompletionRequest(BaseModel):
    context_before: str
    context_after: str
    
predict_session = None
predict_generator = None
autocomplete_session = None
autocomplete_generator = None

async def predict(prompt: str, context: str):
    global predict_session
    global predict_generator
    
    if predict_generator:
        await predict_generator.aclose()
        print("Previous prediction task cancelled")
    
    if not predict_session:
        predict_session = aiohttp.ClientSession()
        
        
    model = 'qwen2.5-coder:3b'
    url = 'http://localhost:11434/api/generate'
    completePrompt = (
        f"Here is the file I am working on \n{context}\n\n"
        f"Here is my question, answer it using the code if necessary\n {prompt}\n"
    )
    body = {'model': model, 'prompt': completePrompt}
    
    async def fetch():
        async with predict_session.post(url, json=body) as resp:
            async for line in resp.content:
                if line:
                    yield json.loads(line.decode('utf-8'))['response']
    
    predict_generator = fetch()
    try:
        async for response in predict_generator:
            yield response
    except asyncio.CancelledError:
        print("Prediction task cancelled")


async def autocomplete(before_cursor: str, after_cursor: str):
    global autocomplete_session
    global autocomplete_generator
    
    print(f"first: {before_cursor}, second: {after_cursor}")
    
    if autocomplete_generator:
        autocomplete_generator.aclose()
        print("Previous autocomplete task cancelled")
        
    if not autocomplete_session:
        autocomplete_session = aiohttp.ClientSession()
        
    model = 'qwen2.5-coder:3b-base'
    url = 'http://localhost:11434/api/generate'
    prompt = f"{before_cursor}<|fim_suffix|>{after_cursor}"
    body = {'model': model, 'prompt': prompt}

    async def fetch():
        async with autocomplete_session.post(url, json=body) as resp:
            async for line in resp.content:
                if line:
                    yield json.loads(line.decode('utf-8'))['response']

    autocomplete_generator = fetch()
    middle_passed = False
    try:
        async for response in autocomplete_generator:
            if middle_passed:
                yield response
            if "<|fim_middle|>" in response:
                middle_passed = True
    except asyncio.CancelledError:
        print("Autocomplete task was cancelled")
