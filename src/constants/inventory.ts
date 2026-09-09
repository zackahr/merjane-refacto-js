export const PRODUCT_TYPES = {
	NORMAL: 'NORMAL',
	SEASONAL: 'SEASONAL',
	EXPIRABLE: 'EXPIRABLE',
} as const;

export type ProductType = (typeof PRODUCT_TYPES)[keyof typeof PRODUCT_TYPES];

export const DAY_IN_MS = 24 * 60 * 60 * 1000;

export const NOW = new Date('2025-06-15T12:00:00.000Z');

export const STRATEGY_ACTIONS = {
	DECREMENT: 'decrement',
	DELAY: 'delay',
	OUT_OF_STOCK: 'out-of-stock',
	OUT_OF_SEASON: 'out-of-season',
	EXPIRED: 'expired',
	NONE: 'none',
} as const;

export type StrategyActionType = (typeof STRATEGY_ACTIONS)[keyof typeof STRATEGY_ACTIONS];
