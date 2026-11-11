
export type LineRange = {
	startLine: number;
	endLineInclusive: number;
};

export type TaskBlock = {
	startLine: number;
	endLineExclusive: number;
	rootIndent: number;
	text: string;
};
