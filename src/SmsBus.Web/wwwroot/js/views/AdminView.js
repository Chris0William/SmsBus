const AdminView = {
    template: `
<el-container style="height:100vh">
    <div class="sidebar-overlay" :class="{active:mobileOpen}" @click="mobileOpen=false"></div>
    <el-aside :width="collapsed?'64px':'220px'" class="sidebar" :class="{'mobile-open':mobileOpen}">
        <div class="sidebar-logo">
            <div class="icon" style="background:linear-gradient(135deg,#f59e0b,#ef4444)">A</div>
            <span v-show="!collapsed" class="title">管理控制台</span>
        </div>
        <el-menu :default-active="activeMenu" @select="onMenuSelect" :collapse="collapsed">
            <el-menu-item index="purchase"><el-icon><ShoppingCart /></el-icon><span>购买管理</span></el-menu-item>
            <el-menu-item index="users"><el-icon><UserFilled /></el-icon><span>用户管理</span></el-menu-item>
            <el-menu-item index="dborders"><el-icon><Tickets /></el-icon><span>用户订单</span></el-menu-item>
            <el-menu-item index="pricing"><el-icon><Setting /></el-icon><span>定价配置</span></el-menu-item>
        </el-menu>
        <div v-show="!collapsed" class="sidebar-footer">
            <div class="email">管理员</div>
            <div class="balance" style="color:#f59e0b">\${{ supplierBalance.toFixed(2) }}</div>
        </div>
    </el-aside>
    <el-container>
        <el-header class="app-header">
            <div class="left">
                <el-button :icon="isMobile?'Menu':(collapsed?'Expand':'Fold')" text @click="toggleSidebar" />
                <span class="breadcrumb">{{ menuLabels[activeMenu] }}</span>
            </div>
            <div class="right">
                <span id="userinfo" style="color:#6b7280;font-size:13px">
                    <span style="color:#22c55e;font-weight:600">\${{ supplierBalance.toFixed(2) }}</span>
                    <span style="color:#f59e0b;font-size:12px;margin-left:4px">¥{{ (supplierBalance*pricingForm.usdCnyRate).toFixed(2) }}</span>
                    <span style="color:#9ca3af;margin-left:4px">Karma: {{ supplierKarma }}</span>
                </span>
                <el-button type="danger" text size="small" @click="doLogout"><el-icon><SwitchButton /></el-icon></el-button>
            </div>
        </el-header>
        <el-main class="app-main">
            <transition name="slide-fade" mode="out-in">

                <!-- ======= 购买管理 ======= -->
                <div v-if="activeMenu==='purchase'" key="purchase">
                    <el-row :gutter="16">
                        <el-col :xs="24" :lg="8">
                            <div class="content-card">
                                <el-radio-group v-model="purchaseMode" style="margin-bottom:16px;width:100%">
                                    <el-radio-button label="activation" style="width:50%">临时接码</el-radio-button>
                                    <el-radio-button label="rental" style="width:50%">租赁</el-radio-button>
                                </el-radio-group>

                                <!-- 一次性接码 -->
                                <div v-if="purchaseMode==='activation'">
                                    <el-form label-position="top" size="default">
                                        <el-form-item label="选择国家">
                                            <el-select v-model="selectedActCountry" style="width:100%" size="default"
                                                @change="checkActCount" filterable placeholder="搜索国家...">
                                                <el-option v-for="c in allActCountries" :key="c.code"
                                                    :label="c.name+' ['+c.code+']'" :value="c.code" />
                                            </el-select>
                                        </el-form-item>
                                        <el-form-item label="选择服务">
                                            <el-select v-model="selectedActService" style="width:100%" size="default"
                                                @change="checkActCount" filterable placeholder="搜索服务...">
                                                <el-option v-for="s in allActServices" :key="s.code"
                                                    :label="s.zh+' ('+s.name+')'" :value="s.code" />
                                            </el-select>
                                        </el-form-item>
                                    </el-form>
                                    <div v-if="actPriceInfo" style="padding:12px;background:#eff6ff;border-radius:8px;margin-bottom:12px">
                                        <div style="display:flex;justify-content:space-between;font-size:13px">
                                            <span style="color:#6b7280">单价：</span>
                                            <span style="font-weight:600;color:#3b82f6">{{ actPriceInfo.priceText }}</span>
                                        </div>
                                        <div style="display:flex;justify-content:space-between;font-size:13px;margin-top:4px">
                                            <span style="color:#6b7280">可用：</span>
                                            <span style="font-weight:600;color:#3b82f6">{{ actPriceInfo.total }} 个</span>
                                        </div>
                                    </div>
                                    <el-button type="primary" style="width:100%" :disabled="!actPriceInfo||actPriceInfo.total===0"
                                        :loading="actBuying" @click="purchaseActivation">购买号码</el-button>
                                </div>

                                <!-- 长期租赁 -->
                                <div v-if="purchaseMode==='rental'">
                                    <el-form label-position="top" size="default">
                                        <el-form-item label="选择国家">
                                            <el-select v-model="selectedRentalCountry" style="width:100%" filterable
                                                @change="loadRentalServices">
                                                <el-option v-for="c in rentalCountries" :key="c.code"
                                                    :label="translateCountry(c.name)+' ('+c.name+')'" :value="c.code" />
                                            </el-select>
                                        </el-form-item>
                                        <el-row :gutter="12">
                                            <el-col :span="12">
                                                <el-form-item label="周期">
                                                    <el-select v-model="rentalDtype" style="width:100%" @change="loadRentalServices">
                                                        <el-option label="按周" value="week" /><el-option label="按月" value="month" />
                                                    </el-select>
                                                </el-form-item>
                                            </el-col>
                                            <el-col :span="12">
                                                <el-form-item label="数量">
                                                    <el-select v-model="rentalDcount" style="width:100%" @change="loadRentalServices">
                                                        <el-option v-for="n in 4" :key="n" :label="n" :value="n" />
                                                    </el-select>
                                                </el-form-item>
                                            </el-col>
                                        </el-row>
                                        <el-form-item label="选择服务">
                                            <el-select v-model="selectedRentalService" style="width:100%" filterable
                                                @change="updateRentalPrice">
                                                <el-option v-for="s in rentalServices" :key="s.code"
                                                    :label="(svcZh(s.code)||s.name)+' ['+formatUsd(getDisplayPrice(s.price,'rental'))+'/日] ('+s.count+'个)'"
                                                    :value="s.code" />
                                            </el-select>
                                        </el-form-item>
                                    </el-form>
                                    <div v-if="rentalPriceInfo" style="padding:12px;background:#faf5ff;border-radius:8px;margin-bottom:12px">
                                        <div style="display:flex;justify-content:space-between;font-size:13px">
                                            <span>日租价：</span><span style="font-weight:600;color:#7c3aed">{{ rentalPriceInfo.dayPrice }}</span>
                                        </div>
                                        <div style="display:flex;justify-content:space-between;font-size:13px;margin-top:4px">
                                            <span>可用：</span><span style="font-weight:600;color:#7c3aed">{{ rentalPriceInfo.stock }} 个</span>
                                        </div>
                                        <div style="display:flex;justify-content:space-between;font-size:14px;margin-top:6px;padding-top:6px;border-top:1px solid #e9d5ff">
                                            <span style="font-weight:500">预估总价：</span><span style="font-weight:700;color:#7c3aed">{{ rentalPriceInfo.totalPrice }}</span>
                                        </div>
                                    </div>
                                    <el-button type="primary" style="width:100%;background:#7c3aed;border-color:#7c3aed"
                                        :disabled="!selectedRentalService" :loading="rentalBuying" @click="purchaseRental">租赁号码</el-button>
                                </div>
                            </div>
                        </el-col>
                        <el-col :xs="24" :lg="16">
                            <div class="content-card">
                                <div class="card-title">
                                    <span>已购号码 <el-tag size="small" type="info">{{ adminOrders.length }}</el-tag></span>
                                </div>
                                <el-empty v-if="adminOrders.length===0" description="暂无已购号码" />
                                <div v-for="o in adminOrders" :key="o.orderId"
                                    style="border:1px solid #e5e7eb;border-radius:10px;padding:14px;margin-bottom:10px">
                                    <div style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:8px">
                                        <div style="flex:1;min-width:200px">
                                            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:4px">
                                                <span style="font-size:16px;font-family:monospace;font-weight:700">{{ o.number||'(激活中)' }}</span>
                                                <el-tag :type="o.mode==='rental'?'':'primary'" size="small">{{ o.mode==='rental'?'租赁':'临时' }}</el-tag>
                                                <el-tag size="small" type="info">{{ o.countryName }}</el-tag>
                                                <span style="font-size:12px;color:#9ca3af">成本{{ formatUsd(o.costPrice) }}</span>
                                                <span v-if="o.listPrice && o.listPrice !== o.costPrice" style="font-size:12px;color:#d1d5db;text-decoration:line-through">商品{{ formatUsd(o.listPrice) }}</span>
                                            </div>
                                            <div style="display:flex;align-items:center;gap:8px;font-size:13px">
                                                <span :class="'status-'+o.status" style="font-weight:500" v-html="statusHtml(o)"></span>
                                                <span style="color:#9ca3af">{{ fmtTime(o.purchasedAt) }}</span>
                                                <span v-if="o.expiresAt && o.mode==='rental'" style="color:#6b7280">到期: {{ fmtDate(o.expiresAt) }}</span>
                                            </div>
                                            <div v-if="o.renewalFailedAt" style="margin-top:4px;padding:4px 8px;background:#fef2f2;border-radius:6px;border:1px solid #fecaca;font-size:12px;color:#dc2626;display:flex;align-items:center;gap:4px">
                                                <span style="font-weight:600">⚠ 续费异常:</span> {{ fmtTime(o.renewalFailedAt) }}
                                                <span style="color:#9ca3af;margin-left:4px">（后台每5分钟自动重试）</span>
                                            </div>
                                            <div v-if="o.status==='received'" style="margin-top:8px">
                                                <div style="color:#6b7280;font-size:12px">{{ o.smsContent }}</div>
                                                <span style="font-family:monospace;font-size:28px;font-weight:700;color:#22c55e;letter-spacing:4px">{{ o.verificationCode||'--' }}</span>
                                                <el-button text type="success" size="small" @click="copyText(o.verificationCode||'')" style="margin-left:8px">复制</el-button>
                                            </div>
                                        </div>
                                        <div style="display:flex;flex-direction:column;gap:4px">
                                            <el-button text type="info" size="small" @click="copyText(location.origin+'/s/'+o.orderId)">复制链接</el-button>
                                            <el-button v-if="o.status==='activating'" text type="primary" size="small" @click="activateRental(o.orderId)">手动激活</el-button>
                                            <el-button v-if="o.mode==='rental'&&o.status==='active'" text type="primary" size="small" @click="prolongRental(o.orderId)">续费</el-button>
                                            <el-button v-if="['waiting','activating','active'].includes(o.status)" text type="danger" size="small" @click="cancelOrder(o.orderId)">取消</el-button>
                                            <el-button v-else text type="info" size="small" @click="deleteOrder(o.orderId)">删除</el-button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </el-col>
                    </el-row>
                </div>

                <!-- ======= 用户管理 ======= -->
                <div v-else-if="activeMenu==='users'" key="users">
                    <div class="content-card">
                        <div class="card-title">
                            <span>用户管理</span>
                            <span style="font-size:13px;color:#6b7280">供应商余额: \${{ supplierBalance.toFixed(2) }} | Karma: {{ supplierKarma }}</span>
                        </div>
                        <el-table :data="adminUsers" stripe style="width:100%">
                            <el-table-column prop="id" label="ID" width="60" />
                            <el-table-column prop="phone" label="手机号">
                                <template #default="{row}">
                                    {{ row.phone }} <el-tag v-if="row.isAdmin" size="small" type="primary">管理员</el-tag>
                                </template>
                            </el-table-column>
                            <el-table-column prop="balance" label="余额" width="100">
                                <template #default="{row}"><span style="font-family:monospace">\${{ row.balance.toFixed(2) }}</span></template>
                            </el-table-column>
                            <el-table-column prop="isActive" label="状态" width="80">
                                <template #default="{row}">
                                    <el-tag :type="row.isActive?'success':'danger'" size="small">{{ row.isActive?'正常':'禁用' }}</el-tag>
                                </template>
                            </el-table-column>
                            <el-table-column prop="createdAt" label="注册时间" width="120">
                                <template #default="{row}">{{ new Date(row.createdAt).toLocaleDateString() }}</template>
                            </el-table-column>
                            <el-table-column label="操作" width="140">
                                <template #default="{row}">
                                    <template v-if="!row.isAdmin">
                                        <el-button text type="primary" size="small" @click="openRecharge(row)">充值</el-button>
                                        <el-button text :type="row.isActive?'danger':'success'" size="small"
                                            @click="toggleUserActive(row)">{{ row.isActive?'禁用':'启用' }}</el-button>
                                    </template>
                                </template>
                            </el-table-column>
                        </el-table>
                    </div>
                </div>

                <!-- ======= 用户订单 ======= -->
                <div v-else-if="activeMenu==='dborders'" key="dborders">
                    <div class="content-card">
                        <div class="card-title">
                            <span>用户订单</span>
                            <div style="display:flex;align-items:center;gap:8px">
                                <el-select v-model="orderUserFilter" placeholder="全部用户" clearable size="small" style="width:160px"
                                    @change="loadDbOrders">
                                    <el-option v-for="u in adminUsers.filter(u=>!u.isAdmin)" :key="u.id" :label="u.phone" :value="u.id" />
                                </el-select>
                                <el-button text type="primary" size="small" @click="loadDbOrders"><el-icon><Refresh /></el-icon></el-button>
                            </div>
                        </div>
                        <el-table :data="dbOrders" stripe style="width:100%" size="small">
                            <el-table-column prop="orderId" label="订单号" width="100" />
                            <el-table-column prop="userName" label="用户" width="120">
                                <template #default="{row}">{{ row.userName||'未分配' }}</template>
                            </el-table-column>
                            <el-table-column label="服务" width="160">
                                <template #default="{row}">{{ row.serviceName }} ({{ row.countryName }})</template>
                            </el-table-column>
                            <el-table-column prop="number" label="号码" width="140">
                                <template #default="{row}"><span style="font-family:monospace">{{ row.number||'-' }}</span></template>
                            </el-table-column>
                            <el-table-column prop="status" label="状态" width="100">
                                <template #default="{row}">
                                    <span :class="'status-'+row.status">{{ row.status }}</span>
                                    <el-tag v-if="row.renewalFailedAt" type="danger" size="small" style="margin-left:4px">续费异常</el-tag>
                                </template>
                            </el-table-column>
                            <el-table-column prop="costPrice" label="成本" width="80">
                                <template #default="{row}">\${{ row.costPrice.toFixed(2) }}</template>
                            </el-table-column>
                            <el-table-column prop="listPrice" label="商品价" width="80">
                                <template #default="{row}">
                                    <span :style="{color: row.listPrice && row.listPrice !== row.costPrice ? '#f59e0b' : '#6b7280'}">\${{ (row.listPrice||0).toFixed(2) }}</span>
                                </template>
                            </el-table-column>
                            <el-table-column prop="totalPrice" label="用户价" width="80">
                                <template #default="{row}">\${{ row.totalPrice.toFixed(2) }}</template>
                            </el-table-column>
                            <el-table-column prop="verificationCode" label="验证码" width="100">
                                <template #default="{row}"><span style="font-family:monospace;color:#3b82f6">{{ row.verificationCode||'-' }}</span></template>
                            </el-table-column>
                            <el-table-column prop="purchasedAt" label="时间" width="160">
                                <template #default="{row}">{{ fmtTime(row.purchasedAt) }}</template>
                            </el-table-column>
                            <el-table-column label="操作" width="80">
                                <template #default="{row}">
                                    <el-button v-if="!row.userId" text type="primary" size="small" @click="openAssign(row)">分配</el-button>
                                </template>
                            </el-table-column>
                        </el-table>
                    </div>
                </div>

                <!-- ======= 定价配置 ======= -->
                <div v-else-if="activeMenu==='pricing'" key="pricing">
                    <div class="content-card" style="max-width:500px">
                        <div class="card-title">定价配置</div>
                        <el-form label-position="top">
                            <el-form-item label="启用加价">
                                <el-switch v-model="pricingForm.markupEnabled" />
                            </el-form-item>
                            <el-form-item label="临时商品费用利润 (%)">
                                <el-input-number v-model="pricingForm.activationProfitPercent" :min="0" :max="500" :step="1" :precision="1" style="width:100%" />
                                <div style="font-size:12px;color:#9ca3af;margin-top:4px">临时接码利润百分比，如 50 表示成本的 50%</div>
                            </el-form-item>
                            <el-form-item label="租赁商品费用利润 (%)">
                                <el-input-number v-model="pricingForm.rentalProfitPercent" :min="0" :max="500" :step="1" :precision="1" style="width:100%" />
                                <div style="font-size:12px;color:#9ca3af;margin-top:4px">租赁利润百分比，按单日成本计算后累计天数</div>
                            </el-form-item>
                            <div style="padding:12px;background:#f0f9ff;border-radius:8px;margin-bottom:16px">
                                <div style="font-size:13px;font-weight:500;color:#374151;margin-bottom:8px">租赁服务费利润 (%)</div>
                                <div style="font-size:12px;color:#9ca3af;margin-bottom:8px">按订阅周期叠加到商品费用利润上</div>
                                <el-row :gutter="8">
                                    <el-col :span="6">
                                        <div style="font-size:12px;color:#6b7280;margin-bottom:4px">1个月</div>
                                        <el-input-number v-model="pricingForm.serviceFee1m" :min="0" :max="500" :step="1" :precision="1" size="small" style="width:100%" />
                                    </el-col>
                                    <el-col :span="6">
                                        <div style="font-size:12px;color:#6b7280;margin-bottom:4px">3个月</div>
                                        <el-input-number v-model="pricingForm.serviceFee3m" :min="0" :max="500" :step="1" :precision="1" size="small" style="width:100%" />
                                    </el-col>
                                    <el-col :span="6">
                                        <div style="font-size:12px;color:#6b7280;margin-bottom:4px">6个月</div>
                                        <el-input-number v-model="pricingForm.serviceFee6m" :min="0" :max="500" :step="1" :precision="1" size="small" style="width:100%" />
                                    </el-col>
                                    <el-col :span="6">
                                        <div style="font-size:12px;color:#6b7280;margin-bottom:4px">12个月</div>
                                        <el-input-number v-model="pricingForm.serviceFee12m" :min="0" :max="500" :step="1" :precision="1" size="small" style="width:100%" />
                                    </el-col>
                                </el-row>
                            </div>
                            <el-form-item label="USD→CNY 汇率">
                                <el-input-number v-model="pricingForm.usdCnyRate" :min="0" :step="0.01" :precision="2" style="width:100%" disabled />
                                <div style="font-size:12px;color:#9ca3af;margin-top:4px">每小时自动更新（日汇率，一天内不变）</div>
                            </el-form-item>
                        </el-form>
                        <div style="padding:12px;background:#f8fafc;border-radius:8px;font-size:13px;color:#6b7280;margin-bottom:16px">
                            <p><strong>定价逻辑:</strong></p>
                            <p style="margin-top:4px">临时接码: 用户价格 = 成本 × (1 + 利润%/100)</p>
                            <p>租赁: 月价 = 月成本 × (1 + (商品利润% + 服务费利润%)/100)</p>
                            <p>总价 = 月价 × 订阅月数</p>
                        </div>
                        <el-button type="primary" style="width:100%" @click="savePricing">保存配置</el-button>
                    </div>
                </div>

            </transition>
        </el-main>
    </el-container>

    <!-- 充值弹窗 -->
    <el-dialog v-model="rechargeVisible" title="用户充值" :width="isMobile?'92%':'400px'">
        <p style="margin-bottom:12px;color:#6b7280">为 <strong>{{ rechargeUser?.phone }}</strong> 充值</p>
        <el-form label-position="top">
            <el-form-item label="金额 (USD)">
                <el-input-number v-model="rechargeAmount" :min="0.01" :step="1" :precision="2" style="width:100%" />
            </el-form-item>
            <el-form-item label="备注">
                <el-input v-model="rechargeDesc" placeholder="可选" />
            </el-form-item>
        </el-form>
        <template #footer>
            <el-button @click="rechargeVisible=false">取消</el-button>
            <el-button type="primary" @click="doRecharge">确认充值</el-button>
        </template>
    </el-dialog>

    <!-- 分配弹窗 -->
    <el-dialog v-model="assignVisible" title="分配订单给用户" :width="isMobile?'92%':'400px'">
        <el-select v-model="assignUserId" placeholder="选择用户" style="width:100%">
            <el-option v-for="u in adminUsers.filter(u=>!u.isAdmin&&u.isActive)" :key="u.id"
                :label="u.phone+' ($'+u.balance.toFixed(2)+')'" :value="u.id" />
        </el-select>
        <template #footer>
            <el-button @click="assignVisible=false">取消</el-button>
            <el-button type="primary" @click="doAssign">确认分配</el-button>
        </template>
    </el-dialog>
</el-container>`,

    data() {
        return {
            collapsed: false,
            mobileOpen: false,
            isMobile: false,
            activeMenu: 'purchase',
            menuLabels: { purchase:'购买管理', users:'用户管理', dborders:'用户订单', pricing:'定价配置' },
            supplierBalance: 0, supplierKarma: 0,
            // Purchase - activation
            purchaseMode: 'activation',
            selectedActCountry: null, selectedActService: null,
            actServices: [],
            actPriceInfo: null, actPrice: 0, actTotal: 0, actBuying: false,
            // Purchase - rental
            rentalCountries: [], selectedRentalCountry: null,
            rentalDtype: 'week', rentalDcount: 1,
            rentalServices: [], selectedRentalService: null,
            rentalPriceInfo: null, rentalBuying: false,
            // Admin orders (purchase panel)
            adminOrders: [],
            pollingTimers: {},
            // Users
            adminUsers: [],
            // DB Orders
            dbOrders: [], orderUserFilter: null,
            // Pricing
            pricingForm: { markupEnabled: false, rentalProfitPercent: 0, activationProfitPercent: 0, serviceFee1m: 0, serviceFee3m: 0, serviceFee6m: 0, serviceFee12m: 0, usdCnyRate: 7.25 },
            // Recharge
            rechargeVisible: false, rechargeUser: null, rechargeAmount: 10, rechargeDesc: '',
            // Assign
            assignVisible: false, assignOrderId: null, assignUserId: null,
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
            if (index === 'users') this.loadAdminUsers();
            if (index === 'dborders') this.loadDbOrders();
            if (index === 'pricing') this.loadPricing();
        },

        refreshAllPrices() {
            if (this.selectedActCountry && this.selectedActService) this.checkActCount();
            if (this.selectedRentalService) this.updateRentalPrice();
            this.loadAdminOrderList();
        },

        // === Lookups ===
        svcZh(code) { return SERVICE_ZH[code] || ''; },
        async loadActServices() {
            try {
                const res = await fetch('/api/activation/services');
                this.actServices = await res.json();
            } catch {}
        },

        // === Price Utils ===
        calcMarkup(cost, mode) {
            if (!this.pricingForm.markupEnabled) return 0;
            const pct = mode === 'activation' ? this.pricingForm.activationProfitPercent : this.pricingForm.rentalProfitPercent;
            return cost * pct / 100;
        },
        getDisplayPrice(cost, mode) { return cost + this.calcMarkup(cost, mode); },
        formatUsd(a) { return `$${a.toFixed(2)}`; },
        formatCny(a) { return `¥${(a * this.pricingForm.usdCnyRate).toFixed(2)}`; },
        formatPrice(a) { return `${this.formatUsd(a)} (${this.formatCny(a)})`; },

        // === Supplier ===
        async loadSupplierInfo() {
            try {
                const res = await fetch('/api/userinfo');
                if (!res.ok) return;
                const d = await res.json();
                this.supplierBalance = d.balance;
                this.supplierKarma = d.karma;
            } catch {}
        },

        // === Activation ===
        async checkActCount() {
            if (!this.selectedActCountry || !this.selectedActService) { this.actPriceInfo = null; return; }
            try {
                const res = await fetch(`/api/activation/count?service=${this.selectedActService}&country=${this.selectedActCountry}`);
                const d = await res.json();
                this.actPrice = d.price; this.actTotal = d.total;
                const dp = this.getDisplayPrice(d.price, 'activation');
                this.actPriceInfo = { total: d.total, priceText: this.formatPrice(dp) };
            } catch { this.actPriceInfo = null; }
        },
        async purchaseActivation() {
            if (!this.selectedActCountry || !this.selectedActService) return;
            this.actBuying = true;
            const c = ACT_COUNTRIES.find(x => x.code === this.selectedActCountry);
            const s = this.allActServices.find(x => x.code === this.selectedActService);
            const hp = this.calcMarkup(this.actPrice, 'activation');
            try {
                const res = await fetch('/api/activation/purchase', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        countryCode: this.selectedActCountry, serviceCode: this.selectedActService,
                        price: this.actPrice, hiddenPrice: hp,
                        countryName: c?.name || this.selectedActCountry,
                        serviceName: s ? `${s.zh} (${s.name})` : this.selectedActService
                    })
                });
                if (!res.ok) throw new Error(await res.text());
                ElementPlus.ElMessage.success('购买成功');
                this.loadSupplierInfo();
                this.loadAdminOrderList();
            } catch (e) { ElementPlus.ElMessage.error('购买失败: ' + e.message); }
            finally { this.actBuying = false; }
        },

        // === Rental ===
        async loadRentalCountries() {
            try {
                const res = await fetch('/api/rental/countries');
                const list = await res.json();
                const fr = list.findIndex(c => c.code === 'FR');
                if (fr > 0) list.unshift(list.splice(fr, 1)[0]);
                this.rentalCountries = list;
            } catch {}
        },
        translateCountry(n) { return translateCountry(n); },
        async loadRentalServices() {
            if (!this.selectedRentalCountry) return;
            try {
                const res = await fetch(`/api/rental/services?country=${this.selectedRentalCountry}&dtype=${this.rentalDtype}&dcount=${this.rentalDcount}`);
                const list = await res.json();
                const tk = list.findIndex(s => s.code === 'opt104');
                if (tk > 0) list.unshift(list.splice(tk, 1)[0]);
                this.rentalServices = list;
                this.selectedRentalService = null;
                this.rentalPriceInfo = null;
            } catch {}
        },
        updateRentalPrice() {
            if (!this.selectedRentalService) { this.rentalPriceInfo = null; return; }
            const s = this.rentalServices.find(x => x.code === this.selectedRentalService);
            if (!s) return;
            const days = this.rentalDtype === 'week' ? 7 * this.rentalDcount : 30 * this.rentalDcount;
            const dp = this.getDisplayPrice(s.price, 'rental');
            const total = dp * days;
            this.rentalPriceInfo = {
                dayPrice: this.formatPrice(dp), stock: s.count,
                totalPrice: `${this.formatPrice(total)} (${days}天)`
            };
        },
        async purchaseRental() {
            if (!this.selectedRentalCountry || !this.selectedRentalService) return;
            this.rentalBuying = true;
            const s = this.rentalServices.find(x => x.code === this.selectedRentalService);
            const c = this.rentalCountries.find(x => x.code === this.selectedRentalCountry);
            const days = this.rentalDtype === 'week' ? 7 * this.rentalDcount : 30 * this.rentalDcount;
            const totalPrice = s ? s.price * days : 0;
            const hiddenTotal = this.calcMarkup(totalPrice, 'rental');
            try {
                const res = await fetch('/api/rental/purchase', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        countryCode: this.selectedRentalCountry, serviceCode: this.selectedRentalService,
                        dtype: this.rentalDtype, dcount: this.rentalDcount,
                        price: totalPrice, hiddenPrice: hiddenTotal,
                        countryName: c ? this.translateCountry(c.name) : this.selectedRentalCountry,
                        serviceName: s ? (SERVICE_ZH[s.code] ? `${SERVICE_ZH[s.code]} (${s.name})` : s.name) : this.selectedRentalService
                    })
                });
                if (!res.ok) throw new Error(await res.text());
                ElementPlus.ElMessage.success('租赁成功');
                this.loadSupplierInfo();
                this.loadAdminOrderList();
            } catch (e) { ElementPlus.ElMessage.error('租赁失败: ' + e.message); }
            finally { this.rentalBuying = false; }
        },

        // === Admin Orders (purchase panel) ===
        async loadAdminOrderList() {
            try {
                const res = await fetch('/api/orders');
                this.adminOrders = await res.json();
                this.adminOrders.filter(o => ['waiting','activating','active'].includes(o.status)).forEach(o => this.startPolling(o.orderId));
            } catch {}
        },
        startPolling(orderId) {
            if (this.pollingTimers[orderId]) return;
            this.pollingTimers[orderId] = setInterval(async () => {
                try {
                    const res = await fetch(`/api/orders/${orderId}/poll`);
                    if (!res.ok) { this.stopPolling(orderId); return; }
                    const o = await res.json();
                    if (['received','cancelled','expired'].includes(o.status)) this.stopPolling(orderId);
                    const idx = this.adminOrders.findIndex(x => x.orderId === orderId);
                    if (idx >= 0) this.adminOrders.splice(idx, 1, o);
                } catch {}
            }, 5000);
        },
        stopPolling(orderId) { if (this.pollingTimers[orderId]) { clearInterval(this.pollingTimers[orderId]); delete this.pollingTimers[orderId]; } },
        async activateRental(id) { await fetch(`/api/rental/${id}/activate`, { method: 'POST' }); this.loadAdminOrderList(); },
        async prolongRental(id) {
            try {
                const { value: dtype } = await ElementPlus.ElMessageBox.prompt('续费类型 (week/month)', '续费', { inputValue: 'week' });
                const { value: dc } = await ElementPlus.ElMessageBox.prompt('续费数量', '续费', { inputValue: '1' });
                const res = await fetch(`/api/rental/${id}/prolong`, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ dtype, dcount: parseInt(dc) })
                });
                if (!res.ok) throw new Error(await res.text());
                ElementPlus.ElMessage.success('续费成功'); this.loadAdminOrderList(); this.loadSupplierInfo();
            } catch {}
        },
        async cancelOrder(id) {
            try { await ElementPlus.ElMessageBox.confirm('确定取消此号码？', '确认', { type: 'warning' }); } catch { return; }
            await fetch(`/api/orders/${id}/cancel`, { method: 'POST' }); this.stopPolling(id);
            this.loadAdminOrderList(); this.loadSupplierInfo();
        },
        async deleteOrder(id) {
            try { await ElementPlus.ElMessageBox.confirm('确定删除此记录？', '确认', { type: 'warning' }); } catch { return; }
            await fetch(`/api/orders/${id}`, { method: 'DELETE' }); this.loadAdminOrderList();
        },
        statusHtml(o) {
            const m = {
                waiting: '<span class="pulse-dot" style="display:inline-block;width:6px;height:6px;background:#e6a23c;border-radius:50%;margin-right:4px"></span>等待验证码...',
                activating: '<span class="pulse-dot" style="display:inline-block;width:6px;height:6px;background:#a855f7;border-radius:50%;margin-right:4px"></span>激活中...',
                active: '已激活', received: '已收到', cancelled: '已取消', expired: '已过期'
            };
            return m[o.status] || o.status;
        },

        // === Users ===
        async loadAdminUsers() {
            try {
                const res = await fetch('/api/admin/users');
                this.adminUsers = await res.json();
            } catch {}
            try {
                const res = await fetch('/api/admin/supplier/balance');
                const d = await res.json();
                this.supplierBalance = d.balance; this.supplierKarma = d.karma;
            } catch {}
        },
        openRecharge(user) {
            this.rechargeUser = user; this.rechargeAmount = 10; this.rechargeDesc = '';
            this.rechargeVisible = true;
        },
        async doRecharge() {
            if (!this.rechargeAmount || this.rechargeAmount <= 0) { ElementPlus.ElMessage.warning('请输入有效金额'); return; }
            const res = await fetch(`/api/admin/users/${this.rechargeUser.id}/recharge`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: this.rechargeAmount, description: this.rechargeDesc || null })
            });
            if (res.ok) {
                this.rechargeVisible = false; this.loadAdminUsers();
                ElementPlus.ElMessage.success('充值成功');
            } else { ElementPlus.ElMessage.error('充值失败'); }
        },
        async toggleUserActive(user) {
            await fetch(`/api/admin/users/${user.id}`, {
                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isActive: !user.isActive })
            });
            this.loadAdminUsers();
        },

        // === DB Orders ===
        async loadDbOrders() {
            if (this.adminUsers.length === 0) await this.loadAdminUsers();
            const url = this.orderUserFilter ? `/api/admin/orders?userId=${this.orderUserFilter}` : '/api/admin/orders';
            try {
                const res = await fetch(url);
                this.dbOrders = await res.json();
            } catch {}
        },
        openAssign(order) {
            this.assignOrderId = order.id; this.assignUserId = null;
            this.assignVisible = true;
        },
        async doAssign() {
            if (!this.assignUserId) { ElementPlus.ElMessage.warning('请选择用户'); return; }
            const res = await fetch(`/api/admin/orders/${this.assignOrderId}/assign`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: this.assignUserId })
            });
            if (res.ok) {
                this.assignVisible = false; this.loadDbOrders();
                ElementPlus.ElMessage.success('分配成功');
            } else { ElementPlus.ElMessage.error('分配失败'); }
        },

        // === Pricing ===
        async loadPricing() {
            try {
                const res = await fetch('/api/admin/pricing');
                const d = await res.json();
                this.pricingForm = {
                    markupEnabled: d.markupEnabled, rentalProfitPercent: d.rentalProfitPercent, activationProfitPercent: d.activationProfitPercent,
                    serviceFee1m: d.serviceFee1m || 0, serviceFee3m: d.serviceFee3m || 0, serviceFee6m: d.serviceFee6m || 0, serviceFee12m: d.serviceFee12m || 0,
                    usdCnyRate: d.usdCnyRate
                };
            } catch {}
        },
        async savePricing() {
            const res = await fetch('/api/admin/pricing', {
                method: 'PUT', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.pricingForm)
            });
            if (res.ok) ElementPlus.ElMessage.success('定价配置已保存');
            else ElementPlus.ElMessage.error('保存失败');
        },

        // === Utils ===
        fmtTime(t) { return new Date(t).toLocaleString(); },
        fmtDate(t) { return new Date(t).toLocaleDateString(); },
        copyText(t) {
            navigator.clipboard?.writeText(t).then(
                () => ElementPlus.ElMessage.success('已复制'),
                () => ElementPlus.ElMessage.error('复制失败')
            );
        },
        async doLogout() {
            await fetch('/api/auth/logout', { method: 'POST' });
            this.$router.push('/login');
        }
    },

    async mounted() {
        this.checkMobile();
        window.addEventListener('resize', this.checkMobile);
        this.loadPricing();
        this.loadSupplierInfo();
        this.loadActServices();
        this.loadAdminOrderList();
        this.loadRentalCountries();
    },

    beforeUnmount() {
        window.removeEventListener('resize', this.checkMobile);
        Object.keys(this.pollingTimers).forEach(id => this.stopPolling(id));
    }
};
