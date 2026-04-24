// Substitua pelas suas credenciais
const _supabase = supabase.createClient('https://felvojelnhthbrxhsgxj.supabase.co', 'sb_publishable_2PnMmf5jBHPHJ2xQkQFjIw_LVAEmr3f');

const forgotForm = document.getElementById('forgotPasswordForm');

forgotForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('resetEmail').value;
    const btn = document.getElementById('btnReset');

    btn.disabled = true;
    btn.innerText = "Enviando...";

    const { error } = await _supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'http://localhost:3000/front/Login/Login.html',
    });

    if (error) {
        alert("Erro: " + error.message);
        btn.disabled = false;
        btn.innerText = "Enviar Link";
    } else {
        alert("Verifique seu e-mail! Enviamos um link de recuperação.");
    }
});
