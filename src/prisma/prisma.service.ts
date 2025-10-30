import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private heartbeat?: NodeJS.Timeout;
  private connected = false;

  constructor() {
    super({
      // log: ['query', 'info', 'warn', 'error'],
    });
  }

  async onModuleInit() {
    console.log('PrismaService initialized');
    await this.connectWithRetry();
    // Start a lightweight heartbeat to detect drops early and auto-reconnect
    this.startHeartbeat(30_000);

    // Ensure graceful exit
    // Note: If you need explicit shutdown handling, rely on Nest lifecycle hooks
    // or process.on('beforeExit') here instead of Prisma $on typing.
  }

  async onModuleDestroy() {
    if (this.heartbeat) clearInterval(this.heartbeat);
    await this.$disconnect();
  }

  // Expose last-known DB connectivity
  get isConnected(): boolean {
    return this.connected;
  }

  private async connectWithRetry(maxRetries = 5, baseDelayMs = 1000) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await this.$connect();
        this.connected = true;
        console.log(`Prisma connected (attempt ${attempt})`);
        return;
      } catch (e: any) {
        this.connected = false;
        const delay = baseDelayMs * Math.pow(2, attempt - 1);
        const msg = e?.code || e?.message || String(e);
        console.error(
          `Prisma connect failed (attempt ${attempt}/${maxRetries}): ${msg}`,
        );
        if (attempt === maxRetries) throw e;
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }

  private startHeartbeat(intervalMs: number) {
    this.heartbeat = setInterval(async () => {
      try {
        // Tiny ping that works through PgBouncer
        await this.$queryRaw`SELECT 1`;
        this.connected = true;
      } catch (e: any) {
        this.connected = false;
        const msg = e?.code || e?.message || String(e);
        console.warn(
          `Prisma heartbeat failed, attempting reconnect... (${msg})`,
        );
        try {
          await this.$disconnect();
          await this.$connect();
          this.connected = true;
          console.log('Prisma reconnected after heartbeat failure');
        } catch (re: any) {
          this.connected = false;
          const rmsg = re?.code || re?.message || String(re);
          console.error(`Prisma reconnection failed: ${rmsg}`);
        }
      }
    }, intervalMs);
  }
}
