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
	| {type: typeof STRATEGY_ACTIONS.DECREMENT}
	| {type: typeof STRATEGY_ACTIONS.DELAY}
	| {type: typeof STRATEGY_ACTIONS.OUT_OF_STOCK}
	// Zeroes the stock: a delivery past the season end means the product can never sell again.
	| {type: typeof STRATEGY_ACTIONS.OUT_OF_SEASON}
	// Zeroes the stock: an expired product can never sell again.
	| {type: typeof STRATEGY_ACTIONS.EXPIRED}
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
