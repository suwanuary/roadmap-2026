/* ===================================
   2026 연간 로드맵 플래너 - JavaScript
   🔒 비밀번호 잠금 버전
   =================================== */

// 🔐 비밀번호 설정 - 원하는 비밀번호로 변경하세요!
const ADMIN_PASSWORD = "roadmap2026";

// 🔥 Firebase 설정 - 본인 설정값으로 교체하세요!
const firebaseConfig = {
    apiKey: "AIzaSyACNczh3pvbfc-DHikTdMX6xHHyrKhqhHM",
    authDomain: "my-roadmap-2026.firebaseapp.com",
    databaseURL: "https://my-roadmap-2026-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "my-roadmap-2026",
    storageBucket: "my-roadmap-2026.firebasestorage.app",
    messagingSenderId: "562848552336",
    appId: "1:562848552336:web:6cbcc9c7791d7f11ae4f15",
    measurementId: "G-F20N15007E"
};

// Firebase 초기화
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

// ===== 데이터 =====
let categories = [];
let tasks = [];
let isAdmin = false; // 🔐 관리자 모드 여부

const months = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월'];
const emojis = ['📌', '🎯', '💡', '✅', '🔥', '⭐', '💼', '📚', '🎓', '💰', '🏠', '💕', '🎉', '🚀', '📝', '🍳', '💪', '🌱', '📊', '🎨', '✈️', '🎵', '📷', '🏃'];

let currentView = 'list';
let currentFilter = 'all';
let editingTaskId = null;

// 기본 카테고리
const defaultCategories = [
    { id: 'marriage', name: '결혼 준비', desc: 'Wedding', color: 'marriage', icon: '💒' },
    { id: 'academic', name: '학업', desc: 'Academic', color: 'academic', icon: '📚' },
    { id: 'work', name: '회사', desc: 'Work', color: 'work', icon: '💼' },
    { id: 'study', name: '공부', desc: 'Study', color: 'study', icon: '📝' },
    { id: 'selfdev', name: '자기계발', desc: 'Self-Dev', color: 'selfdev', icon: '🌱' }
];

// ===== 🔐 관리자 인증 =====
function checkAdminStatus() {
    const savedAdmin = sessionStorage.getItem('roadmap_admin');
    isAdmin = savedAdmin === 'true';
    updateUIForRole();
}

function promptPassword() {
    const password = prompt('🔐 관리자 비밀번호를 입력하세요:');
    if (password === ADMIN_PASSWORD) {
        isAdmin = true;
        sessionStorage.setItem('roadmap_admin', 'true');
        updateUIForRole();
        showSyncStatus('synced', '🔓 관리자 모드 활성화!');
    } else if (password !== null) {
        alert('❌ 비밀번호가 틀렸습니다.');
    }
}

function logout() {
    isAdmin = false;
    sessionStorage.removeItem('roadmap_admin');
    updateUIForRole();
    showSyncStatus('synced', '🔒 읽기 전용 모드');
}

function updateUIForRole() {
    // 관리자 버튼 상태 업데이트
    const adminBtn = document.getElementById('adminBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const categoryBtn = document.getElementById('categoryBtn');
    const lockBadge = document.getElementById('lockBadge');
    
    if (isAdmin) {
        adminBtn.style.display = 'none';
        logoutBtn.style.display = 'block';
        categoryBtn.style.display = 'block';
        lockBadge.textContent = '🔓 편집 모드';
        lockBadge.classList.add('unlocked');
    } else {
        adminBtn.style.display = 'block';
        logoutBtn.style.display = 'none';
        categoryBtn.style.display = 'none';
        lockBadge.textContent = '🔒 읽기 전용';
        lockBadge.classList.remove('unlocked');
    }
    
    // FAB 버튼 표시/숨김
    const fab = document.querySelector('.fab');
    if (fab) {
        fab.style.display = isAdmin ? '' : 'none';
    }
    
    // 그리드 다시 렌더링 (추가 버튼 표시/숨김)
    renderAll();
}

// ===== 동기화 상태 표시 =====
function showSyncStatus(status, text) {
    const el = document.getElementById('syncStatus');
    el.className = `sync-status show ${status}`;
    el.querySelector('.sync-text').textContent = text;
    
    if (status !== 'syncing') {
        setTimeout(() => el.classList.remove('show'), 2000);
    }
}

// ===== Firebase 데이터 로드 =====
async function loadFromFirebase() {
    try {
        // 카테고리 불러오기
        const catSnapshot = await database.ref('categories').once('value');
        const catData = catSnapshot.val();
        
        if (catData) {
            categories = Object.values(catData);
        } else {
            categories = [...defaultCategories];
            if (isAdmin) {
                await saveCategoriesToFirebase();
            }
        }

        // 태스크 불러오기
        const taskSnapshot = await database.ref('tasks').once('value');
        const taskData = taskSnapshot.val();
        
        if (taskData) {
            tasks = Object.values(taskData);
        } else {
            tasks = [];
        }

        console.log('✅ Firebase 데이터 로드 완료');
    } catch (error) {
        console.error('❌ Firebase 로드 실패:', error);
        showSyncStatus('error', '로드 실패');
        loadFromLocalStorage();
    }
}

// ===== Firebase 저장 =====
async function saveCategoriesToFirebase() {
    if (!isAdmin) {
        showSyncStatus('error', '🔒 읽기 전용 모드');
        return;
    }
    
    showSyncStatus('syncing', '저장 중...');
    try {
        const catObject = {};
        categories.forEach(cat => {
            catObject[cat.id] = cat;
        });
        await database.ref('categories').set(catObject);
        showSyncStatus('synced', '저장 완료!');
    } catch (error) {
        console.error('카테고리 저장 실패:', error);
        showSyncStatus('error', '저장 실패');
    }
}

async function saveTasksToFirebase() {
    if (!isAdmin) {
        showSyncStatus('error', '🔒 읽기 전용 모드');
        return;
    }
    
    showSyncStatus('syncing', '저장 중...');
    try {
        const taskObject = {};
        tasks.forEach(task => {
            taskObject[task.id] = task;
        });
        await database.ref('tasks').set(taskObject);
        showSyncStatus('synced', '저장 완료!');
    } catch (error) {
        console.error('태스크 저장 실패:', error);
        showSyncStatus('error', '저장 실패');
    }
}

// ===== 로컬 스토리지 (폴백) =====
function loadFromLocalStorage() {
    const c = localStorage.getItem('roadmap_categories');
    const t = localStorage.getItem('roadmap_tasks');
    categories = c ? JSON.parse(c) : [...defaultCategories];
    tasks = t ? JSON.parse(t) : [];
}

function saveToLocalStorage() {
    localStorage.setItem('roadmap_categories', JSON.stringify(categories));
    localStorage.setItem('roadmap_tasks', JSON.stringify(tasks));
}

// ===== 테마 =====
function setTheme(theme) {
    document.body.setAttribute('data-theme', theme);
    document.getElementById('darkBtn').classList.toggle('active', theme === 'dark');
    document.getElementById('lightBtn').classList.toggle('active', theme === 'light');
    localStorage.setItem('roadmap_theme', theme);
}

// ===== 뷰 토글 =====
function setView(view) {
    currentView = view;
    document.getElementById('listViewBtn').classList.toggle('active', view === 'list');
    document.getElementById('gridViewBtn').classList.toggle('active', view === 'grid');
    document.getElementById('mobileView').classList.toggle('active', view === 'list');
    document.getElementById('roadmapContainer').classList.toggle('active', view === 'grid');
}

// ===== 필터 =====
function setFilter(filter) {
    currentFilter = filter;
    document.querySelectorAll('.filter-chip').forEach(c => {
        c.classList.toggle('active', c.dataset.filter === filter);
    });
    renderMobileView();
}

// ===== 초기화 =====
async function init() {
    const savedTheme = localStorage.getItem('roadmap_theme');
    if (savedTheme) setTheme(savedTheme);

    // 관리자 상태 확인
    checkAdminStatus();

    await loadFromFirebase();
    setupEmojiPicker();
    renderAll();

    // 로딩 숨기기
    document.getElementById('loadingOverlay').classList.add('hidden');

    // 실시간 리스너 설정
    setupRealtimeListeners();
}

// ===== 실시간 리스너 =====
function setupRealtimeListeners() {
    database.ref('tasks').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            tasks = Object.values(data);
            renderAll();
        }
    });

    database.ref('categories').on('value', (snapshot) => {
        const data = snapshot.val();
        if (data) {
            categories = Object.values(data);
            renderAll();
        }
    });
}

// ===== 전체 렌더링 =====
function renderAll() {
    renderGrid();
    renderMobileView();
    renderCategoryFilter();
    renderStats();
    renderCategorySelect();
}

// ===== 날짜 포맷 =====
function formatDate(start, end) {
    if (!start) return '';
    const fmt = d => {
        const dt = new Date(d);
        return `${String(dt.getMonth()+1).padStart(2,'0')}.${String(dt.getDate()).padStart(2,'0')}`;
    };
    return end && end !== start ? `${fmt(start)} → ${fmt(end)}` : fmt(start);
}

// ===== 데스크톱 그리드 렌더링 =====
function renderGrid() {
    const grid = document.getElementById('roadmapGrid');
    grid.innerHTML = '';

    // 헤더 코너
    const corner = document.createElement('div');
    corner.className = 'header-cell';
    corner.innerHTML = '<div class="year">2026</div><div class="month">Category</div>';
    grid.appendChild(corner);

    // 월 헤더
    const now = new Date();
    months.forEach((m, i) => {
        const cell = document.createElement('div');
        cell.className = 'header-cell';
        const isCurr = now.getFullYear() === 2026 && now.getMonth() === i;
        cell.innerHTML = `<div class="year">2026</div><div class="month ${isCurr ? 'current' : ''}">${m}</div>`;
        grid.appendChild(cell);
    });

    // 카테고리 행
    categories.forEach(cat => {
        // 카테고리 라벨
        const label = document.createElement('div');
        label.className = `category-label ${cat.color}`;
        label.innerHTML = `
            <div class="category-icon">${cat.icon}</div>
            <div class="category-name">${cat.name}</div>
            <div class="category-desc">${cat.desc}</div>
        `;
        grid.appendChild(label);

        // 월별 셀
        for (let m = 1; m <= 12; m++) {
            const cell = document.createElement('div');
            cell.className = 'month-cell';
            cell.dataset.month = m;
            cell.dataset.category = cat.id;

            // 해당 셀의 태스크들
            tasks.filter(t => t.month === m && t.category === cat.id)
                .forEach(t => cell.appendChild(createTaskCard(t)));

            // 🔐 관리자만 추가 버튼 표시
            if (isAdmin) {
                const addBtn = document.createElement('button');
                addBtn.className = 'add-task-btn';
                addBtn.textContent = '+';
                addBtn.onclick = () => openTaskModal(m, cat.id);
                cell.appendChild(addBtn);

                // 드래그 앤 드롭 이벤트 (관리자만)
                cell.addEventListener('dragover', e => { 
                    e.preventDefault(); 
                    cell.classList.add('drag-over'); 
                });
                cell.addEventListener('dragleave', () => cell.classList.remove('drag-over'));
                cell.addEventListener('drop', e => handleDrop(e, cell));
            }

            grid.appendChild(cell);
        }
    });
}

// ===== 태스크 카드 생성 =====
function createTaskCard(task) {
    const card = document.createElement('div');
    card.className = `task-card ${task.category}`;
    card.dataset.taskId = task.id;
    
    // 🔐 관리자만 드래그 및 클릭 편집 가능
    if (isAdmin) {
        card.draggable = true;
        card.onclick = () => openEditModal(task.id);
        card.style.cursor = 'pointer';
    } else {
        card.draggable = false;
        card.style.cursor = 'default';
    }

    const dateStr = formatDate(task.startDate, task.endDate);
    card.innerHTML = `
        <div class="task-header">
            <span class="task-emoji">${task.emoji}</span>
            <div class="task-content">
                <div class="task-title">${task.title}</div>
                ${task.subtitle ? `<div class="task-sub">${task.subtitle}</div>` : ''}
            </div>
        </div>
        ${dateStr ? `<div class="task-date">${dateStr}</div>` : ''}
        ${isAdmin ? '<span class="edit-indicator">✏️</span>' : ''}
    `;

    // 🔐 관리자만 드래그 이벤트
    if (isAdmin) {
        card.addEventListener('dragstart', e => {
            card.classList.add('dragging');
            e.dataTransfer.setData('text/plain', task.id);
        });
        card.addEventListener('dragend', () => card.classList.remove('dragging'));
    }

    return card;
}

// ===== 드롭 핸들러 =====
async function handleDrop(e, cell) {
    if (!isAdmin) return;
    
    e.preventDefault();
    cell.classList.remove('drag-over');
    const id = parseInt(e.dataTransfer.getData('text/plain'));
    const task = tasks.find(t => t.id === id);
    if (task) {
        task.month = parseInt(cell.dataset.month);
        task.category = cell.dataset.category;
        await saveTasksToFirebase();
        saveToLocalStorage();
        renderAll();
    }
}

// ===== 모바일 뷰 렌더링 =====
function renderMobileView() {
    const container = document.getElementById('mobileView');
    container.innerHTML = '';

    const now = new Date();
    
    months.forEach((monthName, i) => {
        const monthNum = i + 1;
        let monthTasks = tasks.filter(t => t.month === monthNum);
        
        // 필터 적용
        if (currentFilter !== 'all') {
            monthTasks = monthTasks.filter(t => t.category === currentFilter);
        }

        const section = document.createElement('div');
        section.className = 'mobile-month-section';

        const isCurrent = now.getFullYear() === 2026 && now.getMonth() === i;
        
        // 🔐 관리자만 추가 버튼 표시
        const addBtnHtml = isAdmin 
            ? `<button class="mobile-add-btn" onclick="openTaskModal(${monthNum}, '${categories[0]?.id || ''}')">+ 일정 추가</button>`
            : '';
        
        section.innerHTML = `
            <div class="mobile-month-header">
                <h3 class="${isCurrent ? 'current' : ''}">📅 ${monthName}</h3>
                <span class="task-count">${monthTasks.length}개</span>
            </div>
            <div class="mobile-task-list" id="mobileList${monthNum}"></div>
            ${addBtnHtml}
        `;

        container.appendChild(section);

        // 태스크 카드 추가
        const list = document.getElementById(`mobileList${monthNum}`);
        monthTasks.forEach(task => {
            const cat = categories.find(c => c.id === task.category);
            const card = document.createElement('div');
            card.className = 'mobile-task-card';
            
            // 🔐 관리자만 클릭 편집 가능
            if (isAdmin) {
                card.onclick = () => openEditModal(task.id);
                card.style.cursor = 'pointer';
            } else {
                card.style.cursor = 'default';
            }

            card.innerHTML = `
                <div class="task-emoji ${task.category}">${task.emoji}</div>
                <div class="task-info">
                    <div class="task-title">${task.title}</div>
                    <div class="task-meta">
                        <span class="category-badge ${task.category}">${cat?.name || ''}</span>
                        ${task.startDate ? `<span class="task-date">${formatDate(task.startDate, task.endDate)}</span>` : ''}
                    </div>
                </div>
                ${isAdmin ? '<span class="arrow">›</span>' : ''}
            `;
            list.appendChild(card);
        });
    });
}

// ===== 카테고리 필터 렌더링 =====
function renderCategoryFilter() {
    const container = document.getElementById('categoryFilter');
    container.innerHTML = `<button class="filter-chip ${currentFilter === 'all' ? 'active' : ''}" data-filter="all" onclick="setFilter('all')">전체</button>`;
    categories.forEach(c => {
        container.innerHTML += `<button class="filter-chip ${currentFilter === c.id ? 'active' : ''}" data-filter="${c.id}" onclick="setFilter('${c.id}')">${c.icon} ${c.name}</button>`;
    });
}

// ===== 카테고리 셀렉트 렌더링 =====
function renderCategorySelect() {
    const select = document.getElementById('taskCategorySelect');
    select.innerHTML = categories.map(c => 
        `<option value="${c.id}">${c.icon} ${c.name}</option>`
    ).join('');
}

// ===== 태스크 모달 =====
function openTaskModal(month, category) {
    if (!isAdmin) {
        promptPassword();
        return;
    }
    
    editingTaskId = null;
    document.getElementById('taskModalTitle').textContent = '✨ 새 일정';
    document.getElementById('taskForm').reset();
    document.getElementById('taskId').value = '';
    document.getElementById('taskMonth').value = month;
    document.getElementById('taskCategorySelect').value = category || categories[0]?.id;
    document.getElementById('selectedEmoji').value = '📌';
    
    const defaultDate = `2026-${String(month).padStart(2, '0')}-01`;
    document.getElementById('taskStartDate').value = defaultDate;
    document.getElementById('taskEndDate').value = '';

    document.querySelectorAll('.emoji-btn').forEach((b, i) => b.classList.toggle('selected', i === 0));
    
    document.getElementById('addActions').style.display = 'flex';
    document.getElementById('editActions').style.display = 'none';
    
    document.getElementById('taskModal').classList.add('active');
    document.getElementById('taskTitle').focus();
}

function openEditModal(taskId) {
    if (!isAdmin) {
        promptPassword();
        return;
    }
    
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    editingTaskId = taskId;
    document.getElementById('taskModalTitle').textContent = '✏️ 일정 편집';
    document.getElementById('taskId').value = task.id;
    document.getElementById('taskTitle').value = task.title;
    document.getElementById('taskSubtitle').value = task.subtitle || '';
    document.getElementById('taskMonth').value = task.month;
    document.getElementById('taskCategorySelect').value = task.category;
    document.getElementById('taskStartDate').value = task.startDate || '';
    document.getElementById('taskEndDate').value = task.endDate || '';
    document.getElementById('selectedEmoji').value = task.emoji;

    document.querySelectorAll('.emoji-btn').forEach(b => {
        b.classList.toggle('selected', b.textContent === task.emoji);
    });

    document.getElementById('addActions').style.display = 'none';
    document.getElementById('editActions').style.display = 'grid';

    document.getElementById('taskModal').classList.add('active');
}

function openQuickAddModal() {
    if (!isAdmin) {
        promptPassword();
        return;
    }
    
    const now = new Date();
    const month = now.getFullYear() === 2026 ? now.getMonth() + 1 : 1;
    openTaskModal(month, categories[0]?.id);
}

function closeTaskModal() {
    document.getElementById('taskModal').classList.remove('active');
    editingTaskId = null;
}

// ===== 태스크 저장 =====
async function saveTask(e) {
    e.preventDefault();
    
    if (!isAdmin) {
        showSyncStatus('error', '🔒 읽기 전용 모드');
        return;
    }
    
    const title = document.getElementById('taskTitle').value.trim();
    if (!title) return;

    const taskData = {
        title,
        subtitle: document.getElementById('taskSubtitle').value.trim(),
        emoji: document.getElementById('selectedEmoji').value,
        month: parseInt(document.getElementById('taskMonth').value),
        category: document.getElementById('taskCategorySelect').value,
        startDate: document.getElementById('taskStartDate').value,
        endDate: document.getElementById('taskEndDate').value
    };

    // 시작일 기준으로 월 자동 설정
    if (taskData.startDate) {
        const date = new Date(taskData.startDate);
        if (date.getFullYear() === 2026) {
            taskData.month = date.getMonth() + 1;
        }
    }

    if (editingTaskId) {
        const idx = tasks.findIndex(t => t.id === editingTaskId);
        if (idx !== -1) {
            tasks[idx] = { ...tasks[idx], ...taskData };
        }
    } else {
        tasks.push({ id: Date.now(), ...taskData });
    }

    await saveTasksToFirebase();
    saveToLocalStorage();
    closeTaskModal();
    renderAll();
}

// ===== 태스크 삭제 =====
async function deleteCurrentTask() {
    if (!isAdmin) {
        showSyncStatus('error', '🔒 읽기 전용 모드');
        return;
    }
    
    if (!editingTaskId) return;
    if (confirm('이 일정을 삭제할까요?')) {
        tasks = tasks.filter(t => t.id !== editingTaskId);
        await saveTasksToFirebase();
        saveToLocalStorage();
        closeTaskModal();
        renderAll();
    }
}

// ===== 카테고리 모달 =====
function openCategoryModal() {
    if (!isAdmin) {
        promptPassword();
        return;
    }
    
    renderCategoryList();
    document.getElementById('categoryModal').classList.add('active');
}

function closeCategoryModal() {
    document.getElementById('categoryModal').classList.remove('active');
}

function renderCategoryList() {
    document.getElementById('categoryList').innerHTML = categories.map(c => `
        <div class="category-tag ${c.color}">
            ${c.icon} ${c.name}
            <button class="remove-cat" onclick="removeCategory('${c.id}')">×</button>
        </div>
    `).join('');
}

// ===== 카테고리 추가 =====
async function addCategory(e) {
    e.preventDefault();
    
    if (!isAdmin) {
        showSyncStatus('error', '🔒 읽기 전용 모드');
        return;
    }
    
    const name = document.getElementById('categoryName').value.trim();
    if (!name) return;

    categories.push({
        id: 'cat_' + Date.now(),
        name,
        desc: document.getElementById('categoryDesc').value.trim() || name,
        color: document.getElementById('categoryColor').value,
        icon: document.getElementById('categoryIcon').value || '📁'
    });

    document.getElementById('categoryName').value = '';
    document.getElementById('categoryDesc').value = '';
    document.getElementById('categoryIcon').value = '';

    await saveCategoriesToFirebase();
    saveToLocalStorage();
    renderAll();
    renderCategoryList();
}

// ===== 카테고리 삭제 =====
async function removeCategory(id) {
    if (!isAdmin) {
        showSyncStatus('error', '🔒 읽기 전용 모드');
        return;
    }
    
    if (categories.length <= 1) return alert('최소 1개 필요');
    if (confirm('삭제할까요?')) {
        categories = categories.filter(c => c.id !== id);
        tasks = tasks.filter(t => t.category !== id);
        if (currentFilter === id) currentFilter = 'all';
        await saveCategoriesToFirebase();
        await saveTasksToFirebase();
        saveToLocalStorage();
        renderAll();
        renderCategoryList();
    }
}

// ===== 이모지 피커 =====
function setupEmojiPicker() {
    document.getElementById('emojiPicker').innerHTML = emojis.map((e, i) =>
        `<button type="button" class="emoji-btn ${i === 0 ? 'selected' : ''}" onclick="selectEmoji('${e}', this)">${e}</button>`
    ).join('');
}

function selectEmoji(emoji, btn) {
    document.getElementById('selectedEmoji').value = emoji;
    document.querySelectorAll('.emoji-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
}

// ===== 통계 렌더링 =====
function renderStats() {
    document.getElementById('totalTasks').textContent = tasks.length;
    document.getElementById('totalCategories').textContent = categories.length;
    const now = new Date();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    document.getElementById('currentMonth').textContent = monthNames[now.getMonth()];
}

// ===== 데이터 내보내기 =====
function exportData() {
    const data = { categories, tasks, exported: new Date().toISOString() };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = '2026_roadmap_backup.json';
    a.click();
}

// ===== 이벤트 리스너 =====
document.addEventListener('DOMContentLoaded', init);

// 모달 외부 클릭 시 닫기
document.querySelectorAll('.modal-overlay').forEach(o => {
    o.addEventListener('click', e => {
        if (e.target === o) {
            o.classList.remove('active');
            editingTaskId = null;
        }
    });
});

// ESC 키로 모달 닫기
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        closeTaskModal();
        closeCategoryModal();
    }
});
