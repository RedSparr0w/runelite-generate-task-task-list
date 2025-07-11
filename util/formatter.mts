import {
	CommentPolicy,
	EolStyle,
	Formatter,
	FracturedJsonOptions,
	NumberListAlignment,
	TableCommaPlacement,
} from 'fracturedjsonjs';

const fmt = new Formatter();

fmt.Options = Object.assign(new FracturedJsonOptions(), {
	MaxTotalLineLength: 100,
	MaxInlineLength: 500_000,
	MaxInlineComplexity: 1,
	MaxCompactArrayComplexity: 1,
	MaxTableRowComplexity: 2,
	MinCompactArrayRowItems: 3,
	AlwaysExpandDepth: -1,

	NestedBracketPadding: true,
	SimpleBracketPadding: true,
	ColonPadding: true,
	CommaPadding: true,
	CommentPadding: true,
	UseTabToIndent: true,

	TableCommaPlacement: TableCommaPlacement.BeforePadding,
	NumberListAlignment: NumberListAlignment.Normalize,
	CommentPolicy: CommentPolicy.TreatAsError,
	PreserveBlankLines: true,
	AllowTrailingCommas: false,

	OmitTrailingWhitespace: true,
	JsonEolStyle: EolStyle.Lf,
});

export default fmt;
