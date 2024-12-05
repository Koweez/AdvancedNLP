// Import the necessary modules
import * as vscode from 'vscode';
import axios from 'axios';
import { read } from 'fs';

// This method is called when your extension is activated
export function activate(vscodecontext: vscode.ExtensionContext) {
	console.log('Extension "codebuddy" is now active!');
	let outputChannel = vscode.window.createOutputChannel('CodeBuddy');
	outputChannel.appendLine('CodeBuddy extension activated hehehe boy');

	// Register a command that prompts the user for input
	const promptUserCommand = vscode.commands.registerCommand('codebuddy.promptUser', async () => {
		// put the webview panel on the right side of the editor
		await vscode.commands.executeCommand('workbench.action.editorLayoutTwoColumns');
		await vscode.commands.executeCommand('workbench.action.focusSecondEditorGroup');

		const panel = vscode.window.createWebviewPanel(
			'codebuddy',
			'Code Buddy',
			vscode.ViewColumn.Two,
			{
				enableScripts: true
			},
		);

		panel.webview.html = getWebviewContent();

		panel.webview.onDidReceiveMessage(async (message) => {
			await vscode.commands.executeCommand('workbench.action.focusFirstEditorGroup');

			if (message.command === 'submitPrompt') {
				const userPrompt = message.text;
				if (userPrompt.trim() === '') {
					vscode.window.showInformationMessage('Please enter a valid prompt.');
					return;
				}
				let documentContent = '';

				const editor = vscode.window.activeTextEditor;
				if (editor) {
					documentContent = editor.document.getText();
				}

				try {
					// Using fetch for streaming response
					const response = await fetch("http://localhost:8000/prompt", {
						method: "POST",
						body: JSON.stringify({ prompt: userPrompt, context: documentContent }),
						headers: {
							"Content-Type": "application/json",
						},
					});

					if (!response.body) {
						throw new Error("No response body");
					}

					let completeStr = '';
					for await (const chunk of response.body) {
						var string = new TextDecoder().decode(chunk);
						completeStr += string;
						panel.webview.postMessage({
							command: 'showResponse',
							response: completeStr
						});
					}

				} catch (error) {
					console.error('Error receiving streaming response:', error);
					vscode.window.showErrorMessage('Failed to connect to the server. Please check your server and try again.');
				}
			}
		});

	});

	const inlineCompletionProvider: vscode.InlineCompletionItemProvider = {
		async provideInlineCompletionItems(document, position, context, token) {
			// Only send context when the user is actively typing
			if (context.triggerKind === vscode.InlineCompletionTriggerKind.Automatic) {
				const documentContent = document.getText();

				try {
					const cursorOffset = document.offsetAt(position);
					const contextBefore = documentContent.slice(0, cursorOffset).toString();
					const contextAfter = documentContent.slice(cursorOffset).toString();
					outputChannel.appendLine('Context before:' + contextBefore);
					outputChannel.appendLine('Context after:' + contextAfter);
					const response = await fetch("http://localhost:8000/autocomplete", {
						method: "POST",
						body: JSON.stringify({ context_before: contextBefore, context_after: contextAfter }),
						headers: {
							"Content-Type": "application/json",
						},
					});

					if (!response.ok) {
						throw new Error("Failed to fetch inline completion");
					}

					let completionText = await response.text();
					completionText = completionText.replace(/\\n/g, '\n');
					completionText = completionText.slice(1, -1);

					if (completionText) {
						outputChannel.appendLine('Completion response:' + completionText);
						return {
							items: [
								{
									text: completionText,
									range: new vscode.Range(position, position),
									insertText: completionText
								}
							]
						};
					}
				} catch (error) {
					console.error('Error fetching inline completion:', error);
				}
			}
			return { items: [] };
		}
	};

	// Register the command in the context subscriptions
	vscodecontext.subscriptions.push(promptUserCommand);
	vscodecontext.subscriptions.push(vscode.languages.registerInlineCompletionItemProvider({ pattern: '**' }, inlineCompletionProvider));
	

}

function getWebviewContent(): string {
	return `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>CodeBuddy Assistant</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    padding: 10px;
                }
                textarea {
                    width: 100%;
                    height: 100px;
                }
                button {
                    margin-top: 10px;
                    padding: 5px 10px;
                    cursor: pointer;
                }
                .response {
                    margin-top: 20px;
                    white-space: pre-wrap;
                    border-top: 1px solid #ddd;
                    padding-top: 10px;
                }
            </style>
        </head>
        <body>
            <h2>CodeBuddy Assistant</h2>
            <textarea id="input" placeholder="Type your query here..."></textarea>
            <button id="submit">Submit</button>
            <div class="response" id="response"></div>
            <script>
                const vscode = acquireVsCodeApi();
                document.getElementById('submit').addEventListener('click', () => {
                    const input = document.getElementById('input').value;
                    vscode.postMessage({
                        command: 'submitPrompt',
                        text: input
                    });
                });

                window.addEventListener('message', event => {
					const message = event.data;
					if (message.command === 'showResponse') {
						const responseElement = document.getElementById('response');
						responseElement.innerText = message.response;
					}
				});
            </script>
        </body>
        </html>
    `;
}

// This method is called when your extension is deactivated
export function deactivate() {
	console.log('Deactivated');
}
