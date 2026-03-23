// admin-auth.js - Verifica autenticação antes de exibir o painel

document.addEventListener('DOMContentLoaded', () => {
    const isAdminLogged = sessionStorage.getItem('adminLogged') === 'true';

    if (!isAdminLogged) {
        // Redirecionar para login se não estiver autenticado
        window.location.href = '/admin-login';
    }

    // Setup logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            sessionStorage.removeItem('adminLogged');
            sessionStorage.removeItem('adminUser');
            sessionStorage.removeItem('loginTime');
            window.location.href = '/admin-login';
        });
    }
});
