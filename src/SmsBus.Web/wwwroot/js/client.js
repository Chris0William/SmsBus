// ==================== 状态 ====================
let countries = [];
let allCountries = [];
let projects = [];
let allProjects = [];
let selectedCountryId = null;
let selectedProjectId = null;
let currentPlan = null;   // 'week' | 'month' | 'year'
let currentQty = 1;
let realPrice = 0;        // SMS-BUS 实际单价
let pollingTimers = {};

// ==================== 套餐价格 ====================
const planPrices = {
    week:  12.99,
    month: 14.99,
    year:  39.99
};

const planLabels = {
    week:  '周租',
    month: '月租',
    year:  '年租'
};

const planUnits = {
    week:  '周',
    month: '月',
    year:  '年'
};

// ==================== 中文翻译 ====================
const countryZh = {
    'Russia': '俄罗斯', 'Ukraine': '乌克兰', 'Kazakhstan': '哈萨克斯坦',
    'China': '中国', 'Philippines': '菲律宾', 'Myanmar': '缅甸',
    'Indonesia': '印度尼西亚', 'Malaysia': '马来西亚', 'Vietnam': '越南',
    'Kyrgyzstan': '吉尔吉斯斯坦', 'USA': '美国', 'United States': '美国',
    'United Kingdom': '英国', 'Israel': '以色列', 'Hong Kong': '中国香港',
    'Poland': '波兰', 'England': '英国', 'France': '法国',
    'India': '印度', 'Sweden': '瑞典', 'Germany': '德国',
    'Spain': '西班牙', 'Italy': '意大利', 'Canada': '加拿大',
    'Turkey': '土耳其', 'Macau': '中国澳门', 'Australia': '澳大利亚',
    'Netherlands': '荷兰', 'Brazil': '巴西', 'Ireland': '爱尔兰',
    'Romania': '罗马尼亚', 'Colombia': '哥伦比亚', 'Mexico': '墨西哥',
    'Argentina': '阿根廷', 'Thailand': '泰国', 'Nigeria': '尼日利亚',
    'Egypt': '埃及', 'South Africa': '南非', 'Kenya': '肯尼亚',
    'Ghana': '加纳', 'Morocco': '摩洛哥', 'Cambodia': '柬埔寨',
    'Laos': '老挝', "Lao People's Democratic Republic": '老挝',
    'Bangladesh': '孟加拉国', 'Nepal': '尼泊尔',
    'Pakistan': '巴基斯坦', 'Sri Lanka': '斯里兰卡', 'Japan': '日本',
    'South Korea': '韩国', 'Korea': '韩国', 'Taiwan': '中国台湾',
    'Singapore': '新加坡', 'New Zealand': '新西兰',
    'Portugal': '葡萄牙', 'Belgium': '比利时', 'Switzerland': '瑞士',
    'Austria': '奥地利', 'Czech Republic': '捷克', 'Czechia': '捷克',
    'Denmark': '丹麦', 'Finland': '芬兰', 'Norway': '挪威',
    'Greece': '希腊', 'Hungary': '匈牙利', 'Croatia': '克罗地亚',
    'Bulgaria': '保加利亚', 'Serbia': '塞尔维亚', 'Slovakia': '斯洛伐克',
    'Lithuania': '立陶宛', 'Latvia': '拉脱维亚', 'Estonia': '爱沙尼亚',
    'Georgia': '格鲁吉亚', 'Armenia': '亚美尼亚', 'Azerbaijan': '阿塞拜疆',
    'Uzbekistan': '乌兹别克斯坦', 'Tajikistan': '塔吉克斯坦',
    'Turkmenistan': '土库曼斯坦', 'Moldova': '摩尔多瓦', 'Belarus': '白俄罗斯',
    'Peru': '秘鲁', 'Chile': '智利', 'Venezuela': '委内瑞拉',
    'Ecuador': '厄瓜多尔', 'Bolivia': '玻利维亚', 'Uruguay': '乌拉圭',
    'Paraguay': '巴拉圭', 'Dominican Republic': '多米尼加',
    'Saudi Arabia': '沙特阿拉伯', 'UAE': '阿联酋',
    'United Arab Emirates': '阿联酋', 'Qatar': '卡塔尔',
    'Kuwait': '科威特', 'Bahrain': '巴林', 'Oman': '阿曼',
    'Jordan': '约旦', 'Lebanon': '黎巴嫩', 'Iraq': '伊拉克',
    'Iran': '伊朗', 'Afghanistan': '阿富汗',
    'Algeria': '阿尔及利亚', 'Tunisia': '突尼斯', 'Libya': '利比亚',
    'Tanzania': '坦桑尼亚', 'Uganda': '乌干达', 'Ethiopia': '埃塞俄比亚',
    'Cameroon': '喀麦隆', 'Ivory Coast': '科特迪瓦',
    'Senegal': '塞内加尔', 'Congo': '刚果', 'Mozambique': '莫桑比克',
    'Zambia': '赞比亚', 'Zimbabwe': '津巴布韦', 'Madagascar': '马达加斯加',
    'Mali': '马里', 'Angola': '安哥拉',
    'Slovenia': '斯洛文尼亚', 'Cyprus': '塞浦路斯', 'Malta': '马耳他',
    'Iceland': '冰岛', 'Luxembourg': '卢森堡', 'Montenegro': '黑山',
    'North Macedonia': '北马其顿', 'Macedonia': '马其顿',
    'Bosnia': '波黑', 'Albania': '阿尔巴尼亚', 'Kosovo': '科索沃',
    'Mongolia': '蒙古', 'Cuba': '古巴', 'Jamaica': '牙买加',
    'Haiti': '海地', 'Costa Rica': '哥斯达黎加',
    'Panama': '巴拿马', 'Guatemala': '危地马拉', 'Honduras': '洪都拉斯',
    'El Salvador': '萨尔瓦多', 'Nicaragua': '尼加拉瓜',
    'Suriname': '苏里南', 'Guyana': '圭亚那',
    'Palestine': '巴勒斯坦', 'Benin': '贝宁', 'Botswana': '博茨瓦纳',
    'United States (Virtual)': '美国(虚拟)',
};

const projectZh = {
    'Telegram': '电报(Telegram)',
    'Paypal': '贝宝(PayPal)',
    'TikTok/Douyin': '抖音国际版(TikTok)',
    'WhatsApp': 'WhatsApp(聊天)',
    'Viber': 'Viber(通讯)',
    'KakaoTalk': 'KakaoTalk(韩国聊天)',
    'Google, Youtube, Gmail': '谷歌/油管/邮箱',
    'Blizzard / Battle': '暴雪战网',
    'Microsoft': '微软(Microsoft)',
    'Uber': '优步(Uber)',
    'Yahoo': '雅虎(Yahoo)',
    'Coinbase': 'Coinbase(加密货币)',
    'eBay': 'eBay(电商)',
    'REDnote / 小红书': '小红书(REDnote)',
    'AliExpress': '速卖通(AliExpress)',
    'OpenAI/ChatGPT': 'OpenAI/ChatGPT',
    'Bumble': 'Bumble(交友)',
    'Cash App': 'Cash App(支付)',
    'Line': 'Line(日韩聊天)',
    'Tinder': 'Tinder(交友)',
    'Facebook': '脸书(Facebook)',
    'Twitter': '推特/X(Twitter)',
    'Nike': '耐克(Nike)',
    'Amazon': '亚马逊(Amazon)',
    'Instagram+Threads': 'Instagram(照片分享)',
    'Netflix': 'Netflix(流媒体)',
    'Lazada': 'Lazada(东南亚电商)',
    'Shopee': '虾皮(Shopee)',
    'Discord': 'Discord(语音社区)',
    'Apple': '苹果(Apple)',
    'Snapchat': 'Snapchat(社交)',
    'LinkedIn': '领英(LinkedIn)',
    'Signal': 'Signal(加密通讯)',
    'Steam': 'Steam(游戏平台)',
    'Temu': 'Temu(拼多多海外)',
    'Airbnb': '爱彼迎(Airbnb)',
    'JD（京东）': '京东(JD)',
    'TaoBao': '淘宝(TaoBao)',
    'MeiTuan': '美团(MeiTuan)',
    'Kwai': '快手海外(Kwai)',
    'Shein': 'Shein(跨境电商)',
    'Binance': '币安(Binance)',
    'Bybit': 'Bybit(加密货币)',
    'Bilibili': '哔哩哔哩(Bilibili)',
    'Weibo': '微博(Weibo)',
    'Baidu': '百度(Baidu)',
    'Grab': 'Grab(东南亚打车)',
    'OLX': 'OLX(二手交易)',
    'Roblox': 'Roblox(游戏平台)',
    'Walmart': '沃尔玛(Walmart)',
    'ctrip / 携程': '携程(Ctrip)',
    'Xianyu / 闲鱼': '闲鱼(Xianyu)',
    'SiliconFlow / 硅基流动': '硅基流动(SiliconFlow)',
    'Alibaba': '阿里巴巴(Alibaba)',
    'Alibaba Cloud': '阿里云(Alibaba Cloud)',
    'Google Voice': '谷歌语音(Google Voice)',
    'Google Developer': '谷歌开发者',
    'Claude': 'Claude(AI助手)',
    'DeepSeek': 'DeepSeek(深度求索)',
    'Disney+': '迪士尼+(Disney+)',
    'Fiverr': 'Fiverr(自由职业)',
    'Etsy': 'Etsy(手工电商)',
    'Flipkart': 'Flipkart(印度电商)',
    'wise': 'Wise(跨境汇款)',
    'Truecaller': 'Truecaller(来电识别)',
    'Lyft': 'Lyft(打车)',
    'Skype': 'Skype(通话)',
    'BlaBlaCar': 'BlaBlaCar(拼车)',
    'Badoo': 'Badoo(交友)',
    'Lemon8': 'Lemon8(字节跳动)',
    'Tantan': '探探(Tantan)',
    'Zalo': 'Zalo(越南聊天)',
};

function zh(name, map) {
    if (!name) return name;
    if (map[name]) return map[name];
    const lower = name.toLowerCase();
    for (const [k, v] of Object.entries(map)) {
        if (k.toLowerCase() === lower) return v;
    }
    return name;
}

// ==================== 初始化 ====================
async function init() {
    await Promise.all([loadCountries(), loadProjects()]);
    loadOrders();
}

async function loadCountries() {
    const res = await fetch('/api/countries');
    allCountries = await res.json();
    countries = allCountries;
    document.getElementById('countryCount').textContent = `(共 ${allCountries.length} 个国家)`;
    renderCountries();
}

function renderCountries() {
    const select = document.getElementById('countrySelect');
    select.innerHTML = countries.map(c =>
        `<option value="${c.id}">${zh(c.title, countryZh)}</option>`
    ).join('');
}

async function loadProjects() {
    const res = await fetch('/api/projects');
    allProjects = await res.json();
    projects = allProjects;
    document.getElementById('projectCount').textContent = `(共 ${allProjects.length} 个服务)`;
    renderProjects();
}

function renderProjects() {
    const select = document.getElementById('projectSelect');
    select.innerHTML = projects.map(p =>
        `<option value="${p.id}">${zh(p.title, projectZh)}</option>`
    ).join('');
}

// ==================== 事件绑定 ====================
document.getElementById('countrySelect').addEventListener('change', (e) => {
    selectedCountryId = e.target.value ? parseInt(e.target.value) : null;
    checkAvailability();
});

document.getElementById('projectSelect').addEventListener('change', (e) => {
    selectedProjectId = e.target.value ? parseInt(e.target.value) : null;
    checkAvailability();
});

document.getElementById('countrySearch').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    countries = q ? allCountries.filter(c =>
        c.title.toLowerCase().includes(q) || zh(c.title, countryZh).toLowerCase().includes(q)
    ) : allCountries;
    renderCountries();
});

document.getElementById('projectSearch').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    projects = q ? allProjects.filter(p =>
        p.title.toLowerCase().includes(q) || zh(p.title, projectZh).toLowerCase().includes(q)
    ) : allProjects;
    renderProjects();
});

// ==================== 查询可用性 ====================
async function checkAvailability() {
    const planSection = document.getElementById('planSection');
    const buyBtn = document.getElementById('buyBtn');

    if (!selectedCountryId || !selectedProjectId) {
        planSection.classList.add('hidden');
        buyBtn.disabled = true;
        currentPlan = null;
        return;
    }

    const res = await fetch(`/api/price?countryId=${selectedCountryId}&projectId=${selectedProjectId}`);
    const data = await res.json();
    realPrice = data.price;

    document.getElementById('stockValue').textContent = `${data.count} 个`;
    planSection.classList.remove('hidden');

    if (data.count === 0) {
        buyBtn.disabled = true;
        return;
    }

    // 默认选周租
    if (!currentPlan) selectPlan('week');
    else updatePriceDisplay();
}

// ==================== 套餐选择 ====================
function selectPlan(plan) {
    currentPlan = plan;
    document.querySelectorAll('.plan-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.plan === plan);
    });
    updatePriceDisplay();
}

function changeQty(delta) {
    currentQty = Math.max(1, Math.min(4, currentQty + delta));
    document.getElementById('qtyDisplay').textContent = currentQty;
    updatePriceDisplay();
}

function updatePriceDisplay() {
    if (!currentPlan) return;

    const unitP = planPrices[currentPlan];
    const total = unitP * currentQty;
    const unit = planUnits[currentPlan];

    document.getElementById('unitPrice').textContent = `$${unitP.toFixed(2)}/${unit}`;
    document.getElementById('qtyInfo').textContent = `${currentQty} ${unit}`;
    document.getElementById('totalPrice').textContent = `$${total.toFixed(2)}`;

    document.getElementById('buyBtn').disabled = false;
}

// ==================== 购买 ====================
async function purchase() {
    if (!currentPlan) return;

    const buyBtn = document.getElementById('buyBtn');
    const buyError = document.getElementById('buyError');
    buyBtn.disabled = true;
    buyBtn.textContent = '购买中...';
    buyError.classList.add('hidden');

    const displayPrice = planPrices[currentPlan] * currentQty;
    const planDesc = `${currentQty}${planUnits[currentPlan]} ${planLabels[currentPlan]}`;

    try {
        const res = await fetch('/api/purchase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                countryId: selectedCountryId,
                projectId: selectedProjectId,
                price: displayPrice,
                countryName: zh(allCountries.find(c => c.id === selectedCountryId)?.title, countryZh),
                projectName: zh(allProjects.find(p => p.id === selectedProjectId)?.title, projectZh),
                plan: planDesc
            })
        });

        if (!res.ok) {
            const err = await res.text();
            throw new Error(err);
        }

        await loadOrders();
    } catch (e) {
        buyError.textContent = `购买失败: ${e.message}`;
        buyError.classList.remove('hidden');
    } finally {
        buyBtn.disabled = false;
        buyBtn.textContent = '购买号码';
    }
}

// ==================== 订单列表 ====================
async function loadOrders() {
    const res = await fetch('/api/orders');
    const orders = await res.json();
    const container = document.getElementById('orderList');
    document.getElementById('orderCount').textContent = `${orders.length} 个`;

    if (orders.length === 0) {
        container.innerHTML = '<div class="px-6 py-12 text-center text-gray-400">暂无已购号码，请在左侧购买</div>';
        return;
    }

    container.innerHTML = orders.map(o => renderOrder(o)).join('');

    orders.filter(o => o.status === 'waiting').forEach(o => startPolling(o.requestId));
}

function renderOrder(o) {
    const statusMap = {
        waiting: '<span class="status-waiting font-medium"><span class="pulse-dot inline-block w-2 h-2 bg-yellow-400 rounded-full mr-1"></span>等待验证码...</span>',
        received: '<span class="status-received font-medium">已收到</span>',
        cancelled: '<span class="status-cancelled font-medium">已取消</span>'
    };

    const shareUrl = `${location.origin}/s/${o.requestId}`;

    // 套餐标签
    const planTag = o.plan ? `<span class="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded">${o.plan}</span>` : '';

    return `
    <div class="px-6 py-4" id="order-${o.requestId}">
        <div class="flex items-start justify-between">
            <div class="flex-1">
                <div class="flex items-center gap-3 mb-1">
                    <span class="text-lg font-mono font-bold text-gray-800">${o.number}</span>
                    <span class="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">${o.countryName}</span>
                    <span class="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">${o.projectName}</span>
                    ${planTag}
                    <span class="text-xs text-gray-400">$${o.price.toFixed(2)}</span>
                </div>
                <div class="flex items-center gap-4 text-sm">
                    ${statusMap[o.status] || o.status}
                    <span class="text-gray-400">${new Date(o.purchasedAt).toLocaleString()}</span>
                </div>
                ${o.status === 'received' ? `
                <div class="mt-2 flex items-center gap-2">
                    <span class="text-sm text-gray-500">短信:</span>
                    <span class="text-sm text-gray-700">${o.smsContent}</span>
                </div>
                <div class="mt-1 flex items-center gap-2">
                    <span class="text-3xl font-mono font-bold text-green-600 tracking-widest">${o.verificationCode || '--'}</span>
                    <button onclick="copyText('${o.verificationCode || ''}')" class="copy-btn text-xs bg-green-100 text-green-700 px-3 py-1 rounded hover:bg-green-200 transition">
                        复制验证码
                    </button>
                </div>` : ''}
            </div>
            <div class="flex flex-col gap-2 ml-4">
                <button onclick="copyText('${shareUrl}')" class="copy-btn text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded hover:bg-gray-200 transition whitespace-nowrap">
                    复制分享链接
                </button>
                ${o.status === 'waiting' ? `
                <button onclick="cancelOrder('${o.requestId}')" class="text-xs bg-red-50 text-red-500 px-3 py-1.5 rounded hover:bg-red-100 transition">
                    取消
                </button>` : `
                <button onclick="deleteOrder('${o.requestId}')" class="text-xs bg-gray-50 text-gray-400 px-3 py-1.5 rounded hover:bg-red-50 hover:text-red-500 transition">
                    删除
                </button>`}
            </div>
        </div>
    </div>`;
}

// ==================== 轮询 ====================
function startPolling(requestId) {
    if (pollingTimers[requestId]) return;

    pollingTimers[requestId] = setInterval(async () => {
        const res = await fetch(`/api/orders/${requestId}/poll`);
        if (!res.ok) { stopPolling(requestId); return; }

        const order = await res.json();
        if (order.status !== 'waiting') {
            stopPolling(requestId);
            const el = document.getElementById(`order-${requestId}`);
            if (el) el.outerHTML = renderOrder(order);
        }
    }, 5000);
}

function stopPolling(requestId) {
    if (pollingTimers[requestId]) {
        clearInterval(pollingTimers[requestId]);
        delete pollingTimers[requestId];
    }
}

// ==================== 取消 ====================
async function cancelOrder(requestId) {
    if (!confirm('确定取消此号码？')) return;
    await fetch(`/api/orders/${requestId}/cancel`, { method: 'POST' });
    stopPolling(requestId);
    await loadOrders();
}

// ==================== 删除 ====================
async function deleteOrder(requestId) {
    if (!confirm('确定删除此记录？')) return;
    await fetch(`/api/orders/${requestId}`, { method: 'DELETE' });
    await loadOrders();
}

// ==================== 复制 ====================
function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            showToast('已复制到剪贴板');
        }).catch(() => fallbackCopy(text));
    } else {
        fallbackCopy(text);
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
    showToast('已复制到剪贴板');
}

function showToast(msg) {
    const toast = document.createElement('div');
    toast.className = 'fixed bottom-6 right-6 bg-gray-800 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50 transition-opacity';
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => { toast.style.opacity = '0'; setTimeout(() => toast.remove(), 300); }, 2000);
}

// ==================== 启动 ====================
init();
