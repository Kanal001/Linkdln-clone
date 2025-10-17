document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.querySelector('.login-form');
    
    loginForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const email = this.querySelector('input[type="email"]').value;
        const password = this.querySelector('input[type="password"]').value;
        const companyId = this.querySelector('input[type="text"]').value;
        
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: email,
                    password: password,
                    userType: 'employer'
                })
            });

            const data = await response.json();

            if (response.ok) {
                // ✅ Use the same keys as post-job.html expects
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('userType', 'employer');
                localStorage.setItem('user', JSON.stringify(data.user));

                // ✅ Redirect to employer dashboard
                window.location.href = 'employer-home.html';
            } else {
                alert(data.error || 'Login failed');
            }
        } catch (error) {
            console.error('Error:', error);
            alert('Login failed. Please try again.');
        }
    });

    window.togglePassword = function(element) {
        const input = element.previousElementSibling;
        input.type = input.type === 'password' ? 'text' : 'password';
    }
});
