document.addEventListener('DOMContentLoaded', () => {
    // --- ELEMENTOS UI ---
    const signUpButton = document.getElementById('signUp');
    const signInButton = document.getElementById('signIn');
    const container = document.getElementById('container');
    const toast = document.getElementById('toast');

    // --- ELEMENTOS FORMS ---
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');

    // --- TRANSIÇÃO DE OVERLAY ---
    signUpButton.addEventListener('click', () => {
        container.classList.add("right-panel-active");
    });

    signInButton.addEventListener('click', () => {
        container.classList.remove("right-panel-active");
    });

    // --- LÓGICA DE LOGIN ---
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = loginForm.querySelector('input[type="email"]').value;
        const password = loginForm.querySelector('input[type="password"]').value;

        showToast("Autenticando...");

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const result = await response.json();

            if (result.success) {
                sessionStorage.setItem('userEmail', result.user.email);
                sessionStorage.setItem('userId', result.user.id);
                
                showToast("Sucesso! Redirecionando...", "#4caf50");
                
                // Redirecionamento especial para admin ou usuário comum
                setTimeout(() => {
                    if (email === 'admin@biblioteca.com') {
                        sessionStorage.setItem('adminLogged', 'true');
                        window.location.href = '/admin';
                    } else {
                        window.location.href = '../inicial/i.html';
                    }
                }, 1000);
            } else {
                showToast(result.message, "#ff6b6b");
            }
        } catch (error) {
            showToast("Erro de conexão com o servidor.", "#ff6b6b");
        }
    });

    // --- LÓGICA DE CADASTRO ---
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nome = document.getElementById('regNome').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;

        if (password.length < 6) {
            showToast("A senha deve ter pelo menos 6 caracteres.", "#ff6b6b");
            return;
        }

        showToast("Criando conta...");

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ nome, email, password })
            });

            const result = await response.json();

            if (result.success) {
                showToast("Conta criada! Redirecionando para login...", "#4caf50");
                
                // Retorna ao painel de login após cadastro bem-sucedido
                setTimeout(() => {
                    signInButton.click();
                }, 1500);
            } else {
                showToast(result.message, "#ff6b6b");
            }
        } catch (error) {
            showToast("Erro ao processar cadastro.", "#ff6b6b");
        }
    });

    // --- TOGGLE PASSWORD VISIBILITY ---
    document.querySelectorAll('.toggle-password').forEach(button => {
        button.addEventListener('click', function() {
            const targetId = this.getAttribute('data-target');
            const passwordInput = document.getElementById(targetId);

            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                this.textContent = '👁️‍🗨️';
            } else {
                passwordInput.type = 'password';
                this.textContent = '👁️';
            }
        });
    });

    // --- UTILITÁRIOS ---
    function showToast(message, color = "#333") {
        toast.textContent = message;
        toast.style.backgroundColor = color;
        toast.className = "toast show";
        setTimeout(() => { toast.className = toast.className.replace("show", ""); }, 3000);
    }
});