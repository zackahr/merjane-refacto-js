import {
	describe, it, expect, beforeEach,
	afterEach, vi,
} from 'vitest';
import {type FastifyInstance} from 'fastify';
import supertest from 'supertest';
import {eq} from 'drizzle-orm';
import {type DeepMockProxy, mockDeep} from 'vitest-mock-extended';
import {asValue} from 'awilix';
import {type INotificationService} from '@/services/notifications.port.js';
import {
	type ProductInsert,
	products,
	orders,
	ordersToProducts,
	type Product,
} from '@/db/schema.js';
import {type Database} from '@/db/type.js';
import {buildFastify} from '@/fastify.js';

const DAY = 24 * 60 * 60 * 1000;
const NOW = new Date('2025-06-15T12:00:00.000Z');

function daysFromNow(days: number): Date {
	return new Date(NOW.getTime() + (days * DAY));
}

describe('MyController Integration Tests', () => {
	let fastify: FastifyInstance;
	let database: Database;
	let notificationServiceMock: DeepMockProxy<INotificationService>;

	beforeEach(async () => {
		vi.useFakeTimers();
		vi.setSystemTime(NOW);

		notificationServiceMock = mockDeep<INotificationService>();

		fastify = await buildFastify();
		fastify.diContainer.register({
			ns: asValue(notificationServiceMock as INotificationService),
		});
		await fastify.ready();
		database = fastify.database;
	});
	afterEach(async () => {
		await fastify.close();
		vi.useRealTimers();
	});

	it('DEFAULT ProcessOrderShouldReturn', async () => {
		const allProducts = createProducts();
		const orderId = await insertOrderWithProducts(allProducts);

		await postOrder(orderId).expect(200).expect('Content-Type', /application\/json/);

		const resultOrder = await database.query.orders.findFirst({where: eq(orders.id, orderId)});
		expect(resultOrder!.id).toBe(orderId);
	});

	describe('NORMAL', () => {
		it('decrements stock when available', async () => {
			// GIVEN
			const product = normalProduct({name: 'USB Cable', available: 30, leadTime: 15});
			const orderId = await insertOrderWithProducts([product]);

			// WHEN
			await postOrder(orderId);

			// THEN
			const stored = await getProduct(product.id!);
			expect(stored!.available).toBe(29);
			expect(notificationServiceMock.sendDelayNotification).not.toHaveBeenCalled();
			expect(notificationServiceMock.sendOutOfStockNotification).not.toHaveBeenCalled();
		});

		it('notifies a restocking delay when out of stock', async () => {
			// GIVEN
			const product = normalProduct({name: 'USB Dongle', available: 0, leadTime: 10});
			const orderId = await insertOrderWithProducts([product]);

			// WHEN
			await postOrder(orderId);

			// THEN
			expect(notificationServiceMock.sendDelayNotification).toHaveBeenCalledWith(10, 'USB Dongle');
			expect(notificationServiceMock.sendOutOfStockNotification).not.toHaveBeenCalled();
			const stored = await getProduct(product.id!);
			expect(stored!.available).toBe(0);
		});
	});

	describe('SEASONAL', () => {
		it('decrements stock when in season and available', async () => {
			// GIVEN
			const product = seasonalProduct({
				name: 'Watermelon',
				available: 30,
				leadTime: 15,
				seasonStart: daysFromNow(-20),
				seasonEnd: daysFromNow(58),
			});
			const orderId = await insertOrderWithProducts([product]);

			// WHEN
			await postOrder(orderId);

			// THEN
			const stored = await getProduct(product.id!);
			expect(stored!.available).toBe(29);
			expect(notificationServiceMock.sendDelayNotification).not.toHaveBeenCalled();
			expect(notificationServiceMock.sendOutOfStockNotification).not.toHaveBeenCalled();
		});

		it('notifies the delivery timeframe when out of stock but delivery fits within the season', async () => {
			// GIVEN
			const product = seasonalProduct({
				name: 'Watermelon',
				available: 0,
				leadTime: 20,
				seasonStart: daysFromNow(-2),
				seasonEnd: daysFromNow(58),
			});
			const orderId = await insertOrderWithProducts([product]);

			// WHEN
			await postOrder(orderId);

			// THEN
			expect(notificationServiceMock.sendDelayNotification).toHaveBeenCalledWith(20, 'Watermelon');
			expect(notificationServiceMock.sendOutOfStockNotification).not.toHaveBeenCalled();
			const stored = await getProduct(product.id!);
			expect(stored!.available).toBe(0);
		});

		it('marks the product UNAVAILABLE when the delivery timeframe extends beyond the season end', async () => {
			// GIVEN
			const product = seasonalProduct({
				name: 'Grapes',
				available: 0,
				leadTime: 90,
				seasonStart: daysFromNow(-2),
				seasonEnd: daysFromNow(30),
			});
			const orderId = await insertOrderWithProducts([product]);

			// WHEN
			await postOrder(orderId);

			// THEN
			expect(notificationServiceMock.sendOutOfStockNotification).toHaveBeenCalledWith('Grapes');
			expect(notificationServiceMock.sendDelayNotification).not.toHaveBeenCalled();
			const stored = await getProduct(product.id!);
			expect(stored!.available).toBe(0);
		});

		it('notifies out-of-stock when the season has not started yet', async () => {
			// GIVEN
			const product = seasonalProduct({
				name: 'Grapes',
				available: 30,
				leadTime: 15,
				seasonStart: daysFromNow(10),
				seasonEnd: daysFromNow(60),
			});
			const orderId = await insertOrderWithProducts([product]);

			// WHEN
			await postOrder(orderId);

			// THEN
			expect(notificationServiceMock.sendOutOfStockNotification).toHaveBeenCalledWith('Grapes');
			expect(notificationServiceMock.sendDelayNotification).not.toHaveBeenCalled();
			const stored = await getProduct(product.id!);
			expect(stored!.available).toBe(30);
		});
	});

	describe('EXPIRABLE', () => {
		it('decrements stock when not expired', async () => {
			// GIVEN
			const product = expirableProduct({
				name: 'Butter',
				available: 30,
				leadTime: 15,
				expiryDate: daysFromNow(26),
			});
			const orderId = await insertOrderWithProducts([product]);

			// WHEN
			await postOrder(orderId);

			// THEN
			const stored = await getProduct(product.id!);
			expect(stored!.available).toBe(29);
			expect(notificationServiceMock.sendExpirationNotification).not.toHaveBeenCalled();
		});

		it('marks the product UNAVAILABLE once expired', async () => {
			// GIVEN
			const product = expirableProduct({
				name: 'Milk',
				available: 6,
				leadTime: 90,
				expiryDate: daysFromNow(-2),
			});
			const orderId = await insertOrderWithProducts([product]);

			// WHEN
			await postOrder(orderId);

			// THEN
			expect(notificationServiceMock.sendExpirationNotification).toHaveBeenCalledWith('Milk', product.expiryDate);
			const stored = await getProduct(product.id!);
			expect(stored!.available).toBe(0);
		});
	});

	async function insertOrderWithProducts(allProducts: ProductInsert[]): Promise<number> {
		const orderId = database.transaction(tx => {
			const productList = tx.insert(products).values(allProducts).returning({productId: products.id}).all();
			const order = tx.insert(orders).values([{}]).returning({orderId: orders.id}).get();
			tx.insert(ordersToProducts).values(productList.map(p => ({orderId: order.orderId, productId: p.productId}))).run();
			return order.orderId;
		});
		// `database` inserts with auto-increment; re-read to hydrate the `id` on each product for later assertions.
		const storedProducts = await Promise.all(allProducts.map(p => (
			database.query.products.findFirst({
				where: eq(products.name, p.name),
			})
		)));
		for (const [index, product] of allProducts.entries()) {
			product.id = storedProducts[index]!.id;
		}

		return orderId;
	}

	function postOrder(orderId: number) {
		return supertest(fastify.server).post(`/orders/${orderId}/processOrder`).expect(200);
	}

	async function getProduct(id: number): Promise<Product | undefined> {
		return database.query.products.findFirst({where: eq(products.id, id)});
	}

	function normalProduct({name, available, leadTime}: {name: string; available: number; leadTime: number}): ProductInsert {
		return {
			name, available, leadTime, type: 'NORMAL',
		};
	}

	function seasonalProduct({name, available, leadTime, seasonStart, seasonEnd}: {name: string; available: number; leadTime: number; seasonStart: Date; seasonEnd: Date}): ProductInsert {
		return {
			name, available, leadTime, type: 'SEASONAL', seasonStartDate: seasonStart, seasonEndDate: seasonEnd,
		};
	}

	function expirableProduct({name, available, leadTime, expiryDate}: {name: string; available: number; leadTime: number; expiryDate: Date}): ProductInsert {
		return {
			name, available, leadTime, type: 'EXPIRABLE', expiryDate,
		};
	}

	function createProducts(): ProductInsert[] {
		return [
			normalProduct({name: 'USB Cable', available: 30, leadTime: 15}),
			normalProduct({name: 'USB Dongle', available: 0, leadTime: 10}),
			expirableProduct({
				name: 'Butter',
				available: 30,
				leadTime: 15,
				expiryDate: daysFromNow(26),
			}),
			expirableProduct({
				name: 'Milk',
				available: 6,
				leadTime: 90,
				expiryDate: daysFromNow(-2),
			}),
			seasonalProduct({
				name: 'Watermelon',
				available: 30,
				leadTime: 15,
				seasonStart: daysFromNow(-2),
				seasonEnd: daysFromNow(58),
			}),
			seasonalProduct({
				name: 'Grapes',
				available: 30,
				leadTime: 15,
				seasonStart: daysFromNow(180),
				seasonEnd: daysFromNow(240),
			}),
		];
	}
});
