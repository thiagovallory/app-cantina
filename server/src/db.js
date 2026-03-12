const path = require('path');
const Database = require('better-sqlite3');

const dbPath = path.join(__dirname, '..', 'data', 'cantina.db');

const db = new Database(dbPath);

db.pragma('foreign_keys = ON');

// Inicializa o schema básico do banco
db.exec(`
  CREATE TABLE IF NOT EXISTS people (
    id TEXT PRIMARY KEY,
    custom_id TEXT,
    name TEXT NOT NULL,
    photo TEXT,
    initial_deposit REAL NOT NULL,
    balance REAL NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    barcode TEXT,
    price REAL NOT NULL,
    stock INTEGER NOT NULL,
    cost_price REAL,
    purchased_quantity INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS purchases (
    id TEXT PRIMARY KEY,
    person_id TEXT NOT NULL,
    date TEXT NOT NULL,
    total REAL NOT NULL,
    FOREIGN KEY (person_id) REFERENCES people(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS purchase_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    purchase_id TEXT NOT NULL,
    product_id TEXT,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    price REAL NOT NULL,
    total REAL NOT NULL,
    FOREIGN KEY (purchase_id) REFERENCES purchases(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS branding (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    organization_name TEXT NOT NULL DEFAULT '',
    logo_url TEXT NOT NULL DEFAULT '',
    show_logo INTEGER NOT NULL DEFAULT 0,
    dark_mode INTEGER NOT NULL DEFAULT 0
  );
`);

const brandingColumns = db.prepare(`PRAGMA table_info(branding)`).all();
if (!brandingColumns.some((column) => column.name === 'missionary_goal')) {
  db.exec(`ALTER TABLE branding ADD COLUMN missionary_goal REAL NOT NULL DEFAULT 0`);
}
if (!brandingColumns.some((column) => column.name === 'missionary_offers_reset_at')) {
  db.exec(`ALTER TABLE branding ADD COLUMN missionary_offers_reset_at TEXT`);
}

db.prepare(`
  INSERT OR IGNORE INTO branding (id, organization_name, logo_url, show_logo, dark_mode, missionary_goal, missionary_offers_reset_at)
  VALUES (1, '', '', 0, 0, 0, NULL)
`).run();

function mapPersonRow(row, purchasesByPersonId) {
  return {
    id: row.id,
    customId: row.custom_id || undefined,
    name: row.name,
    photo: row.photo || undefined,
    initialDeposit: row.initial_deposit,
    balance: row.balance,
    purchases: purchasesByPersonId[row.id] || []
  };
}

function mapProductRow(row) {
  return {
    id: row.id,
    name: row.name,
    barcode: row.barcode || undefined,
    price: row.price,
    stock: row.stock,
    costPrice: row.cost_price ?? undefined,
    purchasedQuantity: row.purchased_quantity ?? undefined
  };
}

function mapPurchaseRow(row, itemsByPurchaseId) {
  return {
    id: row.id,
    personId: row.person_id,
    date: new Date(row.date),
    items: itemsByPurchaseId[row.id] || [],
    total: row.total
  };
}

function mapBrandingRow(row) {
  if (!row) {
    return {
      organizationName: '',
      logoUrl: '',
      showLogo: false,
      darkMode: false,
      missionaryGoal: 0
    };
  }

  return {
    organizationName: row.organization_name,
    logoUrl: row.logo_url,
    showLogo: !!row.show_logo,
    darkMode: !!row.dark_mode,
    missionaryGoal: row.missionary_goal ?? 0,
    missionaryOffersResetAt: row.missionary_offers_reset_at || undefined
  };
}

function getBootstrapData() {
  const peopleRows = db.prepare('SELECT * FROM people ORDER BY name COLLATE NOCASE').all();
  const productRows = db.prepare('SELECT * FROM products ORDER BY name COLLATE NOCASE').all();
  const purchaseRows = db.prepare('SELECT * FROM purchases ORDER BY date DESC').all();
  const purchaseItemRows = db.prepare('SELECT * FROM purchase_items').all();
  const brandingRow = db.prepare('SELECT * FROM branding WHERE id = 1').get();

  const itemsByPurchaseId = purchaseItemRows.reduce((acc, row) => {
    if (!acc[row.purchase_id]) acc[row.purchase_id] = [];
    acc[row.purchase_id].push({
      productId: row.product_id,
      productName: row.product_name,
      quantity: row.quantity,
      price: row.price,
      total: row.total
    });
    return acc;
  }, {});

  const purchasesByPersonId = purchaseRows.reduce((acc, row) => {
    if (!acc[row.person_id]) acc[row.person_id] = [];
    acc[row.person_id].push(mapPurchaseRow(row, itemsByPurchaseId));
    return acc;
  }, {});

  const people = peopleRows.map((row) => mapPersonRow(row, purchasesByPersonId));
  const products = productRows.map(mapProductRow);
  const branding = mapBrandingRow(brandingRow);

  return { people, products, branding };
}

module.exports = {
  db,
  getBootstrapData
};
