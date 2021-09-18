/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Ketchetwahmeegwun T. Southall. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as path from 'path';
import * as fs from 'fs';
import * as cp from 'child_process';
import * as vscode from 'vscode';

export class GoblTaskProvider implements vscode.TaskProvider {
	static GoblType = 'gobl';
	private goblPromise: Thenable<vscode.Task[]> | undefined = undefined;

	constructor(workspaceRoot: string) {
		const pattern = path.join(workspaceRoot, 'gobl.go');
		const fileWatcher = vscode.workspace.createFileSystemWatcher(pattern);
		fileWatcher.onDidChange(() => this.goblPromise = undefined);
		fileWatcher.onDidCreate(() => this.goblPromise = undefined);
		fileWatcher.onDidDelete(() => this.goblPromise = undefined);
	}

	public provideTasks(): Thenable<vscode.Task[]> | undefined {
		if (!this.goblPromise) {
			this.goblPromise = getGoblTasks();
		}
		return this.goblPromise;
	}

	public resolveTask(_task: vscode.Task): vscode.Task | undefined {
		const task = _task.definition.task;
		if (task) {
			const definition: GoblTaskDefinition = <any>_task.definition;
			return new vscode.Task(definition, _task.scope ?? vscode.TaskScope.Workspace, definition.task, 'gobl', new vscode.ShellExecution(`go run gobl.go ${definition.task}`));
		}
		return undefined;
	}
}

function exists(file: string): Promise<boolean> {
	return new Promise<boolean>((resolve, _reject) => {
		fs.exists(file, (value) => {
			resolve(value);
		});
	});
}

function exec(command: string, options: cp.ExecOptions): Promise<{ stdout: string; stderr: string }> {
	return new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
		cp.exec(command, options, (error, stdout, stderr) => {
			if (error) {
				reject({ error, stdout, stderr });
			}
			resolve({ stdout, stderr });
		});
	});
}

let _channel: vscode.OutputChannel;
function getOutputChannel(): vscode.OutputChannel {
	if (!_channel) {
		_channel = vscode.window.createOutputChannel('Gobl Auto Detection');
	}
	return _channel;
}

interface GoblTaskDefinition extends vscode.TaskDefinition {
	task: string;
}

const buildNames: string[] = ['build', 'compile', 'watch'];
function isBuildTask(name: string): boolean {
	for (const buildName of buildNames) {
		if (name.indexOf(buildName) !== -1) {
			return true;
		}
	}
	return false;
}

const testNames: string[] = ['test'];
function isTestTask(name: string): boolean {
	for (const testName of testNames) {
		if (name.indexOf(testName) !== -1) {
			return true;
		}
	}
	return false;
}

async function getGoblTasks(): Promise<vscode.Task[]> {
	const workspaceFolders = vscode.workspace.workspaceFolders;
	const result: vscode.Task[] = [];
	if (!workspaceFolders || workspaceFolders.length === 0) {
		return result;
	}
	for (const workspaceFolder of workspaceFolders) {
		const folderString = workspaceFolder.uri.fsPath;
		if (!folderString) {
			continue;
		}
		const goblFile = path.join(folderString, 'gobl.go');
		if (!await exists(goblFile)) {
			continue;
		}

		const commandLine = 'go run gobl.go';
		try {
			const { stdout, stderr } = await exec(commandLine, { cwd: folderString });
			if (stderr && stderr.length > 0) {
				getOutputChannel().appendLine(stderr);
				getOutputChannel().show(true);
			}
			if (stdout) {
				const lines = stdout.split(/\r{0,1}\n/).slice(1);
				for (const line of lines) {
					if (line.length === 0) {
						continue;
					}
					const regExp = /^\s*(.*)/;
					const matches = regExp.exec(line);
					if (matches && matches.length === 2) {
						const taskName = matches[0];
						const kind: GoblTaskDefinition = {
							type: 'gobl',
							task: taskName
						};
						const task = new vscode.Task(kind, workspaceFolder, taskName, 'gobl', new vscode.ShellExecution(`go run gobl.go ${taskName}`));
						result.push(task);
						const lowerCaseLine = line.toLowerCase();
						if (isBuildTask(lowerCaseLine)) {
							task.group = vscode.TaskGroup.Build;
						} else if (isTestTask(lowerCaseLine)) {
							task.group = vscode.TaskGroup.Test;
						}
					}
				}
			}
		} catch (err: any) {
			const channel = getOutputChannel();
			if (err.stderr) {
				channel.appendLine(err.stderr);
			}
			if (err.stdout) {
				channel.appendLine(err.stdout);
			}
			channel.appendLine('Auto detecting gobl tasks failed.');
			channel.show(true);
		}
	}
	return result;
}
