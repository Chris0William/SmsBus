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
                                            @change="actInfo=null">
                                            <el-option v-for="c in allActCountries" :key="c.code"
                                                :label="c.name+' ['+c.code+']'" :value="c.code" />
                                        </el-select>
                                    </el-form-item>
                                    <el-form-item label="选择服务">
                                        <el-select v-model="actService" style="width:100%" filterable placeholder="搜索服务..."
                                            @change="actInfo=null">
                                            <el-option v-for="s in allActServices" :key="s.code"
                                                :label="s.zh+' ('+s.name+')'" :value="s.code" />
                                        </el-select>
                                    </el-form-item>
                                    <el-button type="primary" plain @click="queryActivation" style="width:100%">查询可用数量和价格</el-button>
                                    <div v-if="actInfo" style="margin-top:12px;padding:12px;background:#eff6ff;border-radius:8px">
                                        <p style="font-size:13px;color:#374151">可用: <strong>{{ actInfo.total }}</strong> 个</p>
                                        <p style="font-size:13px;color:#374151">价格: <strong>\${{ actInfo.userPrice.toFixed(2) }}</strong>
                                            <span style="color:#6b7280;font-size:12px"> ≈ ¥{{ cny(actInfo.userPrice) }}</span>
                                        </p>
                                    </div>
                                    <el-button v-if="actInfo" id="actBuyBtn" type="primary" @click="buyActivation"
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
                                            @change="loadRentalServices">
                                            <el-option v-for="c in rentalCountries" :key="c.code" :label="translateCountry(c.name)+' ('+c.code+')'" :value="c.code" />
                                        </el-select>
                                    </el-form-item>
                                    <el-form-item label="订阅时长">
                                        <el-radio-group v-model="rentMonths" @change="loadRentalServices" style="width:100%">
                                            <el-radio-button :value="1">1个月</el-radio-button>
                                            <el-radio-button :value="3">3个月</el-radio-button>
                                            <el-radio-button :value="6">6个月</el-radio-button>
                                            <el-radio-button :value="12">12个月</el-radio-button>
                                        </el-radio-group>
                                    </el-form-item>
                                </el-form>
                                <div style="max-height:300px;overflow-y:auto;margin-top:8px">
                                    <div v-for="s in rentalServiceList" :key="s.code"
                                        style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border:1px solid #e5e7eb;border-radius:8px;margin-bottom:8px;transition:all .2s"
                                        @mouseenter="$event.currentTarget.style.borderColor='#3b82f6';$event.currentTarget.style.background='#f8fafc'"
                                        @mouseleave="$event.currentTarget.style.borderColor='#e5e7eb';$event.currentTarget.style.background=''">
                                        <div>
                                            <span style="font-weight:500;font-size:14px">{{ svcZh(s.code) || s.name }}</span>
                                            <span style="color:#9ca3af;font-size:12px;margin-left:4px">({{ s.name }})</span>
                                            <span style="color:#d1d5db;font-size:12px;margin-left:4px">{{ s.count }}个</span>
                                        </div>
                                        <div style="display:flex;align-items:center;gap:8px">
                                            <div style="text-align:right">
                                                <div>
                                                    <span style="font-weight:500;font-size:14px">\${{ s.totalPrice.toFixed(2) }}</span>
                                                    <span style="color:#6b7280;font-size:12px"> ≈ ¥{{ cny(s.totalPrice) }}</span>
                                                </div>
                                                <div v-if="rentMonths>1" style="color:#9ca3af;font-size:11px">\${{ s.monthlyPrice.toFixed(2) }}/月</div>
                                            </div>
                                            <el-button type="primary" size="small" :disabled="s.count<=0"
                                                @click="buyRental(s)">购买</el-button>
                                        </div>
                                    </div>
                                    <el-empty v-if="rentalServiceList.length===0" description="请先选择国家" :image-size="60" />
                                </div>
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
                                <p style="font-size:13px;color:#6b7280">订单号: {{ rentData.orderId }}</p>
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
                        <div v-for="o in orders" :key="o.orderId"
                            style="border:1px solid #e5e7eb;border-radius:10px;padding:16px;margin-bottom:12px;transition:all .2s"
                            @mouseenter="$event.currentTarget.style.boxShadow='0 2px 12px rgba(0,0,0,.06)'"
                            @mouseleave="$event.currentTarget.style.boxShadow=''">
                            <div style="display:flex;justify-content:space-between;align-items:start">
                                <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">
                                    <el-tag :type="o.mode==='activation'?'':'warning'" size="small">{{ o.mode==='activation'?'临时':'租赁' }}</el-tag>
                                    <span style="font-weight:500;font-size:14px">{{ o.serviceName }}</span>
                                    <el-tag size="small">{{ o.countryName }}</el-tag>
                                    <el-tag :type="statusType(o.status)" size="small">{{ statusText(o.status) }}</el-tag>
                                    <span v-if="o.source==='admin'" style="color:#9ca3af;font-size:12px">(管理员分配)</span>
                                </div>
                                <span style="color:#9ca3af;font-size:12px;white-space:nowrap">{{ fmtTime(o.purchasedAt) }}</span>
                            </div>
                            <div style="margin-top:8px;font-size:13px;display:flex;align-items:center;gap:12px;flex-wrap:wrap">
                                <span style="font-family:monospace;cursor:pointer" @click="o.number&&copyText(o.number)">{{ o.number||'-' }}</span>
                                <span style="color:#9ca3af">\${{ o.totalPrice.toFixed(2) }} ≈ ¥{{ cny(o.totalPrice) }}</span>
                            </div>
                            <!-- 租赁订单信息：到期日期 + 订阅月数 -->
                            <div v-if="o.mode==='rental'" style="margin-top:6px;font-size:12px;color:#6b7280;display:flex;align-items:center;gap:8px;flex-wrap:wrap">
                                <span v-if="o.expiresAt">到期: {{ fmtDate(o.expiresAt) }}</span>
                                <span v-if="o.subscriptionMonths>1">· {{ o.subscriptionMonths }}个月</span>
                            </div>
                            <!-- 临时接码等待中：倒计时 + 等待动画 -->
                            <div v-if="o.mode==='activation'&&o.status==='waiting'" style="margin-top:8px">
                                <p style="color:#3b82f6;font-size:13px">
                                    <span style="display:inline-block;width:6px;height:6px;background:#3b82f6;border-radius:50%;margin-right:4px;animation:pulse 1.5s infinite"></span>
                                    等待短信中...
                                    <span v-if="orderCountdown(o)>0" style="font-family:monospace;font-weight:600;color:#e6a23c;margin-left:8px">
                                        {{ Math.floor(orderCountdown(o)/60) }}:{{ String(orderCountdown(o)%60).padStart(2,'0') }}
                                    </span>
                                </p>
                            </div>
                            <!-- 验证码显示 -->
                            <div v-if="o.verificationCode" style="margin-top:8px;display:flex;align-items:center;gap:8px">
                                <span style="font-family:monospace;font-size:22px;font-weight:700;color:#3b82f6;letter-spacing:3px;cursor:pointer"
                                    @click="copyText(o.verificationCode)">{{ o.verificationCode }}</span>
                                <el-button v-if="o.mode==='rental'&&o.smsList&&o.smsList.length>1" text type="primary" size="small"
                                    @click="showSmsHistory(o.smsList)">历史 ({{ o.smsList.length }})</el-button>
                            </div>
                            <!-- 租赁刷新短信 -->
                            <div v-if="o.mode==='rental'" style="margin-top:6px;display:flex;align-items:center;gap:8px">
                                <el-button text type="primary" size="small" @click="refreshOrderSms(o)">
                                    <el-icon><Refresh /></el-icon> 刷新短信
                                </el-button>
                                <!-- 续订按钮：到期前7天显示 -->
                                <el-button v-if="daysUntilExpiry(o)<=7&&daysUntilExpiry(o)>=0" type="warning" size="small" @click="renewOrder(o)">
                                    续订
                                </el-button>
                                <span v-if="daysUntilExpiry(o)<=7&&daysUntilExpiry(o)>=0" style="color:#e6a23c;font-size:12px">
                                    即将到期
                                </span>
                            </div>
                            <!-- 操作按钮 -->
                            <div v-if="o.status==='waiting'" style="margin-top:8px;display:flex;gap:8px">
                                <el-button type="danger" text size="small" @click="cancelOrder(o.orderId)">取消订单</el-button>
                                <el-button type="primary" text size="small" @click="pollOrder(o.orderId)">刷新状态</el-button>
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
            actCountry: 'FR', actService: '', actInfo: null, actBuying: false,
            actData: null, actCountdown: 0, actCountdownTimer: null,
            actServices: [],
            // Rental
            rentalCountries: [], rentCountry: '', rentMonths: 1,
            rentalServiceList: [], rentData: null, rentSmsLoading: false,
            // Orders
            orders: [], orderTimerTick: 0, orderTickTimer: null,
            // Transactions
            transactions: [],
            // SMS History Dialog
            smsHistoryVisible: false, smsHistoryList: []
        };
    },

    computed: {
        allActCountries() { return ACT_COUNTRIES; },
        allActServices() {
            return this.actServices.map(s => ({
                code: s.code,
                name: s.name,
                zh: svcZh(s.code) || s.name
            }));
        }
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

        // === RMB Helper ===
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
        async loadActServices() {
            try {
                const res = await fetch('/api/services/activation/services');
                const data = await res.json();
                this.actServices = data;
                if (!this.actService && data.length > 0) {
                    const tiktok = data.find(s => s.code === 'opt104');
                    this.actService = tiktok ? 'opt104' : data[0].code;
                }
            } catch {}
        },
        async queryActivation() {
            const s = this.actService, c = this.actCountry;
            if (!s || !c) return;
            try {
                const res = await fetch(`/api/services/activation/count?service=${s}&country=${c}`);
                const d = await res.json();
                this.actInfo = { total: d.total, userPrice: d.userPrice };
            } catch { ElementPlus.ElMessage.error('查询失败'); }
        },
        async buyActivation() {
            this.actBuying = true;
            const c = ACT_COUNTRIES.find(x => x.code === this.actCountry);
            const s = this.allActServices.find(x => x.code === this.actService);
            try {
                const res = await fetch('/api/user/purchase/activation', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        serviceCode: this.actService, countryCode: this.actCountry,
                        serviceName: s ? `${s.zh} (${s.name})` : this.actService,
                        countryName: c?.name || this.actCountry
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
                        this.actData = { status: 'received', number: d.number, code: d.verificationCode || '-', orderId };
                        return;
                    }
                    if (d.status === 'cancelled') {
                        this.clearCountdown();
                        this.actData = { status: 'cancelled', number: d.number, code: null, orderId };
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
                const res = await fetch('/api/services/rental/countries');
                const list = await res.json();
                const fr = list.findIndex(c => c.code === 'FR');
                if (fr > 0) list.unshift(list.splice(fr, 1)[0]);
                this.rentalCountries = list;
            } catch {}
        },
        async loadRentalServices() {
            if (!this.rentCountry) return;
            try {
                const res = await fetch(`/api/services/rental/services?country=${this.rentCountry}&dtype=month&dcount=1&months=${this.rentMonths}`);
                const list = await res.json();
                const tk = list.findIndex(s => s.code === 'opt104');
                if (tk > 0) list.unshift(list.splice(tk, 1)[0]);
                list.forEach(s => {
                    s.monthlyPrice = s.userPrice;
                    s.totalPrice = s.totalUserPrice;
                });
                this.rentalServiceList = list;
            } catch { this.rentalServiceList = []; }
        },
        async buyRental(s) {
            const months = this.rentMonths;
            const total = s.totalPrice;
            const name = svcZh(s.code) || s.name;
            const msg = `确认购买 ${name}（${months}个月），总价 $${total.toFixed(2)} (≈ ¥${this.cny(total)})？`;
            try {
                await ElementPlus.ElMessageBox.confirm(msg, '确认购买',
                    { confirmButtonText: '确认', cancelButtonText: '取消', type: 'info' });
            } catch { return; }
            try {
                const sel = this.rentalCountries.find(c => c.code === this.rentCountry);
                const res = await fetch('/api/user/purchase/rental', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        serviceCode: s.code, countryCode: this.rentCountry,
                        countryName: translateCountry(sel?.name) || this.rentCountry, serviceName: name,
                        dtype: 'month', dcount: 1, subscriptionMonths: months
                    })
                });
                const d = await res.json();
                if (!res.ok) { ElementPlus.ElMessage.error(d.error || '购买失败'); return; }
                ElementPlus.ElNotification({ title: '购买成功', message: `号码: ${d.number}`, type: 'success' });
                this.rentData = {
                    orderId: d.orderId, number: d.number || '', totalPrice: d.totalPrice,
                    months, latestCode: null, smsList: []
                };
                this.loadUserInfo();
            } catch (e) { ElementPlus.ElMessage.error('购买失败'); }
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
        // 订单列表自动轮询（对waiting的临时订单）
        startOrderPolling() {
            this.stopOrderPolling();
            this.orderTickTimer = setInterval(() => {
                this.orderTimerTick++;
                // 每10秒对waiting的临时订单自动poll
                if (this.orderTimerTick % 10 === 0) {
                    const waitingActs = this.orders.filter(o => o.mode === 'activation' && o.status === 'waiting');
                    waitingActs.forEach(o => this.pollOrder(o.orderId));
                }
            }, 1000);
        },
        stopOrderPolling() {
            if (this.orderTickTimer) { clearInterval(this.orderTickTimer); this.orderTickTimer = null; }
            this.orderTimerTick = 0;
        },
        // 计算订单剩余秒数（依赖 orderTimerTick 驱动 Vue 响应式更新）
        orderCountdown(o) {
            void this.orderTimerTick; // 触发响应式依赖
            const elapsed = (Date.now() - new Date(o.purchasedAt).getTime()) / 1000;
            return Math.max(0, Math.floor(600 - elapsed));
        },
        // 计算到期剩余天数
        daysUntilExpiry(o) {
            if (!o.expiresAt) return 999;
            return Math.ceil((new Date(o.expiresAt).getTime() - Date.now()) / (1000*60*60*24));
        },
        // 续订（重新购买延长原订单）
        async renewOrder(o) {
            try {
                // 查询当前价格
                const priceRes = await fetch(`/api/user/orders/${o.orderId}/renew-price?months=1`);
                const priceData = await priceRes.json();
                if (!priceRes.ok) { ElementPlus.ElMessage.error(priceData.error || '查询价格失败'); return; }

                const monthlyPrice = priceData.monthlyPrice;
                const rate = priceData.usdCnyRate || this.usdCnyRate;

                // 弹窗选择月数
                const { value: monthsStr } = await ElementPlus.ElMessageBox.prompt(
                    `续订 ${o.serviceName}\n\n月价: $${monthlyPrice.toFixed(2)} ≈ ¥${(monthlyPrice*rate).toFixed(2)}/月\n\n请输入续订月数 (1/3/6/12):`,
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
                    `确认续订 ${o.serviceName}（${months}个月），总价 $${total.toFixed(2)} (≈ ¥${(total*rate).toFixed(2)})？`,
                    '确认续订', { confirmButtonText: '确认', cancelButtonText: '取消', type: 'warning' }
                );

                const res = await fetch(`/api/user/orders/${o.orderId}/renew`, {
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
                const res = await fetch(`/api/user/orders/${o.orderId}/sms`);
                const d = await res.json();
                if (d.error) ElementPlus.ElMessage.warning(d.error);
                if (d.messages && d.messages.length > 0) {
                    ElementPlus.ElMessage.success('短信已刷新');
                    await this.loadOrders();
                } else if (!d.error) {
                    ElementPlus.ElMessage.info('暂无新短信');
                }
            } catch { ElementPlus.ElMessage.error('获取短信失败'); }
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
    },

    async mounted() {
        this.checkMobile();
        window.addEventListener('resize', this.checkMobile);
        await this.loadUserInfo();
        this.loadActServices();
    },
    beforeUnmount() {
        window.removeEventListener('resize', this.checkMobile);
    }
};
