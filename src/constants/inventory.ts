export const PRODUCT_TYPES = {
	NORMAL: 'NORMAL',
	SEASONAL: 'SEASONAL',
	EXPIRABLE: 'EXPIRABLE',
} as const;

export type ProductType = (typeof PRODUCT_TYPES)[keyof typeof PRODUCT_TYPES];

export const DAY_IN_MS = 24 * 60 * 60 * 1000;
