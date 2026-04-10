const { getDb } = require('../server/db');
const { formatPhoneBR } = require('../server/utils/phone');

async function normalizePhones() {
  const db = await getDb();
  if (!db) {
    console.error('Database not available');
    return;
  }

  // Get all customers
  const customers = await db.select().from(require('../server/database/schema').customers);

  console.log(`Found ${customers.length} customers to normalize`);

  for (const customer of customers) {
    const normalized = formatPhoneBR(customer.phone);
    if (normalized && normalized !== customer.phone) {
      console.log(`Normalizing ${customer.phone} -> ${normalized}`);
      await db.update(require('../server/database/schema').customers)
        .set({ phone: normalized })
        .where(require('../server/database/schema').customers.id.equals(customer.id));
    }
  }

  // Also normalize conversations.customerPhone
  const conversations = await db.select().from(require('../server/database/schema').conversations);

  for (const conv of conversations) {
    const normalized = formatPhoneBR(conv.customerPhone);
    if (normalized && normalized !== conv.customerPhone) {
      console.log(`Normalizing conversation ${conv.customerPhone} -> ${normalized}`);
      await db.update(require('../server/database/schema').conversations)
        .set({ customerPhone: normalized })
        .where(require('../server/database/schema').conversations.id.equals(conv.id));
    }
  }

  console.log('Normalization complete');
}

normalizePhones().catch(console.error);