// ==================== 认证 ====================
const LOGIN_URL = '/sms_admin/login';

async function logout() {
    try { await fetch('/api/auth/logout', { method: 'POST' }); } catch {}
    window.location.href = LOGIN_URL;
}

// 包装 fetch，401 时自动跳转登录页
const _origFetch = window.fetch;
window.fetch = async function(...args) {
    const res = await _origFetch.apply(this, args);
    if (res.status === 401) {
        const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
        // 仅对管理端 API 跳转，排除汇率等外部请求
        if (url.startsWith('/api/')) {
            window.location.href = LOGIN_URL;
        }
    }
    return res;
};

// ==================== 定价配置 ====================
let pricingConfig = { markupEnabled: false, rentalProfitPercent: 0, activationProfitPercent: 0, serviceFee1m: 0, serviceFee3m: 0, serviceFee6m: 0, serviceFee12m: 0, usdCnyRate: 7.25 };

async function loadPricingConfig() {
    try {
        const res = await fetch('/api/admin/pricing');
        const d = await res.json();
        pricingConfig = { markupEnabled: d.markupEnabled, rentalProfitPercent: d.rentalProfitPercent, activationProfitPercent: d.activationProfitPercent, serviceFee1m: d.serviceFee1m || 0, serviceFee3m: d.serviceFee3m || 0, serviceFee6m: d.serviceFee6m || 0, serviceFee12m: d.serviceFee12m || 0, usdCnyRate: d.usdCnyRate };
    } catch {}
}

function calcMarkup(cost, mode) {
    if (!pricingConfig.markupEnabled) return 0;
    const pct = mode === 'activation' ? pricingConfig.activationProfitPercent : pricingConfig.rentalProfitPercent;
    return cost * pct / 100;
}

function refreshAllPrices() {
    if (selectedActCountry && selectedActService) checkActivationCount();
    renderRentalServices();
    if (selectedRentalService) updateRentalPrice();
    loadOrders();
    loadUserInfo();
}

// 价格工具函数
function getDisplayPrice(costPrice, mode) {
    return costPrice + calcMarkup(costPrice, mode);
}

function formatUsd(amount) {
    return `$${amount.toFixed(2)}`;
}

function formatCny(usdAmount) {
    return `¥${(usdAmount * pricingConfig.usdCnyRate).toFixed(2)}`;
}

function formatPrice(usdAmount) {
    return `${formatUsd(usdAmount)} (${formatCny(usdAmount)})`;
}

// ==================== 状态 ====================
let currentMode = 'activation'; // 'activation' | 'rental'
let actPrice = 0;
let actTotal = 0;

// 一次性接码 — 国家和服务列表
const ACT_COUNTRIES = [
    { code: 'US', name: '美国' }, { code: 'UK', name: '英国' }, { code: 'CA', name: '加拿大' },
    { code: 'DE', name: '德国' }, { code: 'FR', name: '法国' }, { code: 'ES', name: '西班牙' },
    { code: 'IT', name: '意大利' }, { code: 'NL', name: '荷兰' }, { code: 'SE', name: '瑞典' },
    { code: 'PL', name: '波兰' }, { code: 'RO', name: '罗马尼亚' }, { code: 'CZ', name: '捷克' },
    { code: 'PT', name: '葡萄牙' }, { code: 'AT', name: '奥地利' }, { code: 'BE', name: '比利时' },
    { code: 'RU', name: '俄罗斯' }, { code: 'UA', name: '乌克兰' }, { code: 'KZ', name: '哈萨克斯坦' },
    { code: 'CN', name: '中国' }, { code: 'HK', name: '香港' }, { code: 'TW', name: '台湾' },
    { code: 'JP', name: '日本' }, { code: 'KR', name: '韩国' }, { code: 'IN', name: '印度' },
    { code: 'ID', name: '印尼' }, { code: 'PH', name: '菲律宾' }, { code: 'TH', name: '泰国' },
    { code: 'VN', name: '越南' }, { code: 'MY', name: '马来西亚' }, { code: 'MX', name: '墨西哥' },
    { code: 'BR', name: '巴西' }, { code: 'AR', name: '阿根廷' }, { code: 'CO', name: '哥伦比亚' },
    { code: 'CL', name: '智利' }, { code: 'AU', name: '澳大利亚' }, { code: 'NZ', name: '新西兰' },
    { code: 'TR', name: '土耳其' }, { code: 'EG', name: '埃及' }, { code: 'NG', name: '尼日利亚' },
    { code: 'ZA', name: '南非' }, { code: 'IL', name: '以色列' }, { code: 'AE', name: '阿联酋' }
];

const ACT_SERVICES = [
    { code: 'opt1', name: 'Google/Gmail', zh: '谷歌/邮箱' },
    { code: 'opt2', name: 'Facebook', zh: '脸书' },
    { code: 'opt3', name: 'WhatsApp', zh: 'WhatsApp聊天' },
    { code: 'opt4', name: 'VK', zh: 'VK社交' },
    { code: 'opt5', name: 'Odnoklassniki', zh: 'OK社交' },
    { code: 'opt6', name: 'Twitter/X', zh: '推特' },
    { code: 'opt7', name: 'Telegram', zh: '电报' },
    { code: 'opt8', name: 'LINE', zh: 'LINE聊天' },
    { code: 'opt9', name: 'Yahoo', zh: '雅虎' },
    { code: 'opt10', name: 'Microsoft', zh: '微软' },
    { code: 'opt12', name: 'Amazon', zh: '亚马逊' },
    { code: 'opt14', name: 'Steam', zh: 'Steam游戏' },
    { code: 'opt15', name: 'LinkedIn', zh: '领英' },
    { code: 'opt16', name: 'Instagram', zh: 'Ins图片' },
    { code: 'opt18', name: 'Uber', zh: '优步' },
    { code: 'opt19', name: 'TikTok', zh: '抖音国际版' },
    { code: 'opt20', name: 'PayPal', zh: '贝宝支付' },
    { code: 'opt21', name: 'Viber', zh: 'Viber聊天' },
    { code: 'opt22', name: 'Discord', zh: 'Discord语音' },
    { code: 'opt23', name: 'WeChat', zh: '微信' },
    { code: 'opt24', name: 'KakaoTalk', zh: 'Kakao聊天' },
    { code: 'opt25', name: 'Airbnb', zh: '爱彼迎' },
    { code: 'opt26', name: 'Nike', zh: '耐克' },
    { code: 'opt27', name: 'Netflix', zh: '奈飞' },
    { code: 'opt28', name: 'Snapchat', zh: 'Snap社交' },
    { code: 'opt29', name: 'Tinder', zh: 'Tinder交友' },
    { code: 'opt30', name: 'OLX', zh: 'OLX二手' },
    { code: 'opt31', name: 'ProtonMail', zh: '质子邮箱' },
    { code: 'opt33', name: 'Spotify', zh: '声田音乐' },
    { code: 'opt35', name: 'eBay', zh: '易贝' },
    { code: 'opt40', name: 'Signal', zh: 'Signal加密' },
    { code: 'opt43', name: 'Binance', zh: '币安' },
    { code: 'opt47', name: 'Coinbase', zh: 'Coinbase交易所' },
    { code: 'opt53', name: 'OpenAI', zh: 'OpenAI/ChatGPT' },
    { code: 'opt68', name: 'Apple', zh: '苹果' }
];

// 服务代码→中文翻译映射（一次性和租赁共用）
const SERVICE_ZH = {};
ACT_SERVICES.forEach(s => { SERVICE_ZH[s.code] = s.zh; });
// 扩充租赁中出现的其他服务翻译
Object.assign(SERVICE_ZH, {
    'opt0': '汇款(Wise)', 'opt3': '暴雪游戏', 'opt6': 'Fiverr自由职业',
    'opt7': 'Wirex钱包', 'opt8': '领英', 'opt9': 'Tinder交友',
    'opt10': '币安', 'opt11': 'Viber聊天', 'opt15': '微软',
    'opt16': 'Ins图片', 'opt17': 'Verse支付', 'opt20': 'WhatsApp聊天',
    'opt24': 'WebMoney钱包', 'opt26': 'Nexo理财', 'opt27': '交友(OurTime)',
    'opt28': '问卷调查', 'opt29': '电报', 'opt31': 'Vinted二手',
    'opt32': 'LINE聊天', 'opt34': 'Indeed招聘', 'opt35': '汇款(MoneyGram)',
    'opt37': '博彩/银行', 'opt38': 'PaySend汇款', 'opt39': '问卷调查',
    'opt41': '推特/X', 'opt42': 'Pyypl钱包', 'opt43': 'bet365博彩',
    'opt44': '亚马逊', 'opt45': 'Bankera银行', 'opt46': '爱彼迎',
    'opt47': 'Coinbase交易所', 'opt48': '交友(OkCupid)', 'opt53': '中继Fi',
    'opt54': 'Gemini交易所', 'opt56': 'Crypto加密', 'opt57': 'BITSA/BITSO',
    'opt58': 'Steam游戏', 'opt60': 'Ria汇款', 'opt61': '阿里巴巴/淘宝/支付宝',
    'opt65': '雅虎', 'opt66': 'Twilio/eToro', 'opt68': 'EUROBET博彩',
    'opt70': 'Coinbase交易所', 'opt72': 'Paxful交易', 'opt74': 'Skrill钱包',
    'opt75': 'MoneyLion理财', 'opt76': 'Weststein万事达', 'opt77': '1xbet博彩',
    'opt78': 'Volet钱包', 'opt81': 'Kraken交易所', 'opt82': '西联汇款',
    'opt83': '贝宝/易贝', 'opt84': '交友(POF)', 'opt85': 'Venmo支付',
    'opt88': '缤客(Booking)', 'opt90': 'Paysafe支付', 'opt92': '股票交易',
    'opt93': 'Phyre钱包', 'opt95': 'OKX交易所', 'opt96': '交友(Match)',
    'opt99': 'iCard卡', 'opt100': 'Vivid银行', 'opt101': 'Revolut银行',
    'opt102': 'AstroPay支付', 'opt103': 'Payoneer支付', 'opt104': '抖音国际版',
    'opt140': 'MoneyJar', 'opt142': '其他服务', 'opt144': '黑猫卡',
    'opt146': '票务大师', 'opt147': 'Discord语音', 'opt149': 'Wallester卡',
    'opt152': 'Guavapay支付', 'opt153': 'Signal加密', 'opt154': '苹果',
    'opt158': 'Fonbet博彩', 'opt159': 'Paytend支付', 'opt160': 'Trastra卡',
    'opt161': 'Airwallex万里汇', 'opt165': 'Bumble交友', 'opt166': 'KuCoin/Bybit',
    'opt167': 'Lydia银行', 'opt169': 'VRBO民宿', 'opt171': 'Fbet博彩',
    'opt173': 'Swagbucks返利', 'opt178': '分类广告', 'opt180': 'TransferGo汇款',
    'opt185': 'Hinge交友', 'opt186': 'Namirial签名', 'opt190': 'Foxpay支付',
    'opt191': 'MyBookie博彩', 'opt192': '沃尔玛', 'opt196': 'Payzy支付',
    'opt198': '京东', 'opt199': 'Bitpanda交易', 'opt200': 'VFS签证',
    'opt201': 'KCEX交易所', 'opt202': 'PecunPay支付', 'opt203': 'Bit2Me交易',
    'opt204': 'Airtm钱包', 'opt205': 'Payz支付', 'opt207': 'Bitnovo',
    'opt208': 'RedotPay卡', 'opt210': 'Betano博彩', 'opt211': 'NCSOFT游戏',
    'opt212': 'TapTap游戏', 'opt213': 'Brighty银行', 'opt214': 'Bovada博彩',
    'opt216': 'Leboncoin二手', 'opt217': 'Outlier数据', 'opt218': 'Rebet博彩',
    'opt219': '奖励卡', 'opt220': 'Green Dot银行', 'opt222': 'Mobile.de汽车',
    'opt223': 'HardRock博彩', 'opt225': '奈飞', 'opt226': 'WEEX交易所',
    'opt228': 'WorldRemit汇款', 'opt230': 'Global66汇款', 'opt231': 'Betly博彩',
    'opt235': 'OnShop购物', 'opt236': 'Bitget交易所', 'opt237': 'Toloka众包',
    'opt1001': 'Neteller钱包'
});

// 国家名英文→中文翻译（租赁API返回英文名）
const COUNTRY_ZH = {
    'Russia': '俄罗斯', 'Ukraine': '乌克兰', 'Kazakhstan': '哈萨克斯坦', 'China': '中国',
    'Philippines': '菲律宾', 'Myanmar': '缅甸', 'Indonesia': '印尼', 'Malaysia': '马来西亚',
    'Vietnam': '越南', 'Kyrgyzstan': '吉尔吉斯斯坦', 'USA': '美国', 'United States': '美国',
    'United Kingdom': '英国', 'UK': '英国', 'England': '英国', 'Unt. Kingdom': '英国',
    'Canada': '加拿大', 'Germany': '德国', 'France': '法国', 'Spain': '西班牙',
    'Italy': '意大利', 'Netherlands': '荷兰', 'Sweden': '瑞典', 'Poland': '波兰',
    'Romania': '罗马尼亚', 'Czech Republic': '捷克', 'Czechia': '捷克',
    'Portugal': '葡萄牙', 'Austria': '奥地利', 'Belgium': '比利时',
    'Hong Kong': '香港', 'Taiwan': '台湾', 'Japan': '日本', 'South Korea': '韩国',
    'Korea': '韩国', 'India': '印度', 'Thailand': '泰国',
    'Mexico': '墨西哥', 'Brazil': '巴西', 'Argentina': '阿根廷', 'Colombia': '哥伦比亚',
    'Chile': '智利', 'Peru': '秘鲁', 'Ecuador': '厄瓜多尔', 'Bolivia': '玻利维亚',
    'Australia': '澳大利亚', 'New Zealand': '新西兰',
    'Turkey': '土耳其', 'Egypt': '埃及', 'Nigeria': '尼日利亚', 'South Africa': '南非',
    'Israel': '以色列', 'UAE': '阿联酋', 'United Arab Emirates': '阿联酋',
    'Saudi Arabia': '沙特阿拉伯', 'Georgia': '格鲁吉亚', 'Armenia': '亚美尼亚',
    'Azerbaijan': '阿塞拜疆', 'Uzbekistan': '乌兹别克斯坦', 'Tajikistan': '塔吉克斯坦',
    'Moldova': '摩尔多瓦', 'Belarus': '白俄罗斯', 'Latvia': '拉脱维亚',
    'Lithuania': '立陶宛', 'Estonia': '爱沙尼亚', 'Croatia': '克罗地亚',
    'Serbia': '塞尔维亚', 'Bulgaria': '保加利亚', 'Hungary': '匈牙利',
    'Slovakia': '斯洛伐克', 'Slovenia': '斯洛文尼亚', 'Greece': '希腊',
    'Finland': '芬兰', 'Denmark': '丹麦', 'Norway': '挪威', 'Ireland': '爱尔兰',
    'Switzerland': '瑞士', 'Luxembourg': '卢森堡', 'Malta': '马耳他', 'Cyprus': '塞浦路斯',
    'Morocco': '摩洛哥', 'Tunisia': '突尼斯', 'Kenya': '肯尼亚', 'Ghana': '加纳',
    'Tanzania': '坦桑尼亚', 'Uganda': '乌干达', 'Cameroon': '喀麦隆',
    'Pakistan': '巴基斯坦', 'Bangladesh': '孟加拉', 'Sri Lanka': '斯里兰卡',
    'Nepal': '尼泊尔', 'Cambodia': '柬埔寨', 'Laos': '老挝', 'Mongolia': '蒙古',
    'Singapore': '新加坡', 'Macau': '澳门', 'Macao': '澳门',
    'Dominican Republic': '多米尼加', 'Costa Rica': '哥斯达黎加', 'Panama': '巴拿马',
    'Venezuela': '委内瑞拉', 'Uruguay': '乌拉圭', 'Paraguay': '巴拉圭',
    'Guatemala': '危地马拉', 'Honduras': '洪都拉斯', 'El Salvador': '萨尔瓦多',
    'Nicaragua': '尼加拉瓜', 'Cuba': '古巴', 'Jamaica': '牙买加',
    'Trinidad and Tobago': '特立尼达和多巴哥', 'Haiti': '海地',
    'Algeria': '阿尔及利亚', 'Libya': '利比亚', 'Sudan': '苏丹',
    'Ethiopia': '埃塞俄比亚', 'Somalia': '索马里', 'Congo': '刚果',
    'Ivory Coast': '科特迪瓦', 'Senegal': '塞内加尔', 'Mali': '马里',
    'Madagascar': '马达加斯加', 'Mozambique': '莫桑比克', 'Zimbabwe': '津巴布韦',
    'Zambia': '赞比亚', 'Angola': '安哥拉', 'Botswana': '博茨瓦纳',
    'Iraq': '伊拉克', 'Iran': '伊朗', 'Syria': '叙利亚', 'Jordan': '约旦',
    'Lebanon': '黎巴嫩', 'Kuwait': '科威特', 'Qatar': '卡塔尔', 'Bahrain': '巴林',
    'Oman': '阿曼', 'Yemen': '也门', 'Afghanistan': '阿富汗'
};

let actCountries = ACT_COUNTRIES;
let actServices = ACT_SERVICES;
let selectedActCountry = null;
let selectedActService = null;

// 租赁
let rentalCountries = [];
let allRentalCountries = [];
let rentalServices = [];
let allRentalServices = [];
let selectedRentalCountry = null;
let selectedRentalService = null;

let pollingTimers = {};

// ==================== 初始化 ====================
async function init() {
    await loadPricingConfig();
    renderActCountries();
    renderActServices();
    loadUserInfo();
    loadOrders();
    loadRentalCountries();
}

async function loadUserInfo(retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch('/api/userinfo');
            if (!res.ok) throw new Error();
            const data = await res.json();
            const cny = (data.balance * pricingConfig.usdCnyRate).toFixed(2);
            document.getElementById('userinfo').innerHTML =
                `<span class="font-semibold text-green-600">$${data.balance.toFixed(2)}</span> <span class="text-orange-500 text-xs">¥${cny}</span> <span class="text-gray-400">Karma: ${data.karma}</span>`;
            return;
        } catch {
            if (i < retries - 1) await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        }
    }
    document.getElementById('userinfo').textContent = '无法加载用户信息';
}

// ==================== 模式切换 ====================
function switchMode(mode) {
    currentMode = mode;
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    document.getElementById('activationPanel').classList.toggle('hidden', mode !== 'activation');
    document.getElementById('rentalPanel').classList.toggle('hidden', mode !== 'rental');
    document.getElementById('buyError').classList.add('hidden');
}

// ==================== 一次性接码 ====================

function renderActCountries() {
    const select = document.getElementById('actCountrySelect');
    select.innerHTML = actCountries.map(c =>
        `<option value="${c.code}">${c.name} [${c.code}]</option>`
    ).join('');
}

function renderActServices() {
    const select = document.getElementById('actServiceSelect');
    select.innerHTML = actServices.map(s =>
        `<option value="${s.code}">${s.zh} (${s.name})</option>`
    ).join('');
}

document.getElementById('actCountrySearch').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    actCountries = q ? ACT_COUNTRIES.filter(c =>
        c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q)
    ) : ACT_COUNTRIES;
    renderActCountries();
});

document.getElementById('actServiceSearch').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    actServices = q ? ACT_SERVICES.filter(s =>
        s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || s.zh.includes(q)
    ) : ACT_SERVICES;
    renderActServices();
});

document.getElementById('actCountrySelect').addEventListener('change', (e) => {
    selectedActCountry = e.target.value || null;
    checkActivationCount();
});

document.getElementById('actServiceSelect').addEventListener('change', (e) => {
    selectedActService = e.target.value || null;
    checkActivationCount();
});

async function checkActivationCount() {
    if (!selectedActCountry || !selectedActService) {
        document.getElementById('actPriceInfo').classList.add('hidden');
        document.getElementById('actBuyBtn').disabled = true;
        return;
    }

    try {
        const res = await fetch(`/api/activation/count?service=${encodeURIComponent(selectedActService)}&country=${encodeURIComponent(selectedActCountry)}`);
        const data = await res.json();
        actPrice = data.price;
        actTotal = data.total;

        const displayPrice = getDisplayPrice(data.price, 'activation');
        document.getElementById('actPrice').textContent = formatPrice(displayPrice);
        document.getElementById('actStock').textContent = `${data.total} 个`;
        document.getElementById('actPriceInfo').classList.remove('hidden');
        document.getElementById('actBuyBtn').disabled = data.total === 0;
    } catch {
        document.getElementById('actPriceInfo').classList.add('hidden');
    }
}

async function purchaseActivation() {
    if (!selectedActCountry || !selectedActService) return;

    const btn = document.getElementById('actBuyBtn');
    const buyError = document.getElementById('buyError');
    btn.disabled = true;
    btn.textContent = '购买中...';
    buyError.classList.add('hidden');

    const country = ACT_COUNTRIES.find(c => c.code === selectedActCountry);
    const service = ACT_SERVICES.find(s => s.code === selectedActService);

    const hiddenPrice = calcMarkup(actPrice, 'activation');

    try {
        const res = await fetch('/api/activation/purchase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                countryCode: selectedActCountry,
                serviceCode: selectedActService,
                price: actPrice,
                hiddenPrice: hiddenPrice,
                countryName: country?.zh ?? country?.name ?? selectedActCountry,
                serviceName: service ? `${service.zh} (${service.name})` : selectedActService
            })
        });
        if (!res.ok) throw new Error(await res.text());
        await loadUserInfo();
        await loadOrders();
    } catch (e) {
        buyError.textContent = `购买失败: ${e.message}`;
        buyError.classList.remove('hidden');
    } finally {
        btn.disabled = false;
        btn.textContent = '购买号码';
    }
}

// ==================== 长期租赁 ====================
async function loadRentalCountries(retries = 3) {
    for (let i = 0; i < retries; i++) {
        try {
            const res = await fetch('/api/rental/countries');
            if (!res.ok) throw new Error();
            allRentalCountries = await res.json();
            rentalCountries = allRentalCountries;
            document.getElementById('rentalCountryCount').textContent = `(共 ${allRentalCountries.length} 个)`;
            renderRentalCountries();
            return;
        } catch {
            if (i < retries - 1) await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        }
    }
    document.getElementById('rentalCountrySelect').innerHTML = '<option value="">加载失败，请刷新</option>';
}

function translateCountry(name) {
    return COUNTRY_ZH[name] || COUNTRY_ZH[name.trim()] || name;
}

function renderRentalCountries() {
    const select = document.getElementById('rentalCountrySelect');
    select.innerHTML = rentalCountries.map(c => {
        const zh = translateCountry(c.name);
        return `<option value="${c.code}">${zh} (${c.name.trim()})</option>`;
    }).join('');
}

document.getElementById('rentalCountrySearch').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    rentalCountries = q ? allRentalCountries.filter(c =>
        c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q) || translateCountry(c.name).includes(q)
    ) : allRentalCountries;
    renderRentalCountries();
});

document.getElementById('rentalCountrySelect').addEventListener('change', (e) => {
    selectedRentalCountry = e.target.value || null;
    if (selectedRentalCountry) loadRentalServices();
});

document.getElementById('rentalDtype').addEventListener('change', () => {
    if (selectedRentalCountry) loadRentalServices();
});

document.getElementById('rentalDcount').addEventListener('change', () => {
    if (selectedRentalCountry) loadRentalServices();
});

async function loadRentalServices() {
    if (!selectedRentalCountry) return;
    const dtype = document.getElementById('rentalDtype').value;
    const dcount = document.getElementById('rentalDcount').value;

    try {
        const res = await fetch(`/api/rental/services?country=${selectedRentalCountry}&dtype=${dtype}&dcount=${dcount}`);
        allRentalServices = await res.json();
        rentalServices = allRentalServices;
        document.getElementById('rentalServiceCount').textContent = `(共 ${allRentalServices.length} 个)`;
        renderRentalServices();
    } catch { /* 忽略 */ }
}

function renderRentalServices() {
    const select = document.getElementById('rentalServiceSelect');
    select.innerHTML = rentalServices.map(s => {
        const zh = SERVICE_ZH[s.code];
        const label = zh ? `${zh} (${s.name})` : s.name;
        const dayPrice = getDisplayPrice(s.price, 'rental');
        return `<option value="${s.code}">${label} [${formatUsd(dayPrice)}/日] (${s.count}个)</option>`;
    }).join('');
    if (rentalServices.length === 0) {
        select.innerHTML = '<option value="">无可用服务</option>';
    }
}

document.getElementById('rentalServiceSearch').addEventListener('input', (e) => {
    const q = e.target.value.toLowerCase();
    rentalServices = q ? allRentalServices.filter(s =>
        s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || (SERVICE_ZH[s.code] || '').includes(q)
    ) : allRentalServices;
    renderRentalServices();
});

document.getElementById('rentalServiceSelect').addEventListener('change', (e) => {
    selectedRentalService = e.target.value || null;
    updateRentalPrice();
});

function updateRentalPrice() {
    const priceInfo = document.getElementById('rentalPriceInfo');
    const buyBtn = document.getElementById('rentalBuyBtn');

    if (!selectedRentalService) {
        priceInfo.classList.add('hidden');
        buyBtn.disabled = true;
        return;
    }

    const service = allRentalServices.find(s => s.code === selectedRentalService);
    if (!service) return;

    const dtype = document.getElementById('rentalDtype').value;
    const dcount = parseInt(document.getElementById('rentalDcount').value);
    const days = dtype === 'week' ? 7 * dcount : 30 * dcount;
    const dayPrice = getDisplayPrice(service.price, 'rental');
    const totalPrice = dayPrice * days;

    document.getElementById('rentalDayPrice').textContent = `${formatUsd(dayPrice)}/日 (${formatCny(dayPrice)})`;
    document.getElementById('rentalStock').textContent = `${service.count} 个`;
    document.getElementById('rentalTotalPrice').textContent = `${formatPrice(totalPrice)} (${days}天)`;
    priceInfo.classList.remove('hidden');
    buyBtn.disabled = service.count === 0;
}

async function purchaseRental() {
    if (!selectedRentalCountry || !selectedRentalService) return;

    const btn = document.getElementById('rentalBuyBtn');
    const buyError = document.getElementById('buyError');
    btn.disabled = true;
    btn.textContent = '租赁中...';
    buyError.classList.add('hidden');

    const dtype = document.getElementById('rentalDtype').value;
    const dcount = parseInt(document.getElementById('rentalDcount').value);
    const service = allRentalServices.find(s => s.code === selectedRentalService);
    const country = allRentalCountries.find(c => c.code === selectedRentalCountry);
    const days = dtype === 'week' ? 7 * dcount : 30 * dcount;
    const totalPrice = service ? service.price * days : 0;
    const hiddenTotal = calcMarkup(totalPrice, 'rental');
    const countryZh = country ? translateCountry(country.name) : selectedRentalCountry;
    const serviceZh = service ? (SERVICE_ZH[service.code] ? `${SERVICE_ZH[service.code]} (${service.name})` : service.name) : selectedRentalService;

    try {
        const res = await fetch('/api/rental/purchase', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                countryCode: selectedRentalCountry,
                serviceCode: selectedRentalService,
                dtype, dcount,
                price: totalPrice,
                hiddenPrice: hiddenTotal,
                countryName: countryZh,
                serviceName: serviceZh
            })
        });
        if (!res.ok) throw new Error(await res.text());
        await loadUserInfo();
        await loadOrders();
    } catch (e) {
        buyError.textContent = `租赁失败: ${e.message}`;
        buyError.classList.remove('hidden');
    } finally {
        btn.disabled = false;
        btn.textContent = '租赁号码';
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

    // 为需要轮询的订单启动轮询
    orders.filter(o => ['waiting', 'activating', 'active'].includes(o.status)).forEach(o => startPolling(o.orderId));
}

function renderOrder(o) {
    const statusMap = {
        waiting: '<span class="status-waiting font-medium"><span class="pulse-dot inline-block w-2 h-2 bg-yellow-400 rounded-full mr-1"></span>等待验证码...</span>',
        activating: '<span class="status-activating font-medium"><span class="pulse-dot inline-block w-2 h-2 bg-purple-400 rounded-full mr-1"></span>激活中...</span>',
        active: '<span class="status-active font-medium">已激活（等待短信）</span>',
        received: '<span class="status-received font-medium">已收到</span>',
        cancelled: '<span class="status-cancelled font-medium">已取消</span>',
        expired: '<span class="status-expired font-medium">已过期</span>'
    };

    const shareUrl = `${location.origin}/s/${o.orderId}`;
    const modeTag = o.mode === 'rental'
        ? '<span class="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded">租赁</span>'
        : '<span class="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">临时</span>';

    // 租赁到期时间
    const expiryInfo = o.mode === 'rental' && o.expiresAt
        ? `<span class="text-xs text-gray-400 ml-2">到期: ${new Date(o.expiresAt).toLocaleString()}</span>` : '';

    // 租赁周期信息
    const rentalInfo = o.mode === 'rental' && o.rentalDtype
        ? `<span class="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">${o.rentalDcount}${o.rentalDtype === 'week' ? '周' : '月'}</span>` : '';

    const costLabel = `$${(o.costPrice || 0).toFixed(2)}`;
    const listLabel = o.listPrice && o.listPrice !== o.costPrice ? ` <span class="text-gray-300 line-through">$${o.listPrice.toFixed(2)}</span>` : '';

    return `
    <div class="px-6 py-4" id="order-${o.orderId}">
        <div class="flex items-start justify-between">
            <div class="flex-1">
                <div class="flex items-center gap-2 mb-1 flex-wrap">
                    <span class="text-lg font-mono font-bold text-gray-800">${o.number || '(激活中)'}</span>
                    ${modeTag}
                    <span class="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded">${o.countryName}</span>
                    <span class="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded">${o.serviceName}</span>
                    ${rentalInfo}
                    <span class="text-xs text-gray-400">成本${costLabel}${listLabel}</span>
                </div>
                <div class="flex items-center gap-4 text-sm flex-wrap">
                    ${statusMap[o.status] || o.status}
                    <span class="text-gray-400">${new Date(o.purchasedAt).toLocaleString()}</span>
                    ${expiryInfo}
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
                ${o.status === 'activating' ? `
                <button onclick="activateRental('${o.orderId}')" class="text-xs bg-purple-50 text-purple-600 px-3 py-1.5 rounded hover:bg-purple-100 transition">
                    手动激活
                </button>` : ''}
                ${o.mode === 'rental' && o.status === 'active' ? `
                <button onclick="prolongRental('${o.orderId}')" class="text-xs bg-blue-50 text-blue-600 px-3 py-1.5 rounded hover:bg-blue-100 transition">
                    续费
                </button>` : ''}
                ${['waiting', 'activating', 'active'].includes(o.status) ? `
                <button onclick="cancelOrder('${o.orderId}')" class="text-xs bg-red-50 text-red-500 px-3 py-1.5 rounded hover:bg-red-100 transition">
                    取消
                </button>` : `
                <button onclick="deleteOrder('${o.orderId}')" class="text-xs bg-gray-50 text-gray-400 px-3 py-1.5 rounded hover:bg-red-50 hover:text-red-500 transition">
                    删除
                </button>`}
            </div>
        </div>
    </div>`;
}

// ==================== 轮询 ====================
function startPolling(orderId) {
    if (pollingTimers[orderId]) return;

    pollingTimers[orderId] = setInterval(async () => {
        try {
            const res = await fetch(`/api/orders/${orderId}/poll`);
            if (!res.ok) { stopPolling(orderId); return; }

            const order = await res.json();
            if (order.status === 'received' || order.status === 'cancelled' || order.status === 'expired') {
                stopPolling(orderId);
            }
            const el = document.getElementById(`order-${orderId}`);
            if (el) el.outerHTML = renderOrder(order);
        } catch { /* 忽略 */ }
    }, 5000);
}

function stopPolling(orderId) {
    if (pollingTimers[orderId]) {
        clearInterval(pollingTimers[orderId]);
        delete pollingTimers[orderId];
    }
}

// ==================== 操作 ====================
async function activateRental(orderId) {
    await fetch(`/api/rental/${orderId}/activate`, { method: 'POST' });
    await loadOrders();
}

async function prolongRental(orderId) {
    const dtype = prompt('续费类型 (week 或 month):', 'week');
    if (!dtype) return;
    const dcount = parseInt(prompt('续费数量:', '1'));
    if (!dcount) return;

    try {
        const res = await fetch(`/api/rental/${orderId}/prolong`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ dtype, dcount })
        });
        if (!res.ok) throw new Error(await res.text());
        showToast('续费成功');
        await loadOrders();
        await loadUserInfo();
    } catch (e) {
        showToast(`续费失败: ${e.message}`);
    }
}

async function cancelOrder(orderId) {
    if (!confirm('确定取消此号码？')) return;
    await fetch(`/api/orders/${orderId}/cancel`, { method: 'POST' });
    stopPolling(orderId);
    await loadOrders();
    await loadUserInfo();
}

async function deleteOrder(orderId) {
    if (!confirm('确定删除此记录？')) return;
    await fetch(`/api/orders/${orderId}`, { method: 'DELETE' });
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

// ==================== 管理端顶级标签切换 ====================

function switchAdminTab(tab) {
    const tabs = ['Purchase', 'Users', 'DbOrders', 'Pricing'];
    tabs.forEach(t => {
        const btn = document.getElementById('adminTab' + t);
        const panel = document.getElementById('adminPanel' + t);
        if (!btn || !panel) return;
        const active = t.toLowerCase() === tab.toLowerCase() || t === tab.charAt(0).toUpperCase() + tab.slice(1);
        const isActive = t.toLowerCase().replace('dborders', 'dborders') === tab;
        if (isActive) {
            btn.className = 'px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white';
            panel.classList.remove('hidden');
        } else {
            btn.className = 'px-4 py-2 rounded-lg text-sm font-medium bg-gray-200 text-gray-700';
            panel.classList.add('hidden');
        }
    });

    if (tab === 'users') loadAdminUsers();
    if (tab === 'dborders') loadAdminOrders();
    if (tab === 'pricing') loadPricing();
}

// 修正 switchAdminTab 中的匹配逻辑
switchAdminTab = function(tab) {
    const mapping = {
        purchase: 'Purchase',
        users: 'Users',
        dborders: 'DbOrders',
        pricing: 'Pricing'
    };
    Object.entries(mapping).forEach(([key, val]) => {
        const btn = document.getElementById('adminTab' + val);
        const panel = document.getElementById('adminPanel' + val);
        if (!btn || !panel) return;
        if (key === tab) {
            btn.className = 'px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white';
            panel.classList.remove('hidden');
        } else {
            btn.className = 'px-4 py-2 rounded-lg text-sm font-medium bg-gray-200 text-gray-700';
            panel.classList.add('hidden');
        }
    });
    if (tab === 'users') loadAdminUsers();
    if (tab === 'dborders') loadAdminOrders();
    if (tab === 'pricing') loadPricing();
};

// ==================== 用户管理 ====================

let adminUsers = [];

async function loadAdminUsers() {
    const res = await fetch('/api/admin/users');
    adminUsers = await res.json();
    renderAdminUsers();
    // 同时加载供应商余额
    try {
        const balRes = await fetch('/api/admin/supplier/balance');
        const balData = await balRes.json();
        const el = document.getElementById('supplierBal');
        if (el) el.textContent = `供应商余额: $${balData.balance.toFixed(2)} | Karma: ${balData.karma}`;
    } catch {}
}

function renderAdminUsers() {
    const el = document.getElementById('adminUserList');
    if (!el) return;
    el.innerHTML = adminUsers.map(u => `
        <tr class="border-b hover:bg-gray-50">
            <td class="py-2">${u.id}</td>
            <td>${u.email} ${u.isAdmin ? '<span class="text-xs text-blue-500">(管理员)</span>' : ''}</td>
            <td>${u.displayName || '-'}</td>
            <td class="font-mono">$${u.balance.toFixed(2)}</td>
            <td><span class="${u.isActive ? 'text-green-600' : 'text-red-500'}">${u.isActive ? '正常' : '禁用'}</span></td>
            <td class="text-gray-400">${new Date(u.createdAt).toLocaleDateString()}</td>
            <td class="space-x-1">
                ${!u.isAdmin ? `
                    <button onclick="openRechargeModal(${u.id},'${u.email}')" class="text-xs text-blue-600 hover:text-blue-800">充值</button>
                    <button onclick="toggleUserActive(${u.id},${u.isActive})" class="text-xs ${u.isActive ? 'text-red-500' : 'text-green-600'}">${u.isActive ? '禁用' : '启用'}</button>
                ` : ''}
            </td>
        </tr>`).join('');

    // 更新订单筛选下拉框
    const filter = document.getElementById('adminOrderUserFilter');
    if (filter) {
        const current = filter.value;
        filter.innerHTML = '<option value="">全部用户</option>' +
            adminUsers.filter(u => !u.isAdmin).map(u => `<option value="${u.id}">${u.email}</option>`).join('');
        filter.value = current;

        // 同时更新分配弹窗下拉框
        const assignSel = document.getElementById('assignUserSelect');
        if (assignSel) {
            assignSel.innerHTML = adminUsers.filter(u => !u.isAdmin && u.isActive)
                .map(u => `<option value="${u.id}">${u.email} ($${u.balance.toFixed(2)})</option>`).join('');
        }
    }
}

async function toggleUserActive(userId, currentActive) {
    await fetch(`/api/admin/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !currentActive })
    });
    loadAdminUsers();
}

// ==================== 充值 ====================

let rechargeUserId = null;

function openRechargeModal(userId, username) {
    rechargeUserId = userId;
    document.getElementById('rechargeUserName').textContent = username;
    document.getElementById('rechargeAmount').value = '';
    document.getElementById('rechargeDesc').value = '';
    document.getElementById('rechargeModal').classList.remove('hidden');
}

function closeRechargeModal() {
    document.getElementById('rechargeModal').classList.add('hidden');
    rechargeUserId = null;
}

async function doRecharge() {
    const amount = parseFloat(document.getElementById('rechargeAmount').value);
    if (!amount || amount <= 0) { alert('请输入有效金额'); return; }

    const res = await fetch(`/api/admin/users/${rechargeUserId}/recharge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            amount,
            description: document.getElementById('rechargeDesc').value || null
        })
    });
    if (res.ok) {
        closeRechargeModal();
        loadAdminUsers();
        showToast('充值成功');
    } else {
        alert('充值失败');
    }
}

// ==================== 用户订单（数据库） ====================

async function loadAdminOrders() {
    // 确保用户列表已加载
    if (adminUsers.length === 0) await loadAdminUsers();

    const userId = document.getElementById('adminOrderUserFilter')?.value;
    const url = userId ? `/api/admin/orders?userId=${userId}` : '/api/admin/orders';
    const res = await fetch(url);
    const orders = await res.json();
    const el = document.getElementById('adminOrderList');
    if (!el) return;

    el.innerHTML = orders.map(o => `
        <tr class="border-b hover:bg-gray-50 text-xs">
            <td class="py-2">${o.orderId}</td>
            <td>${o.userName || '<span class="text-gray-400">未分配</span>'}</td>
            <td>${o.serviceName} (${o.countryName})</td>
            <td class="font-mono">${o.number || '-'}</td>
            <td><span class="status-${o.status}">${o.status}</span></td>
            <td>$${o.costPrice.toFixed(2)}</td>
            <td>${o.listPrice ? '$' + o.listPrice.toFixed(2) : '-'}</td>
            <td>$${o.totalPrice.toFixed(2)}</td>
            <td class="font-mono text-blue-600">${o.verificationCode || '-'}</td>
            <td class="text-gray-400">${new Date(o.purchasedAt).toLocaleString()}</td>
            <td>
                ${!o.userId ? `<button onclick="openAssignModal(${o.id})" class="text-blue-600 hover:text-blue-800">分配</button>` : ''}
            </td>
        </tr>`).join('');
}

// ==================== 订单分配 ====================

let assignOrderId = null;

function openAssignModal(orderId) {
    assignOrderId = orderId;
    document.getElementById('assignModal').classList.remove('hidden');
}

function closeAssignModal() {
    document.getElementById('assignModal').classList.add('hidden');
    assignOrderId = null;
}

async function doAssign() {
    const userId = parseInt(document.getElementById('assignUserSelect').value);
    if (!userId) { alert('请选择用户'); return; }

    const res = await fetch(`/api/admin/orders/${assignOrderId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId })
    });
    if (res.ok) {
        closeAssignModal();
        loadAdminOrders();
        showToast('分配成功');
    } else {
        alert('分配失败');
    }
}

// ==================== 定价配置 ====================

async function loadPricing() {
    const res = await fetch('/api/admin/pricing');
    const data = await res.json();
    document.getElementById('pricingEnabled').checked = data.markupEnabled;
    document.getElementById('pricingActivationProfit').value = data.activationProfitPercent;
    document.getElementById('pricingRentalProfit').value = data.rentalProfitPercent;
    document.getElementById('pricingServiceFee1m').value = data.serviceFee1m || 0;
    document.getElementById('pricingServiceFee3m').value = data.serviceFee3m || 0;
    document.getElementById('pricingServiceFee6m').value = data.serviceFee6m || 0;
    document.getElementById('pricingServiceFee12m').value = data.serviceFee12m || 0;
    document.getElementById('pricingRate').value = data.usdCnyRate;
}

async function savePricing() {
    const res = await fetch('/api/admin/pricing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            markupEnabled: document.getElementById('pricingEnabled').checked,
            activationProfitPercent: parseFloat(document.getElementById('pricingActivationProfit').value) || 0,
            rentalProfitPercent: parseFloat(document.getElementById('pricingRentalProfit').value) || 0,
            serviceFee1m: parseFloat(document.getElementById('pricingServiceFee1m').value) || 0,
            serviceFee3m: parseFloat(document.getElementById('pricingServiceFee3m').value) || 0,
            serviceFee6m: parseFloat(document.getElementById('pricingServiceFee6m').value) || 0,
            serviceFee12m: parseFloat(document.getElementById('pricingServiceFee12m').value) || 0,
            usdCnyRate: parseFloat(document.getElementById('pricingRate').value) || 7.25
        })
    });
    if (res.ok) showToast('定价配置已保存');
    else alert('保存失败');
}

// ==================== 登出 ====================

async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    window.location.href = '/login';
}

// ==================== 启动 ====================
init();
