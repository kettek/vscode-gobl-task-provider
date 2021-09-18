/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ketchetwahmeegwun T. Southall. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as vscode from 'vscode';
import { GoblTaskProvider } from './goblTaskProvider';

let goblTaskProvider: vscode.Disposable | undefined;

export function activate(_context: vscode.ExtensionContext): void {
	const workspaceRoot = (vscode.workspace.workspaceFolders && (vscode.workspace.workspaceFolders.length > 0))
		? vscode.workspace.workspaceFolders[0].uri.fsPath : undefined;
	if (!workspaceRoot) {
		return;
	}
		
	goblTaskProvider = vscode.tasks.registerTaskProvider(GoblTaskProvider.GoblType, new GoblTaskProvider(workspaceRoot));
}

export function deactivate(): void {
	if (goblTaskProvider) {
		goblTaskProvider.dispose();
	}
}