// just pretend you never saw this file; quick, close it! now!

import { readFileSync } from 'node:fs';
import { flat, group } from 'radash';
import fmt from '@/util/formatter.mjs';

type PluginTask = {
	id: number;
	description: string;
	itemID: number;
};

const EXTRA_TASK_MAPPING = {
	'get a heat-proof vessel': 'get a large water container',
	'get 1 unique from fortis colosseum': '1 fortis colosseum unique',
	'get 1 unique from creature creation': 'get a unique from creature creation',
	'upgrade to the expert dragon archer headpiece':
		'upgrade to the (expert) dragon archer headpiece',
};

const inFile = process.argv[2];

const pluginTasks = JSON.parse(
	readFileSync(
		'./ext/clog-master/src/main/resources/com/logmaster/domain/default-tasks.json'
	).toString()
) as Record<string, PluginTask[]>;
const taskMap = group(flat(Object.values(pluginTasks)), (t) => t.description.toLowerCase());

const oldData = JSON.parse(readFileSync(inFile).toString());

function shiftTask(taskName: string): PluginTask | null {
	const ttaskName = taskName.toLowerCase();
	// biome-ignore lint: because
	// @ts-ignore
	const tasks = taskMap[ttaskName] ?? taskMap[EXTRA_TASK_MAPPING[ttaskName]];

	if (!tasks || tasks.length === 0) {
		return null;
	}

	// biome-ignore lint: because
	return tasks!.shift()!;
}

const newData = {
	$schema: '../schema/tier-task-list.schema.json',
	name: inFile.replace('.json', '').replace(/^.+(\/|\\)/, ''),
	// biome-ignore lint: because
	// @ts-ignore
	tasks: oldData.map((task) => {
		const plTask = shiftTask(task.name);

		return {
			id: task.uuid,
			// biome-ignore lint: because
			name: task.name.trim().replace(/\bunique\b/i, 'unique'),
			tip: task.tip.trim(),
			// biome-ignore lint: because
			wikiLink: task.wikiLink.replace(/^http:\/\//, 'https://'),
			// biome-ignore lint: because
			imageLink: task.wikiImage.replace(/\?[\da-f]{5}$/, '').replace(/^http:\/\//, 'https://'),
			displayItemId: plTask?.itemID ?? undefined,
			...(task.colLogData
				? {
						verification: {
							method: 'collection-log',
							itemIds: [
								...new Set<number>(task.colLogData.include.map((i: { id: number }) => i.id)),
							].toSorted((a, b) => a - b),
							count: task.colLogData.logCount,
						},
					}
				: {}),
		};
	}),
};

console.log(fmt.Serialize(newData));
