const LoginView = {
    template: `
<div class="login-bg">
    <div class="login-card">
        <div style="text-align:center;margin-bottom:28px">
            <div style="width:48px;height:48px;background:linear-gradient(135deg,#3b82f6,#8b5cf6);border-radius:12px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px">
                <span style="color:#fff;font-weight:700;font-size:20px">S</span>
            </div>
            <h1 style="font-size:22px;color:#1e293b;font-weight:700">SMS接码平台</h1>
            <p style="color:#94a3b8;font-size:14px;margin-top:4px">{{ mode==='login' ? '欢迎回来' : '创建新账户' }}</p>
        </div>

        <!-- Tabs -->
        <div v-if="!isAdminLogin" style="display:flex;margin-bottom:24px;border-bottom:2px solid #e5e7eb">
            <button id="tabLogin" @click="switchMode('login')"
                :style="{flex:1,padding:'10px',fontSize:'14px',fontWeight:500,border:'none',background:'none',cursor:'pointer',
                borderBottom:mode==='login'?'2px solid #3b82f6':'2px solid transparent',color:mode==='login'?'#3b82f6':'#94a3b8',marginBottom:'-2px'}">
                登录</button>
            <button id="tabRegister" @click="switchMode('register')"
                :style="{flex:1,padding:'10px',fontSize:'14px',fontWeight:500,border:'none',background:'none',cursor:'pointer',
                borderBottom:mode==='register'?'2px solid #3b82f6':'2px solid transparent',color:mode==='register'?'#3b82f6':'#94a3b8',marginBottom:'-2px'}">
                注册</button>
        </div>

        <el-form ref="formRef" :model="form" :rules="rules" label-position="top" hide-required-asterisk>
            <el-form-item label="手机号" prop="phone">
                <el-input id="phone" v-model="form.phone" placeholder="请输入手机号" size="large"
                    @keyup.enter="focusPwd" />
            </el-form-item>
            <el-form-item label="密码" prop="password">
                <el-input id="password" ref="pwdInput" v-model="form.password" type="password" show-password
                    placeholder="请输入密码" size="large" @keyup.enter="mode==='register'?focusConfirm():doSubmit()" />
            </el-form-item>
            <el-form-item v-if="mode==='register'" id="confirmRow" label="确认密码" prop="confirmPassword">
                <el-input id="confirmPassword" ref="confirmInput" v-model="form.confirmPassword" type="password" show-password
                    placeholder="请再次输入密码" size="large" @keyup.enter="doSubmit()" />
            </el-form-item>
        </el-form>

        <!-- CAPTCHA -->
        <div style="margin-bottom:16px">
            <div v-if="!captchaVerified && !captchaVisible" id="captchaBtn" @click="startCaptcha()"
                style="border:1px solid #e5e7eb;border-radius:8px;padding:12px;cursor:pointer;display:flex;align-items:center;gap:12px;transition:all .2s"
                @mouseenter="$event.currentTarget.style.background='#f8fafc';$event.currentTarget.style.borderColor='#3b82f6'"
                @mouseleave="$event.currentTarget.style.background='';$event.currentTarget.style.borderColor='#e5e7eb'">
                <div style="width:28px;height:28px;border:2px solid #d1d5db;border-radius:50%;display:flex;align-items:center;justify-content:center">
                    <el-icon :size="14" color="#9ca3af"><Select /></el-icon>
                </div>
                <span style="color:#6b7280;font-size:14px">点击进行人机验证</span>
            </div>

            <div v-if="captchaVerified && !captchaVisible" id="captchaOk"
                style="border:1px solid #86efac;background:#f0fdf4;border-radius:8px;padding:12px;display:flex;align-items:center;gap:12px">
                <div style="width:28px;height:28px;background:#22c55e;border-radius:50%;display:flex;align-items:center;justify-content:center">
                    <el-icon :size="14" color="#fff"><Check /></el-icon>
                </div>
                <span style="color:#16a34a;font-size:14px;font-weight:500">验证通过</span>
            </div>

            <div v-show="captchaVisible" id="captchaBox" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden">
                <div ref="captchaContainer" class="captcha-container" style="aspect-ratio:300/150">
                    <canvas ref="captchaCanvas" class="captcha-canvas"></canvas>
                    <canvas ref="captchaPiece" class="captcha-piece"></canvas>
                </div>
                <div class="slider-track" ref="sliderTrack">
                    <div class="slider-fill" ref="sliderFill"></div>
                    <span class="slider-hint" ref="sliderHint">向右拖动滑块完成验证</span>
                    <div class="slider-thumb" ref="sliderThumb" id="sThumb" @pointerdown="onSliderDown">&#8680;</div>
                </div>
            </div>
        </div>

        <div v-if="mode==='login'" id="rememberRow" style="display:flex;align-items:center;margin-bottom:16px">
            <el-checkbox id="rememberMe" v-model="form.rememberMe">记住我</el-checkbox>
        </div>

        <el-button id="submitBtn" type="primary" size="large" :loading="submitting" @click="doSubmit()"
            style="width:100%;border-radius:8px;font-size:15px">
            {{ mode==='login' ? '登录' : '注册' }}
        </el-button>
    </div>
</div>`,

    data() {
        return {
            mode: 'login',
            isAdminLogin: false,
            form: { phone: '', password: '', confirmPassword: '', rememberMe: false },
            submitting: false,
            captchaVisible: false,
            captchaVerified: false,
            captchaToken: '',
            captchaData: null,
            dragging: false,
            dragStartX: 0,
            slideX: 0
        };
    },

    computed: {
        rules() {
            const r = {
                phone: [
                    { required: true, message: '请输入手机号', trigger: 'blur' },
                    { pattern: /^[\d+]{5,20}$/, message: '请输入有效的手机号', trigger: 'blur' }
                ],
                password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
            };
            if (this.mode === 'register') {
                r.password.push({ min: 6, message: '密码至少6个字符', trigger: 'blur' });
                r.confirmPassword = [
                    { required: true, message: '请确认密码', trigger: 'blur' },
                    { validator: (_, v, cb) => v !== this.form.password ? cb(new Error('两次密码不一致')) : cb(), trigger: 'blur' }
                ];
            }
            return r;
        }
    },

    methods: {
        switchMode(m) {
            this.mode = m;
            this.$nextTick(() => this.$refs.formRef?.clearValidate());
        },
        focusPwd() { this.$refs.pwdInput?.focus(); },
        focusConfirm() { this.$refs.confirmInput?.focus(); },

        // ===== CAPTCHA =====
        createRng(seed) {
            let s = seed | 0;
            return () => { s = (s * 1664525 + 1013904223) | 0; return (s >>> 0) / 4294967296; };
        },
        drawBg(ctx, seed) {
            const CW = 300, CH = 150, r = this.createRng(seed);
            const g = ctx.createLinearGradient(0, 0, CW, CH);
            g.addColorStop(0, `rgb(${80+r()*100|0},${80+r()*100|0},${80+r()*100|0})`);
            g.addColorStop(1, `rgb(${40+r()*80|0},${40+r()*80|0},${40+r()*80|0})`);
            ctx.fillStyle = g; ctx.fillRect(0, 0, CW, CH);
            for (let i = 0; i < 12; i++) {
                ctx.beginPath(); ctx.arc(r()*CW, r()*CH, r()*25+10, 0, Math.PI*2);
                ctx.fillStyle = `rgba(${r()*256|0},${r()*256|0},${r()*256|0},${r()*.15+.05})`; ctx.fill();
            }
            for (let i = 0; i < 6; i++) {
                ctx.beginPath(); ctx.moveTo(r()*CW, r()*CH); ctx.lineTo(r()*CW, r()*CH);
                ctx.strokeStyle = `rgba(${r()*256|0},${r()*256|0},${r()*256|0},.12)`; ctx.lineWidth = 2; ctx.stroke();
            }
        },
        async startCaptcha() {
            if (this.captchaVerified) return;
            try {
                const res = await fetch('/api/captcha');
                this.captchaData = await res.json();

                // IMPORTANT: Show captcha box FIRST so container has dimensions
                this.captchaVisible = true;
                await this.$nextTick();

                const CW = 300, CH = 150, PS = 42;
                const cvs = this.$refs.captchaCanvas;
                const ctx = cvs.getContext('2d');
                cvs.width = CW; cvs.height = CH;

                const enc = atob(this.captchaData.data);
                const tx = (enc.charCodeAt(0) ^ this.captchaData.token.charCodeAt(0)) << 8 |
                           (enc.charCodeAt(1) ^ this.captchaData.token.charCodeAt(1));
                const ty = this.captchaData.y;

                this.drawBg(ctx, this.captchaData.seed);

                const pieceData = ctx.getImageData(tx, ty, PS, PS);
                ctx.fillStyle = 'rgba(0,0,0,.35)'; ctx.fillRect(tx, ty, PS, PS);
                ctx.strokeStyle = 'rgba(255,255,255,.5)'; ctx.lineWidth = 1.5; ctx.strokeRect(tx, ty, PS, PS);

                const pc = this.$refs.captchaPiece;
                pc.width = PS; pc.height = PS;
                const pctx = pc.getContext('2d');
                pctx.putImageData(pieceData, 0, 0);
                pctx.strokeStyle = 'rgba(255,255,255,.7)'; pctx.lineWidth = 2;
                pctx.strokeRect(1, 1, PS - 2, PS - 2);

                const container = this.$refs.captchaContainer;
                const scale = container.offsetWidth / CW;
                pc.style.width = (PS * scale) + 'px';
                pc.style.height = (PS * scale) + 'px';
                pc.style.top = (ty * scale) + 'px';
                pc.style.left = '0px';

                // Reset slider
                const thumb = this.$refs.sliderThumb;
                const fill = this.$refs.sliderFill;
                thumb.style.left = '0'; fill.style.width = '0';
                thumb.className = 'slider-thumb'; fill.className = 'slider-fill';
                this.$refs.sliderHint.textContent = '向右拖动滑块完成验证';
            } catch (e) {
                console.error('加载验证码失败', e);
                ElementPlus.ElMessage.error('加载验证码失败');
            }
        },

        onSliderDown(e) {
            e.preventDefault();
            this.$refs.sliderThumb.setPointerCapture(e.pointerId);
            this.dragging = true;
            this.dragStartX = e.clientX;
            this.slideX = 0;

            const onMove = (ev) => {
                if (!this.dragging) return;
                const ms = this.$refs.sliderTrack.offsetWidth - 36;
                this.slideX = Math.max(0, Math.min(ms, ev.clientX - this.dragStartX));
                this.$refs.sliderThumb.style.left = this.slideX + 'px';
                this.$refs.sliderFill.style.width = this.slideX + 'px';
                const pc = this.$refs.captchaPiece;
                const maxPiece = this.$refs.captchaContainer.offsetWidth - pc.offsetWidth;
                pc.style.left = ((this.slideX / ms) * maxPiece) + 'px';
            };

            const onUp = async () => {
                if (!this.dragging) return;
                this.dragging = false;
                document.removeEventListener('pointermove', onMove);
                document.removeEventListener('pointerup', onUp);

                const ms = this.$refs.sliderTrack.offsetWidth - 36;
                const naturalX = Math.round((this.slideX / ms) * (300 - 42));

                try {
                    const res = await fetch('/api/captcha/verify', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ token: this.captchaData.token, x: naturalX })
                    });
                    const d = await res.json();
                    if (d.verified) {
                        this.captchaVerified = true;
                        this.captchaToken = d.verifiedToken;
                        this.$refs.sliderFill.className = 'slider-fill ok';
                        this.$refs.sliderThumb.className = 'slider-thumb ok';
                        this.$refs.sliderThumb.innerHTML = '&#10003;';
                        this.$refs.sliderHint.textContent = '验证通过';
                        setTimeout(() => { this.captchaVisible = false; }, 500);
                    } else {
                        this.$refs.sliderFill.className = 'slider-fill fail';
                        this.$refs.sliderThumb.className = 'slider-thumb fail';
                        this.$refs.sliderTrack.style.animation = 'shake .3s';
                        setTimeout(() => {
                            if (this.$refs.sliderTrack) this.$refs.sliderTrack.style.animation = '';
                            this.startCaptcha();
                        }, 500);
                    }
                } catch { this.startCaptcha(); }
            };

            document.addEventListener('pointermove', onMove);
            document.addEventListener('pointerup', onUp);
        },

        // ===== Submit =====
        async doSubmit() {
            try { await this.$refs.formRef.validate(); } catch { return; }
            if (!this.captchaVerified) {
                ElementPlus.ElMessage.warning('请先完成人机验证');
                return;
            }
            this.submitting = true;
            try {
                const url = this.mode === 'login' ? '/api/auth/login' : '/api/auth/register';
                const body = { phone: this.form.phone, password: this.form.password, captchaToken: this.captchaToken };
                if (this.mode === 'login') body.rememberMe = this.form.rememberMe;

                const res = await fetch(url, {
                    method: 'POST', headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(body)
                });
                const data = await res.json();
                if (res.ok && data.success) {
                    ElementPlus.ElMessage.success(this.mode === 'login' ? '登录成功' : '注册成功');
                    setTimeout(() => this.$router.push(data.redirect), 300);
                } else {
                    ElementPlus.ElMessage.error(data.error || '操作失败');
                    this.captchaVerified = false;
                    this.captchaToken = '';
                }
            } catch { ElementPlus.ElMessage.error('网络错误，请重试'); }
            finally { this.submitting = false; }
        }
    },

    mounted() {
        this.isAdminLogin = this.$route.path.includes('sms_admin');
        if (this.$route.hash === '#register') this.mode = 'register';
    }
};
