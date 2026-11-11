
import { describe, expect, it } from "vitest";

import {
	collectTaskBlocksFromSelection,
	findEnclosingTaskBlock,
	findTaskBlockAtTaskLine,
	getIndentation,
	getTouchedLineRange,
	isTaskLine,
} from "../core/task-blocks";

describe("isTaskLine", () => {
	it("recognizes supported task markers", () => {
		expect(isTaskLine("- [ ] Open task")).toBe(true);
		expect(isTaskLine("- [x] Done task")).toBe(true);
		expect(isTaskLine("* [ ] Another task")).toBe(true);
		expect(isTaskLine("* [x] Another done task")).toBe(true);
	});

	it("rejects non-task lines", () => {
		expect(isTaskLine("- item")).toBe(false);
		expect(isTaskLine("plain text")).toBe(false);
	});
});

describe("getIndentation", () => {
	it("counts spaces and tabs", () => {
		expect(getIndentation("    - [ ] Task")).toBe(4);
		expect(getIndentation("\t- [ ] Task")).toBe(4);
		expect(getIndentation(" \t- [ ] Task")).toBe(5);
	});
});

describe("findTaskBlockAtTaskLine", () => {
	it("moves parent tasks with notes and child tasks as one block", () => {
		const lines = [
			"- [ ] Parent task",
			"  notes about it",
			"  more notes",
			"  - [ ] Child task",
			"    child notes",
			"",
			"- [ ] Next task",
		];

		const block = findTaskBlockAtTaskLine(lines, 0);
		expect(block?.text).toBe(
			[
				"- [ ] Parent task",
				"  notes about it",
				"  more notes",
				"  - [ ] Child task",
				"    child notes",
			].join("\n"),
		);
		expect(block?.endLineExclusive).toBe(5);
	});

	it("moves only the child subtree when rooted at the child task", () => {
		const lines = [
			"- [ ] Parent task",
			"  notes about it",
			"  - [ ] Child task",
			"    child notes",
			"- [ ] Next task",
		];

		const block = findTaskBlockAtTaskLine(lines, 2);
		expect(block?.text).toBe(["  - [ ] Child task", "    child notes"].join("\n"));
		expect(block?.endLineExclusive).toBe(4);
	});
});

describe("findEnclosingTaskBlock", () => {
	it("finds the enclosing task when the cursor is in indented task content", () => {
		const lines = [
			"- [ ] Parent task",
			"  notes about it",
			"  - [ ] Child task",
			"    child notes",
			"- [ ] Next task",
		];

		const block = findEnclosingTaskBlock(lines, 1);
		expect(block?.startLine).toBe(0);
		expect(block?.text).toContain("Child task");
	});

	it("returns the child task when the cursor is on child notes", () => {
		const lines = [
			"- [ ] Parent task",
			"  - [ ] Child task",
			"    child notes",
			"- [ ] Next task",
		];

		const block = findEnclosingTaskBlock(lines, 2);
		expect(block?.startLine).toBe(1);
		expect(block?.text).toBe(["  - [ ] Child task", "    child notes"].join("\n"));
	});
});

describe("collectTaskBlocksFromSelection", () => {
	it("collects touched task blocks and ignores unrelated non-task lines", () => {
		const lines = [
			"Intro",
			"- [ ] First task",
			"  notes",
			"plain text",
			"- [ ] Second task",
			"  notes",
		];

		const blocks = collectTaskBlocksFromSelection(lines, 1, 5);
		expect(blocks.map((block) => block.startLine)).toEqual([1, 4]);
	});

	it("deduplicates nested blocks when the parent is already touched", () => {
		const lines = [
			"- [ ] Parent task",
			"  notes",
			"  - [ ] Child task",
			"    child notes",
			"- [ ] Next task",
		];

		const blocks = collectTaskBlocksFromSelection(lines, 0, 3);
		expect(blocks).toHaveLength(1);
		expect(blocks[0]?.startLine).toBe(0);
	});
});

describe("getTouchedLineRange", () => {
	it("treats a selection ending at column zero as not touching the end line", () => {
		expect(
			getTouchedLineRange({ line: 2, ch: 0 }, { line: 5, ch: 0 }),
		).toEqual({ startLine: 2, endLineInclusive: 4 });
	});
});
