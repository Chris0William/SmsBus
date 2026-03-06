// 从 URL 提取 requestId: /s/12345
const pathParts = location.pathname.split('/');
const requestId = pathParts[pathParts.length - 1];

let pollingTimer = null;
let currentMode = null; // 'activation' | 'rental'

async function loadOrder() {
    try {
        const res = await fetch(`/api/orders/${requestId}`);
        if (res.status === 404) {
            showNotFound();
            return;
        }
        const order = await res.json();
        currentMode = order.mode;
        showOrder(order);

        // 一次性：等待中才轮询；租赁：只要没取消就一直轮询
        if (order.mode === 'rental') {
            if (!['cancelled', 'expired'].includes(order.status)) {
                startPolling();
            }
        } else {
            if (['waiting', 'activating', 'active'].includes(order.status)) {
                startPolling();
            }
        }
    } catch {
        showNotFound();
    }
}

function showOrder(order) {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('content').classList.remove('hidden');
    document.getElementById('notFound').classList.add('hidden');

    document.getElementById('phoneNumber').textContent = order.number;
    document.getElementById('countryBadge').textContent = order.countryName;
    document.getElementById('projectBadge').textContent = order.serviceName || order.projectName;

    // 隐藏所有状态
    document.getElementById('waitingState').classList.add('hidden');
    document.getElementById('receivedState').classList.add('hidden');
    document.getElementById('rentalSmsState').classList.add('hidden');
    document.getElementById('cancelledState').classList.add('hidden');

    // 模式标签
    const modeBadge = document.getElementById('modeBadge');
    if (order.mode === 'rental') {
        modeBadge.textContent = '租赁';
        modeBadge.className = 'text-xs bg-purple-50 text-purple-600 px-2 py-1 rounded';
        modeBadge.classList.remove('hidden');
    } else {
        modeBadge.classList.add('hidden');
    }

    if (order.status === 'cancelled' || order.status === 'expired') {
        document.getElementById('cancelledState').classList.remove('hidden');
        stopPolling();
        return;
    }

    if (order.mode === 'rental') {
        // 租赁模式：显示短信列表区域
        showRentalSms(order);
    } else {
        // 一次性模式
        if (['waiting', 'activating', 'active'].includes(order.status)) {
            document.getElementById('waitingState').classList.remove('hidden');
        } else if (order.status === 'received') {
            document.getElementById('receivedState').classList.remove('hidden');
            document.getElementById('codeDisplay').textContent = order.verificationCode || '--';
            document.getElementById('smsBody').textContent = '短信原文: ' + (order.smsContent || '');
            document.title = '验证码: ' + (order.verificationCode || '--');
            stopPolling();
        }
    }
}

function showRentalSms(order) {
    const container = document.getElementById('smsListContainer');
    const smsList = order.smsList || [];

    document.getElementById('rentalSmsState').classList.remove('hidden');

    if (smsList.length === 0) {
        // 没有短信，显示等待
        document.getElementById('waitingState').classList.remove('hidden');
        container.innerHTML = '';
        return;
    }

    // 渲染短信列表（最新的在最上面）
    const reversed = [...smsList].reverse();
    container.innerHTML = reversed.map((sms, i) => {
        const time = sms.receivedAt ? formatTime(sms.receivedAt) : '';
        const code = sms.code || '';
        const isLatest = i === 0;

        return `<div class="bg-gray-50 rounded-lg p-3 ${isLatest ? 'ring-2 ring-green-200' : ''}">
            <div class="flex items-center justify-between mb-1">
                <span class="text-xs text-gray-400">${time}</span>
                ${code ? `<button onclick="copyText('${escapeHtml(code)}')" class="text-xs bg-green-500 text-white px-2 py-0.5 rounded hover:bg-green-600 active:scale-95 transition">
                    复制验证码: ${escapeHtml(code)}
                </button>` : ''}
            </div>
            <div class="text-sm text-gray-600">${escapeHtml(sms.text)}</div>
        </div>`;
    }).join('');

    // 更新标题
    const latest = smsList[smsList.length - 1];
    if (latest.code) {
        document.title = '验证码: ' + latest.code;
    }
}

function formatTime(dateStr) {
    try {
        const d = new Date(dateStr);
        return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
    } catch { return ''; }
}

function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
}

function showNotFound() {
    document.getElementById('loading').classList.add('hidden');
    document.getElementById('notFound').classList.remove('hidden');
}

function startPolling() {
    if (pollingTimer) return;
    pollingTimer = setInterval(async () => {
        try {
            const res = await fetch(`/api/orders/${requestId}/poll`);
            if (!res.ok) return;
            const order = await res.json();
            showOrder(order);
        } catch { /* 忽略网络错误，继续轮询 */ }
    }, 5000);
}

function stopPolling() {
    if (pollingTimer) {
        clearInterval(pollingTimer);
        pollingTimer = null;
    }
}

function copyCode() {
    const code = document.getElementById('codeDisplay').textContent;
    copyText(code);
}

function copyText(text) {
    doCopy(text, () => {
        const toast = document.getElementById('toast');
        toast.classList.remove('hidden');
        setTimeout(() => toast.classList.add('hidden'), 2000);
    });
}

function doCopy(text, onSuccess) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(onSuccess).catch(() => {
            fallbackCopy(text);
            onSuccess();
        });
    } else {
        fallbackCopy(text);
        onSuccess();
    }
}

function fallbackCopy(text) {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
}

// 启动
loadOrder();
