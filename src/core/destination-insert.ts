
import { isTaskLine } from "./task-blocks";

export function buildDestinationContent(destinationText: string, movedText: string): string {
	const normalizedMovedText = stripTrailingNewlines(movedText);
	if (normalizedMovedText.length === 0) {
		return destinationText;
	}

	if (destinationText.trim().length === 0) {
		return normalizedMovedText;
	}

	const destinationLines = destinationText.split("\n");
	const firstTaskLineIndex = destinationLines.findIndex((line) => isTaskLine(line));

	if (firstTaskLineIndex !== -1) {
		const beforeTask = destinationLines.slice(0, firstTaskLineIndex).join("\n");
		const firstTaskAndAfter = destinationLines.slice(firstTaskLineIndex).join("\n");

		if (beforeTask.length === 0) {
			return `${normalizedMovedText}\n${firstTaskAndAfter}`;
		}

		return `${beforeTask}\n${normalizedMovedText}\n${firstTaskAndAfter}`;
	}

	const trimmedDestination = stripTrailingBlankLines(destinationLines).join("\n");
	if (trimmedDestination.length === 0) {
		return normalizedMovedText;
	}

	return `${trimmedDestination}\n\n${normalizedMovedText}`;
}

function stripTrailingNewlines(text: string): string {
	return text.replace(/\n+$/u, "");
}

function stripTrailingBlankLines(lines: string[]): string[] {
	let end = lines.length;
	while (end > 0 && lines[end - 1].trim().length === 0) {
		end--;
	}

	return lines.slice(0, end);
}
