/**
 * 📝 FUNCIONALIDADES DO CADASTRO
 * Script que gerencia a validação de novos usuários e integração com a API de registro.
 */

document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    const nomeInput = document.getElementById('nome');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const confirmInput = document.getElementById('confirmPassword');
    const togglePassword = document.getElementById('togglePassword');

    // Erros
    const nomeError = document.getElementById('nomeError');
    const emailError = document.getElementById('emailError');
    const passwordError = document.getElementById('passwordError');
    const confirmError = document.getElementById('confirmError');

    // 👁️ Mostrar/Esconder Senha
    togglePassword.addEventListener('click', (e) => {
        e.preventDefault();
        const type = passwordInput.type === 'password' ? 'text' : 'password';
        passwordInput.type = type;
        confirmInput.type = type;
        togglePassword.textContent = type === 'password' ? '👁️' : '👁️‍🗨️';
    });

    // 📤 Submit do Formulário
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const nome = nomeInput.value.trim();
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        const confirm = confirmInput.value;

        // Limpar erros anteriores
        [nomeError, emailError, passwordError, confirmError].forEach(err => err.classList.remove('show'));

        // Validações Básicas
        let hasError = false;

        if (nome.length < 3) {
            nomeError.textContent = 'Nome deve ter pelo menos 3 caracteres';
            nomeError.classList.add('show');
            hasError = true;
        }

        if (!validateEmail(email)) {
            emailError.textContent = 'Insira um email válido';
            emailError.classList.add('show');
            hasError = true;
        }

        if (password.length < 6) {
            passwordError.textContent = 'A senha deve ter pelo menos 6 caracteres';
            passwordError.classList.add('show');
            hasError = true;
        }

        if (password !== confirm) {
            confirmError.textContent = 'As senhas não coincidem';
            confirmError.classList.add('show');
            hasError = true;
        }

        if (hasError) return;

        // 🔗 INTEGRAÇÃO COM A API DO SUPABASE
        showNotification('Criando sua conta...', 'info');

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, email, password })
            });

            const result = await response.json();

            if (result.success) {
                showNotification('Conta criada! Verifique seu email para confirmar.', 'success');
                console.log('Sucesso:', result.message);
                
                // Redireciona para o login após 2 segundos
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2500);
            } else {
                showNotification(result.message || 'Erro ao criar conta', 'error');
                console.error('Erro retornado:', result.message);
            }
        } catch (error) {
            console.error('Erro de conexão:', error);
            showNotification('Erro de conexão com o servidor', 'error');
        }
    });

    // Funções Auxiliares
    function validateEmail(email) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    }

    function showNotification(message, type = 'info') {
        const notification = document.createElement('div');
        notification.className = 'toast-notification';
        notification.style.cssText = `
            position: fixed; top: 20px; right: 20px; padding: 16px 24px;
            border-radius: 8px; font-weight: 500; z-index: 9999;
            animation: slideIn 0.3s ease; color: white;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#ff6b6b' : '#2196f3'};
        `;
        notification.textContent = message;
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
});
