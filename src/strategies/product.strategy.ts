import {NormalProductStrategy} from './normal-product-strategy.js';
import {SeasonalProductStrategy} from './seasonal-product-strategy.js';
import {ExpirableProductStrategy} from './expirable-product-strategy.js';
import {PRODUCT_TYPES} from '@/constants/inventory.js';
import {type Product} from '@/db/schema.js';

export type StrategyAction =
	| {type: 'decrement'}
	| {type: 'delay'}
	| {type: 'out-of-stock'}
	| {type: 'unavailable'}
	| {type: 'expired'}
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
