/*
  Warnings:

  - A unique constraint covering the columns `[shopQueueId]` on the table `Visit` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateEnum
CREATE TYPE "QueueState" AS ENUM ('in_queue', 'picked', 'served');

-- AlterTable
ALTER TABLE "Visit" ADD COLUMN     "shopQueueId" TEXT;

-- CreateTable
CREATE TABLE "ShopQueue" (
    "id" TEXT NOT NULL,
    "barberShopId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "state" "QueueState" NOT NULL DEFAULT 'in_queue',
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "servedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'active',

    CONSTRAINT "ShopQueue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ShopQueue_barberShopId_state_idx" ON "ShopQueue"("barberShopId", "state");

-- CreateIndex
CREATE UNIQUE INDEX "Visit_shopQueueId_key" ON "Visit"("shopQueueId");

-- AddForeignKey
ALTER TABLE "Visit" ADD CONSTRAINT "Visit_shopQueueId_fkey" FOREIGN KEY ("shopQueueId") REFERENCES "ShopQueue"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShopQueue" ADD CONSTRAINT "ShopQueue_barberShopId_fkey" FOREIGN KEY ("barberShopId") REFERENCES "BarberShop"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
