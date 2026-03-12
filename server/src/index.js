const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const { db, getBootstrapData } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  },
});

app.use(cors());
app.use(express.json());

const generateId = () => `${Date.now().toString()}-${Math.random().toString(36).slice(2, 8)}`;
const emitBootstrapUpdate = () => {
  io.emit('bootstrap:update', getBootstrapData());
};

// Healthcheck simples
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Retorna estrutura completa esperada pelo front (people, products, branding)
app.get('/api/bootstrap', (req, res, next) => {
  try {
    const data = getBootstrapData();
    res.json(data);
  } catch (err) {
    next(err);
  }
});

// ===== Pessoas =====

app.get('/api/people', (req, res, next) => {
  try {
    const { people } = getBootstrapData();
    res.json(people);
  } catch (err) {
    next(err);
  }
});

app.post('/api/people', (req, res, next) => {
  try {
    const { name, customId, initialDeposit, photo } = req.body;
    if (!name || typeof initialDeposit !== 'number') {
      return res.status(400).json({ error: 'Nome e depósito inicial são obrigatórios' });
    }

    const id = generateId();
    const balance = initialDeposit;

    db.prepare(`
      INSERT INTO people (id, custom_id, name, photo, initial_deposit, balance)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(id, customId || null, name, photo || null, initialDeposit, balance);

    const { people } = getBootstrapData();
    const person = people.find((p) => p.id === id);
    emitBootstrapUpdate();

    res.status(201).json(person);
  } catch (err) {
    next(err);
  }
});

app.patch('/api/people/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, customId, photo, initialDeposit, balance } = req.body;

    const existing = db.prepare('SELECT * FROM people WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Pessoa não encontrada' });
    }

    const updated = {
      name: name ?? existing.name,
      custom_id: customId ?? existing.custom_id,
      photo: photo ?? existing.photo,
      initial_deposit: typeof initialDeposit === 'number' ? initialDeposit : existing.initial_deposit,
      balance: typeof balance === 'number' ? balance : existing.balance
    };

    db.prepare(`
      UPDATE people
      SET name = ?, custom_id = ?, photo = ?, initial_deposit = ?, balance = ?
      WHERE id = ?
    `).run(
      updated.name,
      updated.custom_id,
      updated.photo,
      updated.initial_deposit,
      updated.balance,
      id
    );

    const { people } = getBootstrapData();
    const person = people.find((p) => p.id === id);
    emitBootstrapUpdate();
    res.json(person);
  } catch (err) {
    next(err);
  }
});

app.delete('/api/people/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM people WHERE id = ?').run(id);
    emitBootstrapUpdate();
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// ===== Produtos =====

app.get('/api/products', (req, res, next) => {
  try {
    const { products } = getBootstrapData();
    res.json(products);
  } catch (err) {
    next(err);
  }
});

app.post('/api/products', (req, res, next) => {
  try {
    const { name, barcode, price, stock, costPrice, purchasedQuantity } = req.body;
    const initialStock = typeof stock === 'number'
      ? stock
      : (typeof purchasedQuantity === 'number' ? purchasedQuantity : null);

    if (!name || typeof price !== 'number' || typeof initialStock !== 'number') {
      return res.status(400).json({ error: 'Nome, preço e quantidade comprada são obrigatórios' });
    }

    const id = generateId();

    db.prepare(`
      INSERT INTO products (id, name, barcode, price, stock, cost_price, purchased_quantity)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      name,
      barcode || null,
      price,
      initialStock,
      typeof costPrice === 'number' ? costPrice : null,
      typeof purchasedQuantity === 'number' ? purchasedQuantity : null
    );

    const { products } = getBootstrapData();
    const product = products.find((p) => p.id === id);
    emitBootstrapUpdate();
    res.status(201).json(product);
  } catch (err) {
    next(err);
  }
});

app.patch('/api/products/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, barcode, price, stock, costPrice, purchasedQuantity } = req.body;

    const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    const updated = {
      name: name ?? existing.name,
      barcode: barcode ?? existing.barcode,
      price: typeof price === 'number' ? price : existing.price,
      stock: typeof stock === 'number' ? stock : existing.stock,
      cost_price: typeof costPrice === 'number' ? costPrice : existing.cost_price,
      purchased_quantity: typeof purchasedQuantity === 'number' ? purchasedQuantity : existing.purchased_quantity
    };

    db.prepare(`
      UPDATE products
      SET name = ?, barcode = ?, price = ?, stock = ?, cost_price = ?, purchased_quantity = ?
      WHERE id = ?
    `).run(
      updated.name,
      updated.barcode,
      updated.price,
      updated.stock,
      updated.cost_price,
      updated.purchased_quantity,
      id
    );

    const { products } = getBootstrapData();
    const product = products.find((p) => p.id === id);
    emitBootstrapUpdate();
    res.json(product);
  } catch (err) {
    next(err);
  }
});

app.delete('/api/products/:id', (req, res, next) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM products WHERE id = ?').run(id);
    emitBootstrapUpdate();
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

// ===== Compras =====

app.post('/api/people/:personId/purchases', (req, res, next) => {
  try {
    const { personId } = req.params;
    const { items } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Itens da compra são obrigatórios' });
    }

    const person = db.prepare('SELECT * FROM people WHERE id = ?').get(personId);
    if (!person) {
      return res.status(404).json({ error: 'Pessoa não encontrada' });
    }

    for (const item of items) {
      if (!item || typeof item.quantity !== 'number' || item.quantity <= 0) {
        return res.status(400).json({ error: 'Quantidade inválida na compra' });
      }

      if (item.productId) {
        const product = db.prepare('SELECT id, name, stock FROM products WHERE id = ?').get(item.productId);
        if (!product) {
          return res.status(404).json({ error: `Produto não encontrado: ${item.productName || item.productId}` });
        }

        if (item.quantity > product.stock) {
          return res.status(400).json({ error: `Estoque insuficiente para ${product.name}. Disponível: ${product.stock}` });
        }
      }
    }

    const total = items.reduce((sum, item) => sum + Number(item.total || 0), 0);
    const purchaseId = generateId();
    const now = new Date().toISOString();

    const tx = db.transaction(() => {
      db.prepare(`
        INSERT INTO purchases (id, person_id, date, total)
        VALUES (?, ?, ?, ?)
      `).run(purchaseId, personId, now, total);

      const insertItem = db.prepare(`
        INSERT INTO purchase_items (purchase_id, product_id, product_name, quantity, price, total)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      const updateStock = db.prepare(`
        UPDATE products SET stock = stock - ? WHERE id = ?
      `);

      for (const item of items) {
        insertItem.run(
          purchaseId,
          item.productId || null,
          item.productName,
          item.quantity,
          item.price,
          item.total
        );

        if (item.productId) {
          updateStock.run(item.quantity, item.productId);
        }
      }

      db.prepare(`
        UPDATE people SET balance = balance - ? WHERE id = ?
      `).run(total, personId);
    });

    tx();

    const { people } = getBootstrapData();
    const updatedPerson = people.find((p) => p.id === personId);
    emitBootstrapUpdate();
    res.status(201).json(updatedPerson);
  } catch (err) {
    next(err);
  }
});

app.delete('/api/people/:personId/purchases/:purchaseId', (req, res, next) => {
  try {
    const { personId, purchaseId } = req.params;

    const purchase = db.prepare('SELECT * FROM purchases WHERE id = ? AND person_id = ?').get(purchaseId, personId);
    if (!purchase) {
      return res.status(404).json({ error: 'Compra não encontrada' });
    }

    const items = db.prepare('SELECT * FROM purchase_items WHERE purchase_id = ?').all(purchaseId);

    const tx = db.transaction(() => {
      // Restaurar saldo
      db.prepare('UPDATE people SET balance = balance + ? WHERE id = ?').run(purchase.total, personId);

      // Restaurar estoque
      const restoreStock = db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?');
      for (const item of items) {
        if (item.product_id) {
          restoreStock.run(item.quantity, item.product_id);
        }
      }

      // Remover compra e itens
      db.prepare('DELETE FROM purchase_items WHERE purchase_id = ?').run(purchaseId);
      db.prepare('DELETE FROM purchases WHERE id = ?').run(purchaseId);
    });

    tx();

    const { people } = getBootstrapData();
    const updatedPerson = people.find((p) => p.id === personId);
    emitBootstrapUpdate();
    res.json(updatedPerson);
  } catch (err) {
    next(err);
  }
});

app.delete('/api/people/:personId/purchases/:purchaseId/items/:productId', (req, res, next) => {
  try {
    const { personId, purchaseId, productId } = req.params;

    const purchase = db.prepare('SELECT * FROM purchases WHERE id = ? AND person_id = ?').get(purchaseId, personId);
    if (!purchase) {
      return res.status(404).json({ error: 'Compra não encontrada' });
    }

    const item = db
      .prepare('SELECT * FROM purchase_items WHERE purchase_id = ? AND product_id = ?')
      .get(purchaseId, productId);

    if (!item) {
      return res.status(404).json({ error: 'Item não encontrado' });
    }

    const allItems = db.prepare('SELECT * FROM purchase_items WHERE purchase_id = ?').all(purchaseId);

    const tx = db.transaction(() => {
      // Restaurar saldo
      db.prepare('UPDATE people SET balance = balance + ? WHERE id = ?').run(item.total, personId);

      // Restaurar estoque
      if (item.product_id) {
        db.prepare('UPDATE products SET stock = stock + ? WHERE id = ?').run(item.quantity, item.product_id);
      }

      // Remover item
      db.prepare('DELETE FROM purchase_items WHERE id = ?').run(item.id);

      // Se foi o último item, remover a compra inteira
      if (allItems.length === 1) {
        db.prepare('DELETE FROM purchases WHERE id = ?').run(purchaseId);
      } else {
        const remainingItems = allItems.filter((i) => i.id !== item.id);
        const newTotal = remainingItems.reduce((sum, i) => sum + i.total, 0);
        db.prepare('UPDATE purchases SET total = ? WHERE id = ?').run(newTotal, purchaseId);
      }
    });

    tx();

    const { people } = getBootstrapData();
    const updatedPerson = people.find((p) => p.id === personId);
    emitBootstrapUpdate();
    res.json(updatedPerson);
  } catch (err) {
    next(err);
  }
});

app.patch('/api/people/:personId/purchases/:purchaseId/items/:productId', (req, res, next) => {
  try {
    const { personId, purchaseId, productId } = req.params;
    const { quantity } = req.body;

    if (typeof quantity !== 'number' || quantity < 0) {
      return res.status(400).json({ error: 'Quantidade inválida' });
    }

    if (quantity === 0) {
      // Reaproveita a lógica de deletar item
      req.body = {};
      return app._router.handle(req, res, next); // não ideal, mas suficiente aqui
    }

    const purchase = db.prepare('SELECT * FROM purchases WHERE id = ? AND person_id = ?').get(purchaseId, personId);
    if (!purchase) {
      return res.status(404).json({ error: 'Compra não encontrada' });
    }

    const item = db
      .prepare('SELECT * FROM purchase_items WHERE purchase_id = ? AND product_id = ?')
      .get(purchaseId, productId);
    if (!item) {
      return res.status(404).json({ error: 'Item não encontrado' });
    }

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
    if (!product) {
      return res.status(404).json({ error: 'Produto não encontrado' });
    }

    const quantityDiff = quantity - item.quantity;
    if (quantityDiff > 0 && quantityDiff > product.stock) {
      return res.status(400).json({ error: `Estoque insuficiente! Disponível: ${product.stock}` });
    }

    const tx = db.transaction(() => {
      // Atualizar estoque
      db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(quantityDiff, productId);

      const newItemTotal = Math.round(item.price * quantity * 100) / 100;
      const totalDiff = newItemTotal - item.total;

      // Atualizar item
      db.prepare('UPDATE purchase_items SET quantity = ?, total = ? WHERE id = ?').run(quantity, newItemTotal, item.id);

      // Atualizar total da compra
      const newPurchaseTotal = Math.round((purchase.total + totalDiff) * 100) / 100;
      db.prepare('UPDATE purchases SET total = ? WHERE id = ?').run(newPurchaseTotal, purchaseId);

      // Atualizar saldo da pessoa
      db.prepare('UPDATE people SET balance = balance - ? WHERE id = ?').run(totalDiff, personId);
    });

    tx();

    const { people } = getBootstrapData();
    const updatedPerson = people.find((p) => p.id === personId);
    emitBootstrapUpdate();
    res.json(updatedPerson);
  } catch (err) {
    next(err);
  }
});

// ===== Branding =====

app.patch('/api/branding', (req, res, next) => {
  try {
    const existing = db.prepare('SELECT * FROM branding WHERE id = 1').get();
    const { organizationName, logoUrl, showLogo, darkMode, missionaryGoal } = req.body;

    const updated = {
      organization_name: organizationName ?? (existing && existing.organization_name) ?? '',
      logo_url: logoUrl ?? (existing && existing.logo_url) ?? '',
      show_logo: typeof showLogo === 'boolean' ? (showLogo ? 1 : 0) : existing ? existing.show_logo : 0,
      dark_mode: typeof darkMode === 'boolean' ? (darkMode ? 1 : 0) : existing ? existing.dark_mode : 0,
      missionary_goal: typeof missionaryGoal === 'number' ? missionaryGoal : existing ? existing.missionary_goal : 0
    };

    db.prepare(`
      INSERT INTO branding (id, organization_name, logo_url, show_logo, dark_mode, missionary_goal)
      VALUES (1, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        organization_name = excluded.organization_name,
        logo_url = excluded.logo_url,
        show_logo = excluded.show_logo,
        dark_mode = excluded.dark_mode,
        missionary_goal = excluded.missionary_goal
    `).run(
      updated.organization_name,
      updated.logo_url,
      updated.show_logo,
      updated.dark_mode,
      updated.missionary_goal
    );

    const { branding } = getBootstrapData();
    emitBootstrapUpdate();
    res.json(branding);
  } catch (err) {
    next(err);
  }
});

// ===== Encerramento de acampamento =====

app.post('/api/encerramento', (req, res, next) => {
  try {
    const {
      balanceAction,
      selectedPersonIds = [],
      selectedBalanceAction,
      remainingBalanceAction
    } = req.body;

    const usesGroupedActions =
      Array.isArray(selectedPersonIds) &&
      selectedPersonIds.length > 0 &&
      (selectedBalanceAction === 'saque' || selectedBalanceAction === 'missionario') &&
      (remainingBalanceAction === 'saque' || remainingBalanceAction === 'missionario');

    const usesSingleAction = balanceAction === 'saque' || balanceAction === 'missionario';

    if (!usesGroupedActions && !usesSingleAction) {
      return res.status(400).json({
        error: 'Informe balanceAction ou selectedBalanceAction/remainingBalanceAction com selectedPersonIds'
      });
    }

    const selectedPeopleSet = new Set(selectedPersonIds);
    const getBalanceActionForPerson = (personId) => {
      if (usesGroupedActions) {
        return selectedPeopleSet.has(personId) ? selectedBalanceAction : remainingBalanceAction;
      }

      return balanceAction;
    };

    const now = new Date();
    const encerramentoDate = now.toISOString();
    const brandingColumns = db.prepare('PRAGMA table_info(branding)').all();
    const hasMissionaryOffersResetColumn = brandingColumns.some((column) => column.name === 'missionary_offers_reset_at');

    const { people, products } = getBootstrapData();

    const encerramentoData = {
      data: encerramentoDate,
      balanceAction: usesGroupedActions ? null : balanceAction,
      selectedBalanceAction: usesGroupedActions ? selectedBalanceAction : null,
      remainingBalanceAction: usesGroupedActions ? remainingBalanceAction : null,
      selectedPersonIds: usesGroupedActions ? selectedPersonIds : [],
      peopleCount: people.length,
      peopleWithBalance: people.filter((p) => p.balance > 0).length,
      totalBalance: people.reduce((sum, p) => sum + p.balance, 0),
      productsCount: products.length,
      productsWithStock: products.filter((p) => p.stock > 0).length,
      people: people.map((p) => ({
        id: p.id,
        name: p.name,
        customId: p.customId,
        finalBalance: p.balance,
        balanceAction: p.balance > 0 ? getBalanceActionForPerson(p.id) : null,
        initialDeposit: p.initialDeposit,
        totalPurchases: p.purchases.length,
        totalSpent: p.purchases.reduce((sum, purchase) => sum + purchase.total, 0)
      })),
      products: products.map((p) => ({
        id: p.id,
        name: p.name,
        barcode: p.barcode,
        finalStock: p.stock,
        price: p.price
      }))
    };

    const tx = db.transaction(() => {
      // Restaurar estoque para a quantidade comprada original
      db.prepare('UPDATE products SET stock = COALESCE(purchased_quantity, 0)').run();
      // Limpar pessoas e histórico para o próximo acampamento
      db.prepare('DELETE FROM people').run();
      if (hasMissionaryOffersResetColumn) {
        db.prepare(`
          UPDATE branding SET missionary_offers_reset_at = ? WHERE id = 1
        `).run(encerramentoDate);
      }
    });

    tx();

    const updated = getBootstrapData();
    emitBootstrapUpdate();
    res.json({
      encerramento: encerramentoData,
      ...updated
    });
  } catch (err) {
    next(err);
  }
});

// ===== Export / Import completo =====

app.get('/api/export', (req, res, next) => {
  try {
    const data = getBootstrapData();
    res.json({
      version: '1.0',
      timestamp: new Date().toISOString(),
      ...data
    });
  } catch (err) {
    next(err);
  }
});

app.post('/api/import', (req, res, next) => {
  try {
    const { version, people, products, branding } = req.body || {};
    if (!version || !Array.isArray(people) || !Array.isArray(products)) {
      return res.status(400).json({
        error: 'Formato de dados inválido. Verifique se o arquivo foi gerado pelo sistema.'
      });
    }

    const tx = db.transaction(() => {
      db.prepare('DELETE FROM purchase_items').run();
      db.prepare('DELETE FROM purchases').run();
      db.prepare('DELETE FROM people').run();
      db.prepare('DELETE FROM products').run();

      const insertPerson = db.prepare(`
        INSERT INTO people (id, custom_id, name, photo, initial_deposit, balance)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      const insertPurchase = db.prepare(`
        INSERT INTO purchases (id, person_id, date, total)
        VALUES (?, ?, ?, ?)
      `);
      const insertItem = db.prepare(`
        INSERT INTO purchase_items (purchase_id, product_id, product_name, quantity, price, total)
        VALUES (?, ?, ?, ?, ?, ?)
      `);

      for (const person of people) {
        insertPerson.run(
          person.id || generateId(),
          person.customId || null,
          person.name,
          person.photo || null,
          person.initialDeposit,
          person.balance
        );

        if (Array.isArray(person.purchases)) {
          for (const purchase of person.purchases) {
            const purchaseId = purchase.id || generateId();
            insertPurchase.run(
              purchaseId,
              person.id,
              purchase.date ? new Date(purchase.date).toISOString() : new Date().toISOString(),
              purchase.total
            );

            if (Array.isArray(purchase.items)) {
              for (const item of purchase.items) {
                insertItem.run(
                  purchaseId,
                  item.productId || null,
                  item.productName,
                  item.quantity,
                  item.price,
                  item.total
                );
              }
            }
          }
        }
      }

      const insertProduct = db.prepare(`
        INSERT INTO products (id, name, barcode, price, stock, cost_price, purchased_quantity)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `);

      for (const product of products) {
        insertProduct.run(
          product.id || generateId(),
          product.name,
          product.barcode || null,
          product.price,
          product.stock,
          typeof product.costPrice === 'number' ? product.costPrice : null,
          typeof product.purchasedQuantity === 'number' ? product.purchasedQuantity : null
        );
      }

      if (branding) {
        db.prepare(`
          INSERT INTO branding (id, organization_name, logo_url, show_logo, dark_mode, missionary_goal, missionary_offers_reset_at)
          VALUES (1, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(id) DO UPDATE SET
            organization_name = excluded.organization_name,
            logo_url = excluded.logo_url,
            show_logo = excluded.show_logo,
            dark_mode = excluded.dark_mode,
            missionary_goal = excluded.missionary_goal,
            missionary_offers_reset_at = excluded.missionary_offers_reset_at
        `).run(
          branding.organizationName || '',
          branding.logoUrl || '',
          branding.showLogo ? 1 : 0,
          branding.darkMode ? 1 : 0,
          typeof branding.missionaryGoal === 'number' ? branding.missionaryGoal : 0,
          branding.missionaryOffersResetAt || null
        );
      }
    });

    tx();

    emitBootstrapUpdate();
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

// Servir o build do frontend quando existir
const clientDistPath = path.join(__dirname, '..', '..', 'dist');
app.use(express.static(clientDistPath));

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(clientDistPath, 'index.html'), (err) => {
    if (err) {
      res.status(404).send('Aplicação ainda não foi construída. Rode "npm run build" em app-cantina.');
    }
  });
});

// Middleware de erro
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Erro interno no servidor' });
});

io.on('connection', (socket) => {
  socket.emit('bootstrap:update', getBootstrapData());
});

httpServer.listen(PORT, () => {
  console.log(`Servidor App Cantina rodando em http://localhost:${PORT}`);
});
