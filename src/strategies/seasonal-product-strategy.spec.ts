import {describe, it, expect} from 'vitest';
import {SeasonalProductStrategy} from './seasonal-product-strategy.js';
import {PRODUCT_TYPES, DAY_IN_MS} from '@/constants/inventory.js';
import {type Product} from '@/db/schema.js';

const NOW = new Date('2025-06-15T12:00:00.000Z');

function day(days: number): Date {
	return new Date(NOW.getTime() + (days * DAY_IN_MS));
}

describe('SeasonalProductStrategy', () => {
	const strategy = new SeasonalProductStrategy();

	function seasonalProduct(overrides: Partial<Product> = {}): Product {
		return {
			id: 1,
			name: 'Watermelon',
			type: PRODUCT_TYPES.SEASONAL,
			available: 0,
			leadTime: 15,
			expiryDate: null,
			seasonStartDate: null,
			seasonEndDate: null,
			...overrides,
		};
	}

	it('decrements when the product is in season and available', () => {
		const product = seasonalProduct({
			available: 5,
			seasonStartDate: day(-10),
			seasonEndDate: day(10),
		});

		expect(strategy.evaluate(product, NOW)).toEqual({type: 'decrement'});
	});

	it('does not sell exactly on the season start date', () => {
		const product = seasonalProduct({
			available: 5,
			leadTime: 15,
			seasonStartDate: NOW,
			seasonEndDate: day(30),
		});

		expect(strategy.evaluate(product, NOW)).toEqual({type: 'delay'});
	});

	it('marks the product unavailable exactly on the season end date', () => {
		const product = seasonalProduct({
			available: 5,
			leadTime: 15,
			seasonStartDate: day(-30),
			seasonEndDate: NOW,
		});

		expect(strategy.evaluate(product, NOW)).toEqual({type: 'unavailable'});
	});

	it('marks the product unavailable when delivery extends past the season end', () => {
		const product = seasonalProduct({
			available: 0,
			leadTime: 15,
			seasonStartDate: day(-2),
			seasonEndDate: day(2),
		});

		expect(strategy.evaluate(product, NOW)).toEqual({type: 'unavailable'});
	});

	it('notifies the delivery timeframe when delivery fits within the season', () => {
		const product = seasonalProduct({
			available: 0,
			leadTime: 20,
			seasonStartDate: day(-2),
			seasonEndDate: day(58),
		});

		expect(strategy.evaluate(product, NOW)).toEqual({type: 'delay'});
	});

	it('notifies out-of-stock when the season has not started yet', () => {
		const product = seasonalProduct({
			available: 0,
			seasonStartDate: day(10),
			seasonEndDate: day(60),
		});

		expect(strategy.evaluate(product, NOW)).toEqual({type: 'out-of-stock'});
	});
});
