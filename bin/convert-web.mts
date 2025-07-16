// just pretend you never saw this file; quick, close it! now!

import { readFileSync } from 'node:fs';
import { flat, group, mapKeys } from 'radash';
import fmt from '@/util/formatter.mjs';

type PluginTask = {
	id: number;
	description: string;
	itemID: number;
};

const EXTRA_TASK_MAPPING = {
	'get a heat-proof vessel': 'get a large water container',
	'get 1 unique from fortis colosseum': '1 fortis colosseum unique',
	'get 3 uniques from easy clues': 'get 3 new uniques from easy clues',
	'get 3 uniques from medium clues': 'get 3 new uniques from medium clues',
	'get 3 uniques from hard clues': 'get 3 new uniques from hard clues',
	'get 1 minigame slot': '1 minigame log slot',
	'get 1 unique boss pet or jar': '1 boss pet or jar',
	'get a level 99': 'a new level 99',
	'get 1 unique from creature creation': 'get a unique from creature creation',
	'complete easy/medium/hard/elite/+50 points': 'master tier combat achievements',
	'get 1 unique from dt2 bosses': 'get 1 unique from the dt2 bosses',
	'get quetzin': 'obtain the quetzin',
	'get 1 unique skilling pet': '1 skilling pet',
	'get 2 lms slots': '2 lms log slots',
	'get a infernal cape': 'infernal cape',
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
const ttaskMap = {
	...taskMap,
	// this just adds the same task name but without get
	// biome-ignore lint: because
	...mapKeys(taskMap, (k) => k.replace(/^get /, '')),
};

const oldData = JSON.parse(readFileSync(inFile).toString());

function shiftTask(taskName: string): PluginTask | null {
	const ttaskName = taskName.toLowerCase();
	const tasks =
		ttaskMap[ttaskName] ??
		// biome-ignore lint: because
		// @ts-ignore
		ttaskMap[EXTRA_TASK_MAPPING[ttaskName]] ??
		// biome-ignore lint: because
		ttaskMap[ttaskName.replace(/^get /, '')];

	if (!tasks || tasks.length === 0) {
		return null;
	}

	return tasks[0];
}

const newData = {
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
			displayItemId: plTask?.itemID ?? null,
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
