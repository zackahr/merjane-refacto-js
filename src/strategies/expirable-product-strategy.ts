import {type ProductStrategy, type StrategyAction} from './product.strategy.js';
import {type Product} from '@/db/schema.js';

export class ExpirableProductStrategy implements ProductStrategy {
	public evaluate(product: Product, currentDate: Date): StrategyAction {
		// Sellable only strictly before its expiry date; expiry day itself is already past sale.
		if (product.available > 0 && product.expiryDate! > currentDate) {
			return {type: 'decrement'};
		}

		return {type: 'expired'};
	}
}
