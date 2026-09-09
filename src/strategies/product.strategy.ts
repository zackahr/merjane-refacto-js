import {NormalProductStrategy} from './normal-product-strategy.js';
import {SeasonalProductStrategy} from './seasonal-product-strategy.js';
import {ExpirableProductStrategy} from './expirable-product-strategy.js';
import {PRODUCT_TYPES, type ProductType, type StrategyActionType} from '@/constants/inventory.js';
import {type Product} from '@/db/schema.js';

/**
 * Outcome of a strategy evaluation. The strategy only *decides* what should happen; the
 * `ProductService` owns the actual persistence and notification side effects.
 *
 * The action namespace is intentionally open: behavior is registered per action in
 * `ACTION_HANDLERS`, so new actions do not require changing this contract.
 */
export type StrategyAction = {
	type: StrategyActionType;
};

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
