# CodeBuddy

**CodeBuddy** is a VSCode extension that empowers developers with AI-driven code assistance. Leveraging a quantized large language model (LLM) trained specifically on code, CodeBuddy delivers efficient, context-aware autocompletion and chatbot capabilities. This project prioritizes the integration of advanced AI techniques to provide real-time, intelligent support for coding tasks within the VSCode environment.

# How to use ?
- **Server**: To launch the server, run python model_server/server.py
- **Extension**: 
    - *Update the packaged extension*: vsce package
    - *Build the docker image*: docker build -t codebuddy-image .
    - *Run the docker container*: docker run -d --network="host" --name codebuddy-container codebuddy-image
        Open the extension -> localhost:8000
    - *Stop the container*: docker stop codebuddy-container
    - *Remove the container*: docker rm codebuddy-container
    - *Remove the image*: docker rmi codebuddy-image
