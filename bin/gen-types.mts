import { writeFile } from 'node:fs/promises';
import { basename } from 'node:path';
import { compileFromFile } from 'json-schema-to-typescript';
import { pascal } from 'radash';

const file = './schema/task-tier.schema.json';
const typeContent = await compileFromFile(file, {
	customName: (type) => (type?.$id ? pascal(basename(type.$id, '.schema.json')) : undefined),
	style: {
		useTabs: true,
		singleQuote: true,
	},
});

writeFile('types.d.ts', typeContent);
