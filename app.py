import os
import sqlite3
import logging
from datetime import datetime
from typing import Optional
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import HTMLResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uvicorn
from dotenv import load_dotenv
from telethon import TelegramClient

load_dotenv()

PORT = int(os.getenv("PORT", 8000))
ADMIN_IDS = [1886614664, 8814572765]

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

DB_NAME = "fakeshop.db"

def get_db():
    conn = sqlite3.connect(DB_NAME)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
    CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        price REAL NOT NULL,
        quantity INTEGER NOT NULL DEFAULT 0,
        photo TEXT,
        note TEXT,
        category TEXT DEFAULT 'Все',
        from_china INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_number TEXT UNIQUE NOT NULL,
        user_id INTEGER NOT NULL,
        username TEXT,
        phone TEXT,
        address TEXT,
        product_ids TEXT NOT NULL,
        total REAL NOT NULL,
        final_total REAL NOT NULL,
        status TEXT DEFAULT 'new',
        comment TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS cart (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        product_id INTEGER NOT NULL,
        quantity INTEGER DEFAULT 1,
        UNIQUE(user_id, product_id)
    )
    """)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS categories (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        icon TEXT
    )
    """)
    for cat in ['Все', 'Футболки', 'Свитшоты', 'Кроссовки', 'Штаны', 'Аксессуары', 'Из Китая']:
        cur.execute("INSERT OR IGNORE INTO categories (name) VALUES (?)", (cat,))
    cur.execute("""
    CREATE TABLE IF NOT EXISTS promocodes (
        code TEXT PRIMARY KEY,
        discount INTEGER NOT NULL,
        expires_at TIMESTAMP
    )
    """)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS banned_users (
        user_id INTEGER PRIMARY KEY
    )
    """)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS faq (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question TEXT NOT NULL,
        answer TEXT NOT NULL
    )
    """)
    cur.execute("""
    CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT
    )
    """)
    for key, val in {
        'shop_name': 'FAKESHOP',
        'shop_description': 'Стильная одежда и обувь',
        'contact_manager': '@ManaReaper',
        'reviews_channel': 'TestimonialFAKESTORE'
    }.items():
        cur.execute("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)", (key, val))
    conn.commit()
    conn.close()
    logger.info("База данных инициализирована")

init_db()

app = FastAPI()
app.mount("/static", StaticFiles(directory="frontend"), name="static")

class ProductCreate(BaseModel):
    name: str
    price: float
    quantity: int
    note: Optional[str] = ""
    category: Optional[str] = "Все"
    photo: Optional[str] = None
    from_china: Optional[int] = 0

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    price: Optional[float] = None
    quantity: Optional[int] = None
    note: Optional[str] = None
    category: Optional[str] = None
    photo: Optional[str] = None
    from_china: Optional[int] = None

class CartItem(BaseModel):
    product_id: int
    quantity: int = 1

class OrderCreate(BaseModel):
    user_id: int
    username: Optional[str] = ""
    phone: str
    address: Optional[str] = ""
    comment: Optional[str] = ""

class CategoryCreate(BaseModel):
    name: str
    icon: Optional[str] = ""
    user_id: int

class CategoryUpdate(BaseModel):
    name: str
    icon: Optional[str] = ""
    user_id: int

def generate_order_number():
    return f"FAKE-{datetime.now().strftime('%Y%m%d')}-{datetime.now().strftime('%H%M%S')}"

def is_admin(user_id: int):
    return user_id in ADMIN_IDS

@app.get("/")
async def index():
    with open("frontend/index.html", "r", encoding="utf-8") as f:
        return HTMLResponse(f.read())

@app.get("/api/categories")
async def get_categories():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM categories")
    categories = [dict(row) for row in cur.fetchall()]
    conn.close()
    return categories

@app.post("/api/categories")
async def create_category(data: CategoryCreate):
    if not is_admin(data.user_id):
        raise HTTPException(403, "Нет прав")
    conn = get_db()
    cur = conn.cursor()
    cur.execute("INSERT INTO categories (name, icon) VALUES (?, ?)", (data.name, data.icon))
    conn.commit()
    conn.close()
    return {"message": "Категория создана"}

@app.put("/api/categories/{id}")
async def update_category(id: int, data: CategoryUpdate):
    if not is_admin(data.user_id):
        raise HTTPException(403, "Нет прав")
    conn = get_db()
    cur = conn.cursor()
    cur.execute("UPDATE categories SET name = ?, icon = ? WHERE id = ?", (data.name, data.icon, id))
    conn.commit()
    conn.close()
    return {"message": "Категория обновлена"}

@app.delete("/api/categories/{id}")
async def delete_category(id: int, user_id: int):
    if not is_admin(user_id):
        raise HTTPException(403, "Нет прав")
    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM categories WHERE id = ?", (id,))
    conn.commit()
    conn.close()
    return {"message": "Категория удалена"}

@app.get("/api/products")
async def get_products(category: Optional[str] = None, limit: int = 50, offset: int = 0):
    conn = get_db()
    cur = conn.cursor()
    query = "SELECT * FROM products"
    params = []
    if category and category != "Все":
        query += " WHERE category = ?"
        params.append(category)
    query += " ORDER BY id DESC LIMIT ? OFFSET ?"
    params.extend([limit, offset])
    cur.execute(query, params)
    products = [dict(row) for row in cur.fetchall()]
    conn.close()
    return {"products": products, "total": len(products)}

@app.get("/api/products/{id}")
async def get_product(id: int):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM products WHERE id = ?", (id,))
    product = cur.fetchone()
    conn.close()
    if not product:
        raise HTTPException(404, "Товар не найден")
    return dict(product)

@app.post("/api/products")
async def create_product(data: ProductCreate):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        INSERT INTO products (name, price, quantity, note, category, photo, from_china)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, (data.name, data.price, data.quantity, data.note, data.category, data.photo, data.from_china or 0))
    conn.commit()
    conn.close()
    return {"message": "Товар создан"}

@app.put("/api/products/{id}")
async def update_product(id: int, data: ProductUpdate):
    conn = get_db()
    cur = conn.cursor()
    fields = []
    vals = []
    for k, v in data.dict(exclude_unset=True).items():
        fields.append(f"{k} = ?")
        vals.append(v)
    vals.append(id)
    cur.execute(f"UPDATE products SET {', '.join(fields)} WHERE id = ?", vals)
    conn.commit()
    conn.close()
    return {"message": "Товар обновлен"}

@app.delete("/api/products/{id}")
async def delete_product(id: int):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM products WHERE id = ?", (id,))
    conn.commit()
    conn.close()
    return {"message": "Товар удален"}

@app.get("/api/cart/{user_id}")
async def get_cart(user_id: int):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        SELECT c.*, p.name, p.price, p.photo
        FROM cart c
        JOIN products p ON c.product_id = p.id
        WHERE c.user_id = ?
    """, (user_id,))
    items = []
    total = 0
    for row in cur.fetchall():
        item = dict(row)
        item['subtotal'] = item['price'] * item['quantity']
        total += item['subtotal']
        items.append(item)
    conn.close()
    return {"items": items, "total": total}

@app.post("/api/cart/{user_id}")
async def add_to_cart(user_id: int, data: CartItem):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT quantity FROM products WHERE id = ?", (data.product_id,))
    product = cur.fetchone()
    if not product or product['quantity'] < data.quantity:
        raise HTTPException(400, "Недостаточно товара")
    cur.execute("""
        INSERT INTO cart (user_id, product_id, quantity)
        VALUES (?, ?, ?)
        ON CONFLICT(user_id, product_id)
        DO UPDATE SET quantity = quantity + ?
    """, (user_id, data.product_id, data.quantity, data.quantity))
    conn.commit()
    conn.close()
    return {"message": "Добавлено"}

@app.delete("/api/cart/{user_id}/{product_id}")
async def remove_from_cart(user_id: int, product_id: int):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM cart WHERE user_id = ? AND product_id = ?", (user_id, product_id))
    conn.commit()
    conn.close()
    return {"message": "Удалено"}

@app.delete("/api/cart/{user_id}")
async def clear_cart(user_id: int):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM cart WHERE user_id = ?", (user_id,))
    conn.commit()
    conn.close()
    return {"message": "Корзина очищена"}

@app.post("/api/orders")
async def create_order(data: OrderCreate):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("""
        SELECT c.product_id, c.quantity, p.price
        FROM cart c
        JOIN products p ON c.product_id = p.id
        WHERE c.user_id = ?
    """, (data.user_id,))
    cart_items = cur.fetchall()
    if not cart_items:
        raise HTTPException(400, "Корзина пуста")
    product_ids = []
    total = 0
    for item in cart_items:
        product_ids.append(str(item['product_id']))
        total += item['price'] * item['quantity']
    order_number = generate_order_number()
    cur.execute("""
        INSERT INTO orders (order_number, user_id, username, phone, address, product_ids, total, final_total, comment)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (order_number, data.user_id, data.username, data.phone, data.address, ",".join(product_ids), total, total, data.comment))
    order_id = cur.lastrowid
    for item in cart_items:
        cur.execute("UPDATE products SET quantity = quantity - ? WHERE id = ?", (item['quantity'], item['product_id']))
    cur.execute("DELETE FROM cart WHERE user_id = ?", (data.user_id,))
    conn.commit()
    conn.close()
    return {"order_id": order_id, "order_number": order_number}

@app.get("/api/orders")
async def get_orders():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM orders ORDER BY created_at DESC")
    orders = [dict(row) for row in cur.fetchall()]
    conn.close()
    return orders

@app.delete("/api/orders/{id}")
async def delete_order(id: int):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM orders WHERE id = ?", (id,))
    conn.commit()
    conn.close()
    return {"message": "Заказ удален"}

@app.get("/api/promocodes")
async def get_promocodes():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM promocodes")
    promocodes = [dict(row) for row in cur.fetchall()]
    conn.close()
    return promocodes

@app.post("/api/promocodes")
async def create_promocode(code: str, discount: int, expires_at: Optional[str] = None):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("INSERT INTO promocodes (code, discount, expires_at) VALUES (?, ?, ?)", (code, discount, expires_at))
    conn.commit()
    conn.close()
    return {"message": "Промокод создан"}

@app.delete("/api/promocodes/{code}")
async def delete_promocode(code: str):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM promocodes WHERE code = ?", (code,))
    conn.commit()
    conn.close()
    return {"message": "Промокод удален"}

@app.get("/api/banned")
async def get_banned():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM banned_users")
    banned = [dict(row) for row in cur.fetchall()]
    conn.close()
    return banned

@app.post("/api/banned/{user_id}")
async def ban_user(user_id: int):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("INSERT OR IGNORE INTO banned_users (user_id) VALUES (?)", (user_id,))
    conn.commit()
    conn.close()
    return {"message": "Пользователь забанен"}

@app.delete("/api/banned/{user_id}")
async def unban_user(user_id: int):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM banned_users WHERE user_id = ?", (user_id,))
    conn.commit()
    conn.close()
    return {"message": "Пользователь разбанен"}

@app.get("/api/faq")
async def get_faq():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM faq")
    faq = [dict(row) for row in cur.fetchall()]
    conn.close()
    return faq

@app.post("/api/faq")
async def create_faq(question: str, answer: str):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("INSERT INTO faq (question, answer) VALUES (?, ?)", (question, answer))
    conn.commit()
    conn.close()
    return {"message": "FAQ добавлен"}

@app.delete("/api/faq/{id}")
async def delete_faq(id: int):
    conn = get_db()
    cur = conn.cursor()
    cur.execute("DELETE FROM faq WHERE id = ?", (id,))
    conn.commit()
    conn.close()
    return {"message": "FAQ удален"}

@app.get("/api/settings")
async def get_settings():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT * FROM settings")
    settings = {row['key']: row['value'] for row in cur.fetchall()}
    conn.close()
    return settings

@app.put("/api/settings")
async def update_settings(settings: dict):
    conn = get_db()
    cur = conn.cursor()
    for key, value in settings.items():
        cur.execute("UPDATE settings SET value = ? WHERE key = ?", (value, key))
    conn.commit()
    conn.close()
    return {"message": "Настройки обновлены"}

@app.get("/api/stats")
async def get_stats():
    conn = get_db()
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM products")
    total_products = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM orders")
    total_orders = cur.fetchone()[0]
    cur.execute("SELECT SUM(final_total) FROM orders")
    total_revenue = cur.fetchone()[0] or 0
    cur.execute("SELECT COUNT(DISTINCT user_id) FROM orders")
    total_users = cur.fetchone()[0] or 0
    conn.close()
    return {
        "total_products": total_products,
        "total_orders": total_orders,
        "total_revenue": total_revenue,
        "total_users": total_users
    }

api_id = int(os.getenv("API_ID", 28513725))
api_hash = os.getenv("API_HASH", "ваш_api_hash")
channel_username = os.getenv("REVIEWS_CHANNEL", "TestimonialFAKESTORE")

@app.get("/api/reviews/telegram")
async def get_telegram_reviews():
    try:
        client = TelegramClient('session_reviews', api_id, api_hash)
        await client.connect()
        if not await client.is_user_authorized():
            await client.start(phone=lambda: input("Введите номер телефона: "))
        entity = await client.get_entity(f"@{channel_username}")
        messages = []
        async for msg in client.iter_messages(entity, limit=20):
            if msg.text and not msg.text.startswith('/'):
                messages.append({
                    "text": msg.text,
                    "date": msg.date.isoformat() if msg.date else None,
                    "views": getattr(msg, 'views', 0)
                })
        await client.disconnect()
        return {"reviews": messages}
    except Exception as e:
        return {"error": str(e), "reviews": []}

if __name__ == "__main__":
    logger.info(f"Запуск FAKESHOP на порту {PORT}")
    logger.info(f"Админы: {ADMIN_IDS}")
    uvicorn.run(app, host="0.0.0.0", port=PORT)
