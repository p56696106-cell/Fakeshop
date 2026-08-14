const API_URL = window.location.origin;
let currentCategory = 'Все';
let currentPage = 0;
const LIMIT = 20;
let isLoading = false;
let hasMore = true;
let cartItems = [];
let adminTab = 'dashboard';
let isAdminMode = false;
const ADMIN_IDS = [1886614664, 8814572765];
const tg = window.Telegram?.WebApp || { initDataUnsafe: { user: { id: 0 } } };
const USER_ID = tg.initDataUnsafe?.user?.id || 1886614664;
const USERNAME = tg.initDataUnsafe?.user?.username || 'guest';

const $ = id => document.getElementById(id);
const productsGrid = $('productsGrid');
const skeletonGrid = $('skeletonGrid');
const emptyState = $('emptyState');
const loadMoreContainer = $('loadMoreContainer');
const loadMoreBtn = $('loadMoreBtn');
const categoriesContainer = $('categoriesContainer');
const searchInput = $('searchInput');
const searchToggle = $('searchToggle');
const searchContainer = $('searchContainer');
const searchClear = $('searchClear');
const cartBtn = $('cartBtn');
const cartBadge = $('cartBadge');
const cartPanel = $('cartPanel');
const cartOverlay = $('cartOverlay');
const cartClose = $('cartClose');
const cartItemsContainer = $('cartItems');
const cartFooter = $('cartFooter');
const cartTotal = $('cartTotal');
const checkoutBtn = $('checkoutBtn');
const modalOverlay = $('modalOverlay');
const modalClose = $('modalClose');
const modalContent = $('modalContent');
const orderModalOverlay = $('orderModalOverlay');
const orderModalClose = $('orderModalClose');
const orderForm = $('orderForm');
const orderSuccess = $('orderSuccess');
const orderNumberText = $('orderNumberText');
const orderCloseBtn = $('orderCloseBtn');
const orderPhone = $('orderPhone');
const orderAddress = $('orderAddress');
const orderComment = $('orderComment');
const orderSubtotal = $('orderSubtotal');
const orderTotal = $('orderTotal');
const submitOrderBtn = $('submitOrderBtn');
const toast = $('toast');
const userMode = $('userMode');
const adminMode = $('adminMode');
const adminToggleBtn = $('adminToggleBtn');
const adminModeBadge = $('adminModeBadge');
const cartTitle = $('cartTitle');
const cartEmpty = $('cartEmpty');

// ===== ШУТКИ =====
const jokes = {
    emptyCart: [
        '🧺 Пусто. Как моя голова по утрам.',
        '🧺 Тут грустно. Как в понедельник.',
        '🧺 Ничего нет. Даже пыли.',
        '🧺 А ты точно хотел что-то купить?'
    ],
    addToCart: [
        '✅ Добавили. Ты уже на шаг ближе к идеальному образу.',
        '✅ Товар в корзине. Теперь осталось только не передумать.',
        '✅ Готово. Твой выбор — наша гордость.',
        '✅ Отличный выбор! Ты явно разбираешься.'
    ],
    removeFromCart: [
        '🗑️ Убрали. Но ты ещё успеешь передумать.',
        '🗑️ Вернёшься, мы подождём.',
        '🗑️ Было и прошло. Как лето.',
        '🗑️ Только не плачь, это всего лишь вещь.'
    ],
    cartTitle: [
        '🛒 Тут твоё будущее',
        '🛒 Что-то ценное',
        '🛒 Почти твоё',
        '🛒 Корзина мечты'
    ],
    cartEmpty: [
        '🛒 А корзина-то пуста...',
        '🛒 Здесь могла быть твоя вещь',
        '🛒 А давай что-нибудь добавим?'
    ],
    orderSuccess: [
        '✅ Заказ ушёл в обработку. Менеджер @ManaReaper свяжется с тобой (он не кусается).',
        '✅ Готово! Теперь осталось только дождаться.',
        '✅ Спасибо! Мы уже бежим собирать твой заказ.',
        '✅ Ты сделал это! Теперь просто жди.'
    ],
    productInStock: [
        '✅ Осталось {qty} шт. Не зевай, они не резиновые.',
        '✅ В наличии {qty} шт. Торопись, пока другие не догадались.',
        '✅ Ещё {qty} шт. Или уже меньше?',
        '✅ Только {qty} шт. Думай быстрее.'
    ],
    productOutOfStock: [
        '❌ Улетели. Бывает.',
        '❌ Нет в наличии. Но ты не расстраивайся.',
        '❌ Разобрали. В следующий раз повезёт.',
        '❌ Пусто. Как в холодильнике после пятницы.'
    ],
    error: [
        '❌ Что-то пошло не так. Но мы это исправим. Просто подожди.',
        '❌ Ошибка. Бывает, даже у нас.',
        '❌ Не получилось. Попробуй ещё раз, мы верим в тебя.',
        '❌ Упс. Но мы уже разбираемся.'
    ],
    cartButton: [
        'Забрать себе',
        'Мне это надо',
        'Хочу это',
        'Беру!'
    ]
};

function random(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
}

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type = 'info', duration = 3000) {
    toast.textContent = message;
    toast.className = 'toast ' + type;
    void toast.offsetWidth;
    toast.classList.add('show');
    clearTimeout(window.toastTimeout);
    window.toastTimeout = setTimeout(() => toast.classList.remove('show'), duration);
}

async function apiRequest(url, options = {}) {
    try {
        const res = await fetch(url, {
            ...options,
            headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }
        });
        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Ошибка');
        }
        return await res.json();
    } catch (e) {
        showToast(random(jokes.error), 'error');
        throw e;
    }
}

function isAdmin() { return ADMIN_IDS.includes(USER_ID); }

function toggleAdminMode() {
    isAdminMode = !isAdminMode;
    userMode.style.display = isAdminMode ? 'none' : 'block';
    adminMode.style.display = isAdminMode ? 'block' : 'none';
    adminModeBadge.style.display = isAdminMode ? 'inline' : 'none';
    adminToggleBtn.innerHTML = isAdminMode ? '<i class="fas fa-store"></i>' : '<i class="fas fa-crown"></i>';
    if (isAdminMode) switchAdminTab('dashboard');
}

async function loadCategories() {
    try {
        const cats = await apiRequest('/api/categories');
        categoriesContainer.innerHTML = '';
        const all = document.createElement('button');
        all.className = 'category-btn active';
        all.dataset.category = 'Все';
        all.textContent = 'Все';
        all.onclick = () => selectCategory('Все');
        categoriesContainer.appendChild(all);
        cats.forEach(c => {
            if (c.name !== 'Все') {
                const btn = document.createElement('button');
                btn.className = 'category-btn';
                btn.dataset.category = c.name;
                btn.textContent = c.icon ? `${c.icon} ${c.name}` : c.name;
                btn.onclick = () => selectCategory(c.name);
                categoriesContainer.appendChild(btn);
            }
        });
        // Заполняем select в админке
        const catSelect = document.getElementById('productCategory');
        if (catSelect) {
            catSelect.innerHTML = '<option value="Все">Все</option>';
            cats.forEach(c => {
                const opt = document.createElement('option');
                opt.value = c.name;
                opt.textContent = c.name;
                catSelect.appendChild(opt);
            });
        }
    } catch (e) {}
}

function selectCategory(cat) {
    currentCategory = cat;
    currentPage = 0;
    hasMore = true;
    productsGrid.innerHTML = '';
    document.querySelectorAll('.category-btn').forEach(b =>
        b.classList.toggle('active', b.dataset.category === cat)
    );
    loadProducts(true);
}

async function loadProducts(reset = false) {
    if (isLoading || (!hasMore && !reset)) return;
    isLoading = true;
    if (reset) {
        currentPage = 0;
        hasMore = true;
        productsGrid.innerHTML = '';
        skeletonGrid.classList.remove('hidden');
    }
    try {
        const q = searchInput.value.trim();
        let url = `/api/products?limit=${LIMIT}&offset=${currentPage * LIMIT}`;
        if (currentCategory !== 'Все') url += `&category=${encodeURIComponent(currentCategory)}`;
        if (q) url += `&search=${encodeURIComponent(q)}`;
        const data = await apiRequest(url);
        skeletonGrid.classList.add('hidden');
        if (!data.products?.length && currentPage === 0) {
            emptyState.style.display = 'flex';
            productsGrid.classList.add('empty');
            loadMoreContainer.style.display = 'none';
            return;
        }
        emptyState.style.display = 'none';
        productsGrid.classList.remove('empty');
        data.products.forEach(p => productsGrid.appendChild(createProductCard(p)));
        currentPage++;
        hasMore = data.products.length === LIMIT;
        loadMoreContainer.style.display = hasMore ? 'flex' : 'none';
    } catch (e) {
        skeletonGrid.classList.add('hidden');
    } finally { isLoading = false; }
}

function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    const inStock = product.quantity > 0;
    const statusText = inStock
        ? random(jokes.productInStock).replace('{qty}', product.quantity)
        : random(jokes.productOutOfStock);
    card.innerHTML = `
        <div class="product-image" onclick="openProduct(${product.id})">
            ${product.photo ? `<img src="${product.photo}" loading="lazy">` : '<span class="placeholder-icon"><i class="fas fa-tshirt"></i></span>'}
            <span class="product-id-badge">#${product.id}</span>
            <button class="product-share-btn" onclick="event.stopPropagation(); shareProduct(${product.id})"><i class="fas fa-share-alt"></i></button>
        </div>
        <div class="product-info">
            <div class="product-name">${escapeHtml(product.name)}</div>
            <div class="product-price">${product.price} <small>BYN</small></div>
            <div class="${inStock ? 'product-status' : 'product-status out-of-stock'}">${statusText}</div>
            <div class="product-actions">
                <button class="product-action-btn btn-cart" onclick="addToCart(${product.id})">
                    <i class="fas fa-shopping-cart"></i> ${random(jokes.cartButton)}
                </button>
            </div>
        </div>
    `;
    return card;
}

async function openProduct(id) {
    try {
        const p = await apiRequest(`/api/products/${id}`);
        const inStock = p.quantity > 0;
        const statusText = inStock
            ? random(jokes.productInStock).replace('{qty}', p.quantity)
            : random(jokes.productOutOfStock);
        modalContent.innerHTML = `
            <div class="modal-product-id">#${p.id}</div>
            <div class="modal-product-image">${p.photo ? `<img src="${p.photo}">` : '<i class="fas fa-tshirt" style="font-size:60px;opacity:0.3;"></i>'}</div>
            <div class="modal-product-name">${escapeHtml(p.name)}</div>
            <div class="modal-product-price">${p.price} BYN</div>
            <div class="${inStock ? 'modal-product-status' : 'modal-product-status out-of-stock'}">${statusText}</div>
            ${p.note ? `<div class="modal-product-note">${escapeHtml(p.note)}</div>` : ''}
            <div class="modal-actions">
                <button class="product-action-btn btn-cart" onclick="addToCart(${p.id}); closeModal();">
                    <i class="fas fa-shopping-cart"></i> ${random(jokes.cartButton)}
                </button>
            </div>
        `;
        modalOverlay.classList.add('open');
    } catch (e) {}
}

function closeModal() { modalOverlay.classList.remove('open'); }

function shareProduct(id) {
    const url = `${window.location.origin}?start=product_${id}`;
    if (navigator.share) navigator.share({ title: 'FAKESHOP', text: `Товар #${id}`, url }).catch(() => {});
    else navigator.clipboard.writeText(url).then(() => showToast('Ссылка скопирована', 'success'));
}

async function addToCart(id, qty = 1) {
    try {
        await apiRequest(`/api/cart/${USER_ID}`, {
            method: 'POST',
            body: JSON.stringify({ product_id: id, quantity: qty })
        });
        await loadCart();
        showToast(random(jokes.addToCart), 'success');
    } catch (e) {}
}

async function loadCart() {
    try {
        const data = await apiRequest(`/api/cart/${USER_ID}`);
        cartItems = data.items || [];
        updateCartUI();
    } catch (e) { cartItems = []; updateCartUI(); }
}

function updateCartUI() {
    const count = cartItems.reduce((s, i) => s + i.quantity, 0);
    cartBadge.textContent = count;
    cartBadge.style.display = count > 0 ? 'flex' : 'none';
    if (cartTitle) cartTitle.textContent = random(jokes.cartTitle);
    if (cartEmpty) cartEmpty.innerHTML = `<i class="fas fa-shopping-basket"></i><p>${random(jokes.cartEmpty)}</p>`;
    if (!cartItems.length) {
        cartItemsContainer.innerHTML = `<div class="cart-empty"><i class="fas fa-shopping-basket"></i><p>${random(jokes.cartEmpty)}</p></div>`;
        cartFooter.style.display = 'none';
        return;
    }
    let total = 0;
    cartItemsContainer.innerHTML = cartItems.map(item => {
        const sub = item.price * item.quantity;
        total += sub;
        return `
            <div class="cart-item">
                <div class="cart-item-image">${item.photo ? `<img src="${item.photo}">` : '<i class="fas fa-tshirt"></i>'}</div>
                <div class="cart-item-info">
                    <div class="cart-item-name">${escapeHtml(item.name)}</div>
                    <div class="cart-item-price">${item.price} BYN</div>
                    <div class="cart-item-qty">
                        <button onclick="updateCartQty(${item.product_id}, -1)">−</button>
                        <span>${item.quantity}</span>
                        <button onclick="updateCartQty(${item.product_id}, 1)">+</button>
                    </div>
                </div>
                <button class="cart-item-remove" onclick="removeFromCart(${item.product_id})"><i class="fas fa-trash-alt"></i></button>
            </div>
        `;
    }).join('');
    cartTotal.textContent = `${total} BYN`;
    cartFooter.style.display = 'block';
}

async function updateCartQty(id, delta) {
    const item = cartItems.find(i => i.product_id === id);
    if (!item) return;
    const newQty = item.quantity + delta;
    if (newQty <= 0) { await removeFromCart(id); return; }
    try {
        await apiRequest(`/api/cart/${USER_ID}/${id}`, { method: 'DELETE' });
        await apiRequest(`/api/cart/${USER_ID}`, {
            method: 'POST',
            body: JSON.stringify({ product_id: id, quantity: newQty })
        });
        await loadCart();
    } catch (e) {}
}

async function removeFromCart(id) {
    try {
        await apiRequest(`/api/cart/${USER_ID}/${id}`, { method: 'DELETE' });
        await loadCart();
        showToast(random(jokes.removeFromCart), 'info');
    } catch (e) {}
}

function openCart() {
    cartPanel.classList.add('open');
    cartOverlay.classList.add('open');
}

function closeCart() {
    cartPanel.classList.remove('open');
    cartOverlay.classList.remove('open');
}

function checkoutFromCart() {
    if (!cartItems.length) { showToast('Корзина пуста', 'error'); return; }
    openOrderForm();
}

function openOrderForm() {
    orderForm.style.display = 'block';
    orderSuccess.style.display = 'none';
    orderModalOverlay.classList.add('open');
    updateOrderSummary();
}

function closeOrderModal() {
    orderModalOverlay.classList.remove('open');
}

async function updateOrderSummary() {
    let total = cartItems.reduce((s, i) => s + i.price * i.quantity, 0);
    orderSubtotal.textContent = `${total} BYN`;
    orderTotal.textContent = `${total} BYN`;
}

async function submitOrder() {
    const phone = orderPhone.value.trim();
    if (!phone) { showToast('Введите номер телефона', 'error'); return; }
    if (!cartItems.length) { showToast('Корзина пуста', 'error'); return; }
    const orderData = {
        user_id: USER_ID,
        username: USERNAME,
        phone: phone,
        address: orderAddress.value.trim(),
        comment: orderComment.value.trim()
    };
    try {
        const result = await apiRequest('/api/orders', { method: 'POST', body: JSON.stringify(orderData) });
        orderForm.style.display = 'none';
        orderSuccess.style.display = 'block';
        orderNumberText.innerHTML = `Номер заказа: <strong>${result.order_number}</strong>`;
        await loadCart();
        showToast(random(jokes.orderSuccess), 'success');
    } catch (e) {}
}

function toggleSearch() {
    searchContainer.classList.toggle('open');
    if (searchContainer.classList.contains('open')) searchInput.focus();
}

function clearSearch() {
    searchInput.value = '';
    searchContainer.classList.remove('open');
    currentPage = 0;
    hasMore = true;
    productsGrid.innerHTML = '';
    loadProducts(true);
}

function loadMore() { loadProducts(); }

function switchAdminTab(tab) {
    adminTab = tab;
    document.querySelectorAll('.admin-tab').forEach(el => el.classList.remove('active'));
    document.querySelectorAll('.admin-nav-btn').forEach(el => el.classList.remove('active'));
    const targetTab = document.getElementById(`tab-${tab}`);
    if (targetTab) targetTab.classList.add('active');
    const targetBtn = document.querySelector(`.admin-nav-btn[data-tab="${tab}"]`);
    if (targetBtn) targetBtn.classList.add('active');
    const loaders = {
        dashboard: loadDashboard,
        products: loadAdminProducts,
        categories: loadAdminCategories,
        orders: loadAdminOrders,
        promocodes: loadPromoCodes,
        faq: loadFaq,
        banned: loadBannedUsers,
        settings: loadSettings,
        reviews: loadTelegramReviews
    };
    if (loaders[tab]) loaders[tab]();
}

async function loadDashboard() {
    try {
        const stats = await apiRequest('/api/stats');
        const el = document.getElementById('statProducts');
        if (el) el.textContent = stats.total_products || 0;
        const el2 = document.getElementById('statOrders');
        if (el2) el2.textContent = stats.total_orders || 0;
        const el3 = document.getElementById('statRevenue');
        if (el3) el3.textContent = `${stats.total_revenue || 0} BYN`;
        const el4 = document.getElementById('statUsers');
        if (el4) el4.textContent = stats.total_users || 0;
    } catch (e) {}
}

async function loadAdminProducts() {
    const list = document.getElementById('adminProductsList');
    if (!list) return;
    list.innerHTML = '<div style="padding:20px;text-align:center;color:#666;">Загрузка...</div>';
    try {
        const data = await apiRequest('/api/products?limit=100');
        const products = data.products || [];
        if (!products.length) { list.innerHTML = '<div class="empty-state"><p>Товаров не найдено</p></div>'; return; }
        list.innerHTML = products.map(p => `
            <div class="admin-list-item">
                <div class="admin-list-item-info">
                    <div class="admin-list-item-title">#${p.id} ${escapeHtml(p.name)}</div>
                    <div class="admin-list-item-sub">${p.price} BYN · ${p.quantity} шт · ${p.category || 'Все'} ${p.quantity > 0 ? '✅' : '❌'} ${p.from_china ? '🌏 Из Китая' : ''}</div>
                </div>
                <div class="admin-list-actions">
                    <button class="view-btn" onclick="openProduct(${p.id})"><i class="fas fa-eye"></i></button>
                    <button class="edit-btn" onclick="editProduct(${p.id})"><i class="fas fa-pen"></i></button>
                    <button class="delete-btn" onclick="deleteProduct(${p.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `).join('');
    } catch (e) { list.innerHTML = '<div class="empty-state"><p>Ошибка</p></div>'; }
}

function toggleProductForm() {
    const c = document.getElementById('productFormContainer');
    if (!c) return;
    c.style.display = c.style.display === 'none' ? 'block' : 'none';
    if (c.style.display === 'block') {
        ['productName', 'productPrice', 'productQuantity', 'productPhoto', 'productNote'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        const cat = document.getElementById('productCategory');
        if (cat) cat.value = 'Все';
        const ch = document.getElementById('productFromChina');
        if (ch) ch.checked = false;
        const submit = document.getElementById('productFormSubmit');
        if (submit) { submit.dataset.productId = ''; submit.textContent = 'Сохранить'; }
    }
}

async function saveProduct() {
    const name = document.getElementById('productName')?.value.trim();
    const price = parseFloat(document.getElementById('productPrice')?.value);
    const quantity = parseInt(document.getElementById('productQuantity')?.value);
    const category = document.getElementById('productCategory')?.value || 'Все';
    const photo = document.getElementById('productPhoto')?.value.trim();
    const note = document.getElementById('productNote')?.value.trim();
    const fromChina = document.getElementById('productFromChina')?.checked ? 1 : 0;
    const editId = document.getElementById('productFormSubmit')?.dataset.productId;
    if (!name || isNaN(price) || isNaN(quantity)) {
        showToast('Заполните все поля', 'error');
        return;
    }
    const data = { name, price, quantity, category, photo, note, from_china: fromChina };
    try {
        if (editId) {
            await apiRequest(`/api/products/${editId}`, { method: 'PUT', body: JSON.stringify(data) });
            showToast('Товар обновлён', 'success');
        } else {
            await apiRequest('/api/products', { method: 'POST', body: JSON.stringify(data) });
            showToast('Товар создан', 'success');
        }
        toggleProductForm();
        loadAdminProducts();
        loadProducts(true);
    } catch (e) {}
}

async function editProduct(id) {
    try {
        const p = await apiRequest(`/api/products/${id}`);
        toggleProductForm();
        const title = document.getElementById('productFormTitle');
        if (title) title.textContent = 'Редактировать товар';
        ['productName', 'productPrice', 'productQuantity', 'productPhoto', 'productNote'].forEach(f => {
            const el = document.getElementById(f);
            if (el) el.value = p[f.replace('product', '').toLowerCase()] || '';
        });
        const cat = document.getElementById('productCategory');
        if (cat) cat.value = p.category || 'Все';
        const ch = document.getElementById('productFromChina');
        if (ch) ch.checked = p.from_china == 1;
        const submit = document.getElementById('productFormSubmit');
        if (submit) { submit.dataset.productId = id; submit.textContent = 'Обновить'; }
    } catch (e) {}
}

async function deleteProduct(id) {
    if (!confirm('Удалить товар?')) return;
    try {
        await apiRequest(`/api/products/${id}`, { method: 'DELETE' });
        showToast('Товар удалён', 'info');
        loadAdminProducts();
        loadProducts(true);
    } catch (e) {}
}

async function loadAdminCategories() {
    const list = document.getElementById('adminCategoriesList');
    if (!list) return;
    list.innerHTML = '<div style="padding:20px;text-align:center;color:#666;">Загрузка...</div>';
    try {
        const cats = await apiRequest('/api/categories');
        if (!cats.length) { list.innerHTML = '<div class="empty-state"><p>Категорий нет</p></div>'; return; }
        list.innerHTML = cats.map(c => `
            <div class="admin-list-item">
                <div class="admin-list-item-info">
                    <div class="admin-list-item-title">${c.icon || '📁'} ${c.name}</div>
                    <div class="admin-list-item-sub">ID: ${c.id} ${c.name === 'Все' ? '· Системная' : ''}</div>
                </div>
                ${c.name !== 'Все' ? `
                <div class="admin-list-actions">
                    <button class="edit-btn" onclick="editCategory(${c.id}, '${c.name}', '${c.icon || ''}')"><i class="fas fa-pen"></i></button>
                    <button class="delete-btn" onclick="deleteCategory(${c.id})"><i class="fas fa-trash"></i></button>
                </div>` : ''}
            </div>
        `).join('');
    } catch (e) { list.innerHTML = '<div class="empty-state"><p>Ошибка</p></div>'; }
}

function toggleCategoryForm() {
    const c = document.getElementById('categoryFormContainer');
    if (!c) return;
    c.style.display = c.style.display === 'none' ? 'block' : 'none';
    if (c.style.display === 'block') {
        ['categoryName', 'categoryIcon'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        const submit = document.getElementById('categoryFormSubmit');
        if (submit) { submit.dataset.categoryId = ''; submit.textContent = 'Сохранить'; }
    }
}

async function saveCategory() {
    const name = document.getElementById('categoryName')?.value.trim();
    const icon = document.getElementById('categoryIcon')?.value.trim();
    const editId = document.getElementById('categoryFormSubmit')?.dataset.categoryId;
    if (!name) { showToast('Введите название', 'error'); return; }
    try {
        if (editId) {
            await apiRequest(`/api/categories/${editId}`, {
                method: 'PUT',
                body: JSON.stringify({ name, icon, user_id: USER_ID })
            });
            showToast('Категория обновлена', 'success');
        } else {
            await apiRequest('/api/categories', {
                method: 'POST',
                body: JSON.stringify({ name, icon, user_id: USER_ID })
            });
            showToast('Категория создана', 'success');
        }
        toggleCategoryForm();
        loadAdminCategories();
        loadCategories();
    } catch (e) {}
}

function editCategory(id, name, icon) {
    toggleCategoryForm();
    const nameEl = document.getElementById('categoryName');
    const iconEl = document.getElementById('categoryIcon');
    if (nameEl) nameEl.value = name;
    if (iconEl) iconEl.value = icon;
    const submit = document.getElementById('categoryFormSubmit');
    if (submit) { submit.dataset.categoryId = id; submit.textContent = 'Обновить'; }
}

async function deleteCategory(id) {
    if (!confirm('Удалить категорию?')) return;
    try {
        await apiRequest(`/api/categories/${id}?user_id=${USER_ID}`, { method: 'DELETE' });
        showToast('Категория удалена', 'info');
        loadAdminCategories();
        loadCategories();
    } catch (e) {}
}

async function loadAdminOrders() {
    const list = document.getElementById('adminOrdersList');
    if (!list) return;
    list.innerHTML = '<div style="padding:20px;text-align:center;color:#666;">Загрузка...</div>';
    try {
        const orders = await apiRequest('/api/orders');
        if (!orders.length) { list.innerHTML = '<div class="empty-state"><p>Заявок нет</p></div>'; return; }
        list.innerHTML = orders.map(o => `
            <div class="admin-list-item">
                <div class="admin-list-item-info">
                    <div class="admin-list-item-title">${o.order_number || '#' + o.id}</div>
                    <div class="admin-list-item-sub">${o.username || 'Гость'} · ${o.phone || '-'}</div>
                    <div class="admin-list-item-sub">${o.final_total} BYN · <span class="status-badge ${o.status}">${o.status}</span></div>
                </div>
                <div class="admin-list-actions">
                    ${o.status !== 'completed' && o.status !== 'cancelled' ? `
                        <button class="edit-btn" onclick="acceptOrder(${o.id}, ${o.user_id})"><i class="fas fa-check"></i> Принять</button>
                    ` : ''}
                    <button class="delete-btn" onclick="deleteOrder(${o.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `).join('');
    } catch (e) { list.innerHTML = '<div class="empty-state"><p>Ошибка</p></div>'; }
}

async function acceptOrder(id, userId) {
    if (!confirm('Принять заказ и открыть чат?')) return;
    try {
        await apiRequest(`/api/orders/${id}`, { method: 'DELETE' });
        if (userId) window.open(`tg://user?id=${userId}`, '_blank');
        showToast('Заказ принят', 'success');
        loadAdminOrders();
    } catch (e) {}
}

async function deleteOrder(id) {
    if (!confirm('Удалить заявку?')) return;
    try {
        await apiRequest(`/api/orders/${id}`, { method: 'DELETE' });
        showToast('Заявка удалена', 'info');
        loadAdminOrders();
    } catch (e) {}
}

async function loadPromoCodes() {
    const list = document.getElementById('adminPromoCodes');
    if (!list) return;
    try {
        const data = await apiRequest('/api/promocodes');
        if (!data.length) { list.innerHTML = '<div class="empty-state"><p>Промокодов нет</p></div>'; return; }
        list.innerHTML = data.map(p => `
            <div class="admin-list-item">
                <div class="admin-list-item-info">
                    <div class="admin-list-item-title">${p.code}</div>
                    <div class="admin-list-item-sub">Скидка ${p.discount}%</div>
                </div>
                <div class="admin-list-actions">
                    <button class="delete-btn" onclick="deletePromo('${p.code}')"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `).join('');
    } catch (e) { list.innerHTML = '<div class="empty-state"><p>Ошибка</p></div>'; }
}

function togglePromoForm() {
    const c = document.getElementById('promoFormContainer');
    if (!c) return;
    c.style.display = c.style.display === 'none' ? 'block' : 'none';
}

async function savePromo() {
    const code = document.getElementById('promoCode')?.value.trim().toUpperCase();
    const discount = parseInt(document.getElementById('promoDiscount')?.value);
    if (!code || isNaN(discount)) { showToast('Заполните код и скидку', 'error'); return; }
    try {
        await apiRequest(`/api/promocodes?code=${code}&discount=${discount}`, { method: 'POST' });
        showToast('Промокод создан', 'success');
        togglePromoForm();
        loadPromoCodes();
    } catch (e) {}
}

async function deletePromo(code) {
    if (!confirm(`Удалить промокод ${code}?`)) return;
    try {
        await apiRequest(`/api/promocodes/${code}`, { method: 'DELETE' });
        showToast('Промокод удален', 'info');
        loadPromoCodes();
    } catch (e) {}
}

async function loadFaq() {
    const list = document.getElementById('adminFaqList');
    if (!list) return;
    try {
        const data = await apiRequest('/api/faq');
        if (!data.length) { list.innerHTML = '<div class="empty-state"><p>FAQ пуст</p></div>'; return; }
        list.innerHTML = data.map(f => `
            <div class="admin-list-item">
                <div class="admin-list-item-info">
                    <div class="admin-list-item-title">${escapeHtml(f.question)}</div>
                    <div class="admin-list-item-sub">${escapeHtml(f.answer)}</div>
                </div>
                <div class="admin-list-actions">
                    <button class="delete-btn" onclick="deleteFaq(${f.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>
        `).join('');
    } catch (e) { list.innerHTML = '<div class="empty-state"><p>Ошибка</p></div>'; }
}

function toggleFaqForm() {
    const c = document.getElementById('faqFormContainer');
    if (!c) return;
    c.style.display = c.style.display === 'none' ? 'block' : 'none';
}

async function saveFaq() {
    const question = document.getElementById('faqQuestion')?.value.trim();
    const answer = document.getElementById('faqAnswer')?.value.trim();
    if (!question || !answer) { showToast('Заполните вопрос и ответ', 'error'); return; }
    try {
        await apiRequest(`/api/faq?question=${encodeURIComponent(question)}&answer=${encodeURIComponent(answer)}`, { method: 'POST' });
        showToast('FAQ добавлен', 'success');
        toggleFaqForm();
        loadFaq();
    } catch (e) {}
}

async function deleteFaq(id) {
    if (!confirm('Удалить FAQ?')) return;
    try {
        await apiRequest(`/api/faq/${id}`, { method: 'DELETE' });
        showToast('FAQ удален', 'info');
        loadFaq();
    } catch (e) {}
}

async function loadBannedUsers() {
    const list = document.getElementById('adminBannedList');
    if (!list) return;
    try {
        const data = await apiRequest('/api/banned');
        if (!data.length) { list.innerHTML = '<div class="empty-state"><p>Забаненных нет</p></div>'; return; }
        list.innerHTML = data.map(b => `
            <div class="admin-list-item">
                <div class="admin-list-item-info">
                    <div class="admin-list-item-title">${b.user_id}</div>
                </div>
                <div class="admin-list-actions">
                    <button class="edit-btn" onclick="unbanUser(${b.user_id})"><i class="fas fa-check"></i></button>
                </div>
            </div>
        `).join('');
    } catch (e) { list.innerHTML = '<div class="empty-state"><p>Ошибка</p></div>'; }
}

async function banUser() {
    const userId = parseInt(document.getElementById('banUserId')?.value);
    if (!userId) { showToast('Введите ID пользователя', 'error'); return; }
    try {
        await apiRequest(`/api/banned/${userId}`, { method: 'POST' });
        showToast(`Пользователь ${userId} забанен`, 'info');
        document.getElementById('banUserId').value = '';
        loadBannedUsers();
    } catch (e) {}
}

async function unbanUser(userId) {
    if (!confirm(`Разбанить ${userId}?`)) return;
    try {
        await apiRequest(`/api/banned/${userId}`, { method: 'DELETE' });
        showToast(`Пользователь ${userId} разбанен`, 'success');
        loadBannedUsers();
    } catch (e) {}
}

async function loadSettings() {
    try {
        const data = await apiRequest('/api/settings');
        if (data) {
            const nameEl = document.getElementById('settingShopName');
            if (nameEl) nameEl.value = data.shop_name || '';
            const contactEl = document.getElementById('settingContactManager');
            if (contactEl) contactEl.value = data.contact_manager || '';
        }
    } catch (e) {}
}

async function saveSettings() {
    const name = document.getElementById('settingShopName')?.value.trim();
    const contact = document.getElementById('settingContactManager')?.value.trim();
    try {
        await apiRequest('/api/settings', {
            method: 'PUT',
            body: JSON.stringify({ shop_name: name, contact_manager: contact })
        });
        showToast('Настройки сохранены', 'success');
    } catch (e) {}
}

async function loadTelegramReviews() {
    const list = document.getElementById('adminReviewsList');
    if (!list) return;
    list.innerHTML = '<div style="padding:20px;text-align:center;color:#666;">Загрузка отзывов...</div>';
    try {
        const data = await apiRequest('/api/reviews/telegram');
        if (data.error) {
            list.innerHTML = `<div class="empty-state"><p>Ошибка: ${data.error}</p></div>`;
            return;
        }
        const reviews = data.reviews || [];
        if (!reviews.length) {
            list.innerHTML = '<div class="empty-state"><p>Отзывов не найдено</p></div>';
            return;
        }
        list.innerHTML = reviews.map(r => `
            <div class="admin-list-item">
                <div class="admin-list-item-info">
                    <div class="admin-list-item-title">${escapeHtml(r.text.substring(0, 100))}${r.text.length > 100 ? '...' : ''}</div>
                    <div class="admin-list-item-sub">${r.date ? new Date(r.date).toLocaleString() : 'Дата не указана'} · ${r.views || 0} просмотров</div>
                </div>
            </div>
        `).join('');
    } catch (e) {
        list.innerHTML = '<div class="empty-state"><p>Ошибка загрузки отзывов</p></div>';
    }
}

function openSendAll() {
    const modal = document.getElementById('sendAllModal');
    if (modal) modal.classList.add('open');
}

function closeSendAll() {
    const modal = document.getElementById('sendAllModal');
    if (modal) {
        modal.classList.remove('open');
        const text = document.getElementById('sendAllText');
        if (text) text.value = '';
    }
}

async function sendAll() {
    const text = document.getElementById('sendAllText')?.value.trim();
    if (!text) {
        showToast('Введите текст рассылки', 'error');
        return;
    }
    if (!confirm('Отправить рассылку всем пользователям?')) return;
    try {
        await apiRequest('/api/send_all', { method: 'POST', body: JSON.stringify({ text }) });
        showToast('Рассылка отправлена', 'success');
        closeSendAll();
    } catch (e) {
        showToast('Ошибка отправки', 'error');
    }
}

async function init() {
    tg.ready();
    if (isAdmin()) {
        adminToggleBtn.style.display = 'flex';
        adminToggleBtn.innerHTML = '<i class="fas fa-crown"></i>';
    }
    await loadCategories();
    await loadProducts(true);
    await loadCart();

    searchToggle?.addEventListener('click', toggleSearch);
    searchClear?.addEventListener('click', clearSearch);
    searchInput?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            currentPage = 0;
            hasMore = true;
            productsGrid.innerHTML = '';
            loadProducts(true);
            searchContainer.classList.remove('open');
        }
    });
    cartBtn?.addEventListener('click', openCart);
    cartClose?.addEventListener('click', closeCart);
    cartOverlay?.addEventListener('click', closeCart);
    checkoutBtn?.addEventListener('click', checkoutFromCart);
    modalClose?.addEventListener('click', closeModal);
    modalOverlay?.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
    });
    orderModalClose?.addEventListener('click', closeOrderModal);
    orderModalOverlay?.addEventListener('click', (e) => {
        if (e.target === orderModalOverlay) closeOrderModal();
    });
    orderCloseBtn?.addEventListener('click', closeOrderModal);
    submitOrderBtn?.addEventListener('click', submitOrder);
    loadMoreBtn?.addEventListener('click', loadMore);
    adminToggleBtn?.addEventListener('click', toggleAdminMode);

    document.querySelectorAll('.admin-nav-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            switchAdminTab(btn.dataset.tab);
        });
    });

    document.getElementById('addProductBtn')?.addEventListener('click', toggleProductForm);
    document.getElementById('productFormCancel')?.addEventListener('click', toggleProductForm);
    document.getElementById('productFormSubmit')?.addEventListener('click', saveProduct);

    document.getElementById('addCategoryBtn')?.addEventListener('click', toggleCategoryForm);
    document.getElementById('categoryFormCancel')?.addEventListener('click', toggleCategoryForm);
    document.getElementById('categoryFormSubmit')?.addEventListener('click', saveCategory);

    document.getElementById('addPromoBtn')?.addEventListener('click', togglePromoForm);
    document.getElementById('promoFormCancel')?.addEventListener('click', togglePromoForm);
    document.getElementById('promoFormSubmit')?.addEventListener('click', savePromo);

    document.getElementById('addFaqBtn')?.addEventListener('click', toggleFaqForm);
    document.getElementById('faqFormCancel')?.addEventListener('click', toggleFaqForm);
    document.getElementById('faqFormSubmit')?.addEventListener('click', saveFaq);

    document.getElementById('banUserBtn')?.addEventListener('click', banUser);
    document.getElementById('settingsSaveBtn')?.addEventListener('click', saveSettings);
    document.getElementById('sendAllBtn')?.addEventListener('click', openSendAll);
    document.getElementById('sendAllClose')?.addEventListener('click', closeSendAll);
    document.getElementById('sendAllSubmit')?.addEventListener('click', sendAll);

    document.getElementById('confirmCancel')?.addEventListener('click', () => {
        document.getElementById('confirmModal')?.classList.remove('open');
    });
    document.getElementById('confirmOk')?.addEventListener('click', () => {
        document.getElementById('confirmModal')?.classList.remove('open');
        if (window._confirmAction) {
            window._confirmAction();
            window._confirmAction = null;
        }
    });

    // Deep link
    const params = new URLSearchParams(window.location.search);
    const startParam = params.get('start');
    if (startParam && startParam.startsWith('product_')) {
        const productId = parseInt(startParam.replace('product_', ''));
        if (productId) {
            setTimeout(() => openProduct(productId), 500);
        }
    }

    console.log('FAKESHOP инициализирован');
    console.log('User ID:', USER_ID);
}

document.addEventListener('DOMContentLoaded', init);
