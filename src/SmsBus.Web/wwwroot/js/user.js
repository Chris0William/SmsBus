let userBalance = 0;
let usdCnyRate = 7.25;
let currentActPrice = 0;

// ==================== 初始化 ====================

(async () => {
    try {
        const res = await fetch('/api/user/info');
        if (!res.ok) { window.location.href = '/login'; return; }
        const data = await res.json();
        userBalance = data.balance;
        usdCnyRate = data.usdCnyRate || 7.25;
        document.getElementById('userInfo').textContent =
            `${data.email} | 余额: $${data.balance.toFixed(2)} (¥${(data.balance * usdCnyRate).toFixed(2)})`;
    } catch { window.location.href = '/login'; }
})();

async function doLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
}

// ==================== 标签切换 ====================

function switchTab(tab) {
    const tabs = { activation: 'tabAct', rental: 'tabRent', orders: 'tabOrders', transactions: 'tabTx' };
    const panels = { activation: 'panelActivation', rental: 'panelRental', orders: 'panelOrders', transactions: 'panelTransactions' };

    Object.entries(tabs).forEach(([k, id]) => {
        const el = document.getElementById(id);
        if (k === tab) { el.className = 'px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white'; }
        else { el.className = 'px-4 py-2 rounded-lg text-sm font-medium bg-gray-200 text-gray-700'; }
    });
    Object.entries(panels).forEach(([k, id]) => {
        document.getElementById(id).classList.toggle('hidden', k !== tab);
    });

    if (tab === 'orders') loadOrders();
    if (tab === 'transactions') loadTransactions();
    if (tab === 'rental') loadRentalCountries();
}

// ==================== 一次性接码 ====================

async function queryActivation() {
    const service = document.getElementById('actService').value.trim();
    const country = document.getElementById('actCountry').value.trim();
    if (!service || !country) return;

    const res = await fetch(`/api/services/activation/count?service=${service}&country=${country}`);
    const data = await res.json();

    document.getElementById('actCount').textContent = data.total;
    currentActPrice = data.userPrice;
    const priceText = `$${data.userPrice.toFixed(2)} (¥${(data.userPrice * usdCnyRate).toFixed(2)})`;
    document.getElementById('actPrice').textContent = data.markup > 0
        ? `${priceText} (含加价 $${data.markup.toFixed(2)})`
        : priceText;

    document.getElementById('actInfo').classList.remove('hidden');
    const buyBtn = document.getElementById('actBuyBtn');
    buyBtn.classList.remove('hidden');
    buyBtn.textContent = data.total > 0 ? `购买 $${data.userPrice.toFixed(2)}` : '无可用号码';
    buyBtn.disabled = data.total <= 0;
}

async function buyActivation() {
    const btn = document.getElementById('actBuyBtn');
    btn.disabled = true;
    btn.textContent = '购买中...';

    try {
        const res = await fetch('/api/user/purchase/activation', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                serviceCode: document.getElementById('actService').value.trim(),
                countryCode: document.getElementById('actCountry').value.trim(),
                serviceName: document.getElementById('actService').value.trim(),
                countryName: document.getElementById('actCountry').value.trim()
            })
        });
        const data = await res.json();

        if (!res.ok) {
            alert(data.error || '购买失败');
            btn.disabled = false;
            btn.textContent = `购买 $${currentActPrice.toFixed(2)}`;
            return;
        }

        // 显示结果并开始轮询
        document.getElementById('actResult').classList.remove('hidden');
        pollActivation(data.orderId);
        refreshUserInfo();
    } catch (e) {
        alert('购买失败: ' + e.message);
        btn.disabled = false;
        btn.textContent = `购买 $${currentActPrice.toFixed(2)}`;
    }
}

async function pollActivation(orderId) {
    const el = document.getElementById('actResultContent');
    el.innerHTML = '<p class="text-gray-500">等待短信中...</p>';

    for (let i = 0; i < 60; i++) {
        await new Promise(r => setTimeout(r, 3000));
        try {
            const res = await fetch(`/api/user/orders/${orderId}/poll`);
            const data = await res.json();

            if (data.status === 'received') {
                el.innerHTML = `
                    <p class="text-green-600 font-medium">收到短信!</p>
                    <p class="text-sm mt-1">号码: ${data.number}</p>
                    <p class="text-sm">验证码: <span class="font-mono text-lg font-bold text-blue-600">${data.verificationCode || '-'}</span></p>
                    <p class="text-sm text-gray-500 mt-1">${data.smsContent || ''}</p>`;
                return;
            }
            if (data.status === 'expired' || data.status === 'cancelled') {
                el.innerHTML = `<p class="text-red-500">订单已${data.status === 'expired' ? '过期' : '取消'}</p>`;
                return;
            }
        } catch { /* 继续 */ }
    }
    el.innerHTML = '<p class="text-gray-500">轮询超时，请在订单列表中查看</p>';
}

// ==================== 租赁 ====================

let rentalCountriesLoaded = false;

async function loadRentalCountries() {
    if (rentalCountriesLoaded) return;
    const res = await fetch('/api/services/rental/countries');
    const countries = await res.json();
    const sel = document.getElementById('rentCountry');
    sel.innerHTML = countries.map(c => `<option value="${c.code}">${c.name} (${c.code})</option>`).join('');
    rentalCountriesLoaded = true;
    loadRentalServices();
}

async function loadRentalServices() {
    const country = document.getElementById('rentCountry').value;
    const dtype = document.getElementById('rentDtype').value;
    const dcount = document.getElementById('rentDcount').value;
    if (!country) return;

    const res = await fetch(`/api/services/rental/services?country=${country}&dtype=${dtype}&dcount=${dcount}`);
    const services = await res.json();
    const el = document.getElementById('rentServices');

    el.innerHTML = services.map(s => `
        <div class="flex items-center justify-between p-2 border rounded hover:bg-gray-50">
            <div>
                <span class="font-medium text-sm">${s.name}</span>
                <span class="text-xs text-gray-500 ml-1">(${s.code})</span>
                <span class="text-xs text-gray-400 ml-1">${s.count}个</span>
            </div>
            <div class="flex items-center gap-2">
                <span class="text-sm font-medium">$${s.userPrice.toFixed(2)}</span>
                <button onclick="buyRental('${s.code}','${s.name}',${s.userPrice})"
                    class="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                    ${s.count <= 0 ? 'disabled' : ''}>购买</button>
            </div>
        </div>`).join('');
}

async function buyRental(serviceCode, serviceName, price) {
    if (!confirm(`确认购买 ${serviceName}，价格 $${price.toFixed(2)}？`)) return;

    const res = await fetch('/api/user/purchase/rental', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            serviceCode,
            countryCode: document.getElementById('rentCountry').value,
            countryName: document.getElementById('rentCountry').options[document.getElementById('rentCountry').selectedIndex].text,
            serviceName,
            dtype: document.getElementById('rentDtype').value,
            dcount: parseInt(document.getElementById('rentDcount').value)
        })
    });
    const data = await res.json();

    if (!res.ok) { alert(data.error || '购买失败'); return; }

    document.getElementById('rentResult').classList.remove('hidden');
    document.getElementById('rentResultContent').innerHTML = `
        <p class="text-green-600 font-medium">购买成功!</p>
        <p class="text-sm mt-1">订单号: ${data.orderId}</p>
        <p class="text-sm">扣款: $${data.totalPrice.toFixed(2)}</p>
        <p class="text-sm text-gray-500 mt-1">请到「我的订单」查看详情</p>`;
    refreshUserInfo();
}

// ==================== 我的订单 ====================

async function loadOrders() {
    const res = await fetch('/api/user/orders');
    const orders = await res.json();
    const el = document.getElementById('ordersList');
    const empty = document.getElementById('ordersEmpty');

    if (orders.length === 0) {
        el.innerHTML = '';
        empty.classList.remove('hidden');
        return;
    }
    empty.classList.add('hidden');

    el.innerHTML = orders.map(o => {
        const statusClass = { waiting: 'text-yellow-600', received: 'text-green-600', cancelled: 'text-gray-400', expired: 'text-red-500' }[o.status] || 'text-blue-600';
        const statusText = { waiting: '等待中', received: '已收到', cancelled: '已取消', expired: '已过期', activating: '激活中', active: '活跃' }[o.status] || o.status;

        return `
        <div class="border rounded-lg p-3">
            <div class="flex justify-between items-start">
                <div>
                    <span class="font-medium text-sm">${o.serviceName}</span>
                    <span class="text-xs text-gray-500 ml-1">${o.countryName}</span>
                    <span class="text-xs ${statusClass} ml-2">${statusText}</span>
                    <span class="text-xs text-gray-400 ml-1">${o.source === 'admin' ? '(管理员分配)' : ''}</span>
                </div>
                <span class="text-xs text-gray-400">${new Date(o.purchasedAt).toLocaleString()}</span>
            </div>
            <div class="mt-1 text-sm">
                <span class="font-mono">${o.number || '-'}</span>
                <span class="text-gray-400 ml-2">$${o.totalPrice.toFixed(2)}</span>
            </div>
            ${o.verificationCode ? `<div class="mt-1"><span class="font-mono text-lg font-bold text-blue-600">${o.verificationCode}</span>
                <button onclick="navigator.clipboard.writeText('${o.verificationCode}')" class="text-xs text-gray-400 ml-2 hover:text-blue-600">复制</button></div>` : ''}
            ${o.smsContent ? `<div class="text-xs text-gray-500 mt-1">${o.smsContent}</div>` : ''}
            ${o.status === 'waiting' ? `<button onclick="cancelOrder('${o.orderId}')" class="mt-2 text-xs text-red-500 hover:text-red-700">取消订单</button>` : ''}
            ${o.status === 'waiting' ? `<button onclick="pollOrder('${o.orderId}')" class="mt-2 text-xs text-blue-500 hover:text-blue-700 ml-3">刷新状态</button>` : ''}
        </div>`;
    }).join('');
}

async function cancelOrder(orderId) {
    if (!confirm('确认取消此订单？余额将退回。')) return;
    const res = await fetch(`/api/user/orders/${orderId}/cancel`, { method: 'POST' });
    if (res.ok) { loadOrders(); refreshUserInfo(); }
    else { const d = await res.json(); alert(d.error || '取消失败'); }
}

async function pollOrder(orderId) {
    await fetch(`/api/user/orders/${orderId}/poll`);
    loadOrders();
}

// ==================== 余额流水 ====================

async function loadTransactions() {
    const res = await fetch('/api/user/transactions');
    const list = await res.json();
    const el = document.getElementById('txList');
    const empty = document.getElementById('txEmpty');

    if (list.length === 0) { el.innerHTML = ''; empty.classList.remove('hidden'); return; }
    empty.classList.add('hidden');

    el.innerHTML = list.map(t => {
        const typeText = { recharge: '充值', purchase: '消费', refund: '退款' }[t.type] || t.type;
        const amtClass = t.amount >= 0 ? 'text-green-600' : 'text-red-500';
        return `<tr class="border-b">
            <td class="py-2">${new Date(t.createdAt).toLocaleString()}</td>
            <td>${typeText}</td>
            <td class="${amtClass}">$${t.amount >= 0 ? '+' : ''}${t.amount.toFixed(2)}</td>
            <td class="text-gray-500">${t.description || ''}</td>
        </tr>`;
    }).join('');
}

// ==================== 工具函数 ====================

async function refreshUserInfo() {
    const res = await fetch('/api/user/info');
    if (!res.ok) return;
    const data = await res.json();
    userBalance = data.balance;
    document.getElementById('userInfo').textContent =
        `${data.email} | 余额: $${data.balance.toFixed(2)} (¥${(data.balance * usdCnyRate).toFixed(2)})`;
}
