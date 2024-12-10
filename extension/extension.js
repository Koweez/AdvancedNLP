const vscode = require('vscode');
const MarkdownIt = require('markdown-it');
const hljs = require('highlight.js');
const fs = require('fs');

function activate(vscodecontext) {
	console.log('Extension "codebuddy" is now active!');
	if (vscode.window.activeTextEditor) { lastFileSelected = vscode.workspace.asRelativePath(vscode.window.activeTextEditor.document.fileName); }

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
				retainContextWhenHidden: true
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

				const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
				if (!workspaceFolder) {
					vscode.window.showErrorMessage('No workspace folder is open');
					return;
				}

				const filenames = message.filenames;
				const files = {};
				try {
					for (const file of filenames) {
						const filePath = vscode.Uri.file(`${workspaceFolder}/${file}`);
						const document = await vscode.workspace.openTextDocument(filePath);
						files[file] = document.getText();
					}
				} catch (error) {
					vscode.window.showErrorMessage(`Failed to open file: ${error.message}`);
				}

				try {
					const response = await fetch("http://localhost:8000/prompt", {
						method: "POST",
						body: JSON.stringify({ prompt: userPrompt, files: files }),
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

		panel.webview.onDidReceiveMessage(
			async (message) => {
				if (message.command === 'chooseFile') {
					const workspaceFolder = vscode.workspace.workspaceFolders?.[0]?.uri.fsPath;
					if (workspaceFolder) {
						const files = await vscode.workspace.findFiles(
							'**/*',
							'**/{node_modules,.git,.pycache,dist,out,build,__pycache__}/**'
						);

						const selectedFile = await vscode.window.showQuickPick(
							files.map(file => file.fsPath.replace(workspaceFolder, '').substring(1)),
							{ placeHolder: 'Select a file from your project' }
						);
						if (typeof selectedFile !== "undefined") {
							panel.webview.postMessage({
								command: 'contextFile',
								fileName: selectedFile
							});
						}
					} else {
						vscode.window.showErrorMessage('No workspace folder is open');
					}
				}
			}
		);
	});


	let controller = null;
	const inlineCompletionProvider = {
		async provideInlineCompletionItems(document, position, context, token) {
			console.log('Inline completion requested');
			// Abort previous request if it exists
			if (controller) {
				controller.abort();
				console.log('Previous autocomplete request aborted');
			}

			// Create a new AbortController for the current request
			controller = new AbortController();
			token.onCancellationRequested(() => {
				controller.abort();
				console.log('Autocomplete request cancelled');
			});

			const documentContent = document.getText();
			const cursorOffset = document.offsetAt(position);

			const contextBefore = documentContent.slice(0, cursorOffset);
			const contextAfter = documentContent.slice(cursorOffset);

			try {
				const response = await fetch("http://localhost:8000/autocomplete", {
					method: "POST",
					body: JSON.stringify({ context_before: contextBefore, context_after: contextAfter }),
					headers: {
						"Content-Type": "application/json",
					},
					signal: controller.signal
				});

				if (!response.ok) {
					throw new Error(`Failed to fetch autocomplete: ${response.statusText}`);
				}

				let completionText = '';
				const reader = response.body.getReader();
				const decoder = new TextDecoder('utf-8');

				while (true) {
					const { done, value } = await reader.read();

					if (done) {
						break;
					}

					completionText += decoder.decode(value);

					if (token.isCancellationRequested) {
						controller.abort();
						return { items: [] };
					}
				}

				return {
					items: [
						{
							text: completionText,
							range: new vscode.Range(position, position),
							insertText: completionText
						}
					]
				};
			} catch (error) {
				if (error.name === 'AbortError') {
					console.log('Autocomplete fetch aborted');
				} else {
					console.error('Error fetching autocomplete:', error);
				}
			}

			return { items: [] };
		}
	};
	// Register the command in the context subscriptions
	vscodecontext.subscriptions.push(promptUserCommand);
	vscode.languages.registerInlineCompletionItemProvider({ pattern: '**/**' }, inlineCompletionProvider);
}


function renderMarkdown(markdown) {
	const md = new MarkdownIt({
		html: true,
		linkify: true,
		typographer: true,

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
