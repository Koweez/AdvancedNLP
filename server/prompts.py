def get_prompt(prompt, files):
    if len(files) == 0:
        return prompt
    elif len(files) == 1:
        return one_context_file_prompt(prompt, list(zip(files.keys(), files.values())))
    else:
        return multiple_context_file_prompt(prompt, list(zip(files.keys(), files.values())))


def one_context_file_prompt(prompt, file):
    return f"""Here is the content of my file {file[0][0]}:
    ```\n{file[0][1]}```.
    I want you to answer to the following prompt: {prompt}.
    Using the file content to answer the prompt is NOT necessary, only use it if relevant."""

def multiple_context_file_prompt(prompt, files):
    return f"""Here is the content of my files:
    {"".join([f"File {file[0]}:\n```\n{file[1]}```\n" for file in files])}.
    I want you to answer to the following prompt: {prompt}.
    Using the files content to answer the prompt is NOT necessary, only use it if relevant."""
    pass