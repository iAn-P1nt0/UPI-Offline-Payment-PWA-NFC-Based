# IndexedDB Guide - UPI Offline Payment PWA

## Overview

This document explains how IndexedDB is used in the UPI Offline Payment PWA for offline-first functionality using Dexie.js.

---

## Architecture

### Database Schema

The app uses a single IndexedDB database named `UPIOfflineDB` with 7 tables:

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `transactions` | Local transaction queue | `id`, `needs_sync`, `status` |
| `merchants` | Cached merchants | `id`, `merchant_code`, `upi_id` |
| `walletState` | Cached wallet information | `id`, `user_id`, `upi_id` |
| `syncQueue` | Operations to sync | `id`, `is_processed`, `priority` |
| `dailyStats` | Daily transaction limits | `wallet_id`, `date` |
| `deviceInfo` | Device information | `id`, `device_fingerprint` |
| `settings` | App settings | `key` (KV store) |

---

## Getting Started

### Initialize Database

```typescript
import { initializeDB } from "@/lib/db";

// In your app initialization (layout.tsx or _app.tsx)
useEffect(() => {
  initializeDB().then((success) => {
    if (success) {
      console.log("IndexedDB ready");
    }
  });
}, []);
```

---

## Usage Examples

### 1. Creating an Offline Transaction

```typescript
import { createOfflineTransaction, currency } from "@/lib/db";

// Create offline payment
const result = await createOfflineTransaction({
  senderWalletId: "wallet-id",
  receiverWalletId: "merchant-wallet-id",
  merchantId: "merchant-id",
  amountPaise: currency.toPaise(500), // ₹500
  description: "Coffee at StarBucks",
  transactionType: "payment",
  paymentMethod: "nfc",
  nfcTagId: "tag-123",
  deviceId: "device-id",
});

if (result.success) {
  console.log("Transaction created:", result.transaction);
} else {
  console.error("Failed:", result.error);
}
```

### 2. Syncing Merchants

```typescript
import { syncMerchantsFromServer, createClient } from "@/lib/db";

// When online, sync merchants for offline use
const supabase = createClient();
const result = await syncMerchantsFromServer(supabase, {
  forceRefresh: false, // Only sync if needed
  limit: 100,
});

console.log(`Synced ${result.count} merchants`);
```

### 3. Searching Cached Merchants

```typescript
import { searchCachedMerchants, getCachedMerchantByCode } from "@/lib/db";

// Search by name/category
const results = await searchCachedMerchants("starbucks");

// Get by merchant code (from NFC tag)
const merchant = await getCachedMerchantByCode("STARBUCKS001");
```

### 4. Managing Wallet State

```typescript
import {
  syncWalletStateFromServer,
  getCachedWalletState,
  getWalletSyncStatus
} from "@/lib/db";

// Sync wallet from server
const supabase = createClient();
await syncWalletStateFromServer(supabase, userId);

// Get cached wallet
const wallet = await getCachedWalletState(walletId);
console.log(`Balance: ₹${wallet.offline_balance_paise / 100}`);

// Check sync status
const status = await getWalletSyncStatus(walletId);
if (status.needsSync) {
  console.log(`${status.pendingCount} transactions pending sync`);
}
```

### 5. Getting Pending Transactions

```typescript
import { getPendingTransactions, getTransactionStats } from "@/lib/db";

// Get all pending transactions
const pending = await getPendingTransactions(walletId);
console.log(`${pending.length} transactions need sync`);

// Get statistics
const stats = await getTransactionStats(walletId);
console.log(`Today: ${stats.today} transactions, ₹${stats.todayAmount / 100}`);
```

### 6. Offline Status Monitoring

```typescript
import { getOfflineStatus, needsCriticalSync } from "@/lib/db";

// Get overall offline status
const status = await getOfflineStatus();
console.log(`Offline: ${status.isOffline}`);
console.log(`Pending: ${status.pendingTransactions} transactions`);

// Check if critical sync needed
if (await needsCriticalSync()) {
  alert("Please sync your wallet");
}
```

### 7. Network Event Handling

```typescript
import { setupNetworkListeners, isOnline } from "@/lib/db";

// Setup listeners
useEffect(() => {
  const cleanup = setupNetworkListeners({
    onOnline: async () => {
      console.log("Back online - triggering sync");
      // Trigger sync logic
    },
    onOffline: () => {
      console.log("Gone offline");
    },
  });

  return cleanup;
}, []);

// Check current status
if (isOnline()) {
  // Sync data
}
```

### 8. Device Capabilities Check

```typescript
import { checkDeviceCapabilities } from "@/lib/db";

const capabilities = await checkDeviceCapabilities();

if (!capabilities.nfc) {
  // Show QR code option instead
}

if (capabilities.biometric) {
  // Enable fingerprint/face auth
}
```

### 9. Storage Management

```typescript
import { getStorageInfo, formatBytes } from "@/lib/db";

const storage = await getStorageInfo();
console.log(`Used: ${formatBytes(storage.used)}`);
console.log(`Available: ${formatBytes(storage.available)}`);
console.log(`Percentage: ${storage.percentage.toFixed(2)}%`);

if (storage.percentage > 90) {
  // Cleanup old data
  await cleanupOldTransactions(30); // Keep last 30 days
  await cleanupOldMerchants(60); // Keep last 60 days
}
```

### 10. Nearby Merchants

```typescript
import { getNearbyMerchants } from "@/lib/db";

// Get user location
navigator.geolocation.getCurrentPosition(async (position) => {
  const nearby = await getNearbyMerchants(
    position.coords.latitude,
    position.coords.longitude,
    5 // 5km radius
  );

  console.log(`Found ${nearby.length} merchants nearby`);
  nearby.forEach((m) => {
    console.log(`${m.display_name} - ${m.distance.toFixed(2)}km away`);
  });
});
```

---

## NPCI Compliance Checks

The IndexedDB layer enforces NPCI UPI Lite limits:

```typescript
// Automatic validation when creating transactions
const result = await createOfflineTransaction({
  // ... params
  amountPaise: 150000, // ₹1,500
});

// Will fail with: "Amount exceeds NPCI limit of ₹1,000"
```

**Enforced Limits:**
- ✅ Max ₹1,000 per transaction
- ✅ Max ₹5,000 wallet balance
- ✅ Max 20 daily transactions
- ✅ Max 5 offline transactions before sync
- ✅ 4-day sync deadline

---

## Data Flow

### Offline Transaction Flow

```
1. User initiates payment (offline)
   ↓
2. createOfflineTransaction() validates limits
   ↓
3. Store in IndexedDB transactions table
   ↓
4. Update offline balance
   ↓
5. Set needs_sync = true
   ↓
6. When online, sync to Supabase
   ↓
7. Mark as synced
   ↓
8. Update wallet balance from server
```

### Merchant Caching Flow

```
1. When online, fetch from Supabase
   ↓
2. Store in IndexedDB merchants table
   ↓
3. When offline, use cached data
   ↓
4. Track usage (last_used_at, usage_count)
   ↓
5. Periodically refresh when online
```

---

## Error Handling

```typescript
try {
  const result = await createOfflineTransaction(params);

  if (!result.success) {
    // Handle business logic errors
    switch (result.error) {
      case "Insufficient balance":
        showError("Not enough funds");
        break;
      case "Offline transaction limit exceeded":
        showError("Please sync your wallet");
        break;
      default:
        showError(result.error);
    }
  }
} catch (error) {
  // Handle technical errors
  console.error("Database error:", error);
  showError("Something went wrong");
}
```

---

## Performance Tips

### 1. Use Indexes Efficiently

```typescript
// Good - uses index
const merchants = await db.merchants
  .where("category")
  .equals("Cafe & Restaurant")
  .toArray();

// Bad - full table scan
const merchants = await db.merchants
  .filter((m) => m.category === "Cafe & Restaurant")
  .toArray();
```

### 2. Batch Operations

```typescript
// Good - single transaction
await db.transaction("rw", [db.transactions, db.walletState], async () => {
  await db.transactions.add(transaction);
  await db.walletState.update(walletId, { balance });
});

// Bad - multiple transactions
await db.transactions.add(transaction);
await db.walletState.update(walletId, { balance });
```

### 3. Limit Results

```typescript
// Good - limit results
const recent = await db.transactions
  .orderBy("created_at")
  .reverse()
  .limit(20)
  .toArray();

// Bad - load everything
const all = await db.transactions.toArray();
const recent = all.slice(0, 20);
```

---

## Cleanup and Maintenance

```typescript
import {
  cleanupOldTransactions,
  cleanupOldMerchants,
  getDatabaseSize,
} from "@/lib/db";

// Regular cleanup (run monthly or based on storage)
async function performMaintenance() {
  const size = await getDatabaseSize();
  console.log(`Total records: ${size.total}`);

  // Cleanup old completed transactions (keep 90 days)
  const txnDeleted = await cleanupOldTransactions(90);
  console.log(`Deleted ${txnDeleted} old transactions`);

  // Cleanup unused merchants (keep 90 days)
  const merchantsDeleted = await cleanupOldMerchants(90);
  console.log(`Deleted ${merchantsDeleted} unused merchants`);
}
```

---

## Backup and Restore

```typescript
import { exportDatabase, importDatabase } from "@/lib/db";

// Export
const backup = await exportDatabase();
if (backup) {
  // Save to file or cloud storage
  downloadFile("wallet-backup.json", backup);
}

// Import
const success = await importDatabase(backupData);
if (success) {
  console.log("Backup restored");
}
```

---

## Debug and Health Checks

```typescript
import { checkDatabaseHealth, getDatabaseSize } from "@/lib/db";

// Health check
const health = await checkDatabaseHealth();
if (!health.healthy) {
  console.error("Database issues:", health.errors);
}

// Size check
const size = await getDatabaseSize();
console.log("Database size:", size);
/*
{
  transactions: 150,
  merchants: 25,
  walletState: 1,
  syncQueue: 3,
  dailyStats: 7,
  total: 186
}
*/
```

---

## Best Practices

### 1. Initialize Early
Initialize IndexedDB as early as possible in your app lifecycle.

### 2. Handle Offline First
Always check IndexedDB first, then fall back to network.

### 3. Sync Regularly
Sync wallet state and merchants when online.

### 4. Monitor Storage
Check storage quota and cleanup old data.

### 5. Handle Errors Gracefully
Always provide user-friendly error messages.

### 6. Test Offline Scenarios
Test all flows in offline mode.

### 7. Use Transactions
Use Dexie transactions for related operations.

---

## Common Patterns

### Pattern: Optimistic Updates

```typescript
// Update UI immediately
setBalance(balance - amount);

// Create transaction in background
createOfflineTransaction(params).then((result) => {
  if (!result.success) {
    // Rollback UI
    setBalance(balance);
    showError(result.error);
  }
});
```

### Pattern: Progressive Enhancement

```typescript
// Try online first
let merchants = [];
if (isOnline()) {
  merchants = await fetchFromServer();
} else {
  // Fall back to cache
  merchants = await getAllCachedMerchants();
}
```

### Pattern: Background Sync

```typescript
// Register sync event (in service worker)
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-transactions") {
    event.waitUntil(syncPendingTransactions());
  }
});
```

---

## Troubleshooting

### Issue: Database not initialized
**Solution:** Call `initializeDB()` on app start

### Issue: Quota exceeded
**Solution:** Run cleanup functions or request persistent storage

### Issue: Data not syncing
**Solution:** Check `needs_sync` flag and network status

### Issue: Stale data
**Solution:** Force refresh from server periodically

---

## API Reference

See type definitions in:
- `src/lib/db/dexie-client.ts` - Database schema
- `src/lib/db/transaction-queue.ts` - Transaction operations
- `src/lib/db/merchant-cache.ts` - Merchant operations
- `src/lib/db/wallet-state.ts` - Wallet operations
- `src/lib/db/offline-helpers.ts` - Utility functions
- `src/lib/db/index.ts` - All exports

---

**IndexedDB provides the offline-first foundation for the UPI Offline Payment PWA!**
