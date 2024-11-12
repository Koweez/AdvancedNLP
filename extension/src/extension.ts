// Import the necessary modules
import * as vscode from 'vscode';
import axios from 'axios';
import { read } from 'fs';

// This method is called when your extension is activated
export function activate(vscodecontext: vscode.ExtensionContext) {
	console.log('Extension "codebuddy" is now active!');

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
					const response = await axios.post('http://localhost:8000/prompt',
						{
							prompt: userPrompt,
							context: documentContent
						}
					);

					panel.webview.postMessage({
						command: 'showResponse',
						response: response.data.answer
					});
				}
				catch (error) {
					console.error('Error sending request to the server:', error);
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
					const response = await axios.post('http://localhost:8000/autocomplete', {
						context: documentContent
					});

					const completionText = response.data.completion;

					if (completionText) {
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
	vscode.languages.registerInlineCompletionItemProvider({ pattern: '**' }, inlineCompletionProvider);

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
                        document.getElementById('response').innerText = message.response;
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
