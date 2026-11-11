
import { FuzzySuggestModal } from "obsidian";
import type { App, FuzzyMatch, TFile } from "obsidian";

export class MarkdownNoteSuggestModal extends FuzzySuggestModal<TFile> {
	private readonly log: (message: string, details?: unknown) => void;
	private resolver: ((file: TFile | null) => void) | null = null;
	private chosenFile: TFile | null = null;
	private settled = false;

	constructor(app: App, log: (message: string, details?: unknown) => void) {
		super(app);
		this.log = log;
		this.setPlaceholder("Choose a destination note");
	}

	getItems(): TFile[] {
		return this.app.vault.getMarkdownFiles();
	}

	getItemText(file: TFile): string {
		return file.path;
	}

	override onChooseSuggestion(item: FuzzyMatch<TFile>, evt: MouseEvent | KeyboardEvent): void {
		this.log("Picker suggestion chosen", item.item.path);
		this.chosenFile = item.item;
		this.finish(item.item);
		super.onChooseSuggestion(item, evt);
	}

	onChooseItem(file: TFile, evt: MouseEvent | KeyboardEvent): void {
		void evt;
		this.log("Picker onChooseItem", file.path);
		this.chosenFile = file;
		this.finish(file);
	}

	override onClose(): void {
		this.log("Picker closed", this.chosenFile?.path ?? null);
		super.onClose();
		globalThis.setTimeout(() => {
			this.finish(this.chosenFile);
		}, 0);
	}

	pick(): Promise<TFile | null> {
		return new Promise((resolve) => {
			this.resolver = resolve;
			this.chosenFile = null;
			this.settled = false;
			globalThis.setTimeout(() => {
				if (!this.settled) {
					this.log("Opening destination picker");
					this.open();
				}
			}, 0);
		});
	}

	private finish(file: TFile | null): void {
		if (this.settled || !this.resolver) {
			return;
		}

		this.settled = true;
		const resolve = this.resolver;
		this.resolver = null;
		this.chosenFile = null;
		resolve(file);
	}
}
