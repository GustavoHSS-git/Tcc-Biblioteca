// navbar-auth.js - Gerencia autenticação e exibe/oculta botão Admin

document.addEventListener('DOMContentLoaded', () => {
    const isAdminLogged = sessionStorage.getItem('adminLogged') === 'true';
    const adminBtn = document.getElementById('adminBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    if (adminBtn) {
        if (isAdminLogged) {
            adminBtn.style.display = 'flex';
        } else {
            adminBtn.style.display = 'none';
        }

        adminBtn.addEventListener('click', () => {
            window.location.href = '/admin';
        });
    }

    if (logoutBtn) {
        if (isAdminLogged) {
            logoutBtn.style.display = 'flex';
        } else {
            logoutBtn.style.display = 'none';
        }

        logoutBtn.addEventListener('click', () => {
            sessionStorage.removeItem('adminLogged');
            sessionStorage.removeItem('adminUser');
            sessionStorage.removeItem('loginTime');
            window.location.href = '/';
        });
    }
});
