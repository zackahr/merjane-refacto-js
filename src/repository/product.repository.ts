import {eq} from 'drizzle-orm';
import {BaseRepository} from './base.repository.js';
import {products, type Product} from '@/db/schema.js';

export class ProductRepository extends BaseRepository {
	public async findById(id: number): Promise<Product | undefined> {
		return this.database.query.products.findFirst({where: eq(products.id, id)});
	}

	public async findByName(name: string): Promise<Product | undefined> {
		return this.database.query.products.findFirst({where: eq(products.name, name)});
	}

	public async persist(product: Product): Promise<void> {
		await this.database.update(products).set(product).where(eq(products.id, product.id));
	}
}
