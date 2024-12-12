from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from utils import PromptRequest, CompletionRequest, predict, inference, load_model
import asyncio

app = FastAPI()

print("Loading model...")
tokenizer, model, assistant_model = load_model()
print("Model loaded")

autocomplete_task = None

@app.get("/")
async def root():
    return {"message": "Welcome to the code assistant server!"}

@app.post("/prompt")
async def get_prediction(request: PromptRequest):
    try:
        return StreamingResponse(predict(request.prompt, request.files), media_type="text/plain")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing request: {str(e)}")
    
@app.post("/autocomplete")
async def get_autocomplete(request: CompletionRequest):
    global autocomplete_task
    
    if autocomplete_task and not autocomplete_task.done():
        autocomplete_task.cancel()
        try:
            await autocomplete_task
        except:
            print("Previous autocomplete task cancelled")
            
    autocomplete_task = asyncio.create_task(
        inference(tokenizer, model, assistant_model, request.context_before, request.context_after, "cuda")
    )
    
    try:
        result = await autocomplete_task
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing request: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
