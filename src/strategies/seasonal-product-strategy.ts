import {type ProductStrategy, type StrategyAction} from './product.strategy.js';
import {DAY_IN_MS} from '@/constants/inventory.js';
import {type Product} from '@/db/schema.js';

export class SeasonalProductStrategy implements ProductStrategy {
	public evaluate(product: Product, currentDate: Date): StrategyAction {
		const {seasonStartDate, seasonEndDate} = product;

		// Boundaries are exclusive: the product is only sellable strictly inside the season window.
		if (seasonStartDate! < currentDate && currentDate < seasonEndDate! && product.available > 0) {
			return {type: 'decrement'};
		}

		// Restock would land past the season end -> the product can no longer be made available.
		const deliveryEndDate = new Date(currentDate.getTime() + (product.leadTime * DAY_IN_MS));

		if (deliveryEndDate > seasonEndDate!) {
			return {type: 'unavailable'};
		}

		if (seasonStartDate! > currentDate) {
			return {type: 'out-of-stock'};
		}

		return {type: 'delay'};
	}
}
