import {type ProductStrategy, type StrategyAction} from './product.strategy.js';
import {DAY_IN_MS, STRATEGY_ACTIONS} from '@/constants/inventory.js';
import {type Product} from '@/db/schema.js';

export class SeasonalProductStrategy implements ProductStrategy {
	public evaluate(product: Product, currentDate: Date): StrategyAction {
		const {seasonStartDate, seasonEndDate} = product;

		// Boundaries are exclusive: the product is only sellable strictly inside the season window.
		if (seasonStartDate! < currentDate && currentDate < seasonEndDate! && product.available > 0) {
			return {type: STRATEGY_ACTIONS.DECREMENT};
		}

		// Restock would land past the season end -> the product can no longer be made available.
		const deliveryEndDate = new Date(currentDate.getTime() + (product.leadTime * DAY_IN_MS));

		if (deliveryEndDate > seasonEndDate!) {
			return {type: STRATEGY_ACTIONS.OUT_OF_SEASON};
		}

		if (seasonStartDate! > currentDate) {
			return {type: STRATEGY_ACTIONS.OUT_OF_STOCK};
		}

		return {type: STRATEGY_ACTIONS.DELAY};
	}
}
