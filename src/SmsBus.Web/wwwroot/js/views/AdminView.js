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
            <el-menu-item index="suppliers"><el-icon><Connection /></el-icon><span>供应商管理</span></el-menu-item>
            <el-menu-item index="countries"><el-icon><Location /></el-icon><span>国家管理</span></el-menu-item>
        </el-menu>
        <div v-show="!collapsed" class="sidebar-footer">
            <div class="email">管理员</div>
            <div class="balance" style="color:#f59e0b" v-if="supplierBalances.length">
                <span v-for="b in supplierBalances" :key="b.code">\${{ b.balance.toFixed(2) }} ({{ b.code }})</span>
            </div>
        </div>
    </el-aside>
    <el-container>
        <el-header class="app-header">
            <div class="left">
                <el-button :icon="isMobile?'Menu':(collapsed?'Expand':'Fold')" text @click="toggleSidebar" />
                <span class="breadcrumb">{{ menuLabels[activeMenu] }}</span>
            </div>
            <div class="right">
                <span style="color:#6b7280;font-size:13px">
                    <span v-for="b in supplierBalances" :key="b.code" style="margin-right:8px">
                        <span style="color:#22c55e;font-weight:600">\${{ b.balance.toFixed(2) }}</span>
                        <span style="color:#9ca3af;font-size:12px">({{ b.code }})</span>
                    </span>
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
                                            <el-select v-model="selectedActCountry" style="width:100%" filterable placeholder="搜索国家..."
                                                @change="onAdminActCountryChange">
                                                <el-option v-for="c in adminActCountries" :key="c.code"
                                                    :label="c.name+' ['+c.code+']'" :value="c.code" />
                                            </el-select>
                                        </el-form-item>
                                        <el-form-item v-if="adminActNeedService" label="选择服务">
                                            <el-select v-model="selectedActService" style="width:100%" filterable placeholder="搜索服务..."
                                                @change="checkActCount">
                                                <el-option v-for="s in adminActServices" :key="s.code"
                                                    :label="(svcZh(s.code)||s.name)+' ('+s.name+')'" :value="s.code" />
                                            </el-select>
                                        </el-form-item>
                                    </el-form>
                                    <div v-if="actPriceInfo" style="padding:12px;background:#eff6ff;border-radius:8px;margin-bottom:12px">
                                        <div style="display:flex;justify-content:space-between;font-size:13px">
                                            <span style="color:#6b7280">价格：</span>
                                            <span style="font-weight:600;color:#3b82f6">\${{ actPriceInfo.userPrice.toFixed(4) }}</span>
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
                                                @change="onAdminRentCountryChange">
                                                <el-option v-for="c in adminRentCountries" :key="c.code"
                                                    :label="c.name+' ('+c.code+')'" :value="c.code" />
                                            </el-select>
                                        </el-form-item>
                                        <el-form-item v-if="adminRentNeedService" label="选择服务">
                                            <el-select v-model="selectedRentalService" style="width:100%" filterable>
                                                <el-option v-for="s in adminRentServices" :key="s.code"
                                                    :label="(svcZh(s.code)||s.name)+' ('+s.count+'个) $'+s.price.toFixed(4)+'/日'" :value="s.code" />
                                            </el-select>
                                        </el-form-item>
                                    </el-form>
                                    <el-button type="primary" style="width:100%;background:#7c3aed;border-color:#7c3aed"
                                        :disabled="!selectedRentalCountry" :loading="rentalBuying" @click="purchaseRental">租赁号码</el-button>
                                </div>
                            </div>
                        </el-col>
                        <el-col :xs="24" :lg="16">
                            <div class="content-card">
                                <div class="card-title">
                                    <span>已购号码 <el-tag size="small" type="info">{{ adminOrders.length }}</el-tag></span>
                                    <el-button text type="primary" size="small" @click="loadAdminOrderList"><el-icon><Refresh /></el-icon></el-button>
                                </div>
                                <el-empty v-if="adminOrders.length===0" description="暂无已购号码" />
                                <div v-for="o in adminOrders" :key="o.id"
                                    style="border:1px solid #e5e7eb;border-radius:10px;padding:14px;margin-bottom:10px">
                                    <div style="display:flex;justify-content:space-between;align-items:start;flex-wrap:wrap;gap:8px">
                                        <div style="flex:1;min-width:200px">
                                            <div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-bottom:4px">
                                                <span style="font-size:16px;font-family:monospace;font-weight:700">{{ o.phoneNumber||'(获取中)' }}</span>
                                                <el-tag :type="o.mode==='rental'?'':'primary'" size="small">{{ o.mode==='rental'?'租赁':'临时' }}</el-tag>
                                                <el-tag size="small" type="info">{{ o.countryName }}</el-tag>
                                                <span style="font-size:12px;color:#9ca3af">成本\${{ (o.costPrice||0).toFixed(2) }}</span>
                                            </div>
                                            <div style="display:flex;align-items:center;gap:8px;font-size:13px">
                                                <span :class="'status-'+o.status" style="font-weight:500" v-html="statusHtml(o)"></span>
                                                <span style="color:#9ca3af">{{ fmtTime(o.purchasedAt) }}</span>
                                                <span v-if="o.expiresAt && o.mode==='rental'" style="color:#6b7280">到期: {{ fmtDate(o.expiresAt) }}</span>
                                            </div>
                                            <div v-if="o.renewalFailedAt" style="margin-top:4px;padding:4px 8px;background:#fef2f2;border-radius:6px;border:1px solid #fecaca;font-size:12px;color:#dc2626">
                                                ⚠ 续费异常: {{ fmtTime(o.renewalFailedAt) }}
                                            </div>
                                            <!-- 短信列表 -->
                                            <div v-if="o.smsList&&o.smsList.length>0" style="margin-top:8px">
                                                <div v-for="sms in o.smsList.slice(0,1)" :key="sms.receivedAt">
                                                    <span v-if="sms.code" style="font-family:monospace;font-size:22px;font-weight:700;color:#22c55e;letter-spacing:3px;cursor:pointer"
                                                        @click="copyText(sms.code)">{{ sms.code }}</span>
                                                    <span style="color:#6b7280;font-size:12px;margin-left:8px">{{ sms.text?.substring(0,60) }}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div style="display:flex;flex-direction:column;gap:4px">
                                            <el-button v-if="o.mode==='rental'&&o.status==='active'" text type="primary" size="small" @click="prolongRental(o.id)">续费</el-button>
                                            <el-button v-if="o.mode==='rental'&&o.status==='active'" text type="primary" size="small" @click="fetchAdminSms(o.id)">刷新短信</el-button>
                                            <el-button v-if="['waiting','activating','active'].includes(o.status)" text type="danger" size="small" @click="cancelOrder(o.id)">取消</el-button>
                                            <el-button v-else text type="info" size="small" @click="deleteOrder(o.id)">删除</el-button>
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
                        <div class="card-title"><span>用户管理</span></div>
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
                            <el-table-column prop="userName" label="用户" width="120">
                                <template #default="{row}">{{ row.userName||'未分配' }}</template>
                            </el-table-column>
                            <el-table-column label="服务" width="160">
                                <template #default="{row}">{{ row.serviceName||'全服务' }} ({{ row.countryName }})</template>
                            </el-table-column>
                            <el-table-column prop="phoneNumber" label="号码" width="150">
                                <template #default="{row}"><span style="font-family:monospace">{{ row.phoneNumber||'-' }}</span></template>
                            </el-table-column>
                            <el-table-column prop="status" label="状态" width="100">
                                <template #default="{row}">
                                    <span :class="'status-'+row.status">{{ row.status }}</span>
                                    <el-tag v-if="row.renewalFailedAt" type="danger" size="small" style="margin-left:4px">续费异常</el-tag>
                                </template>
                            </el-table-column>
                            <el-table-column prop="costPrice" label="成本" width="80">
                                <template #default="{row}">\${{ (row.costPrice||0).toFixed(2) }}</template>
                            </el-table-column>
                            <el-table-column prop="userPrice" label="用户价" width="80">
                                <template #default="{row}">\${{ (row.userPrice||0).toFixed(2) }}</template>
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
                        <div class="card-title">全局默认定价</div>
                        <p style="font-size:12px;color:#9ca3af;margin:-8px 0 12px">当国家未设置专属加价时，使用以下默认值</p>
                        <el-form label-position="top">
                            <el-form-item label="临时接码默认加价 (%)">
                                <el-input-number v-model="pricingForm.defaultActivationMarkupPercent" :min="0" :max="500" :step="1" :precision="1" style="width:100%" />
                            </el-form-item>
                            <el-form-item label="租赁默认加价 (%)">
                                <el-input-number v-model="pricingForm.defaultRentalMarkupPercent" :min="0" :max="500" :step="1" :precision="1" style="width:100%" />
                            </el-form-item>
                            <div style="padding:12px;background:#f0f9ff;border-radius:8px;margin-bottom:16px">
                                <div style="font-size:13px;font-weight:500;color:#374151;margin-bottom:8px">租赁服务费 (%)</div>
                                <div style="font-size:12px;color:#9ca3af;margin-bottom:8px">按订阅周期叠加到加价上</div>
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
                                <div style="font-size:12px;color:#9ca3af;margin-top:4px">每小时自动更新</div>
                            </el-form-item>
                        </el-form>
                        <div style="padding:12px;background:#f8fafc;border-radius:8px;font-size:13px;color:#6b7280;margin-bottom:16px">
                            <p><strong>定价逻辑:</strong></p>
                            <p style="margin-top:4px">用户价 = 成本 × (1 + (加价% + 服务费%)/100)</p>
                            <p>加价%和服务费%优先用国家级配置，为空时用此全局默认</p>
                        </div>
                        <el-button type="primary" style="width:100%" @click="savePricing">保存配置</el-button>
                    </div>
                </div>

                <!-- ======= 供应商管理（只读）======= -->
                <div v-else-if="activeMenu==='suppliers'" key="suppliers">
                    <div class="content-card">
                        <div class="card-title"><span>供应商管理</span></div>
                        <el-table :data="supplierList" stripe style="width:100%">
                            <el-table-column prop="code" label="代码" width="100" />
                            <el-table-column prop="name" label="名称" width="120" />
                            <el-table-column prop="apiBaseUrl" label="API地址" />
                            <el-table-column label="能力" width="180">
                                <template #default="{row}">
                                    <el-tag v-if="row.supportsActivation" size="small" style="margin-right:4px">临时</el-tag>
                                    <el-tag v-if="row.supportsRental" size="small" type="warning" style="margin-right:4px">租赁</el-tag>
                                    <el-tag v-if="row.requiresServiceForActivation" size="small" type="info" style="margin-right:2px">临时选服务</el-tag>
                                    <el-tag v-else size="small" type="success" style="margin-right:2px">临时全服务</el-tag>
                                    <el-tag v-if="row.requiresServiceForRental" size="small" type="info">租赁选服务</el-tag>
                                    <el-tag v-else size="small" type="success">租赁全服务</el-tag>
                                </template>
                            </el-table-column>
                            <el-table-column prop="isActive" label="状态" width="80">
                                <template #default="{row}"><el-tag :type="row.isActive?'success':'danger'" size="small">{{ row.isActive?'启用':'禁用' }}</el-tag></template>
                            </el-table-column>
                        </el-table>
                    </div>
                </div>

                <!-- ======= 国家管理 ======= -->
                <div v-else-if="activeMenu==='countries'" key="countries">
                    <div class="content-card">
                        <div class="card-title">
                            <span>国家管理</span>
                            <el-button type="primary" size="small" @click="openCountryDialog()">添加国家</el-button>
                        </div>
                        <el-table :data="countryList" stripe style="width:100%">
                            <el-table-column prop="code" label="代码" width="80" />
                            <el-table-column prop="name" label="名称" width="100" />
                            <el-table-column prop="supplierName" label="供应商" width="100" />
                            <el-table-column label="模式" width="140">
                                <template #default="{row}">
                                    <el-tag v-if="row.activationEnabled" size="small" style="margin-right:4px">临时</el-tag>
                                    <el-tag v-if="row.rentalEnabled" size="small" type="warning">租赁</el-tag>
                                </template>
                            </el-table-column>
                            <el-table-column label="商品加价%" width="150">
                                <template #default="{row}">
                                    <span v-if="row.activationMarkupPercent!=null" style="font-size:12px">临时:{{ row.activationMarkupPercent }}%</span>
                                    <span v-if="row.rentalMarkupPercent!=null" style="font-size:12px;margin-left:4px">租赁:{{ row.rentalMarkupPercent }}%</span>
                                    <span v-if="row.activationMarkupPercent==null&&row.rentalMarkupPercent==null" style="font-size:12px;color:#9ca3af">默认</span>
                                </template>
                            </el-table-column>
                            <el-table-column label="服务费%" width="120">
                                <template #default="{row}">
                                    <span v-if="row.serviceFee1m!=null" style="font-size:12px">{{ row.serviceFee1m }}%</span>
                                    <span v-else style="font-size:12px;color:#9ca3af">默认</span>
                                </template>
                            </el-table-column>
                            <el-table-column prop="sortOrder" label="排序" width="60" />
                            <el-table-column prop="isActive" label="状态" width="80">
                                <template #default="{row}"><el-tag :type="row.isActive?'success':'danger'" size="small">{{ row.isActive?'启用':'禁用' }}</el-tag></template>
                            </el-table-column>
                            <el-table-column label="操作" width="120">
                                <template #default="{row}">
                                    <el-button text type="primary" size="small" @click="openCountryDialog(row)">编辑</el-button>
                                    <el-button text type="danger" size="small" @click="deleteCountry(row.id)">删除</el-button>
                                </template>
                            </el-table-column>
                        </el-table>
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

    <!-- 国家编辑弹窗 -->
    <el-dialog v-model="countryDialogVisible" :title="countryForm.id?'编辑国家':'添加国家'" :width="isMobile?'92%':'600px'">
        <el-form label-position="top" size="default">
            <el-row :gutter="12">
                <el-col :span="12"><el-form-item label="国家">
                    <el-select v-model="countryForm.code" filterable :disabled="!!countryForm.id" style="width:100%" placeholder="选择国家" @change="onCountryPresetChange">
                        <el-option v-for="c in countryPresets" :key="c.code" :label="c.name+' ('+c.code+')'" :value="c.code" />
                    </el-select>
                </el-form-item></el-col>
                <el-col :span="6"><el-form-item label="排序"><el-input-number v-model="countryForm.sortOrder" :min="0" style="width:100%" /></el-form-item></el-col>
                <el-col :span="6"><el-form-item label="启用"><el-switch v-model="countryForm.isActive" style="margin-top:8px" /></el-form-item></el-col>
            </el-row>
            <el-form-item label="供应商">
                <el-select v-model="countryForm.supplierId" style="width:100%">
                    <el-option v-for="s in supplierList" :key="s.id" :label="s.name+' ('+s.code+')'" :value="s.id" />
                </el-select>
            </el-form-item>
            <el-row :gutter="12">
                <el-col :span="12"><el-form-item label="临时接码"><el-switch v-model="countryForm.activationEnabled" /></el-form-item></el-col>
                <el-col :span="12"><el-form-item label="租赁"><el-switch v-model="countryForm.rentalEnabled" /></el-form-item></el-col>
            </el-row>
            <el-divider content-position="left">商品加价% (空=使用全局默认)</el-divider>
            <el-row :gutter="12">
                <el-col :span="12"><el-form-item label="临时接码加价%">
                    <el-input-number v-model="countryForm.activationMarkupPercent" :min="0" :max="500" :precision="1" style="width:100%" placeholder="默认" />
                </el-form-item></el-col>
                <el-col :span="12"><el-form-item label="租赁加价%">
                    <el-input-number v-model="countryForm.rentalMarkupPercent" :min="0" :max="500" :precision="1" style="width:100%" placeholder="默认" />
                </el-form-item></el-col>
            </el-row>
            <el-divider content-position="left">服务费% (空=使用全局默认)</el-divider>
            <el-row :gutter="12">
                <el-col :span="6"><el-form-item label="1个月">
                    <el-input-number v-model="countryForm.serviceFee1m" :min="0" :max="500" :precision="1" style="width:100%" />
                </el-form-item></el-col>
                <el-col :span="6"><el-form-item label="3个月">
                    <el-input-number v-model="countryForm.serviceFee3m" :min="0" :max="500" :precision="1" style="width:100%" />
                </el-form-item></el-col>
                <el-col :span="6"><el-form-item label="6个月">
                    <el-input-number v-model="countryForm.serviceFee6m" :min="0" :max="500" :precision="1" style="width:100%" />
                </el-form-item></el-col>
                <el-col :span="6"><el-form-item label="12个月">
                    <el-input-number v-model="countryForm.serviceFee12m" :min="0" :max="500" :precision="1" style="width:100%" />
                </el-form-item></el-col>
            </el-row>
        </el-form>
        <template #footer>
            <el-button @click="countryDialogVisible=false">取消</el-button>
            <el-button type="primary" @click="saveCountry">保存</el-button>
        </template>
    </el-dialog>
</el-container>`,

    data() {
        return {
            collapsed: false,
            mobileOpen: false,
            isMobile: false,
            activeMenu: 'purchase',
            menuLabels: { purchase:'购买管理', users:'用户管理', dborders:'用户订单', pricing:'定价配置', suppliers:'供应商管理', countries:'国家管理' },
            supplierBalances: [],
            // Purchase - activation
            purchaseMode: 'activation',
            adminActCountries: [], selectedActCountry: null, adminActNeedService: true,
            adminActServices: [], selectedActService: null,
            actPriceInfo: null, actBuying: false,
            // Purchase - rental
            adminRentCountries: [], selectedRentalCountry: null, adminRentNeedService: true,
            adminRentServices: [], selectedRentalService: null, rentalBuying: false,
            // Admin orders (purchase panel)
            adminOrders: [],
            pollingTimers: {},
            // Users
            adminUsers: [],
            // DB Orders
            dbOrders: [], orderUserFilter: null,
            // Pricing
            pricingForm: { defaultActivationMarkupPercent: 0, defaultRentalMarkupPercent: 0, serviceFee1m: 0, serviceFee3m: 0, serviceFee6m: 0, serviceFee12m: 0, usdCnyRate: 7.25 },
            // Recharge
            rechargeVisible: false, rechargeUser: null, rechargeAmount: 10, rechargeDesc: '',
            // Assign
            assignVisible: false, assignOrderId: null, assignUserId: null,
            // Suppliers
            supplierList: [],
            // Countries
            countryList: [],
            countryPresets: [],
            countryDialogVisible: false,
            countryForm: { id: null, code: '', name: '', supplierId: null, isActive: true, activationEnabled: true, rentalEnabled: true, activationMarkupPercent: null, rentalMarkupPercent: null, serviceFee1m: null, serviceFee3m: null, serviceFee6m: null, serviceFee12m: null, sortOrder: 0 },
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
            if (index === 'users') this.loadAdminUsers();
            if (index === 'dborders') this.loadDbOrders();
            if (index === 'pricing') this.loadPricing();
            if (index === 'suppliers') this.loadSuppliers();
            if (index === 'countries') { this.loadCountries(); this.loadSuppliers(); }
        },

        svcZh(code) { return SERVICE_ZH[code] || ''; },

        // === Supplier Balance ===
        async loadSupplierBalance() {
            try {
                const res = await fetch('/api/admin/supplier/balance');
                this.supplierBalances = await res.json();
            } catch {}
        },

        // === Activation Purchase ===
        async loadAdminActCountries() {
            try {
                const res = await fetch('/api/countries?mode=activation');
                this.adminActCountries = await res.json();
            } catch {}
        },
        async onAdminActCountryChange() {
            this.actPriceInfo = null;
            this.selectedActService = null;
            this.adminActServices = [];
            const c = this.adminActCountries.find(x => x.code === this.selectedActCountry);
            this.adminActNeedService = c ? c.requiresServiceForActivation : true;
            if (this.adminActNeedService) {
                try {
                    const res = await fetch(`/api/countries/${this.selectedActCountry}/services/activation`);
                    this.adminActServices = await res.json();
                } catch {}
            }
            this.checkActCount();
        },
        async checkActCount() {
            if (!this.selectedActCountry) { this.actPriceInfo = null; return; }
            const svc = this.adminActNeedService ? (this.selectedActService || '') : '';
            try {
                const res = await fetch(`/api/countries/${this.selectedActCountry}/activation/price?service=${svc}`);
                const d = await res.json();
                this.actPriceInfo = { total: d.total, userPrice: d.userPrice };
            } catch { this.actPriceInfo = null; }
        },
        async purchaseActivation() {
            if (!this.selectedActCountry) return;
            this.actBuying = true;
            try {
                const res = await fetch('/api/admin/purchase/activation', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        countryCode: this.selectedActCountry,
                        serviceCode: this.adminActNeedService ? this.selectedActService : null
                    })
                });
                if (!res.ok) { const d = await res.json(); throw new Error(d.error || '购买失败'); }
                ElementPlus.ElMessage.success('购买成功');
                this.loadSupplierBalance();
                this.loadAdminOrderList();
            } catch (e) { ElementPlus.ElMessage.error(e.message); }
            finally { this.actBuying = false; }
        },

        // === Rental Purchase ===
        async loadAdminRentCountries() {
            try {
                const res = await fetch('/api/countries?mode=rental');
                this.adminRentCountries = await res.json();
            } catch {}
        },
        async onAdminRentCountryChange() {
            this.selectedRentalService = null;
            this.adminRentServices = [];
            const c = this.adminRentCountries.find(x => x.code === this.selectedRentalCountry);
            this.adminRentNeedService = c ? c.requiresServiceForRental : true;
            if (this.adminRentNeedService) {
                try {
                    const res = await fetch(`/api/countries/${this.selectedRentalCountry}/services/rental`);
                    this.adminRentServices = await res.json();
                } catch {}
            }
        },
        async purchaseRental() {
            if (!this.selectedRentalCountry) return;
            this.rentalBuying = true;
            try {
                const res = await fetch('/api/admin/purchase/rental', {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        countryCode: this.selectedRentalCountry,
                        serviceCode: this.adminRentNeedService ? this.selectedRentalService : null
                    })
                });
                if (!res.ok) { const d = await res.json(); throw new Error(d.error || '租赁失败'); }
                ElementPlus.ElMessage.success('租赁成功');
                this.loadSupplierBalance();
                this.loadAdminOrderList();
            } catch (e) { ElementPlus.ElMessage.error(e.message); }
            finally { this.rentalBuying = false; }
        },

        // === Admin Orders ===
        async loadAdminOrderList() {
            try {
                const res = await fetch('/api/admin/orders');
                this.adminOrders = await res.json();
                this.adminOrders.filter(o => ['waiting','activating','active'].includes(o.status)).forEach(o => this.startPolling(o.id));
            } catch {}
        },
        startPolling(orderId) {
            if (this.pollingTimers[orderId]) return;
            this.pollingTimers[orderId] = setInterval(async () => {
                try {
                    const res = await fetch(`/api/admin/orders/${orderId}/poll`);
                    if (!res.ok) { this.stopPolling(orderId); return; }
                    const o = await res.json();
                    if (['received','cancelled','expired'].includes(o.status)) this.stopPolling(orderId);
                    const idx = this.adminOrders.findIndex(x => x.id === orderId);
                    if (idx >= 0) this.adminOrders.splice(idx, 1, o);
                } catch {}
            }, 5000);
        },
        stopPolling(orderId) { if (this.pollingTimers[orderId]) { clearInterval(this.pollingTimers[orderId]); delete this.pollingTimers[orderId]; } },
        async prolongRental(id) {
            try {
                await ElementPlus.ElMessageBox.confirm('确认向上游续费1个月？', '续费', { type: 'warning' });
                const res = await fetch(`/api/admin/orders/${id}/prolong`, { method: 'POST' });
                if (!res.ok) throw new Error(await res.text());
                ElementPlus.ElMessage.success('续费成功');
                this.loadAdminOrderList();
                this.loadSupplierBalance();
            } catch {}
        },
        async fetchAdminSms(id) {
            try {
                const res = await fetch(`/api/admin/orders/${id}/sms`);
                const d = await res.json();
                if (d.error) ElementPlus.ElMessage.warning(d.error);
                else ElementPlus.ElMessage.success('短信已刷新');
                this.loadAdminOrderList();
            } catch { ElementPlus.ElMessage.error('获取短信失败'); }
        },
        async cancelOrder(id) {
            try { await ElementPlus.ElMessageBox.confirm('确定取消？', '确认', { type: 'warning' }); } catch { return; }
            await fetch(`/api/admin/orders/${id}/cancel`, { method: 'POST' });
            this.stopPolling(id);
            this.loadAdminOrderList();
            this.loadSupplierBalance();
        },
        async deleteOrder(id) {
            try { await ElementPlus.ElMessageBox.confirm('确定删除？', '确认', { type: 'warning' }); } catch { return; }
            await fetch(`/api/admin/orders/${id}/remove`, { method: 'POST' });
            this.loadAdminOrderList();
        },
        statusHtml(o) {
            const m = {
                waiting: '<span style="display:inline-block;width:6px;height:6px;background:#e6a23c;border-radius:50%;margin-right:4px;animation:pulse 1.5s infinite"></span>等待验证码...',
                activating: '<span style="display:inline-block;width:6px;height:6px;background:#a855f7;border-radius:50%;margin-right:4px;animation:pulse 1.5s infinite"></span>激活中...',
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
                    defaultActivationMarkupPercent: d.defaultActivationMarkupPercent || 0,
                    defaultRentalMarkupPercent: d.defaultRentalMarkupPercent || 0,
                    serviceFee1m: d.serviceFee1m || 0, serviceFee3m: d.serviceFee3m || 0,
                    serviceFee6m: d.serviceFee6m || 0, serviceFee12m: d.serviceFee12m || 0,
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

        // === Suppliers ===
        async loadSuppliers() {
            try {
                const res = await fetch('/api/admin/suppliers');
                this.supplierList = await res.json();
            } catch {}
        },

        // === Countries ===
        async loadCountries() {
            try {
                const res = await fetch('/api/admin/countries');
                this.countryList = await res.json();
            } catch {}
        },
        async loadCountryPresets() {
            if (this.countryPresets.length) return;
            try {
                const res = await fetch('/api/admin/country-presets');
                this.countryPresets = await res.json();
            } catch {}
        },
        onCountryPresetChange(code) {
            const preset = this.countryPresets.find(c => c.code === code);
            if (preset) this.countryForm.name = preset.name;
        },
        openCountryDialog(row) {
            this.loadCountryPresets();
            if (row) {
                this.countryForm = { ...row };
            } else {
                this.countryForm = { id: null, code: '', name: '', supplierId: null, isActive: true, activationEnabled: true, rentalEnabled: true, activationMarkupPercent: null, rentalMarkupPercent: null, serviceFee1m: null, serviceFee3m: null, serviceFee6m: null, serviceFee12m: null, sortOrder: 0 };
            }
            this.countryDialogVisible = true;
        },
        async saveCountry() {
            const f = this.countryForm;
            const body = JSON.stringify({ code: f.code, name: f.name, supplierId: f.supplierId, isActive: f.isActive, activationEnabled: f.activationEnabled, rentalEnabled: f.rentalEnabled, activationMarkupPercent: f.activationMarkupPercent, rentalMarkupPercent: f.rentalMarkupPercent, serviceFee1m: f.serviceFee1m, serviceFee3m: f.serviceFee3m, serviceFee6m: f.serviceFee6m, serviceFee12m: f.serviceFee12m, sortOrder: f.sortOrder });
            let res;
            if (f.id) {
                res = await fetch(`/api/admin/countries/${f.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body });
            } else {
                res = await fetch('/api/admin/countries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body });
            }
            if (res.ok) {
                this.countryDialogVisible = false;
                this.loadCountries();
                ElementPlus.ElMessage.success('保存成功');
            } else { ElementPlus.ElMessage.error('保存失败'); }
        },
        async deleteCountry(id) {
            try { await ElementPlus.ElMessageBox.confirm('确定删除此国家？', '确认', { type: 'warning' }); } catch { return; }
            const res = await fetch(`/api/admin/countries/${id}`, { method: 'DELETE' });
            if (res.ok) { this.loadCountries(); ElementPlus.ElMessage.success('已删除'); }
            else ElementPlus.ElMessage.error('删除失败');
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
        this.loadSupplierBalance();
        this.loadAdminActCountries();
        this.loadAdminRentCountries();
        this.loadAdminOrderList();
    },

    beforeUnmount() {
        window.removeEventListener('resize', this.checkMobile);
        Object.keys(this.pollingTimers).forEach(id => this.stopPolling(id));
    }
};
