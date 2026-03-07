-- CreateEnum
CREATE TYPE "FriendRequestStatus" AS ENUM ('PENDING', 'ACCEPTED', 'DECLINED');

-- CreateTable
CREATE TABLE "FriendRequest" (
    "id" TEXT NOT NULL,
    "requester_id" TEXT NOT NULL,
    "requested_id" TEXT NOT NULL,
    "status" "FriendRequestStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "FriendRequest_id_key" ON "FriendRequest"("id");

-- CreateIndex
CREATE INDEX "FriendRequest_requester_id_idx" ON "FriendRequest"("requester_id");

-- CreateIndex
CREATE INDEX "FriendRequest_requested_id_idx" ON "FriendRequest"("requested_id");

-- CreateIndex
CREATE UNIQUE INDEX "FriendRequest_requester_id_requested_id_key" ON "FriendRequest"("requester_id", "requested_id");

-- AddForeignKey
ALTER TABLE "FriendRequest" ADD CONSTRAINT "FriendRequest_requester_id_fkey" FOREIGN KEY ("requester_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FriendRequest" ADD CONSTRAINT "FriendRequest_requested_id_fkey" FOREIGN KEY ("requested_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
