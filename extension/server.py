from fastapi import FastAPI, HTTPException
from utils import PromptRequest, CompletionRequest, predict, autocomplete

app = FastAPI()

@app.get("/")
async def root():
    return {"message": "Welcome to the code assistant server!"}

@app.post("/predict")
async def get_prediction(request: PromptRequest):
    try:
        response = predict(request.prompt, request.context)
        return {"answer": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing request: {str(e)}")
    
@app.post("/autocomplete")
async def get_autocomplete(request: CompletionRequest):
    try:
        response = autocomplete(request.context)
        return {"answer": response}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing request: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
