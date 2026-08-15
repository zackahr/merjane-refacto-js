import {NormalProductStrategy} from './normal-product-strategy.js';
import {SeasonalProductStrategy} from './seasonal-product-strategy.js';
import {ExpirableProductStrategy} from './expirable-product-strategy.js';
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
		case 'NORMAL': {
			return new NormalProductStrategy();
		}

		case 'SEASONAL': {
			return new SeasonalProductStrategy();
		}

		case 'EXPIRABLE': {
			return new ExpirableProductStrategy();
		}

		default: {
			throw new Error(`Unsupported product type: ${type}`);
		}
	}
}
