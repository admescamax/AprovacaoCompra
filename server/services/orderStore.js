const fs = require('fs');
const path = require('path');

const ORDERS_FILE = path.resolve(__dirname, '../data/orders.json');

function readOrders() {
    try {
        const raw = fs.readFileSync(ORDERS_FILE, 'utf8');
        return JSON.parse(raw || '[]');
    } catch {
        return [];
    }
}

function writeOrders(orders) {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2), 'utf8');
}

function appendOrder(entry) {
    const orders = readOrders();
    orders.push(entry);
    writeOrders(orders);
    return entry;
}

function findOrder(id) {
    return readOrders().find(order => order.id === id) || null;
}

function findOrderByIdempotencyKey(key) {
    const normalized = String(key || '').trim();
    if (!normalized) return null;
    return readOrders().find(order => order.idempotencyKey === normalized) || null;
}

function updateOrder(id, updater) {
    const orders = readOrders();
    const index = orders.findIndex(order => order.id === id);
    if (index < 0) return null;

    const updated = updater({ ...orders[index] });
    orders[index] = updated;
    writeOrders(orders);
    return updated;
}

module.exports = {
    ORDERS_FILE,
    readOrders,
    writeOrders,
    appendOrder,
    findOrder,
    findOrderByIdempotencyKey,
    updateOrder,
};
