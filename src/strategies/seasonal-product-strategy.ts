import {type ProductStrategy, type StrategyAction} from './product.strategy.js';
import {type Product} from '@/db/schema.js';

const DAY_IN_MS = 24 * 60 * 60 * 1000;

export class SeasonalProductStrategy implements ProductStrategy {
	public evaluate(product: Product, currentDate: Date): StrategyAction {
		const {seasonStartDate, seasonEndDate} = product;

		if (seasonStartDate! < currentDate && currentDate < seasonEndDate! && product.available > 0) {
			return {type: 'decrement'};
		}

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
