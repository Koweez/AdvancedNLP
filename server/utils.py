import asyncio
import aiohttp
import json
import os
from transformers import AutoModelForCausalLM, AutoTokenizer


from pydantic import BaseModel
from prompts import get_prompt

class PromptRequest(BaseModel):
    prompt: str
    files: dict[str, str]
    
class CompletionRequest(BaseModel):
    context_before: str
    context_after: str
    
predict_session = None
predict_generator = None
autocomplete_task = None

def get_url():
    if os.environ.get('OLLAMA_SERVER_URL'):
        return os.environ.get('OLLAMA_SERVER_URL') + '/api/generate'
    else:
        return 'http://localhost:11434/api/generate'

async def predict(prompt: str, files: dict[str, str]):
    global predict_session
    global predict_generator
    
    if predict_generator:
        await predict_generator.aclose()
        print("Previous prediction task cancelled")
    
    if not predict_session:
        predict_session = aiohttp.ClientSession()
        
        
    # check if inside docker container with the OLLAMA_SERVER_URL environment variable
    # if not, use localhost
    
    url = get_url()
    
    model = 'qwen2.5-coder:3b'
    body = {'model': model, 'prompt': get_prompt(prompt=prompt, files=files)}
    
    async def fetch():
        async with predict_session.post(url, json=body) as resp:
            async for line in resp.content:
                if line:
                    yield json.loads(line.decode('utf-8'))['response']
    
    predict_generator = fetch()
    try:
        async for response in predict_generator:
            yield response
    except:
        print("Prediction task cancelled")

def load_model():
    model_checkpoint = "Qwen/Qwen2.5-Coder-3B"
    assistant_checkpoint = "Qwen/Qwen2.5-Coder-0.5B"

    tokenizer = AutoTokenizer.from_pretrained(model_checkpoint, cache_dir='/home/koweez/models_cache/qwen2.5-coder-3b-instruct/')
    tokenizer.pad_token = tokenizer.eos_token
    model = AutoModelForCausalLM.from_pretrained(
        model_checkpoint,
        torch_dtype="auto",
        device_map="auto",
        cache_dir='/home/koweez/models_cache/qwen2.5-coder-3b/'
    )
    model.generation_config.pad_token_id = tokenizer.eos_token_id

    assistant_model = AutoModelForCausalLM.from_pretrained(
        assistant_checkpoint,
        torch_dtype="auto",
        device_map="auto",
        cache_dir='/home/koweez/models_cache/qwen2.5-coder-0.5b/'
    )
    assistant_model.generation_config.pad_token_id = tokenizer.eos_token_id
    return tokenizer, model, assistant_model

async def inference(tokenizer, model, assistant_model, before_context:str, after_context:str, device:str) -> str:
    prompt = f"<|fim_prefix|>{before_context}\n<|fim_suffix|>{after_context}\n<|fim_middle|>"
    model_inputs = tokenizer(prompt, return_tensors="pt", padding=True, return_attention_mask=True)
    input_ids = model_inputs["input_ids"].to(device)
    attention_mask = model_inputs["attention_mask"].to(device)
    try:
        outputs = model.generate(
            input_ids=input_ids,
            attention_mask=attention_mask,
            assistant_model=assistant_model,
            max_new_tokens=512
        )
        response = tokenizer.decode(outputs[0])
        response = response.split("<|fim_middle|>")[1][:-13]
        return response
    except asyncio.CancelledError:
        print("Inference task cancelled")
        raise
