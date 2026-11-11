
import { MarkdownView, Notice, Plugin } from "obsidian";
import type { Editor } from "obsidian";

import { buildDestinationContent } from "./core/destination-insert";
import { MarkdownNoteSuggestModal } from "./core/file-picker-modal";
import { DEFAULT_SETTINGS, type TaskMoverSettings } from "./core/settings";
import { TaskMoverSettingTab } from "./core/settings-tab";
import {
	collectTaskBlocksFromSelection,
	findEnclosingTaskBlock,
	getTouchedLineRange,
	removeTaskBlocksFromSource,
	type TaskBlock,
} from "./core/task-blocks";

export default class TaskMoverPlugin extends Plugin {
	settings: TaskMoverSettings = DEFAULT_SETTINGS;

	override async onload(): Promise<void> {
		await this.loadSettings();
		this.log("Plugin loaded");
		this.addSettingTab(new TaskMoverSettingTab(this.app, this));

		this.addCommand({
			id: "move-task-blocks-to-note",
			name: "Move task block(s) to note",
			callback: async () => {
				await this.moveTaskBlocksToNote();
			},
		});
	}

	private async moveTaskBlocksToNote(): Promise<void> {
		this.log("Command started");

		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		const editor = view?.editor;
		const sourceFile = view?.file;

		if (!editor || !sourceFile) {
			this.log("No active markdown editor");
			new Notice("Open a markdown note in the editor to move task blocks.");
			return;
		}

		this.log("Active source file", sourceFile.path);
		const sourceLines = editor.getValue().split("\n");
		const hasSelection = editor.getSelection().length > 0;
		this.log("Selection mode", hasSelection ? "selection" : "cursor");

		const taskBlocks = this.resolveTaskBlocksToMove(hasSelection, editor, sourceLines);
		if (taskBlocks.length === 0) {
			this.log("No task blocks resolved");
			new Notice("No task blocks were found at the current cursor or selection.");
			return;
		}

		this.log(
			"Resolved task blocks",
			taskBlocks.map((taskBlock) => ({
				startLine: taskBlock.startLine,
				endLineExclusive: taskBlock.endLineExclusive,
				text: taskBlock.text,
			})),
		);

		const destinationFile = await new MarkdownNoteSuggestModal(this.app, this.log.bind(this)).pick();
		if (!destinationFile) {
			this.log("Destination picker cancelled");
			return;
		}

		this.log("Destination selected", destinationFile.path);
		if (destinationFile.path === sourceFile.path) {
			this.log("Destination matched source file");
			new Notice("Choose a different destination note.");
			return;
		}

		const movedText = taskBlocks.map((taskBlock) => taskBlock.text).join("\n");
		this.log("Moved text preview", movedText);

		try {
			this.log("Reading destination file");
			const destinationContents = await this.app.vault.read(destinationFile);
			const updatedDestination = buildDestinationContent(destinationContents, movedText);
			this.log("Writing destination file");
			await this.app.vault.modify(destinationFile, updatedDestination);
			this.log("Destination update complete");
		} catch (error: unknown) {
			console.error("Task Block Mover: failed to update destination note", error);
			new Notice(`Failed to update ${destinationFile.path}. The source note was not changed.`);
			return;
		}

		try {
			this.log("Removing task blocks from source");
			removeTaskBlocksFromSource(editor, taskBlocks);
			this.log("Source cleanup complete");
		} catch (error: unknown) {
			console.error("Task Block Mover: failed to clean up source note after destination update", error);
			new Notice(
				`Moved ${taskBlocks.length} task block(s) to ${destinationFile.path}, but source cleanup failed.`,
			);
			return;
		}

		const blockLabel = taskBlocks.length === 1 ? "task block" : "task blocks";
		this.log("Command finished successfully");
		new Notice(`Moved ${taskBlocks.length} ${blockLabel} to ${destinationFile.path}.`);
	}

	private resolveTaskBlocksToMove(
		hasSelection: boolean,
		editor: Editor,
		sourceLines: string[],
	): TaskBlock[] {
		if (hasSelection) {
			const touchedRange = getTouchedLineRange(editor.getCursor("from"), editor.getCursor("to"));
			return collectTaskBlocksFromSelection(
				sourceLines,
				touchedRange.startLine,
				touchedRange.endLineInclusive,
			);
		}

		const block = findEnclosingTaskBlock(sourceLines, editor.getCursor().line);
		return block ? [block] : [];
	}

	async loadSettings(): Promise<void> {
		const loadedData = await this.loadData();
		this.settings = {
			...DEFAULT_SETTINGS,
			...loadedData,
		};
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
	}

	private log(message: string, details?: unknown): void {
		if (!this.settings.enableDebugLogs) {
			return;
		}

		if (details === undefined) {
			console.info(`[Task Block Mover] ${message}`);
			return;
		}

		console.info(`[Task Block Mover] ${message}`, details);
	}
}
