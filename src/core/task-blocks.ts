
import type { Editor, EditorPosition } from "obsidian";

import type { LineRange, TaskBlock } from "./types";

const TASK_LINE_PATTERN = /^(\s*)([-*]) \[( |x|X)\](?:\s|$)/u;
const TAB_WIDTH = 4;

export type { TaskBlock } from "./types";

export function isTaskLine(line: string): boolean {
	return TASK_LINE_PATTERN.test(line);
}

export function getIndentation(line: string): number {
	let indentation = 0;

	for (const character of line) {
		if (character === " ") {
			indentation += 1;
			continue;
		}

		if (character === "\t") {
			indentation += TAB_WIDTH;
			continue;
		}

		break;
	}

	return indentation;
}

export function findTaskBlockAtTaskLine(lines: string[], taskLine: number): TaskBlock | null {
	if (taskLine < 0 || taskLine >= lines.length || !isTaskLine(lines[taskLine])) {
		return null;
	}

	const rootIndent = getIndentation(lines[taskLine]);
	let endLineExclusive = taskLine + 1;

	while (endLineExclusive < lines.length) {
		const line = lines[endLineExclusive];
		if (isBlankLine(line)) {
			endLineExclusive += 1;
			continue;
		}

		if (getIndentation(line) > rootIndent) {
			endLineExclusive += 1;
			continue;
		}

		break;
	}

	while (endLineExclusive > taskLine + 1 && isBlankLine(lines[endLineExclusive - 1])) {
		endLineExclusive -= 1;
	}

	return {
		startLine: taskLine,
		endLineExclusive,
		rootIndent,
		text: lines.slice(taskLine, endLineExclusive).join("\n"),
	};
}

export function findEnclosingTaskBlock(lines: string[], lineNumber: number): TaskBlock | null {
	if (lineNumber < 0 || lineNumber >= lines.length) {
		return null;
	}

	if (isTaskLine(lines[lineNumber])) {
		return findTaskBlockAtTaskLine(lines, lineNumber);
	}

	for (let candidateLine = lineNumber - 1; candidateLine >= 0; candidateLine -= 1) {
		if (!isTaskLine(lines[candidateLine])) {
			continue;
		}

		const block = findTaskBlockAtTaskLine(lines, candidateLine);
		if (block && lineNumber >= block.startLine && lineNumber < block.endLineExclusive) {
			return block;
		}
	}

	return null;
}

export function collectTaskBlocksFromSelection(
	lines: string[],
	startLine: number,
	endLineInclusive: number,
): TaskBlock[] {
	if (lines.length === 0) {
		return [];
	}

	const clampedStartLine = clampLine(startLine, lines.length);
	const clampedEndLine = clampLine(endLineInclusive, lines.length);
	const candidates = new Map<number, TaskBlock>();

	for (let lineNumber = clampedStartLine; lineNumber <= clampedEndLine; lineNumber += 1) {
		const block = isTaskLine(lines[lineNumber])
			? findTaskBlockAtTaskLine(lines, lineNumber)
			: findEnclosingTaskBlock(lines, lineNumber);

		if (block) {
			candidates.set(block.startLine, block);
		}
	}

	const sortedBlocks = Array.from(candidates.values()).sort(
		(left, right) => left.startLine - right.startLine,
	);

	const deduplicatedBlocks: TaskBlock[] = [];
	for (const block of sortedBlocks) {
		const alreadyCovered = deduplicatedBlocks.some(
			(existingBlock) =>
				block.startLine >= existingBlock.startLine &&
				block.endLineExclusive <= existingBlock.endLineExclusive,
		);

		if (!alreadyCovered) {
			deduplicatedBlocks.push(block);
		}
	}

	return deduplicatedBlocks;
}

export function getTouchedLineRange(from: EditorPosition, to: EditorPosition): LineRange {
	const startLine = from.line;
	let endLineInclusive = to.line;

	if (to.line > from.line && to.ch === 0) {
		endLineInclusive -= 1;
	}

	if (endLineInclusive < startLine) {
		endLineInclusive = startLine;
	}

	return {
		startLine,
		endLineInclusive,
	};
}

export function removeTaskBlocksFromSource(editor: Editor, taskBlocks: TaskBlock[]): void {
	const sortedBlocks = [...taskBlocks].sort((left, right) => right.startLine - left.startLine);

	for (const taskBlock of sortedBlocks) {
		removeBlock(editor, taskBlock);
		cleanupSourceSpacing(editor, taskBlock.startLine);
	}
}

export function cleanupSourceSpacing(editor: Editor, anchorLine: number): void {
	if (editor.lineCount() === 0) {
		return;
	}

	const lastLine = editor.lastLine();
	const clampedAnchor = Math.max(0, Math.min(anchorLine, lastLine));
	let rangeStart = clampedAnchor;
	let rangeEnd = clampedAnchor;

	while (rangeStart > 0 && isBlankLine(editor.getLine(rangeStart - 1))) {
		rangeStart -= 1;
	}
	if (rangeStart > 0) {
		rangeStart -= 1;
	}

	while (rangeEnd < editor.lastLine() && isBlankLine(editor.getLine(rangeEnd + 1))) {
		rangeEnd += 1;
	}
	if (rangeEnd < editor.lastLine()) {
		rangeEnd += 1;
	}

	const originalLines: string[] = [];
	for (let lineNumber = rangeStart; lineNumber <= rangeEnd; lineNumber += 1) {
		originalLines.push(editor.getLine(lineNumber));
	}

	const normalizedLines = collapseBlankRuns(
		originalLines.map((line) => line.replace(/[ \t]+$/u, "")),
	);
	const replacement = normalizedLines.join("\n");

	editor.replaceRange(
		replacement,
		{ line: rangeStart, ch: 0 },
		{ line: rangeEnd, ch: editor.getLine(rangeEnd).length },
	);
}

function removeBlock(editor: Editor, taskBlock: TaskBlock): void {
	const lineCount = editor.lineCount();
	if (lineCount === 0) {
		return;
	}

	const from = {
		line: Math.min(taskBlock.startLine, editor.lastLine()),
		ch: 0,
	};

	if (taskBlock.endLineExclusive < lineCount) {
		editor.replaceRange("", from, { line: taskBlock.endLineExclusive, ch: 0 });
		return;
	}

	const lastLine = editor.lastLine();
	editor.replaceRange("", from, { line: lastLine, ch: editor.getLine(lastLine).length });
}

function collapseBlankRuns(lines: string[]): string[] {
	const normalizedLines: string[] = [];
	let blankRunLength = 0;

	for (const line of lines) {
		if (isBlankLine(line)) {
			blankRunLength += 1;
			if (blankRunLength <= 2) {
				normalizedLines.push("");
			}
			continue;
		}

		blankRunLength = 0;
		normalizedLines.push(line);
	}

	return normalizedLines;
}

function isBlankLine(line: string): boolean {
	return line.trim().length === 0;
}

function clampLine(lineNumber: number, lineCount: number): number {
	if (lineCount === 0) {
		return 0;
	}

	return Math.max(0, Math.min(lineNumber, lineCount - 1));
}
