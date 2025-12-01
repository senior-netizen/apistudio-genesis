-- CreateTable
CREATE TABLE "HubSubscription" (
    "id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "workspace_id" TEXT,
    "plan" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "stripe_customer_id" TEXT,
    "stripe_subscription_id" TEXT,
    "stripe_checkout_session_id" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HubSubscription_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BillingInvoice" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "workspace_id" TEXT,
    "stripe_invoice_id" TEXT NOT NULL,
    "stripe_customer_id" TEXT NOT NULL,
    "stripe_subscription_id" TEXT,
    "amount_due" INTEGER NOT NULL,
    "amount_paid" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL,
    "paid_at" TIMESTAMP(3),
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BillingInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CreditsTransaction" (
    "id" TEXT NOT NULL,
    "user_id" TEXT,
    "workspace_id" TEXT,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'usd',
    "reason" TEXT NOT NULL,
    "stripe_invoice_id" TEXT,
    "stripe_balance_transaction_id" TEXT,
    "metadata" JSONB,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CreditsTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HubSubscription_user_id_key" ON "HubSubscription"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "HubSubscription_stripe_subscription_id_key" ON "HubSubscription"("stripe_subscription_id");

-- CreateIndex
CREATE INDEX "HubSubscription_workspace_id_idx" ON "HubSubscription"("workspace_id");

-- CreateIndex
CREATE UNIQUE INDEX "BillingInvoice_stripe_invoice_id_key" ON "BillingInvoice"("stripe_invoice_id");

-- CreateIndex
CREATE INDEX "BillingInvoice_workspace_id_idx" ON "BillingInvoice"("workspace_id");

-- CreateIndex
CREATE INDEX "BillingInvoice_user_id_idx" ON "BillingInvoice"("user_id");

-- CreateIndex
CREATE INDEX "CreditsTransaction_workspace_id_recorded_at_idx" ON "CreditsTransaction"("workspace_id", "recorded_at");

-- CreateIndex
CREATE INDEX "CreditsTransaction_user_id_recorded_at_idx" ON "CreditsTransaction"("user_id", "recorded_at");

-- AddForeignKey
ALTER TABLE "HubSubscription" ADD CONSTRAINT "HubSubscription_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HubSubscription" ADD CONSTRAINT "HubSubscription_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingInvoice" ADD CONSTRAINT "BillingInvoice_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BillingInvoice" ADD CONSTRAINT "BillingInvoice_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditsTransaction" ADD CONSTRAINT "CreditsTransaction_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CreditsTransaction" ADD CONSTRAINT "CreditsTransaction_workspace_id_fkey" FOREIGN KEY ("workspace_id") REFERENCES "Workspace"("id") ON DELETE SET NULL ON UPDATE CASCADE;
