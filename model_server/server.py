from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from model_server.utils import PromptRequest, CompletionRequest, predict, autocomplete

app = FastAPI()

@app.get("/")
async def root():
    return {"message": "Welcome to the code assistant server!"}

@app.post("/prompt")
async def get_prediction(request: PromptRequest):
    try:
        return StreamingResponse(predict(request.prompt, request.context))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing request: {str(e)}")
    
@app.post("/autocomplete")
async def get_autocomplete(request: CompletionRequest):
    try:
        return autocomplete(request.context_before, request.context_after)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing request: {str(e)}")
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
