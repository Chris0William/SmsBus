const UserView = {
    template: `
<el-container style="height:100vh">
    <div class="sidebar-overlay" :class="{active:mobileOpen}" @click="mobileOpen=false"></div>
    <el-aside :width="collapsed?'64px':'220px'" class="sidebar" :class="{'mobile-open':mobileOpen}">
        <div class="sidebar-logo">
            <div class="icon">S</div>
            <span v-show="!collapsed" class="title">SMS接码平台</span>
        </div>
        <el-menu :default-active="activeMenu" @select="onMenuSelect" :collapse="collapsed">
            <el-menu-item index="activation"><el-icon><Promotion /></el-icon><span>临时接码</span></el-menu-item>
            <el-menu-item index="rental"><el-icon><Timer /></el-icon><span>租赁</span></el-menu-item>
            <el-menu-item index="orders"><el-icon><Document /></el-icon><span>我的订单</span></el-menu-item>
            <el-menu-item index="transactions"><el-icon><Wallet /></el-icon><span>余额流水</span></el-menu-item>
        </el-menu>
        <div v-show="!collapsed" class="sidebar-footer">
            <div class="email">{{ userPhone }}</div>
            <div class="balance">\${{ userBalance.toFixed(2) }} (¥{{ cny(userBalance) }})</div>
        </div>
    </el-aside>
    <el-container>
        <el-header class="app-header">
            <div class="left">
                <el-button :icon="isMobile?'Menu':(collapsed?'Expand':'Fold')" text @click="toggleSidebar" />
                <span class="breadcrumb">{{ menuLabels[activeMenu] }}</span>
            </div>
            <div class="right">
                <span id="userInfo" style="color:#6b7280;font-size:13px">{{ userPhone }} | \${{ userBalance.toFixed(2) }}</span>
                <el-button type="danger" text size="small" @click="doLogout">
                    <el-icon><SwitchButton /></el-icon><span class="mobile-hide"> 退出</span>
                </el-button>
            </div>
        </el-header>
        <el-main class="app-main">
            <transition name="slide-fade" mode="out-in">

                <!-- ======= 临时接码 ======= -->
                <div v-if="activeMenu==='activation'" key="act">
                    <el-row :gutter="16">
                        <el-col :xs="24" :md="12">
                            <div class="content-card">
                                <div class="card-title">选择服务</div>
                                <el-form label-position="top" size="default">
                                    <el-form-item label="选择国家">
                                        <el-select v-model="actCountry" style="width:100%" filterable placeholder="搜索国家..."
                                            @change="onActCountryChange">
                                            <el-option v-for="c in actCountries" :key="c.code"
                                                :label="c.name+' ['+c.code+']'" :value="c.code" />
                                        </el-select>
                                    </el-form-item>
                                    <el-form-item v-if="actNeedService" label="选择服务">
                                        <el-select v-model="actService" style="width:100%" filterable placeholder="搜索服务..."
                                            @change="actInfo=null">
                                            <el-option v-for="s in actServices" :key="s.code"
                                                :label="(svcZh(s.code)||s.name)+' ('+s.name+')'" :value="s.code" />
                                        </el-select>
                                    </el-form-item>
                                    <el-button type="primary" plain @click="queryActivation" style="width:100%">查询可用数量和价格</el-button>
                                    <div v-if="actInfo" style="margin-top:12px;padding:12px;background:#eff6ff;border-radius:8px">
                                        <p style="font-size:13px;color:#374151">可用: <strong>{{ actInfo.total }}</strong> 个</p>
                                        <p style="font-size:13px;color:#374151">价格: <strong>\${{ actInfo.userPrice.toFixed(4) }}</strong>
                                            <span style="color:#6b7280;font-size:12px"> ≈ ¥{{ cny(actInfo.userPrice) }}</span>
                                        </p>
                                    </div>
                                    <el-button v-if="actInfo" type="primary" @click="buyActivation"
                                        :disabled="actInfo.total<=0" :loading="actBuying" style="width:100%;margin-top:12px">
                                        {{ actInfo.total>0 ? '购买 $'+actInfo.userPrice.toFixed(2)+' ≈ ¥'+cny(actInfo.userPrice) : '无可用号码' }}
                                    </el-button>
                                </el-form>
                            </div>
                        </el-col>
                        <el-col :xs="24" :md="12">
                            <div v-if="actData" class="content-card">
                                <div class="card-title">购买结果</div>
                                <div v-if="actData.number" style="margin-bottom:8px">
                                    <span style="font-size:13px;color:#6b7280">号码: </span>
                                    <span style="font-family:monospace;font-weight:600;cursor:pointer" @click="copyText(actData.number)">{{ actData.number }}</span>
                                </div>
                                <div v-if="actData.status==='waiting'">
                                    <p style="color:#3b82f6"><span style="display:inline-block;width:6px;height:6px;background:#3b82f6;border-radius:50%;margin-right:4px;animation:pulse 1.5s infinite"></span>等待短信中...</p>
                                </div>
                                <div v-else-if="actData.status==='received'">
                                    <p style="color:#22c55e;font-weight:600">收到短信!</p>
                                    <div v-if="actData.code" style="margin-top:8px">
                                        <span style="font-family:monospace;font-size:28px;font-weight:700;color:#3b82f6;letter-spacing:3px;cursor:pointer"
                                            @click="copyText(actData.code)">{{ actData.code }}</span>
                                    </div>
                                </div>
                                <div v-else-if="actData.status==='expired'||actData.status==='cancelled'">
                                    <p style="color:#ef4444">号码已过期，已自动退款</p>
                                </div>
                                <div v-else-if="actData.status==='timeout'">
                                    <p style="color:#6b7280">轮询超时，请在订单列表中查看</p>
                                </div>
                                <div v-if="actCountdown > 0" style="margin-top:12px">
                                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                                        <span style="font-size:14px;color:#6b7280">剩余等待时间</span>
                                        <span style="font-size:18px;font-weight:700;color:#e6a23c;font-family:monospace">
                                            {{ Math.floor(actCountdown/60) }}:{{ String(actCountdown%60).padStart(2,'0') }}
                                        </span>
                                    </div>
                                    <el-progress :percentage="Math.round(actCountdown/600*100)" :show-text="false"
                                        :stroke-width="6" color="#e6a23c" />
                                </div>
                                <div v-if="actCountdown > 0" style="margin-top:12px;padding:12px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px;font-size:13px;color:#92400e;line-height:1.8">
                                    <p>1. 请在第三方应用中使用上方号码进行注册或验证</p>
                                    <p>2. 短信通常在 1-3 分钟内到达</p>
                                    <p>3. 超时未收到验证码，订单将自动取消并退款</p>
                                </div>
                            </div>
                        </el-col>
                    </el-row>
                </div>

                <!-- ======= 租赁 ======= -->
                <div v-else-if="activeMenu==='rental'" key="rent">
                    <el-row :gutter="16">
                        <el-col :xs="24" :md="12">
                            <div class="content-card">
                                <div class="card-title">租赁服务</div>
                                <el-form label-position="top" size="default">
                                    <el-form-item label="国家">
                                        <el-select v-model="rentCountry" filterable placeholder="选择国家" style="width:100%"
                                            @change="onRentCountryChange">
                                            <el-option v-for="c in rentalCountries" :key="c.code" :label="c.name+' ('+c.code+')'" :value="c.code" />
                                        </el-select>
                                    </el-form-item>
                                    <el-form-item v-if="rentNeedService" label="选择服务">
                                        <el-select v-model="rentService" filterable placeholder="选择服务" style="width:100%"
                                            @change="onRentConfigChange">
                                            <el-option v-for="s in rentalServiceList" :key="s.code"
                                                :label="(svcZh(s.code)||s.name)+' ('+s.name+') - '+s.count+'个'" :value="s.code" />
                                        </el-select>
                                    </el-form-item>
                                    <el-form-item label="订阅时长">
                                        <el-radio-group v-model="rentMonths" @change="onRentConfigChange" style="width:100%">
                                            <el-radio-button :value="1">1个月</el-radio-button>
                                            <el-radio-button :value="3">3个月</el-radio-button>
                                            <el-radio-button :value="6">6个月</el-radio-button>
                                            <el-radio-button :value="12">12个月</el-radio-button>
                                        </el-radio-group>
                                    </el-form-item>
                                </el-form>
                                <div v-if="rentPriceInfo" style="padding:12px;background:#eff6ff;border-radius:8px;margin-top:8px">
                                    <p style="font-size:13px;color:#374151">月价: <strong>\${{ rentPriceInfo.monthlyUserPrice.toFixed(4) }}</strong>
                                        <span style="color:#6b7280;font-size:12px"> ≈ ¥{{ cny(rentPriceInfo.monthlyUserPrice) }}</span>
                                    </p>
                                    <p style="font-size:14px;color:#374151;margin-top:4px;font-weight:600">总价: \${{ rentPriceInfo.totalUserPrice.toFixed(4) }}
                                        <span style="color:#6b7280;font-size:12px;font-weight:400"> ≈ ¥{{ cny(rentPriceInfo.totalUserPrice) }}</span>
                                    </p>
                                </div>
                                <el-button v-if="rentPriceInfo" type="primary" @click="buyRental"
                                    :loading="rentBuying" style="width:100%;margin-top:12px">
                                    购买 \${{ rentPriceInfo.totalUserPrice.toFixed(2) }} ≈ ¥{{ cny(rentPriceInfo.totalUserPrice) }}
                                </el-button>
                            </div>
                        </el-col>
                        <el-col :xs="24" :md="12">
                            <div v-if="rentData" class="content-card">
                                <div class="card-title">租赁结果</div>
                                <p style="color:#22c55e;font-weight:600;margin-bottom:8px">购买成功!</p>
                                <div style="margin-bottom:8px">
                                    <span style="font-size:13px;color:#6b7280">号码: </span>
                                    <span style="font-family:monospace;font-weight:600;font-size:16px;cursor:pointer" @click="copyText(rentData.number)">{{ rentData.number }}</span>
                                </div>
                                <p style="font-size:13px;color:#6b7280">总扣款: \${{ rentData.totalPrice.toFixed(2) }} ≈ ¥{{ cny(rentData.totalPrice) }}</p>
                                <p v-if="rentData.months>1" style="font-size:12px;color:#9ca3af;margin-top:2px">{{ rentData.months }}个月</p>
                                <div style="margin-top:12px;border-top:1px solid #e5e7eb;padding-top:12px">
                                    <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
                                        <span style="font-size:13px;font-weight:500">短信验证码</span>
                                        <el-button type="primary" text size="small" :loading="rentSmsLoading" @click="fetchRentSms(rentData.orderId)">
                                            <el-icon><Refresh /></el-icon> 刷新短信
                                        </el-button>
                                    </div>
                                    <div v-if="rentData.latestCode" style="margin-top:4px">
                                        <span style="font-family:monospace;font-size:28px;font-weight:700;color:#3b82f6;letter-spacing:3px;cursor:pointer"
                                            @click="copyText(rentData.latestCode)">{{ rentData.latestCode }}</span>
                                    </div>
                                    <p v-else style="color:#9ca3af;font-size:13px">暂无验证码，请使用号码注册后点击刷新</p>
                                    <el-button v-if="rentData.smsList&&rentData.smsList.length>0" text type="primary" size="small"
                                        @click="showSmsHistory(rentData.smsList)" style="margin-top:8px">
                                        查看历史验证码 ({{ rentData.smsList.length }}条)
                                    </el-button>
                                </div>
                            </div>
                        </el-col>
                    </el-row>
                </div>

                <!-- ======= 我的订单 ======= -->
                <div v-else-if="activeMenu==='orders'" key="orders">
                    <div class="content-card">
                        <div class="card-title">
                            <span>我的订单</span>
                            <el-button text type="primary" @click="loadOrders"><el-icon><Refresh /></el-icon> 刷新</el-button>
                        </div>
                        <el-empty v-if="orders.length===0" description="暂无订单" />
                        <div v-for="o in orders" :key="o.id"
                            style="border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin-bottom:12px;transition:all .2s"
                            @mouseenter="$event.currentTarget.style.boxShadow='0 2px 12px rgba(0,0,0,.06)'"
                            @mouseleave="$event.currentTarget.style.boxShadow=''">
                            <div style="display:flex;justify-content:space-between;align-items:start">
                                <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                                    <el-tag :type="o.mode==='activation'?'':'warning'" size="small">{{ o.mode==='activation'?'临时':'租赁' }}</el-tag>
                                    <span style="font-weight:500;font-size:14px">{{ o.serviceName || o.serviceCode || '全服务' }}</span>
                                    <el-tag size="small">{{ o.countryName || o.countryCode }}</el-tag>
                                    <el-tag :type="statusType(o.status)" size="small">{{ statusText(o.status) }}</el-tag>
                                    <span v-if="o.source==='admin'" style="color:#9ca3af;font-size:12px">(管理员分配)</span>
                                </div>
                                <span style="color:#9ca3af;font-size:12px;white-space:nowrap">{{ fmtTime(o.purchasedAt) }}</span>
                            </div>
                            <div style="margin-top:8px;font-size:13px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">
                                <span style="font-family:monospace;cursor:pointer" @click="o.phoneNumber&&copyText(o.phoneNumber)">{{ o.phoneNumber||'-' }}</span>
                                <span style="color:#9ca3af">\${{ (o.userPrice||0).toFixed(2) }} ≈ ¥{{ cny(o.userPrice||0) }}</span>
                            </div>
                            <div v-if="o.mode==='rental'" style="margin-top:6px;font-size:12px;color:#6b7280;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                                <span v-if="o.expiresAt">到期: {{ fmtDate(o.expiresAt) }}</span>
                                <span v-if="o.subscriptionMonths>1">· {{ o.subscriptionMonths }}个月 (已续{{ o.renewedCount||0 }}次)</span>
                            </div>
                            <div v-if="o.mode==='activation'&&o.status==='waiting'" style="margin-top:8px">
                                <p style="color:#3b82f6;font-size:13px">
                                    <span style="display:inline-block;width:6px;height:6px;background:#3b82f6;border-radius:50%;margin-right:4px;animation:pulse 1.5s infinite"></span>
                                    等待短信中...
                                    <span v-if="orderCountdown(o)>0" style="font-family:monospace;font-weight:600;color:#e6a23c;margin-left:8px">
                                        {{ Math.floor(orderCountdown(o)/60) }}:{{ String(orderCountdown(o)%60).padStart(2,'0') }}
                                    </span>
                                </p>
                            </div>
                            <!-- 短信列表 -->
                            <div v-if="o.smsList&&o.smsList.length>0" style="margin-top:8px">
                                <div v-for="sms in o.smsList.slice(0,1)" :key="sms.receivedAt" style="display:flex;align-items:center;gap:8px">
                                    <span v-if="sms.code" style="font-family:monospace;font-size:22px;font-weight:700;color:#3b82f6;letter-spacing:3px;cursor:pointer"
                                        @click="copyText(sms.code)">{{ sms.code }}</span>
                                    <span v-else style="color:#6b7280;font-size:13px">{{ sms.text?.substring(0,50) }}</span>
                                </div>
                                <el-button v-if="o.smsList.length>1" text type="primary" size="small"
                                    @click="showSmsHistory(o.smsList)" style="margin-top:4px">历史 ({{ o.smsList.length }})</el-button>
                            </div>
                            <div v-if="o.mode==='rental'" style="margin-top:6px;display:flex;align-items:center;gap:8px">
                                <el-button text type="primary" size="small" @click="refreshOrderSms(o)">
                                    <el-icon><Refresh /></el-icon> 刷新短信
                                </el-button>
                                <el-button v-if="daysUntilExpiry(o)<=7&&daysUntilExpiry(o)>=0" type="warning" size="small" @click="renewOrder(o)">
                                    续订
                                </el-button>
                                <span v-if="daysUntilExpiry(o)<=7&&daysUntilExpiry(o)>=0" style="color:#e6a23c;font-size:12px">
                                    即将到期
                                </span>
                            </div>
                            <div v-if="o.status==='waiting'" style="margin-top:8px;display:flex;gap:8px">
                                <el-button type="danger" text size="small" @click="cancelOrder(o.id)">取消订单</el-button>
                                <el-button type="primary" text size="small" @click="pollOrder(o.id)">刷新状态</el-button>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- ======= 余额流水 ======= -->
                <div v-else-if="activeMenu==='transactions'" key="tx">
                    <div class="content-card">
                        <div class="card-title">余额流水</div>
                        <el-table :data="transactions" stripe empty-text="暂无记录" style="width:100%">
                            <el-table-column prop="createdAt" label="时间" width="180">
                                <template #default="{row}">{{ fmtTime(row.createdAt) }}</template>
                            </el-table-column>
                            <el-table-column prop="type" label="类型" width="100">
                                <template #default="{row}">
                                    <el-tag :type="row.type==='recharge'?'success':row.type==='refund'?'warning':'danger'" size="small">
                                        {{ {recharge:'充值',purchase:'消费',refund:'退款'}[row.type]||row.type }}
                                    </el-tag>
                                </template>
                            </el-table-column>
                            <el-table-column prop="amount" label="金额" width="120">
                                <template #default="{row}">
                                    <span :style="{color:row.amount>=0?'#67c23a':'#f56c6c',fontWeight:600}">
                                        \${{ row.amount>=0?'+':'' }}{{ row.amount.toFixed(2) }}
                                    </span>
                                </template>
                            </el-table-column>
                            <el-table-column prop="description" label="说明" />
                        </el-table>
                    </div>
                </div>

            </transition>
        </el-main>
    </el-container>

    <!-- 短信历史对话框 -->
    <el-dialog v-model="smsHistoryVisible" title="历史验证码" :width="isMobile?'92%':'480px'">
        <div v-for="(sms, idx) in smsHistoryList" :key="idx"
            style="padding:10px 12px;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:8px">
            <div style="display:flex;justify-content:space-between;align-items:center">
                <span v-if="sms.code" style="font-family:monospace;font-size:18px;font-weight:700;color:#3b82f6;letter-spacing:2px;cursor:pointer"
                    @click="copyText(sms.code)">{{ sms.code }}</span>
                <span v-else style="color:#9ca3af;font-size:13px">无验证码</span>
                <span style="color:#9ca3af;font-size:12px">{{ fmtTime(sms.receivedAt) }}</span>
            </div>
            <p style="color:#6b7280;font-size:12px;margin-top:4px">{{ sms.text }}</p>
        </div>
        <el-empty v-if="smsHistoryList.length===0" description="暂无短信记录" :image-size="60" />
    </el-dialog>
</el-container>`,

    data() {
        return {
            collapsed: false,
            mobileOpen: false,
            isMobile: false,
            activeMenu: 'activation',
            menuLabels: { activation: '临时接码', rental: '租赁', orders: '我的订单', transactions: '余额流水' },
            userPhone: '', userBalance: 0, usdCnyRate: 7.25,
            // Activation
            actCountries: [], actCountry: '', actNeedService: true,
            actServices: [], actService: '', actInfo: null, actBuying: false,
            actData: null, actCountdown: 0, actCountdownTimer: null,
            // Rental
            rentalCountries: [], rentCountry: '', rentNeedService: true,
            rentalServiceList: [], rentService: '', rentMonths: 1,
            rentPriceInfo: null, rentData: null, rentSmsLoading: false, rentBuying: false,
            // Orders
            orders: [], orderTimerTick: 0, orderTickTimer: null,
            // Transactions
            transactions: [],
            // SMS History Dialog
            smsHistoryVisible: false, smsHistoryList: []
        };
    },

    methods: {
        toggleSidebar() {
            if (this.isMobile) this.mobileOpen = !this.mobileOpen;
            else this.collapsed = !this.collapsed;
        },
        checkMobile() {
            this.isMobile = window.innerWidth <= 768;
            if (this.isMobile) this.collapsed = false;
        },
        onMenuSelect(index) {
            this.activeMenu = index;
            if (this.isMobile) this.mobileOpen = false;
            if (index === 'orders') { this.loadOrders(); this.startOrderPolling(); }
            else { this.stopOrderPolling(); }
            if (index === 'transactions') this.loadTransactions();
            if (index === 'rental' && this.rentalCountries.length === 0) this.loadRentalCountries();
        },

        cny(usd) { return (usd * this.usdCnyRate).toFixed(2); },

        // === User Info ===
        async loadUserInfo() {
            try {
                const res = await fetch('/api/user/info');
                if (!res.ok) { this.$router.push('/login'); return; }
                const d = await res.json();
                this.userPhone = d.phone;
                this.userBalance = d.balance;
                this.usdCnyRate = d.usdCnyRate || 7.25;
            } catch { this.$router.push('/login'); }
        },

        async doLogout() {
            await fetch('/api/auth/logout', { method: 'POST' });
            this.$router.push('/login');
        },

        // === Activation ===
        async loadActCountries() {
            try {
                const res = await fetch('/api/countries?mode=activation');
                this.actCountries = await res.json();
            } catch {}
        },
        async onActCountryChange() {
            this.actInfo = null;
            this.actService = '';
            this.actServices = [];
            const c = this.actCountries.find(x => x.code === this.actCountry);
            this.actNeedService = c ? c.requiresServiceForActivation : true;
            if (this.actNeedService) {
                try {
                    const res = await fetch(`/api/countries/${this.actCountry}/services/activation`);
                    const data = await res.json();
                    this.actServices = data;
                    if (data.length > 0) {
                        const tiktok = data.find(s => s.code === 'opt104');
                        this.actService = tiktok ? 'opt104' : data[0].code;
                    }
                } catch {}
            }
        },
        async queryActivation() {
            if (!this.actCountry) return;
            const svc = this.actNeedService ? this.actService : '';
            try {
                const res = await fetch(`/api/countries/${this.actCountry}/activation/price?service=${svc}`);
                const d = await res.json();
                this.actInfo = { total: d.total, userPrice: d.userPrice };
                if (d.usdCnyRate) this.usdCnyRate = d.usdCnyRate;
            } catch { ElementPlus.ElMessage.error('查询失败'); }
        },
        async buyActivation() {
            this.actBuying = true;
            try {
                const res = await fetch('/api/user/purchase/activation', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        countryCode: this.actCountry,
                        serviceCode: this.actNeedService ? this.actService : null
                    })
                });
                const d = await res.json();
                if (!res.ok) { ElementPlus.ElMessage.error(d.error || '购买失败'); return; }
                ElementPlus.ElMessage.success('购买成功，等待短信...');
                this.actData = { status: 'waiting', number: d.number || '', code: null, orderId: d.orderId };
                this.startCountdown();
                this.pollActivation(d.orderId);
                this.loadUserInfo();
            } catch (e) { ElementPlus.ElMessage.error('购买失败: ' + e.message); }
            finally { this.actBuying = false; }
        },
        async pollActivation(orderId) {
            for (let i = 0; i < 200; i++) {
                await new Promise(r => setTimeout(r, 3000));
                try {
                    const res = await fetch(`/api/user/orders/${orderId}/poll`);
                    const d = await res.json();
                    if (d.deleted || d.status === 'expired') {
                        this.clearCountdown();
                        this.actData = { status: 'expired', number: '', code: null, orderId };
                        this.loadUserInfo();
                        return;
                    }
                    if (d.status === 'received') {
                        this.clearCountdown();
                        const code = d.smsList?.[0]?.code || '-';
                        this.actData = { status: 'received', number: d.phoneNumber, code, orderId };
                        return;
                    }
                    if (d.status === 'cancelled') {
                        this.clearCountdown();
                        this.actData = { status: 'cancelled', number: d.phoneNumber, code: null, orderId };
                        return;
                    }
                } catch {}
            }
            this.clearCountdown();
            if (this.actData) this.actData.status = 'timeout';
        },

        // === Rental ===
        async loadRentalCountries() {
            try {
                const res = await fetch('/api/countries?mode=rental');
                this.rentalCountries = await res.json();
            } catch {}
        },
        async onRentCountryChange() {
            this.rentService = '';
            this.rentalServiceList = [];
            this.rentPriceInfo = null;
            const c = this.rentalCountries.find(x => x.code === this.rentCountry);
            this.rentNeedService = c ? c.requiresServiceForRental : true;
            if (this.rentNeedService) {
                try {
                    const res = await fetch(`/api/countries/${this.rentCountry}/services/rental`);
                    const list = await res.json();
                    const tk = list.findIndex(s => s.code === 'opt104');
                    if (tk > 0) list.unshift(list.splice(tk, 1)[0]);
                    this.rentalServiceList = list;
                } catch {}
            }
            this.onRentConfigChange();
        },
        async onRentConfigChange() {
            if (!this.rentCountry) return;
            const svc = this.rentNeedService ? this.rentService : '';
            try {
                const res = await fetch(`/api/countries/${this.rentCountry}/rental/price?service=${svc}&months=${this.rentMonths}`);
                if (!res.ok) { this.rentPriceInfo = null; return; }
                const d = await res.json();
                if (d.error) { this.rentPriceInfo = null; return; }
                this.rentPriceInfo = { monthlyUserPrice: d.monthlyUserPrice, totalUserPrice: d.totalUserPrice };
                if (d.usdCnyRate) this.usdCnyRate = d.usdCnyRate;
            } catch { this.rentPriceInfo = null; }
        },
        async buyRental() {
            if (!this.rentPriceInfo) return;
            const total = this.rentPriceInfo.totalUserPrice;
            const months = this.rentMonths;
            const msg = `确认购买租赁（${months}个月），总价 $${total.toFixed(2)} (≈ ¥${this.cny(total)})？`;
            try {
                await ElementPlus.ElMessageBox.confirm(msg, '确认购买',
                    { confirmButtonText: '确认', cancelButtonText: '取消', type: 'info' });
            } catch { return; }
            this.rentBuying = true;
            try {
                const res = await fetch('/api/user/purchase/rental', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        countryCode: this.rentCountry,
                        serviceCode: this.rentNeedService ? this.rentService : null,
                        months
                    })
                });
                const d = await res.json();
                if (!res.ok) { ElementPlus.ElMessage.error(d.error || '购买失败'); return; }
                ElementPlus.ElNotification({ title: '购买成功', message: `号码: ${d.number}`, type: 'success' });
                this.rentData = {
                    orderId: d.orderId, number: d.number || '', totalPrice: d.totalUserPrice || total,
                    months, latestCode: null, smsList: []
                };
                this.loadUserInfo();
            } catch (e) { ElementPlus.ElMessage.error('购买失败'); }
            finally { this.rentBuying = false; }
        },
        async fetchRentSms(orderId) {
            this.rentSmsLoading = true;
            try {
                const res = await fetch(`/api/user/orders/${orderId}/sms`);
                const d = await res.json();
                if (d.error) ElementPlus.ElMessage.warning(d.error);
                if (d.messages && d.messages.length > 0) {
                    if (this.rentData) {
                        this.rentData.smsList = d.messages;
                        this.rentData.latestCode = d.messages[0].code;
                    }
                } else if (!d.error) {
                    ElementPlus.ElMessage.info('暂无新短信');
                }
            } catch { ElementPlus.ElMessage.error('获取短信失败'); }
            finally { this.rentSmsLoading = false; }
        },

        // === Orders ===
        async loadOrders() {
            try {
                const res = await fetch('/api/user/orders');
                this.orders = await res.json();
            } catch {}
        },
        async cancelOrder(orderId) {
            try {
                await ElementPlus.ElMessageBox.confirm('确认取消此订单？余额将退回。', '确认取消',
                    { confirmButtonText: '确认', cancelButtonText: '取消', type: 'warning' });
            } catch { return; }
            const res = await fetch(`/api/user/orders/${orderId}/cancel`, { method: 'POST' });
            if (res.ok) { this.loadOrders(); this.loadUserInfo(); ElementPlus.ElMessage.success('订单已取消，余额已退回'); }
            else { const d = await res.json(); ElementPlus.ElMessage.error(d.error || '取消失败'); }
        },
        async pollOrder(orderId) {
            const res = await fetch(`/api/user/orders/${orderId}/poll`);
            const d = await res.json();
            if (d.deleted) { this.loadUserInfo(); }
            this.loadOrders();
        },
        startOrderPolling() {
            this.stopOrderPolling();
            this.orderTickTimer = setInterval(() => {
                this.orderTimerTick++;
                // 每10秒对waiting的临时订单自动poll
                if (this.orderTimerTick % 10 === 0) {
                    const waitingActs = this.orders.filter(o => o.mode === 'activation' && o.status === 'waiting');
                    waitingActs.forEach(o => this.pollOrder(o.id));
                }
                // 每30秒对active的租赁订单刷新短信
                if (this.orderTimerTick % 30 === 0) {
                    const activeRentals = this.orders.filter(o => o.mode === 'rental' && o.status === 'active');
                    activeRentals.forEach(o => this.refreshOrderSms(o));
                }
            }, 1000);
        },
        stopOrderPolling() {
            if (this.orderTickTimer) { clearInterval(this.orderTickTimer); this.orderTickTimer = null; }
            this.orderTimerTick = 0;
        },
        orderCountdown(o) {
            void this.orderTimerTick;
            const elapsed = (Date.now() - new Date(o.purchasedAt).getTime()) / 1000;
            return Math.max(0, Math.floor(600 - elapsed));
        },
        daysUntilExpiry(o) {
            if (!o.expiresAt) return 999;
            return Math.ceil((new Date(o.expiresAt).getTime() - Date.now()) / (1000*60*60*24));
        },
        async renewOrder(o) {
            try {
                const priceRes = await fetch(`/api/user/orders/${o.id}/renew-price?months=1`);
                const priceData = await priceRes.json();
                if (!priceRes.ok) { ElementPlus.ElMessage.error(priceData.error || '查询价格失败'); return; }

                const monthlyPrice = priceData.monthlyUserPrice;
                const rate = priceData.usdCnyRate || this.usdCnyRate;

                const { value: monthsStr } = await ElementPlus.ElMessageBox.prompt(
                    `续订 ${o.serviceName||'全服务'}\n\n月价: $${monthlyPrice.toFixed(2)} ≈ ¥${(monthlyPrice*rate).toFixed(2)}/月\n\n请输入续订月数 (1/3/6/12):`,
                    '续订', {
                        confirmButtonText: '确认续订',
                        cancelButtonText: '取消',
                        inputPattern: /^(1|3|6|12)$/,
                        inputErrorMessage: '请输入 1、3、6 或 12',
                        inputValue: '1'
                    }
                );
                const months = parseInt(monthsStr);
                const total = monthlyPrice * months;

                await ElementPlus.ElMessageBox.confirm(
                    `确认续订（${months}个月），总价 $${total.toFixed(2)} (≈ ¥${(total*rate).toFixed(2)})？`,
                    '确认续订', { confirmButtonText: '确认', cancelButtonText: '取消', type: 'warning' }
                );

                const res = await fetch(`/api/user/orders/${o.id}/renew`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ months })
                });
                const d = await res.json();
                if (!res.ok) { ElementPlus.ElMessage.error(d.error || '续订失败'); return; }
                ElementPlus.ElMessage.success('续订成功');
                this.loadOrders();
                this.loadUserInfo();
            } catch { /* 用户取消 */ }
        },
        async refreshOrderSms(o) {
            try {
                const res = await fetch(`/api/user/orders/${o.id}/sms`);
                const d = await res.json();
                if (d.error) ElementPlus.ElMessage.warning(d.error);
                if (d.messages && d.messages.length > 0) {
                    await this.loadOrders();
                }
            } catch {}
        },

        // === SMS History ===
        showSmsHistory(smsList) {
            this.smsHistoryList = smsList;
            this.smsHistoryVisible = true;
        },

        // === Transactions ===
        async loadTransactions() {
            try {
                const res = await fetch('/api/user/transactions');
                this.transactions = await res.json();
            } catch {}
        },

        // === Countdown ===
        startCountdown() {
            this.clearCountdown();
            this.actCountdown = 600;
            this.actCountdownTimer = setInterval(() => {
                this.actCountdown--;
                if (this.actCountdown <= 0) this.clearCountdown();
            }, 1000);
        },
        clearCountdown() {
            if (this.actCountdownTimer) { clearInterval(this.actCountdownTimer); this.actCountdownTimer = null; }
            this.actCountdown = 0;
        },

        // === Shared helpers ===
        translateCountry(n) { return translateCountry(n); },
        svcZh(code) { return svcZh(code); },

        // === Utils ===
        statusType(s) { return { waiting:'warning', received:'success', cancelled:'info', expired:'danger', activating:'', active:'' }[s] || ''; },
        statusText(s) { return { waiting:'等待中', received:'已收到', cancelled:'已取消', expired:'已过期', activating:'激活中', active:'活跃' }[s] || s; },
        fmtTime(t) { return new Date(t).toLocaleString(); },
        fmtDate(t) { return new Date(t).toLocaleDateString(); },
        copyText(t) {
            navigator.clipboard?.writeText(t).then(
                () => ElementPlus.ElMessage.success('已复制'),
                () => ElementPlus.ElMessage.error('复制失败')
            );
        }
    },

    beforeUnmount() {
        this.clearCountdown();
        this.stopOrderPolling();
        window.removeEventListener('resize', this.checkMobile);
    },

    async mounted() {
        this.checkMobile();
        window.addEventListener('resize', this.checkMobile);
        await this.loadUserInfo();
        this.loadActCountries();
    }
};
