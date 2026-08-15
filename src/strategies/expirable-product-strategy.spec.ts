import {describe, it, expect} from 'vitest';
import {ExpirableProductStrategy} from './expirable-product-strategy.js';
import {PRODUCT_TYPES, DAY_IN_MS} from '@/constants/inventory.js';
import {type Product} from '@/db/schema.js';

const NOW = new Date('2025-06-15T12:00:00.000Z');

function day(days: number): Date {
	return new Date(NOW.getTime() + (days * DAY_IN_MS));
}

describe('ExpirableProductStrategy', () => {
	const strategy = new ExpirableProductStrategy();

	function expirableProduct(overrides: Partial<Product> = {}): Product {
		return {
			id: 1,
			name: 'Butter',
			type: PRODUCT_TYPES.EXPIRABLE,
			available: 0,
			leadTime: 15,
			expiryDate: null,
			seasonStartDate: null,
			seasonEndDate: null,
			...overrides,
		};
	}

	it('decrements when the product is not yet expired', () => {
		const product = expirableProduct({
			available: 5,
			expiryDate: day(26),
		});

		expect(strategy.evaluate(product, NOW)).toEqual({type: 'decrement'});
	});

	it('decrements while in stock up to the last available day', () => {
		const product = expirableProduct({
			available: 5,
			expiryDate: day(1),
		});

		expect(strategy.evaluate(product, NOW)).toEqual({type: 'decrement'});
	});

	it('marks the product expired exactly on the expiry date', () => {
		const product = expirableProduct({
			available: 5,
			expiryDate: NOW,
		});

		expect(strategy.evaluate(product, NOW)).toEqual({type: 'expired'});
	});

	it('marks the product expired after the expiry date regardless of stock', () => {
		const product = expirableProduct({
			available: 50,
			expiryDate: day(-2),
		});

		expect(strategy.evaluate(product, NOW)).toEqual({type: 'expired'});
	});
});
