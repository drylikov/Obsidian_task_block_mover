
import { PluginSettingTab, Setting } from "obsidian";
import type { App } from "obsidian";

import type TaskMoverPlugin from "../main";

export class TaskMoverSettingTab extends PluginSettingTab {
	private readonly plugin: TaskMoverPlugin;

	constructor(app: App, plugin: TaskMoverPlugin) {
		super(app, plugin);
		this.plugin = plugin;
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Enable debug logs")
			.setDesc("Write Task Block Mover debug logs to the developer console.")
			.addToggle((toggle) => {
				toggle.setValue(this.plugin.settings.enableDebugLogs).onChange(async (value) => {
					this.plugin.settings.enableDebugLogs = value;
					await this.plugin.saveSettings();
				});
			});
	}
}
