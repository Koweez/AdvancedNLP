const vscode = require('vscode');
const MarkdownIt = require('markdown-it');
const hljs = require('highlight.js');
const fs = require('fs');
const { PassThrough } = require('stream');


function activate(vscodecontext) {
	console.log('Extension "codebuddy" is now active!');
	let outputChannel = vscode.window.createOutputChannel('CodeBuddy');
	outputChannel.appendLine('Code Buddy extension activated hehehe boy');

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
				enableScripts: true,
				retainContextWhenHidden: false
			},
		);

		panel.webview.html = getWebviewContent(panel.webview, vscodecontext.extensionUri);

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

					let content = '';
					for await (const chunk of response.body) {
						content += new TextDecoder().decode(chunk);
						panel.webview.postMessage({
							command: 'showResponse',
							response: renderMarkdown(content)
						});
					}

				} catch (error) {
					console.error('Error receiving streaming response:', error);
					vscode.window.showErrorMessage('Failed to connect to the server. Please check your server and try again.');
				}
			}
		});

	});

	// const controller = new AbortController();
	// let notSent = false;
	// const inlineCompletionProvider = {
	// 	async provideInlineCompletionItems(document, position, context, token) {
	// 		console.log('token:', token);
	// 		// Only send context when the user is actively typing
	// 		if (context.triggerKind === vscode.InlineCompletionTriggerKind.Automatic) {
	// 			const documentContent = document.getText();
	// 			const cursorOffset = document.offsetAt(position);

	// 			// Extract context efficiently
	// 			const contextBefore = documentContent.slice(0, cursorOffset);
	// 			const contextAfter = documentContent.slice(cursorOffset);

				

	// 			// check if the user is typing in the prompt
	// 			token.onCancellationRequested(() => {
	// 				// check if the typed char is a space
	// 				// if it is a space, then 
	// 				notSent = true;
	// 			})

	// 			try {
	// 				if (notSent) {
	// 					console.log('not sent');
	// 					return { items: [] };
	// 				}

	// 				console.log('sent');
	// 				// log the context with spaces and newlines
	// 				console.log('contextBefore:', JSON.stringify(contextBefore));
	// 				console.log('contextAfter:', JSON.stringify(contextAfter));def 

					
	// 				// Send the request
	// 				const response = await fetch("http://localhost:8000/autocomplete", {
	// 					method: "POST",
	// 					body: JSON.stringify({ context_before: contextBefore, context_after: contextAfter }),
	// 					headers: {
	// 						"Content-Type": "application/json",
	// 					},
	// 					// signal: controller.signal
	// 				});

	// 				if (!response.ok) {
	// 					throw new Error(`Failed to fetch inline completion: ${response.statusText}`);
	// 				}

	// 				const completionText = await response.text();

	// 				// Parse and format the completion text
	// 				const parsedCompletionText = JSON.parse(completionText);
	// 				const formattedCompletionText = parsedCompletionText.replace(/\\n/g, '\n').replace(/\\t/g, '\t');

	// 				return {
	// 					items: [
	// 						{
	// 							text: formattedCompletionText,
	// 							range: new vscode.Range(position, position),
	// 							insertText: formattedCompletionText
	// 						}
	// 					]
	// 				};
	// 			} catch (error) {
	// 				console.error('Error fetching inline completion:', error);
	// 				// Consider providing user feedback, e.g., a notification or a specific error message in the editor
	// 			}
	// 		}

	// 		return { items: [] };
	// 	}
	// };

	const controller = new AbortController();

	const inlineCompletionProvider = {
		async provideInlineCompletionItems(document, position, context, token) {

			// token.isCancellationRequested is true if the user is typing in the prompt
			// token.onCancellationRequested is called when the user types a space

			// check if cancelation is requested: user is typing in the prompt
			if (token.isCancellationRequested) {
				console.log('canceled before sending');
				controller.abort();
				return { items: [] };
			}

			console.log('not canceled');

			// console.log('not canceled, recreating controller');
			// // reset the controller each time the user stops typing
			// controller.abort(); // abort any ongoing request before starting a new one
			// console.log('controller aborted');

			const documentContent = document.getText();
			const cursorOffset = document.offsetAt(position);

			// context before the cursor
			const contextBefore = documentContent.slice(0, cursorOffset);
			// context after the cursor
			const contextAfter = documentContent.slice(cursorOffset);
			
			try {
				console.log('contextBefore:', JSON.stringify(contextBefore));
				console.log('contextAfter:', JSON.stringify(contextAfter));
				// send the request to the server
				const response = await fetch("http://localhost:8000/autocomplete", {
					method: "POST",
					body: JSON.stringify({ context_before: contextBefore, context_after: contextAfter }),
					headers: {
						"Content-Type": "application/json",
					},
					signal: controller.signal
				});

				if (token.isCancellationRequested) {
					console.log('canceled after sending');
					return { items: [] };
				}	

				// check model response
				if (!response.ok) {
					throw new Error(`Failed to fetch inline completion: ${response.statusText}`);
				}

				// get the completion text
				const completionText = await response.text();

				// parse and format the completion text
				const parsedCompletionText = JSON.parse(completionText);
				const formattedCompletionText = parsedCompletionText.replace(/\\n/g, '\n').replace(/\\t/g, '\t');

				return {
					items: [
						{
							text: formattedCompletionText,
							range: new vscode.Range(position, position),
							insertText: formattedCompletionText
						}
					]
				};
			} catch (error) {
				console.error('Error fetching inline completion:', error);
			}

			return { items: [] };
		}
	};

	// Register the command in the context subscriptions
	vscodecontext.subscriptions.push(promptUserCommand);
	vscode.languages.registerInlineCompletionItemProvider({ pattern: '**' }, inlineCompletionProvider);
}

function renderMarkdown(markdown) {
	const md = new MarkdownIt({
		html: true,          // Allow HTML tags in Markdown
		linkify: true,       // Convert links to clickable URLs
		typographer: true,   // Enable typographic features

		highlight: function (str, lang) {
			if (lang && hljs.getLanguage(lang)) {
				try {
					return `<pre class="hljs language-${lang}" data-code="${Buffer.from(str).toString('base64')}"><code class="language-${lang}">${hljs.highlight(str, { language: lang, ignoreIllegals: true }).value
						}</code></pre>`;
				} catch (__) {
					return `<pre class="hljs" data-code="${Buffer.from(str).toString('base64')}"><code>${md.utils.escapeHtml(str)}</code></pre>`;
				}
			}

			return `<pre class="hljs" data-code="${Buffer.from(str).toString('base64')}"><code>${md.utils.escapeHtml(str)}</code></pre>`;
		}
	});

	return md.render(markdown).replace(/<pre[^>]*>([\s\S]*?)<\/pre>/g, function (m) {
		return `
			<div id="div-copy">
				<button id="copy-button" onclick="copyCode(this)">copy</button>
			</div>
			${m}
		`;
	});
}

function getWebviewContent(webview, extensionUri) {
	const htmlPath = vscode.Uri.joinPath(extensionUri, 'media', 'webview.html');
	let html = fs.readFileSync(htmlPath.fsPath, 'utf8');

	const cssPath = webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, 'media', 'webview.css'));
	html = html.replace('<link rel="stylesheet" href="webview.css">', `<link rel="stylesheet" href="${cssPath}">`);

	return html;
}

function deactivate() {
	console.log('Deactivated');
}

module.exports = {
	activate,
	deactivate
};
