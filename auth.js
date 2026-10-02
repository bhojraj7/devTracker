// ===== Auth Functions =====

// Check if we're on the login page or main page
const isLoginPage = window.location.pathname.includes('login.html');

function isGuestMode() {
    return sessionStorage.getItem('guestMode') === 'true';
}

// ===== Login Page Logic =====
if (isLoginPage) {
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const tabLogin = document.getElementById('tab-login');
    const tabSignup = document.getElementById('tab-signup');
    const loginTab = document.getElementById('login-tab');
    const signupTab = document.getElementById('signup-tab');
    const guestBtn = document.getElementById('guest-btn');
    const authError = document.getElementById('auth-error');

    // Tab switching
    tabLogin.addEventListener('click', function () {
        tabLogin.classList.add('active');
        tabSignup.classList.remove('active');
        loginTab.classList.remove('hidden');
        signupTab.classList.add('hidden');
        authError.classList.add('hidden');
    });

    tabSignup.addEventListener('click', function () {
        tabSignup.classList.add('active');
        tabLogin.classList.remove('active');
        signupTab.classList.remove('hidden');
        loginTab.classList.add('hidden');
        authError.classList.add('hidden');
    });

    function showError(msg) {
        authError.textContent = msg;
        authError.classList.remove('hidden');
    }

    if (!auth) {
        showError('Account login is not configured yet. Continue as a guest or add your Firebase Web App config.');
    }

    // Login
    loginForm.addEventListener('submit', function (e) {
        e.preventDefault();

        if (!auth) {
            showError('Account login is not configured yet. Add your Firebase Web App config first.');
            return;
        }

        const email = document.getElementById('login-email').value.trim();
        const password = document.getElementById('login-password').value;

        authError.classList.add('hidden');

        auth.signInWithEmailAndPassword(email, password)
            .then(() => {
                sessionStorage.removeItem('guestMode');
                window.location.href = 'index.html';
            })
            .catch(err => {
                showError(getErrorMessage(err.code));
            });
    });

    // Sign Up
    signupForm.addEventListener('submit', function (e) {
        e.preventDefault();

        if (!auth || !db) {
            showError('Account signup is not configured yet. Add your Firebase Web App config first.');
            return;
        }

        const name = document.getElementById('signup-name').value.trim();
        const email = document.getElementById('signup-email').value.trim();
        const password = document.getElementById('signup-password').value;
        const confirm = document.getElementById('signup-confirm').value;

        authError.classList.add('hidden');

        if (password !== confirm) {
            showError('Passwords do not match.');
            return;
        }

        if (password.length < 6) {
            showError('Password must be at least 6 characters.');
            return;
        }

        auth.createUserWithEmailAndPassword(email, password)
            .then(cred => {
                return cred.user.updateProfile({ displayName: name }).then(() => {
                    return db.collection('users').doc(cred.user.uid).set({
                        name: name,
                        email: email,
                        createdAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                });
            })
            .then(() => {
                sessionStorage.removeItem('guestMode');
                window.location.href = 'index.html';
            })
            .catch(err => {
                showError(getErrorMessage(err.code));
            });
    });

    // Guest mode
    guestBtn.addEventListener('click', function () {
        sessionStorage.setItem('guestMode', 'true');
        window.location.href = 'index.html';
    });

    // If already logged in, redirect to main page
    if (auth) {
        auth.onAuthStateChanged(user => {
            if (user && !isGuestMode()) {
                window.location.href = 'index.html';
            }
        });
    }

    // Theme toggle on login page
    const themeToggleLogin = document.getElementById('theme-toggle');
    const toggleIconLogin = document.getElementById('toggle-icon');
    if (themeToggleLogin) {
        const saved = localStorage.getItem('theme') || 'dark';
        if (saved === 'light') {
            document.body.classList.add('light');
            toggleIconLogin.textContent = '🌙';
        }
        themeToggleLogin.addEventListener('click', function () {
            const isLight = document.body.classList.contains('light');
            const newTheme = isLight ? 'dark' : 'light';
            localStorage.setItem('theme', newTheme);
            if (newTheme === 'light') {
                document.body.classList.add('light');
                toggleIconLogin.textContent = '🌙';
            } else {
                document.body.classList.remove('light');
                toggleIconLogin.textContent = '☀️';
            }
        });
    }
}

// ===== Main Page Auth Guard =====
if (!isLoginPage && auth) {
    auth.onAuthStateChanged(user => {
        if (!user && !isGuestMode()) {
            // Not logged in and not guest — redirect to login
            window.location.href = 'login.html';
        } else {
            // Show appropriate UI
            const guestBanner = document.getElementById('guest-banner');
            const navUser = document.getElementById('nav-user-info');
            const logoutBtn = document.getElementById('logout-btn');

            if (user && !isGuestMode()) {
                // Logged in user
                if (guestBanner) guestBanner.classList.add('hidden');
                if (navUser) navUser.textContent = user.displayName || user.email;
                if (logoutBtn) logoutBtn.classList.remove('hidden');
            } else {
                // Guest
                if (guestBanner) guestBanner.classList.remove('hidden');
                if (navUser) navUser.textContent = 'Guest';
                if (logoutBtn) logoutBtn.classList.remove('hidden');
            }

            // Trigger data load after auth is resolved
            if (typeof initApp === 'function') {
                initApp(user && !isGuestMode() ? user : null);
            }
        }
    });
}

if (!isLoginPage && !auth && isGuestMode() && typeof initApp === 'function') {
    const guestBanner = document.getElementById('guest-banner');
    const navUser = document.getElementById('nav-user-info');
    const logoutBtn = document.getElementById('logout-btn');

    if (guestBanner) guestBanner.classList.remove('hidden');
    if (navUser) navUser.textContent = 'Guest';
    if (logoutBtn) logoutBtn.classList.remove('hidden');
    initApp(null);
}

// Logout
function handleLogout() {
    if (!auth) {
        sessionStorage.removeItem('guestMode');
        window.location.href = 'login.html';
        return;
    }

    auth.signOut().then(() => {
        sessionStorage.removeItem('guestMode');
        window.location.href = 'login.html';
    });
}

// ===== Friendly Error Messages =====
function getErrorMessage(code) {
    switch (code) {
        case 'auth/user-not-found': return 'No account found with this email.';
        case 'auth/wrong-password': return 'Incorrect password. Try again.';
        case 'auth/email-already-in-use': return 'This email is already registered. Try logging in.';
        case 'auth/weak-password': return 'Password must be at least 6 characters.';
        case 'auth/invalid-email': return 'Please enter a valid email address.';
        case 'auth/too-many-requests': return 'Too many attempts. Please try again later.';
        default: return 'Something went wrong. Please try again.';
    }
}
