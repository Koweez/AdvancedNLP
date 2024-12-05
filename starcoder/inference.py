from transformers import AutoModelForCausalLM, AutoTokenizer
import torch
from typing import Optional

ACCESS_TOKEN = "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"
checkpoint = "bigcode/starcoderbase-1b"

tokenizer = AutoTokenizer.from_pretrained(checkpoint, token=ACCESS_TOKEN, cache_dir="/tmp/starcoder")
tokenizer.pad_token = tokenizer.eos_token
model = AutoModelForCausalLM.from_pretrained(checkpoint, token=ACCESS_TOKEN, cache_dir="/tmp/starcoder")
model.generation_config.pad_token_id = tokenizer.eos_token_id

def postprocess_output(prediction):
    txt = prediction.split('<fim_middle>')[1].split('<fim_suffix>')[0]
    txt = txt[:-13] # removing trailing <|endoftext|>
    return txt

def fill_in(before_cursor: str, after_cursor: str, device: Optional[str | torch.device] = "cpu") -> str:
    input_text = f"<fim_prefix>{before_cursor}<fim_suffix>{after_cursor}<fim_middle>"
    inputs = tokenizer(input_text, return_tensors="pt", padding=True, return_attention_mask=True)
    
    input_ids = inputs['input_ids'].to(device)
    attention_mask = inputs['attention_mask'].to(device)
    
    outputs = model.generate(input_ids=input_ids, attention_mask=attention_mask, max_new_tokens=20)
    pred = tokenizer.decode(outputs[0])
    return postprocess_output(pred)
