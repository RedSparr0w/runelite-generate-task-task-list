import fmt from '@/util/formatter.mjs';
import data from './package-lock.json' with { type: 'json' };

console.log(fmt.Serialize(data));
