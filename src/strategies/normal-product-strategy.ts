import {type ProductStrategy, type StrategyAction} from './product.strategy.js';
import {STRATEGY_ACTIONS} from '@/constants/inventory.js';
import {type Product} from '@/db/schema.js';

export class NormalProductStrategy implements ProductStrategy {
	public evaluate(product: Product): StrategyAction {
		if (product.available > 0) {
			return {type: STRATEGY_ACTIONS.DECREMENT};
		}

		if (product.leadTime > 0) {
			return {type: STRATEGY_ACTIONS.DELAY};
		}

		return {type: STRATEGY_ACTIONS.NONE};
	}
}
