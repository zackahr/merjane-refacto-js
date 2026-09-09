import {eq} from 'drizzle-orm';
import {products, type Product} from '@/db/schema.js';
import {type Database} from '@/db/type.js';

export class ProductRepository {
	private readonly database: Database;

	public constructor({database}: {database: Database}) {
		this.database = database;
	}

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
