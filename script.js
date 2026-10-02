// ===== Progress Persistence =====
const DEFAULT_WEEKLY_GOAL = 14;
let activeUser = null;
let progressState = {
    entries: [],
    weeklyGoal: DEFAULT_WEEKLY_GOAL
};
let appInitialized = false;
let initializationId = 0;
let progressWriteQueue = Promise.resolve();
let persistenceStatusTimer;

function getProgressRef() {
    return db.collection('users').doc(activeUser.uid).collection('progress').doc('data');
}

function showPersistenceStatus(message, isError = false) {
    const status = document.getElementById('progress-status');
    if (!status) return;

    status.textContent = message;
    status.classList.toggle('error', isError);
    status.classList.remove('hidden');
    clearTimeout(persistenceStatusTimer);

    if (!isError) {
        persistenceStatusTimer = setTimeout(() => status.classList.add('hidden'), 2500);
    }
}

function loadGuestProgress() {
    const storedEntries = JSON.parse(localStorage.getItem('studyEntries') || '[]');
    const storedGoal = parseInt(localStorage.getItem('weeklyGoal'), 10);

    return {
        entries: Array.isArray(storedEntries) ? storedEntries : [],
        weeklyGoal: storedGoal > 0 ? storedGoal : DEFAULT_WEEKLY_GOAL
    };
}

function getEntries() {
    return progressState.entries;
}

function saveEntries(entries) {
    progressState.entries = entries;
    return persistProgress();
}

function getWeeklyGoal() {
    return progressState.weeklyGoal;
}

function setWeeklyGoal(hours) {
    progressState.weeklyGoal = hours;
    return persistProgress();
}

function persistProgress() {
    if (!appInitialized) return Promise.resolve(false);

    if (!activeUser) {
        localStorage.setItem('studyEntries', JSON.stringify(progressState.entries));
        localStorage.setItem('weeklyGoal', progressState.weeklyGoal.toString());
        showPersistenceStatus('Saved on this device.');
        return Promise.resolve(true);
    }

    const progress = {
        entries: progressState.entries,
        weeklyGoal: progressState.weeklyGoal,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    const progressRef = getProgressRef();

    progressWriteQueue = progressWriteQueue
        .then(() => progressRef.set(progress))
        .then(() => {
            showPersistenceStatus('Saved to your account.');
            return true;
        })
        .catch(error => {
            console.error('Unable to save progress:', error);
            showPersistenceStatus('Could not save your latest change. Please try again.', true);
            return false;
        });

    return progressWriteQueue;
}

async function initApp(user) {
    const currentInitializationId = ++initializationId;
    activeUser = user || null;
    appInitialized = false;
    progressWriteQueue = Promise.resolve();
    progressState = { entries: [], weeklyGoal: DEFAULT_WEEKLY_GOAL };

    try {
        if (activeUser) {
            const snapshot = await getProgressRef().get();
            if (currentInitializationId !== initializationId) return;

            const data = snapshot.exists ? snapshot.data() : {};
            const weeklyGoal = Number(data.weeklyGoal);
            progressState = {
                entries: Array.isArray(data.entries) ? data.entries : [],
                weeklyGoal: weeklyGoal > 0 ? weeklyGoal : DEFAULT_WEEKLY_GOAL
            };
        } else {
            progressState = loadGuestProgress();
        }

        appInitialized = true;
        setDefaultDate();
        showRandomQuote();
        renderAll();
    } catch (error) {
        console.error('Unable to load progress:', error);
        showPersistenceStatus('Could not load your progress. Refresh and try again.', true);
    }
}

// ===== Data Helpers =====
function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
}

function formatDate(dateStr) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', options);
}

// ===== DOM Elements =====
const studyForm = document.getElementById('study-form');
const dateInput = document.getElementById('date');
const topicInput = document.getElementById('topic');
const hoursInput = document.getElementById('hours');
const notesInput = document.getElementById('notes');
const logBody = document.getElementById('log-body');
const emptyMsg = document.getElementById('empty-msg');
const logTable = document.getElementById('log-table');

// Stats
const statTotalHours = document.getElementById('stat-total-hours');
const statTotalSessions = document.getElementById('stat-total-sessions');
const statAvgHours = document.getElementById('stat-avg-hours');
const statBestTopic = document.getElementById('stat-best-topic');
const statStreak = document.getElementById('stat-streak');
const streakFire = document.getElementById('streak-fire');
const statLevel = document.getElementById('stat-level');
const statXp = document.getElementById('stat-xp');
const xpBarFill = document.getElementById('xp-bar-fill');

// Goal
const weeklyGoalInput = document.getElementById('weekly-goal-input');
const setGoalBtn = document.getElementById('set-goal-btn');
const goalCurrent = document.getElementById('goal-current');
const goalTarget = document.getElementById('goal-target');
const goalPercent = document.getElementById('goal-percent');
const goalBarFill = document.getElementById('goal-bar-fill');

// Terminal
const terminalStreak = document.getElementById('terminal-streak');
const terminalHours = document.getElementById('terminal-hours');
const terminalTopic = document.getElementById('terminal-topic');
const navCurrentTopic = document.getElementById('nav-current-topic');

// Hamburger
const hamburger = document.getElementById('hamburger');
const navLinks = document.querySelector('.nav-links');

// ===== Topic Colors =====
const TOPIC_COLORS = {
    'HTML': '#e34c26',
    'CSS': '#264de4',
    'JavaScript': '#f0db4f',
    'React': '#61dafb',
    'Node.js': '#68a063',
    'Git': '#f05032',
    'TypeScript': '#3178c6',
    'Other': '#888888'
};

// ===== 9. Motivational Quotes =====
const QUOTES = [
    { text: "First, solve the problem. Then, write the code.", author: "John Johnson" },
    { text: "Code is like humor. When you have to explain it, it's bad.", author: "Cory House" },
    { text: "The best error message is the one that never shows up.", author: "Thomas Fuchs" },
    { text: "It's not a bug — it's an undocumented feature.", author: "Anonymous" },
    { text: "Simplicity is the soul of efficiency.", author: "Austin Freeman" },
    { text: "Make it work, make it right, make it fast.", author: "Kent Beck" },
    { text: "Any fool can write code that a computer can understand. Good programmers write code that humans can understand.", author: "Martin Fowler" },
    { text: "The only way to learn a new programming language is by writing programs in it.", author: "Dennis Ritchie" },
    { text: "Experience is the name everyone gives to their mistakes.", author: "Oscar Wilde" },
    { text: "In order to be irreplaceable, one must always be different.", author: "Coco Chanel" },
    { text: "Java is to JavaScript what car is to carpet.", author: "Chris Heilmann" },
    { text: "Deleted code is debugged code.", author: "Jeff Sickel" },
    { text: "The most disastrous thing that you can ever learn is your first programming language.", author: "Alan Kay" },
    { text: "Consistency is what transforms average into excellence.", author: "Anonymous" },
    { text: "Small daily improvements are the key to staggering long-term results.", author: "Anonymous" },
    { text: "Don't comment bad code — rewrite it.", author: "Brian Kernighan" },
    { text: "Programming isn't about what you know; it's about what you can figure out.", author: "Chris Pine" },
];

function showRandomQuote() {
    const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
    document.getElementById('quote-text').textContent = `"${q.text}"`;
    document.getElementById('quote-author').textContent = `— ${q.author}`;
}

// ===== 10. Badges =====
const BADGES = [
    { id: 'first-steps', name: 'First Steps', icon: '🚀', desc: 'Log your first study session', check: (entries) => entries.length >= 1 },
    { id: 'getting-started', name: 'Getting Started', icon: '📝', desc: 'Log 5 study sessions', check: (entries) => entries.length >= 5 },
    { id: 'dedicated', name: 'Dedicated', icon: '💎', desc: 'Log 20 study sessions', check: (entries) => entries.length >= 20 },
    { id: 'week-warrior', name: 'Week Warrior', icon: '🔥', desc: 'Achieve a 7-day streak', check: (entries, stats) => stats.streak >= 7 },
    { id: 'unstoppable', name: 'Unstoppable', icon: '⚡', desc: 'Achieve a 14-day streak', check: (entries, stats) => stats.streak >= 14 },
    { id: '10-hours', name: '10 Hour Club', icon: '⏰', desc: 'Study for 10 total hours', check: (entries, stats) => stats.totalHours >= 10 },
    { id: '50-hours', name: '50 Hour Club', icon: '🏅', desc: 'Study for 50 total hours', check: (entries, stats) => stats.totalHours >= 50 },
    { id: 'century', name: 'Century', icon: '💯', desc: 'Study for 100 total hours', check: (entries, stats) => stats.totalHours >= 100 },
    { id: 'night-owl', name: 'Night Owl', icon: '🦉', desc: 'Log any session (you showed up!)', check: (entries) => entries.length >= 1 },
    { id: 'polyglot', name: 'Polyglot', icon: '🌐', desc: 'Study 3+ different topics', check: (entries) => { const topics = new Set(entries.map(e => e.topic)); return topics.size >= 3; } },
    { id: 'specialist', name: 'Specialist', icon: '🎯', desc: '20+ hours in one topic', check: (entries) => { const map = {}; entries.forEach(e => { map[e.topic] = (map[e.topic] || 0) + e.hours; }); return Object.values(map).some(h => h >= 20); } },
    { id: 'marathon', name: 'Marathon', icon: '🏃', desc: 'Log a 5+ hour session', check: (entries) => entries.some(e => e.hours >= 5) },
];

// ===== 8. Level / XP System =====
const LEVELS = [
    { title: 'Newbie', minXP: 0 },
    { title: 'Beginner', minXP: 50 },
    { title: 'Learner', minXP: 150 },
    { title: 'Coder', minXP: 300 },
    { title: 'Developer', minXP: 500 },
    { title: 'Pro Dev', minXP: 1000 },
    { title: 'Full Stack Warrior', minXP: 2000 },
];

function getLevel(xp) {
    let current = LEVELS[0];
    let nextLevel = LEVELS[1];
    for (let i = LEVELS.length - 1; i >= 0; i--) {
        if (xp >= LEVELS[i].minXP) {
            current = LEVELS[i];
            nextLevel = LEVELS[i + 1] || null;
            break;
        }
    }
    return { current, nextLevel };
}

// ===== 4. Streak Calculation =====
function calculateStreak(entries) {
    if (entries.length === 0) return 0;

    const uniqueDates = [...new Set(entries.map(e => e.date))].sort().reverse();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const latestDate = new Date(uniqueDates[0] + 'T00:00:00');
    if (latestDate < yesterday) return 0;

    let streak = 1;
    for (let i = 0; i < uniqueDates.length - 1; i++) {
        const current = new Date(uniqueDates[i] + 'T00:00:00');
        const next = new Date(uniqueDates[i + 1] + 'T00:00:00');
        const diffDays = (current - next) / (1000 * 60 * 60 * 24);

        if (diffDays === 1) {
            streak++;
        } else {
            break;
        }
    }
    return streak;
}

// ===== 5. Heatmap =====
function renderHeatmap(entries) {
    const grid = document.getElementById('heatmap-grid');
    const monthsRow = document.getElementById('heatmap-months');
    grid.innerHTML = '';
    monthsRow.innerHTML = '';

    // Build hours-per-date map
    const hoursMap = {};
    entries.forEach(e => {
        hoursMap[e.date] = (hoursMap[e.date] || 0) + e.hours;
    });

    // Generate last 52 weeks (364 days)
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Start from the most recent Sunday going back 52 weeks
    const dayOfWeek = today.getDay(); // 0=Sun
    const endDate = new Date(today);
    const startDate = new Date(today);
    startDate.setDate(startDate.getDate() - 363 - dayOfWeek);

    // Track months for labels
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    let lastMonth = -1;
    let weekIndex = 0;
    const monthPositions = [];

    const current = new Date(startDate);
    while (current <= endDate) {
        const dateStr = current.toISOString().split('T')[0];
        const hours = hoursMap[dateStr] || 0;

        let level = 'level-0';
        if (hours >= 4) level = 'level-4';
        else if (hours >= 2.5) level = 'level-3';
        else if (hours >= 1.5) level = 'level-2';
        else if (hours >= 0.5) level = 'level-1';

        const cell = document.createElement('div');
        cell.className = `heatmap-cell ${level}`;

        const dayName = current.toLocaleDateString('en-US', { weekday: 'short' });
        const dateLabel = current.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
        cell.title = hours > 0 ? `${hours}h on ${dayName}, ${dateLabel}` : `No study on ${dayName}, ${dateLabel}`;

        grid.appendChild(cell);

        // Track month changes (on first day of each week — Sunday, index 0 of week)
        if (current.getDay() === 0) {
            const month = current.getMonth();
            if (month !== lastMonth) {
                monthPositions.push({ month, weekIndex });
                lastMonth = month;
            }
            weekIndex++;
        }

        current.setDate(current.getDate() + 1);
    }

    // Render month labels
    const totalWeeks = weekIndex;
    monthPositions.forEach(mp => {
        const label = document.createElement('span');
        label.className = 'heatmap-month-label';
        label.textContent = monthNames[mp.month];
        // Position based on week index
        const leftPercent = (mp.weekIndex / totalWeeks) * 100;
        label.style.position = 'absolute';
        label.style.left = leftPercent + '%';
        monthsRow.appendChild(label);
    });
    monthsRow.style.position = 'relative';
    monthsRow.style.height = '18px';
}

// ===== 7. Topic Bars =====
function renderTopicBars(entries) {
    const container = document.getElementById('topic-bars-container');
    container.innerHTML = '';

    if (entries.length === 0) {
        container.innerHTML = '<p class="empty-state">No data yet. Log a session to see your topic breakdown.</p>';
        return;
    }

    // Group by topic
    const topicHours = {};
    entries.forEach(e => {
        topicHours[e.topic] = (topicHours[e.topic] || 0) + e.hours;
    });

    // Sort by most hours
    const sorted = Object.entries(topicHours).sort((a, b) => b[1] - a[1]);
    const maxHours = sorted[0][1];

    sorted.forEach(([topic, hours]) => {
        const row = document.createElement('div');
        row.className = 'topic-bar-row';

        const widthPercent = (hours / maxHours) * 100;
        const color = TOPIC_COLORS[topic] || '#888';

        row.innerHTML = `
            <span class="topic-bar-label">${escapeHTML(topic)}</span>
            <div class="topic-bar-track">
                <div class="topic-bar-fill" style="width: ${widthPercent}%; background-color: ${color};"></div>
            </div>
            <span class="topic-bar-hours">${hours}h</span>
        `;

        container.appendChild(row);
    });
}

// ===== 6. Weekly Goal =====
function updateWeeklyGoal(entries) {
    const goal = getWeeklyGoal();
    weeklyGoalInput.value = goal;
    goalTarget.textContent = goal;

    // Get current week (Monday to Sunday)
    const today = new Date();
    const dayOfWeek = today.getDay();
    const monday = new Date(today);
    monday.setDate(today.getDate() - ((dayOfWeek + 6) % 7));
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    let weeklyHours = 0;
    entries.forEach(e => {
        const entryDate = new Date(e.date + 'T00:00:00');
        if (entryDate >= monday && entryDate <= sunday) {
            weeklyHours += e.hours;
        }
    });

    goalCurrent.textContent = weeklyHours;
    const percent = Math.min(Math.round((weeklyHours / goal) * 100), 100);
    goalPercent.textContent = percent + '%';
    goalBarFill.style.width = percent + '%';
}

// ===== Render Badges =====
function renderBadges(entries, stats) {
    const grid = document.getElementById('badges-grid');
    grid.innerHTML = '';

    BADGES.forEach(badge => {
        const unlocked = badge.check(entries, stats);
        const card = document.createElement('div');
        card.className = `badge-card ${unlocked ? 'unlocked' : 'locked'}`;
        card.innerHTML = `
            <span class="badge-icon">${badge.icon}</span>
            <div class="badge-name">${badge.name}</div>
            <div class="badge-desc">${badge.desc}</div>
        `;
        grid.appendChild(card);
    });
}

// ===== Render Table =====
function renderTable(entries) {
    logBody.innerHTML = '';

    if (entries.length === 0) {
        emptyMsg.classList.remove('hidden');
        logTable.classList.add('hidden');
        return;
    }

    emptyMsg.classList.add('hidden');
    logTable.classList.remove('hidden');

    // Sort newest first
    const sorted = [...entries].sort((a, b) => new Date(b.date) - new Date(a.date) || b.id - a.id);

    sorted.forEach(entry => {
        const row = document.createElement('tr');
        const notesPreview = entry.notes && entry.notes.length > 40
            ? entry.notes.substring(0, 40) + '...'
            : (entry.notes || '—');
        const xp = Math.round(entry.hours * 10);

        row.innerHTML = `
            <td>${formatDate(entry.date)}</td>
            <td>${escapeHTML(entry.topic)}</td>
            <td>${entry.hours}h</td>
            <td title="${escapeHTML(entry.notes)}">${escapeHTML(notesPreview)}</td>
            <td><span class="t-green">+${xp} XP</span></td>
            <td>
                <button class="btn-edit" data-id="${entry.id}">Edit</button>
                <button class="btn-delete" data-id="${entry.id}">Del</button>
            </td>
        `;
        logBody.appendChild(row);
    });
}

// ===== Update Stats =====
function updateStats(entries) {
    const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);
    const totalSessions = entries.length;
    const uniqueDays = new Set(entries.map(e => e.date)).size;
    const avgHours = uniqueDays > 0 ? (totalHours / uniqueDays).toFixed(1) : '0';

    // Most studied topic
    const topicMap = {};
    entries.forEach(e => { topicMap[e.topic] = (topicMap[e.topic] || 0) + e.hours; });
    let bestTopic = '—';
    let maxH = 0;
    for (const [topic, hours] of Object.entries(topicMap)) {
        if (hours > maxH) { maxH = hours; bestTopic = topic; }
    }

    statTotalHours.textContent = totalHours;
    statTotalSessions.textContent = totalSessions;
    statAvgHours.textContent = avgHours;
    statBestTopic.textContent = bestTopic;

    // Streak
    const streak = calculateStreak(entries);
    statStreak.textContent = streak;

    if (streak === 0) streakFire.textContent = '';
    else if (streak < 4) streakFire.textContent = '🔥';
    else if (streak < 8) streakFire.textContent = '🔥🔥';
    else streakFire.textContent = '🔥🔥🔥';

    // XP & Level
    const xp = Math.round(totalHours * 10);
    const { current: lvl, nextLevel } = getLevel(xp);
    statLevel.textContent = lvl.title;
    statXp.textContent = xp;

    if (nextLevel) {
        const range = nextLevel.minXP - lvl.minXP;
        const progress = xp - lvl.minXP;
        xpBarFill.style.width = Math.min((progress / range) * 100, 100) + '%';
    } else {
        xpBarFill.style.width = '100%';
    }

    // Terminal updates
    terminalHours.textContent = totalHours;
    terminalStreak.textContent = streak + ' days';
    terminalTopic.textContent = bestTopic !== '—' ? bestTopic : 'JavaScript';

    // Nav current topic (most recent entry's topic)
    if (entries.length > 0) {
        const sorted = [...entries].sort((a, b) => new Date(b.date) - new Date(a.date) || b.id - a.id);
        navCurrentTopic.textContent = sorted[0].topic;
    }

    return { totalHours, totalSessions, streak, bestTopic };
}

// ===== Master Render =====
function renderAll() {
    const entries = getEntries();
    const stats = updateStats(entries);
    renderTable(entries);
    renderHeatmap(entries);
    renderTopicBars(entries);
    updateWeeklyGoal(entries);
    renderBadges(entries, stats);
}

// ===== Update navbar + terminal when form fields change =====
topicInput.addEventListener('change', function () {
    if (topicInput.value) {
        navCurrentTopic.textContent = topicInput.value;
        terminalTopic.textContent = topicInput.value;
    }
});

hoursInput.addEventListener('input', function () {
    if (hoursInput.value) {
        const entries = getEntries();
        const totalHours = entries.reduce((sum, e) => sum + e.hours, 0);
        terminalHours.textContent = totalHours + ' + ' + hoursInput.value;
    }
});

dateInput.addEventListener('change', function () {
    // Recalculate what streak would be if this date is logged
    if (dateInput.value) {
        const entries = getEntries();
        const tempEntries = [...entries, { date: dateInput.value, hours: 0 }];
        const streak = calculateStreak(tempEntries);
        terminalStreak.textContent = streak + ' days';
    }
});

// ===== Form Submit (Feature 1) =====
studyForm.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!appInitialized) return;

    const entry = {
        id: Date.now(),
        date: dateInput.value,
        topic: topicInput.value,
        hours: parseFloat(hoursInput.value),
        notes: notesInput.value.trim()
    };

    const entries = getEntries();
    entries.push(entry);
    saveEntries(entries);

    studyForm.reset();
    setDefaultDate();
    renderAll();

    // Scroll to stats
    document.getElementById('stats-section').scrollIntoView({ behavior: 'smooth' });
});

// ===== Delete & Edit (Event Delegation) =====
logBody.addEventListener('click', function (e) {
    if (!appInitialized) return;

    const id = Number(e.target.dataset.id);
    if (!id) return;

    if (e.target.classList.contains('btn-delete')) {
        let entries = getEntries();
        entries = entries.filter(entry => entry.id !== id);
        saveEntries(entries);
        renderAll();
    }

    if (e.target.classList.contains('btn-edit')) {
        let entries = getEntries();
        const entry = entries.find(en => en.id === id);
        if (!entry) return;

        // Load into form
        dateInput.value = entry.date;
        topicInput.value = entry.topic;
        hoursInput.value = entry.hours;
        notesInput.value = entry.notes || '';

        // Remove old entry
        entries = entries.filter(en => en.id !== id);
        saveEntries(entries);
        renderAll();

        // Scroll to form
        document.getElementById('log-section').scrollIntoView({ behavior: 'smooth' });
    }
});

// ===== Weekly Goal Button =====
setGoalBtn.addEventListener('click', function () {
    if (!appInitialized) return;

    const val = parseInt(weeklyGoalInput.value);
    if (val && val > 0) {
        setWeeklyGoal(val);
        renderAll();
    }
});

// ===== Hamburger Menu =====
hamburger.addEventListener('click', function () {
    hamburger.classList.toggle('active');
    navLinks.classList.toggle('open');
});

// ===== Nav Links — smooth scroll + active state =====
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function (e) {
        e.preventDefault();

        // Remove active from all
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        this.classList.add('active');

        // Scroll to section
        const targetId = this.getAttribute('href').substring(1);
        const target = document.getElementById(targetId);
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }

        // Close mobile menu
        hamburger.classList.remove('active');
        navLinks.classList.remove('open');
    });
});

// ===== Theme Toggle =====
const themeToggle = document.getElementById('theme-toggle');
const toggleIcon = document.getElementById('toggle-icon');

function applyTheme(theme) {
    if (theme === 'light') {
        document.body.classList.add('light');
        toggleIcon.textContent = '🌙';
    } else {
        document.body.classList.remove('light');
        toggleIcon.textContent = '☀️';
    }
}

// Load saved theme
const savedTheme = localStorage.getItem('theme') || 'dark';
applyTheme(savedTheme);

themeToggle.addEventListener('click', function () {
    const isLight = document.body.classList.contains('light');
    const newTheme = isLight ? 'dark' : 'light';
    localStorage.setItem('theme', newTheme);
    applyTheme(newTheme);
});

// ===== Set Default Date =====
function setDefaultDate() {
    const today = new Date().toISOString().split('T')[0];
    dateInput.value = today;
}

// ===== Init =====
// Data initialization is triggered by auth.js after the auth state resolves.
