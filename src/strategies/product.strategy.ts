import {NormalProductStrategy} from './normal-product-strategy.js';
import {SeasonalProductStrategy} from './seasonal-product-strategy.js';
import {ExpirableProductStrategy} from './expirable-product-strategy.js';
import {PRODUCT_TYPES, type ProductType, type STRATEGY_ACTIONS} from '@/constants/inventory.js';
import {type Product} from '@/db/schema.js';

/**
 * Outcome of a strategy evaluation. The strategy only *decides* what should happen; the
 * `ProductService` owns the actual persistence and notification side effects.
 */
export type StrategyAction =
	// Sell the product: decrement `available` by 1 and persist.
	| {type: typeof STRATEGY_ACTIONS.DECREMENT}
	// Out of stock: notify a restocking delay; persist. Stock level is unchanged.
	| {type: typeof STRATEGY_ACTIONS.DELAY}
	// Not sellable (e.g. season not started): notify out-of-stock; persist. Stock level is unchanged.
	| {type: typeof STRATEGY_ACTIONS.OUT_OF_STOCK}
	// Out of season: zero the stock and notify out-of-stock (SEASONAL delivery past season end).
	| {type: typeof STRATEGY_ACTIONS.OUT_OF_SEASON}
	// Expired: zero the stock and notify expiration (EXPIRABLE past its expiry date).
	| {type: typeof STRATEGY_ACTIONS.EXPIRED}
	// Do nothing (e.g. NORMAL out of stock with no lead time).
	| {type: typeof STRATEGY_ACTIONS.NONE};

export type ProductStrategy = {
	evaluate(product: Product, currentDate: Date): StrategyAction;
};

const STRATEGIES: Record<ProductType, () => ProductStrategy> = {
	[PRODUCT_TYPES.NORMAL]: () => new NormalProductStrategy(),
	[PRODUCT_TYPES.SEASONAL]: () => new SeasonalProductStrategy(),
	[PRODUCT_TYPES.EXPIRABLE]: () => new ExpirableProductStrategy(),
};

export function createProductStrategy(type: Product['type']): ProductStrategy {
	return STRATEGIES[type]();
}
