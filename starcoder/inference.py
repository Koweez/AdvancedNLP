from transformers import AutoModelForCausalLM, AutoTokenizer
import torch
from typing import Optional
device = torch.device("cuda" if torch.cuda.is_available() else "cpu")


ACCESS_TOKEN = "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"
checkpoint = "bigcode/starcoderbase-1b"
device = "cuda" # for GPU usage or "cpu" for CPU usage

tokenizer = AutoTokenizer.from_pretrained(checkpoint, token=ACCESS_TOKEN, cache_dir="tmp/")
tokenizer.pad_token = tokenizer.eos_token
model = AutoModelForCausalLM.from_pretrained(checkpoint, token=ACCESS_TOKEN, cache_dir="tmp/")
model.generation_config.pad_token_id = tokenizer.eos_token_id

def postprocess_output(prediction):
    txt = prediction.split('<fim_middle>')[1].split('<fim_suffix>')[0]
    # removing trailing <|endoftext|>
    txt = txt[:-13]
    return txt

def fill_in(before_cursor: str, after_cursor: str, device: Optional[str | torch.device] = "cpu") -> str:
    input_text = f"<fim_prefix>{before_cursor}<fim_suffix>{after_cursor}<fim_middle>"
    print(input_text)
    inputs = tokenizer(input_text, return_tensors="pt", padding=True, return_attention_mask=True)
    
    input_ids = inputs['input_ids'].to(device)
    attention_mask = inputs['attention_mask'].to(device)
    
    outputs = model.generate(input_ids=input_ids, attention_mask=attention_mask, max_new_tokens=20)
    pred = tokenizer.decode(outputs[0])
    return postprocess_output(pred)

# postprocess to get only the generated code between the 
before_cursor = "def add(a, b):\n"
after_cursor = "return res\n"

completion = autocomplete(before_cursor, after_cursor, "cpu")
print('-------------')
print(completion)

def is_even(n):
    if n % 2 == 0:
        return True
    else:
        return False
