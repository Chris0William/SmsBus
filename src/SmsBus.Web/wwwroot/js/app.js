// Vue 3 SPA App - SMS接码平台

const { createApp } = Vue;
const { createRouter, createWebHistory } = VueRouter;

// Router
const router = createRouter({
    history: createWebHistory(),
    routes: [
        { path: '/', redirect: '/login' },
        { path: '/login', component: LoginView },
        { path: '/sms_admin/login', component: LoginView },
        { path: '/dashboard', component: UserView },
        { path: '/sms_admin', component: AdminView }
    ]
});

// Intercept 401 responses globally
const _origFetch = window.fetch;
window.fetch = async function (...args) {
    const res = await _origFetch.apply(this, args);
    if (res.status === 401) {
        const url = typeof args[0] === 'string' ? args[0] : args[0]?.url || '';
        if (url.startsWith('/api/')) {
            const isAdmin = window.location.pathname.includes('sms_admin');
            router.push(isAdmin ? '/sms_admin/login' : '/login');
        }
    }
    return res;
};

// Create App
const app = createApp({
    template: `
        <router-view v-slot="{ Component, route }">
            <transition name="fade" mode="out-in">
                <component :is="Component" :key="route.path" />
            </transition>
        </router-view>`
});

// Register Element Plus
app.use(ElementPlus);

// Register all icons
for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component);
}

// Register router
app.use(router);

// Mount
app.mount('#app');
