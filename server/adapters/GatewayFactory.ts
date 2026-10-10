import { GatewayAccount } from '../types.js';
import { PaymentGatewayInterface } from '../contracts/PaymentGatewayInterface.js';
import { EaglePayAdapter } from './EaglePayAdapter.js';
import { MockGatewayAdapter } from './MockGatewayAdapter.js';

export class GatewayFactory {
  private static registry = new Map<string, () => PaymentGatewayInterface>();

  static {
    // Register default built-in adapters
    this.register('eaglepay', () => new EaglePayAdapter());
    this.register('mock', () => new MockGatewayAdapter());
  }

  /**
   * Register a new gateway adapter dynamically
   */
  public static register(id: string, factory: () => PaymentGatewayInterface): void {
    this.registry.set(id.toLowerCase(), factory);
  }

  /**
   * Resolve an initialized gateway adapter for a specific GatewayAccount
   */
  public static create(account: GatewayAccount): PaymentGatewayInterface {
    const adapterKey = account.adapter.toLowerCase();
    const factory = this.registry.get(adapterKey);

    if (!factory) {
      throw new Error(`Unsupported gateway adapter "${account.adapter}". Registered: ${Array.from(this.registry.keys()).join(', ')}`);
    }

    const adapter = factory();
    adapter.configure(account);
    return adapter;
  }

  /**
   * List all registered adapters
   */
  public static getRegisteredAdapters(): string[] {
    return Array.from(this.registry.keys());
  }
}
