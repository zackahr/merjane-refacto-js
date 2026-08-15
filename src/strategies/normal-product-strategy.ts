import {type ProductStrategy, type StrategyAction} from './product.strategy.js';
import {type Product} from '@/db/schema.js';

export class NormalProductStrategy implements ProductStrategy {
	public evaluate(product: Product): StrategyAction {
		if (product.available > 0) {
			return {type: 'decrement'};
		}

		if (product.leadTime > 0) {
			return {type: 'delay'};
		}

		return {type: 'none'};
	}
}
