// navbar-auth.js - Gerencia autenticação e exibe/oculta botões de navegação
document.addEventListener('DOMContentLoaded', () => {
    const isAdminLogged = sessionStorage.getItem('adminLogged') === 'true';
    const isUserLogged = sessionStorage.getItem('userId') !== null;
    
    const adminBtn = document.getElementById('adminBtn');
    const logoutBtn = document.getElementById('logoutBtn');

    // Lógica do Botão Administrativo
    if (adminBtn) {
        adminBtn.style.display = isAdminLogged ? 'flex' : 'none';
        adminBtn.addEventListener('click', () => {
            window.location.href = '/admin';
        });
    }

    // Lógica do Botão de Sair (Logout)
    if (logoutBtn) {
        // Exibe o botão se houver alguém logado (Admin ou Usuário comum)
        logoutBtn.style.display = (isAdminLogged || isUserLogged) ? 'flex' : 'none';

        logoutBtn.addEventListener('click', () => {
            // Limpa todos os dados de sessão
            sessionStorage.clear();
            
            // Opcional: Limpar dados específicos do LocalStorage se necessário
            // localStorage.removeItem('cart'); 

            // Feedback visual e redirecionamento
            alert("Sessão encerrada com sucesso!");
            window.location.href = '/';
        });
    }
});
