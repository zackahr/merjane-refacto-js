import {NormalProductStrategy} from './normal-product-strategy.js';
import {SeasonalProductStrategy} from './seasonal-product-strategy.js';
import {ExpirableProductStrategy} from './expirable-product-strategy.js';
import {PRODUCT_TYPES} from '@/constants/inventory.js';
import {type Product} from '@/db/schema.js';

/**
 * Outcome of a strategy evaluation. The strategy only *decides* what should happen; the
 * `ProductService` owns the actual persistence and notification side effects.
 */
export type StrategyAction =
	// Sell the product: decrement `available` by 1 and persist.
	| {type: 'decrement'}
	// Out of stock: notify a restocking delay; persist. Stock level is unchanged.
	| {type: 'delay'}
	// Not sellable (e.g. season not started): notify out-of-stock; persist. Stock level is unchanged.
	| {type: 'out-of-stock'}
	// Not sellable: zero the stock and notify out-of-stock (SEASONAL delivery past season end).
	| {type: 'unavailable'}
	// Expired: zero the stock and notify expiration (EXPIRABLE past its expiry date).
	| {type: 'expired'}
	// Do nothing (e.g. NORMAL out of stock with no lead time).
	| {type: 'none'};

export type ProductStrategy = {
	evaluate(product: Product, currentDate: Date): StrategyAction;
};

export function createProductStrategy(type: Product['type']): ProductStrategy {
	switch (type) {
		case PRODUCT_TYPES.NORMAL: {
			return new NormalProductStrategy();
		}

		case PRODUCT_TYPES.SEASONAL: {
			return new SeasonalProductStrategy();
		}

		case PRODUCT_TYPES.EXPIRABLE: {
			return new ExpirableProductStrategy();
		}
	}
}
