import {describe, it, expect} from 'vitest';
import {NormalProductStrategy} from './normal-product-strategy.js';
import {PRODUCT_TYPES} from '@/constants/inventory.js';
import {type Product} from '@/db/schema.js';

describe('NormalProductStrategy', () => {
	const strategy = new NormalProductStrategy();

	function normalProduct(overrides: Partial<Product> = {}): Product {
		return {
			id: 1,
			name: 'USB Cable',
			type: PRODUCT_TYPES.NORMAL,
			available: 0,
			leadTime: 15,
			expiryDate: null,
			seasonStartDate: null,
			seasonEndDate: null,
			...overrides,
		};
	}

	it('decrements when available', () => {
		const product = normalProduct({available: 5});

		expect(strategy.evaluate(product, new Date())).toEqual({type: 'decrement'});
	});

	it('notifies a delay when out of stock and a lead time is set', () => {
		const product = normalProduct({available: 0, leadTime: 10});

		expect(strategy.evaluate(product, new Date())).toEqual({type: 'delay'});
	});

	it('does nothing when out of stock and no lead time is set', () => {
		const product = normalProduct({available: 0, leadTime: 0});

		expect(strategy.evaluate(product, new Date())).toEqual({type: 'none'});
	});
});
