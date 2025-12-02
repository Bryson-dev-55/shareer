// Global variables
let currentSessionId = null;
let terminalExpanded = false;
let welcomeInterval;
let currentUser = null;

// ==================== AUTHENTICATION SYSTEM ====================

// User storage (in a real app, this would be on a server)
const users = JSON.parse(localStorage.getItem('spamshare_users')) || [];
const sessions = JSON.parse(localStorage.getItem('spamshare_sessions')) || {};

// Initialize default admin user if none exists
if (users.length === 0) {
    const defaultUser = {
        id: generateId(),
        firstName: 'Admin',
        lastName: 'User',
        username: 'admin',
        email: 'admin@spamshare.com',
        password: hashPassword('admin123'), // In real app, use proper hashing
        plan: 'premium',
        createdAt: new Date().toISOString(),
        lastLogin: null,
        shareStats: {
            totalShares: 0,
            successfulShares: 0,
            failedShares: 0,
            activeSessions: 0
        }
    };
    users.push(defaultUser);
    localStorage.setItem('spamshare_users', JSON.stringify(users));
}

// Authentication functions
function generateId() {
    return Math.random().toString(36).substr(2, 9);
}

function hashPassword(password) {
    // Simple hash for demo (use bcrypt in production)
    return btoa(password);
}

function validatePassword(password) {
    // At least 8 characters, 1 number, 1 special character
    const regex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*#?&])[A-Za-z\d@$!%*#?&]{8,}$/;
    return regex.test(password);
}

function validateEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

// Login function
async function login(username, password) {
    const user = users.find(u => 
        u.username === username || u.email === username
    );
    
    if (!user) {
        throw new Error('User not found');
    }
    
    if (user.password !== hashPassword(password)) {
        throw new Error('Invalid password');
    }
    
    // Update last login
    user.lastLogin = new Date().toISOString();
    localStorage.setItem('spamshare_users', JSON.stringify(users));
    
    // Create session
    const sessionId = generateId();
    sessions[sessionId] = {
        userId: user.id,
        createdAt: new Date().toISOString(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days
    };
    localStorage.setItem('spamshare_sessions', JSON.stringify(sessions));
    localStorage.setItem('spamshare_current_session', sessionId);
    
    return { user, sessionId };
}

// Signup function
async function signup(userData) {
    // Validate input
    if (!validateEmail(userData.email)) {
        throw new Error('Invalid email address');
    }
    
    if (!validatePassword(userData.password)) {
        throw new Error('Password must be at least 8 characters with numbers and special characters');
    }
    
    if (userData.password !== userData.confirmPassword) {
        throw new Error('Passwords do not match');
    }
    
    // Check if user exists
    if (users.some(u => u.email === userData.email)) {
        throw new Error('Email already registered');
    }
    
    if (users.some(u => u.username === userData.username)) {
        throw new Error('Username already taken');
    }
    
    // Create new user
    const newUser = {
        id: generateId(),
        firstName: userData.firstName,
        lastName: userData.lastName,
        username: userData.username,
        email: userData.email,
        password: hashPassword(userData.password),
        plan: 'free', // Start with free plan
        createdAt: new Date().toISOString(),
        lastLogin: null,
        shareStats: {
            totalShares: 0,
            successfulShares: 0,
            failedShares: 0,
            activeSessions: 0
        }
    };
    
    users.push(newUser);
    localStorage.setItem('spamshare_users', JSON.stringify(users));
    
    // Auto login after signup
    return login(newUser.email, userData.password);
}

// Logout function
function logout() {
    const sessionId = localStorage.getItem('spamshare_current_session');
    if (sessionId && sessions[sessionId]) {
        delete sessions[sessionId];
        localStorage.setItem('spamshare_sessions', JSON.stringify(sessions));
    }
    
    localStorage.removeItem('spamshare_current_session');
    currentUser = null;
    
    showToast('Logged out successfully', 'success');
    updateUIForAuthState();
    
    // Redirect to home
    setTimeout(() => {
        window.location.reload();
    }, 1000);
}

// Check if user is logged in
function checkAuth() {
    const sessionId = localStorage.getItem('spamshare_current_session');
    
    if (!sessionId || !sessions[sessionId]) {
        return false;
    }
    
    // Check if session expired
    const session = sessions[sessionId];
    if (new Date(session.expiresAt) < new Date()) {
        delete sessions[sessionId];
        localStorage.setItem('spamshare_sessions', JSON.stringify(sessions));
        localStorage.removeItem('spamshare_current_session');
        return false;
    }
    
    // Get user data
    const user = users.find(u => u.id === session.userId);
    if (!user) {
        return false;
    }
    
    currentUser = user;
    return true;
}

// ==================== MODAL FUNCTIONS ====================

function showLogin() {
    closeAllModals();
    document.getElementById('loginModal').classList.remove('hidden');
    setTimeout(() => {
        document.getElementById('loginUsername').focus();
    }, 100);
}

function closeLoginModal() {
    document.getElementById('loginModal').classList.add('hidden');
    document.getElementById('loginForm').reset();
}

function showSignup() {
    closeAllModals();
    document.getElementById('signupModal').classList.remove('hidden');
    setTimeout(() => {
        document.getElementById('signupFirstName').focus();
    }, 100);
}

function closeSignupModal() {
    document.getElementById('signupModal').classList.add('hidden');
    document.getElementById('signupForm').reset();
}

function showForgotPassword() {
    closeAllModals();
    document.getElementById('forgotPasswordModal').classList.remove('hidden');
    setTimeout(() => {
        document.getElementById('forgotEmail').focus();
    }, 100);
}

function closeForgotPasswordModal() {
    document.getElementById('forgotPasswordModal').classList.add('hidden');
    document.getElementById('forgotPasswordForm').reset();
}

function closeAllModals() {
    closeLoginModal();
    closeSignupModal();
    closeForgotPasswordModal();
    closeSessionModal();
}

function togglePassword(fieldId) {
    const field = document.getElementById(fieldId);
    const type = field.type === 'password' ? 'text' : 'password';
    field.type = type;
}

// ==================== UI UPDATE FUNCTIONS ====================

function updateUIForAuthState() {
    const isLoggedIn = checkAuth();
    
    // Show/hide navigation elements
    document.getElementById('navLinks').classList.toggle('hidden', !isLoggedIn);
    document.getElementById('userInfo').classList.toggle('hidden', !isLoggedIn);
    document.getElementById('authButtons').classList.toggle('hidden', isLoggedIn);
    document.getElementById('heroSection').classList.toggle('hidden', isLoggedIn);
    document.getElementById('dashboardSection').classList.toggle('hidden', !isLoggedIn);
    document.getElementById('mobileUserInfo').classList.toggle('hidden', !isLoggedIn);
    document.getElementById('mobileAuthButtons').classList.toggle('hidden', isLoggedIn);
    
    if (isLoggedIn && currentUser) {
        // Update user info
        const avatarText = currentUser.firstName.charAt(0) + currentUser.lastName.charAt(0);
        const fullName = `${currentUser.firstName} ${currentUser.lastName}`;
        
        // Desktop
        document.getElementById('userName').textContent = currentUser.username;
        document.getElementById('userAvatar').textContent = avatarText;
        document.getElementById('dropdownUserName').textContent = fullName;
        document.getElementById('dropdownUserEmail').textContent = currentUser.email;
        document.getElementById('dashboardUserName').textContent = currentUser.firstName;
        
        // Mobile
        document.getElementById('mobileUserName').textContent = currentUser.username;
        document.getElementById('mobileUserEmail').textContent = currentUser.email;
        document.getElementById('mobileUserAvatar').textContent = avatarText;
        
        // Update dashboard stats
        updateUserStats();
        
        // Add terminal welcome
        addTerminalLine(`Welcome back, ${currentUser.username}!`, 'success');
        addTerminalLine(`Plan: ${currentUser.plan.toUpperCase()}`, 'info');
    } else {
        // Clear user info
        document.getElementById('userName').textContent = '';
        document.getElementById('userAvatar').textContent = '';
        document.getElementById('dashboardUserName').textContent = '';
        
        // Add terminal message for guests
        addTerminalLine('Guest mode: Please login to use all features', 'warning');
    }
}

function updateUserStats() {
    if (!currentUser) return;
    
    // Update dashboard with user stats
    document.getElementById('dashboardProcessedCount').textContent = 
        currentUser.shareStats.successfulShares || 0;
    document.getElementById('dashboardActiveCount').textContent = 
        currentUser.shareStats.activeSessions || 0;
    
    const successRate = currentUser.shareStats.totalShares > 0 ? 
        Math.round((currentUser.shareStats.successfulShares / currentUser.shareStats.totalShares) * 100) : 0;
    document.getElementById('dashboardSuccessRate').textContent = `${successRate}%`;
}

// ==================== FORM HANDLERS ====================

// Login form handler
document.getElementById('loginForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!username || !password) {
        showToast('Please fill in all fields', 'error');
        return;
    }
    
    const button = this.querySelector('button[type="submit"]');
    const originalText = button.textContent;
    button.textContent = 'Logging in...';
    button.disabled = true;
    
    try {
        const result = await login(username, password);
        currentUser = result.user;
        
        showToast('Login successful!', 'success');
        closeLoginModal();
        
        // Update UI
        updateUIForAuthState();
        
        // Update user stats in terminal
        addTerminalLine(`User ${currentUser.username} logged in`, 'success');
        addTerminalLine(`Last login: ${new Date(currentUser.lastLogin).toLocaleString()}`, 'info');
        
    } catch (error) {
        showToast(error.message, 'error');
        addTerminalLine(`Login failed: ${error.message}`, 'error');
    } finally {
        button.textContent = originalText;
        button.disabled = false;
    }
});

// Signup form handler
document.getElementById('signupForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const userData = {
        firstName: document.getElementById('signupFirstName').value.trim(),
        lastName: document.getElementById('signupLastName').value.trim(),
        username: document.getElementById('signupUsername').value.trim(),
        email: document.getElementById('signupEmail').value.trim(),
        password: document.getElementById('signupPassword').value,
        confirmPassword: document.getElementById('signupConfirmPassword').value
    };
    
    // Validate all fields
    for (const [key, value] of Object.entries(userData)) {
        if (!value && key !== 'confirmPassword') {
            showToast(`Please fill in ${key.replace('signup', '')}`, 'error');
            return;
        }
    }
    
    const button = this.querySelector('button[type="submit"]');
    const originalText = button.textContent;
    button.textContent = 'Creating account...';
    button.disabled = true;
    
    try {
        const result = await signup(userData);
        currentUser = result.user;
        
        showToast('Account created successfully!', 'success');
        closeSignupModal();
        
        // Update UI
        updateUIForAuthState();
        
        // Welcome message
        addTerminalLine(`Welcome to Spam Share, ${currentUser.firstName}!`, 'success');
        addTerminalLine('Your account has been created successfully', 'info');
        addTerminalLine('Start by creating your first share task', 'info');
        
    } catch (error) {
        showToast(error.message, 'error');
        addTerminalLine(`Signup failed: ${error.message}`, 'error');
    } finally {
        button.textContent = originalText;
        button.disabled = false;
    }
});

// Forgot password form handler
document.getElementById('forgotPasswordForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const email = document.getElementById('forgotEmail').value.trim();
    
    if (!validateEmail(email)) {
        showToast('Please enter a valid email address', 'error');
        return;
    }
    
    // Check if email exists
    const user = users.find(u => u.email === email);
    if (!user) {
        showToast('No account found with this email', 'error');
        return;
    }
    
    const button = this.querySelector('button[type="submit"]');
    const originalText = button.textContent;
    button.textContent = 'Sending...';
    button.disabled = true;
    
    // Simulate sending reset email
    setTimeout(() => {
        showToast('Password reset instructions sent to your email', 'success');
        addTerminalLine(`Password reset requested for: ${email}`, 'info');
        closeForgotPasswordModal();
        
        button.textContent = originalText;
        button.disabled = false;
    }, 1500);
});

// ==================== EXISTING FUNCTIONS (UPDATED) ====================

// Toast notification system (keep existing)
function showToast(message, type = 'info', duration = 5000) {
    // ... (same as before)
}

function removeToast(toastId) {
    // ... (same as before)
}

// Modal functions (keep existing, but add closeAllModals integration)
function openSessionModal(sessionData) {
    // ... (same as before, but check if user is logged in)
    if (!checkAuth()) {
        showToast('Please login to view session details', 'warning');
        showLogin();
        return;
    }
    // ... rest of the function
}

// Terminal management (keep existing)
function addTerminalLine(text, type = 'info') {
    // ... (same as before)
}

function clearTerminal() {
    // ... (same as before)
}

function toggleTerminal() {
    // ... (same as before)
}

// Statistics update function (updated for user-specific stats)
async function updateStatistics() {
    try {
        const response = await fetch('/statistics');
        const data = await response.json();
        
        // Update global stats
        document.getElementById('processed-count').textContent = data.processed || 0;
        document.getElementById('active-count').textContent = data.activeSessions || 0;
        document.getElementById('active-sessions-count').textContent = data.activeSessions || 0;
        document.getElementById('success-rate').textContent = data.successRate ? `${data.successRate}%` : '0%';
        document.getElementById('total-shares').textContent = data.totalShares || 0;
        
        // Update user stats if logged in
        if (currentUser) {
            currentUser.shareStats.totalShares = data.totalShares || 0;
            currentUser.shareStats.activeSessions = data.activeSessions || 0;
            updateUserStats();
        }
    } catch (error) {
        console.error('Failed to fetch statistics:', error);
        addTerminalLine('Error fetching statistics', 'error');
    }
}

// Form submission (updated for user tracking)
async function submitForm(event) {
    if (event) event.preventDefault();
    
    // Check if user is logged in
    if (!checkAuth()) {
        showToast('Please login to submit share tasks', 'warning');
        showLogin();
        return;
    }
    
    // ... rest of the function (same as before)
    
    // After successful submission, update user stats
    if (data.status === 200 && currentUser) {
        currentUser.shareStats.activeSessions += 1;
        localStorage.setItem('spamshare_users', JSON.stringify(users));
        updateUserStats();
    }
}

// Helper functions (keep existing)
function clearField(fieldId) {
    // ... (same as before)
}

function showActiveSessions() {
    // ... (same as before, but check auth)
    if (!checkAuth()) {
        showToast('Please login to view sessions', 'warning');
        return;
    }
    // ... rest of the function
}

// Process monitoring (keep existing)
async function linkOfProcessing() {
    // ... (same as before)
}

// Terminal clock (keep existing)
function updateTerminalTime() {
    // ... (same as before)
}

// Initialize (updated for auth check)
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication status
    checkAuth();
    updateUIForAuthState();
    
    // Initialize welcome message
    initWelcomeMessage();
    
    // Initialize terminal
    setTimeout(() => {
        if (currentUser) {
            addTerminalLine(`Welcome back, ${currentUser.username}!`, 'success');
            addTerminalLine(`Plan: ${currentUser.plan.toUpperCase()}`, 'info');
        } else {
            addTerminalLine('Guest mode: Login for full features', 'warning');
        }
        
        addTerminalLine('System initialized', 'success');
        addTerminalLine('Spam Share v2.0 ready', 'system');
        addTerminalLine('Waiting for commands...', 'info');
        
        // Start process monitoring
        linkOfProcessing();
        
        // Start statistics update
        updateStatistics();
        setInterval(updateStatistics, 3000);
        
        // Start terminal clock
        updateTerminalTime();
        setInterval(updateTerminalTime, 1000);
        
    }, 1000);
    
    // Mobile menu toggle
    document.getElementById('mobileMenuButton').addEventListener('click', function() {
        const menu = document.getElementById('mobileMenu');
        menu.classList.toggle('hidden');
        this.innerHTML = menu.classList.contains('hidden') ? 
            '<i class="fas fa-bars text-xl"></i>' : 
            '<i class="fas fa-times text-xl"></i>';
    });
    
    // Close mobile menu when clicking outside
    document.addEventListener('click', function(e) {
        if (!e.target.closest('#mobileMenu') && !e.target.closest('#mobileMenuButton')) {
            document.getElementById('mobileMenu').classList.add('hidden');
            document.getElementById('mobileMenuButton').innerHTML = '<i class="fas fa-bars text-xl"></i>';
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Ctrl + L to login
        if (e.ctrlKey && e.key === 'l') {
            e.preventDefault();
            if (!currentUser) showLogin();
        }
        
        // Escape to close modals
        if (e.key === 'Escape') {
            closeAllModals();
        }
        
        // Other shortcuts (same as before)
    });
    
    // Auto-logout after 24 hours (for demo purposes)
    setInterval(() => {
        const sessionId = localStorage.getItem('spamshare_current_session');
        if (sessionId && sessions[sessionId]) {
            const session = sessions[sessionId];
            if (new Date(session.expiresAt) < new Date()) {
                showToast('Session expired. Please login again.', 'warning');
                logout();
            }
        }
    }, 60 * 60 * 1000); // Check every hour
});

// Initialize welcome message function
function initWelcomeMessage() {
    const welcomeMessages = [
        "Welcome to Spam Share",
        "Automation Tool Ready",
        "System Initialized",
        "Server Connected",
        "Ready for Operation",
        "Powered by Bryson"
    ];

    let currentWelcomeIndex = 0;
    let isDeleting = false;
    let currentText = '';
    let charIndex = 0;
    const welcomeElement = document.getElementById('welcome-message');
    const typingSpeed = 100;
    const deletingSpeed = 50;
    const pauseTime = 3000;

    function typeWelcomeMessage() {
        const fullText = welcomeMessages[currentWelcomeIndex];
        
        if (isDeleting) {
            currentText = fullText.substring(0, charIndex - 1);
            charIndex--;
            welcomeElement.textContent = currentText;
            
            if (charIndex > 0) {
                setTimeout(typeWelcomeMessage, deletingSpeed);
            } else {
                isDeleting = false;
                currentWelcomeIndex = (currentWelcomeIndex + 1) % welcomeMessages.length;
                setTimeout(typeWelcomeMessage, 500);
            }
        } else {
            currentText = fullText.substring(0, charIndex + 1);
            charIndex++;
            welcomeElement.textContent = currentText;
            
            if (charIndex < fullText.length) {
                setTimeout(typeWelcomeMessage, typingSpeed);
            } else {
                setTimeout(() => {
                    isDeleting = true;
                    setTimeout(typeWelcomeMessage, 500);
                }, pauseTime);
            }
        }
        
        if (charIndex === fullText.length && !isDeleting) {
            welcomeElement.style.borderRightColor = '#a855f7';
        } else {
            welcomeElement.style.borderRightColor = 'transparent';
        }
    }

    // Start typing effect
    setTimeout(() => {
        typeWelcomeMessage();
    }, 1000);
}

// Quick share function (optional)
function showQuickShare() {
    showToast('Quick share feature coming soon!', 'info');
}

// Keep other existing functions (sessionModal, stopSession, etc.) as they were
// ... (rest of your existing functions)