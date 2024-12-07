const vscode = require('vscode');
const MarkdownIt = require('markdown-it');
const hljs = require('highlight.js');
const fs = require('fs');


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

	const inlineCompletionProvider = {
		async provideInlineCompletionItems(document, position, context, token) {
			// Only send context when the user is actively typing
			if (context.triggerKind === vscode.InlineCompletionTriggerKind.Automatic) {
				const documentContent = document.getText();

				try {
					const cursorOffset = document.offsetAt(position);
					const contextBefore = documentContent.slice(0, cursorOffset).toString();
					const contextAfter = documentContent.slice(cursorOffset).toString();
					console.log('Context before:' + contextBefore);
					console.log('Context after:' + contextAfter);
					const response = await fetch("http://localhost:8000/autocomplete", {
						method: "POST",
						body: JSON.stringify({ context_before: contextBefore, context_after: contextAfter }),
						headers: {
							"Content-Type": "application/json",
						},
					});

					if (!response.body) {
						throw new Error("Failed to fetch inline completion");
					}

					let completionText = await response.text();
					completionText = completionText.replace(/\\n/g, '\n');
					completionText = completionText.slice(1, -1);

					if (completionText) {
						console.log('Completion text:', completionText);
						completionText = completionText.replace(/\\n/g, '\n');
						completionText = completionText.replace(/\\t/g, '\t');

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
