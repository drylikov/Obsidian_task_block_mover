
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		exclude: [".skill-staging/**", "dist/**", "node_modules/**"],
		include: ["src/__tests__/**/*.test.ts"],
	},
});
