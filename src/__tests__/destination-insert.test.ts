
import { describe, expect, it } from "vitest";

import { buildDestinationContent } from "../core/destination-insert";

describe("buildDestinationContent", () => {
	it("inserts moved blocks immediately above the first existing task", () => {
		const destination = "# Inbox\n\n- [ ] Existing task\nnotes";
		const moved = "- [ ] Moved task";

		expect(buildDestinationContent(destination, moved)).toBe(
			"# Inbox\n\n- [ ] Moved task\n- [ ] Existing task\nnotes",
		);
	});

	it("appends moved blocks with exactly one blank line when the destination has no tasks", () => {
		const destination = "# Journal\n\nSome text\n\n";
		const moved = "- [ ] Moved task";

		expect(buildDestinationContent(destination, moved)).toBe(
			"# Journal\n\nSome text\n\n- [ ] Moved task",
		);
	});

	it("writes only the moved blocks when the destination is empty", () => {
		expect(buildDestinationContent("", "- [ ] Moved task")).toBe("- [ ] Moved task");
	});
});
