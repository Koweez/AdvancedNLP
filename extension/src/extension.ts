// Import the necessary modules
import * as vscode from 'vscode';
import axios from 'axios';

// This method is called when your extension is activated
export function activate(context: vscode.ExtensionContext) {
	console.log('Extension "code-assistant" is now active!');

	// Register a command that prompts the user for input
	const disposable = vscode.commands.registerCommand('code-assistant.promptUser', async () => {
		// Retrieve the active text editor (if any)
		const editor = vscode.window.activeTextEditor;
		let documentContent = '';

		if (editor) {
			// Get the content of the current file if an editor is active
			documentContent = editor.document.getText();
		}

		// Prompt the user for input
		const userPrompt = await vscode.window.showInputBox({
			prompt: 'Enter your prompt for the AI',
			placeHolder: 'Type your question or instruction here...'
		});

		if (userPrompt) {
			try {
				// Send the prompt and document content (if any) to the server
				const response = await axios.post('http://localhost:8000/predict', {
					prompt: userPrompt,
					context: documentContent
				});

				// Display the server response to the user
				vscode.window.showInformationMessage(`Server response: ${response.data.answer}`);
			} catch (error) {
				console.error('Error sending request to the server:', error);
				vscode.window.showErrorMessage('Failed to connect to the server. Please check your server and try again.');
			}
		} else {
			vscode.window.showInformationMessage('No input provided.');
		}
	});

	// Register the command in the context subscriptions
	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {
	console.log('Deactivated');
}
