// ===== CONFIGURAÇÃO DA API =====
const API_BASE_URL = "https://back-habittracker2-production.up.railway.app/api"; // AJUSTE ESTA URL CONFORME SEU BACKEND

// Endpoints da API (ajuste conforme suas rotas)
const API_ENDPOINTS = {
    // Usuários
   
    users: `${API_BASE_URL}/users`,
    userById: (id) => `${API_BASE_URL}/users/${id}`,
    
    // Hábitos
    habits: `${API_BASE_URL}/habits`,
    habitsByUser: (userId) => `${API_BASE_URL}/users/${userId}/habits`,
    habitById: (id) => `${API_BASE_URL}/habits/${id}`,
    
    // Logs de Hábitos
    habitLogs: `${API_BASE_URL}/habit-logs`,
    habitLogsByUser: (userId) => `${API_BASE_URL}/users/${userId}/habits/history`,
    completeHabit: (userId, habitId) => `${API_BASE_URL}/users/${userId}/habits/${habitId}/complete`,
    
    // Recompensas
    rewards: `${API_BASE_URL}/rewards`,
    rewardById: (id) => `${API_BASE_URL}/rewards/${id}`,
    
    // Recompensas do Usuário
    userRewards: `${API_BASE_URL}/user-rewards`,
    userRewardsByUser: (userId) => `${API_BASE_URL}/users/${userId}/rewards`,
    purchaseReward: (userId, rewardId) => `${API_BASE_URL}/users/${userId}/rewards/${rewardId}/redeem`,

    // Conquistas
    achievementsByUser: (userId) => `${API_BASE_URL}/users/${userId}/achievements`,
    createAchievement: (userId) => `${API_BASE_URL}/users/${userId}/achievements`,
    
    // Atividades
    activitiesByUser: (userId) => `${API_BASE_URL}/users/${userId}/activities`
};

// ===== ESTADO DA APLICAÇÃO =====
let currentUser = null;
let habits = [];
let rewards = [];
let habitLogs = [];
let userRewards = [];
let editingItem = null;
let editingType = null;
let apiOnline = false;

// ===== UTILIDADES DE API =====
async function apiRequest(url, options = {}) {
    const config = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        ...options
    };

    try {
        const response = await fetch(url, config);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
        }

        const contentType = response.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
            return await response.json();
        }
        
        return await response.text();
    } catch (error) {
        console.error('API Request Error:', error);
        updateApiStatus(false);
        throw error;
    }
}

function updateApiStatus(online) {
    apiOnline = online;
    const statusElement = document.getElementById('apiStatus');
    if (online) {
        statusElement.className = 'api-status online';
        statusElement.innerHTML = '<i class="fas fa-circle"></i> API Online';
    } else {
        statusElement.className = 'api-status offline';
        statusElement.innerHTML = '<i class="fas fa-circle"></i> API Offline';
    }
}

async function checkApiHealth() {
    try {
        await apiRequest(API_ENDPOINTS.users);
        updateApiStatus(true);
        return true;
    } catch (error) {
        updateApiStatus(false);
        return false;
    }
}

function showMessage(elementId, message, type = 'error') {
    const element = document.getElementById(elementId);
    if (!element) return;

    element.innerHTML = `
        <div class="${type}-message">
            <i class="fas fa-${type === 'error' ? 'exclamation-triangle' : 'check-circle'}"></i>
            ${message}
        </div>
    `;

    setTimeout(() => {
        element.innerHTML = '';
    }, 5000);
}

// ===== FUNÇÕES DE USUÁRIO =====
function logout() {
    if (confirm('Deseja realmente sair?')) {
        // Limpa os dados do usuário
        currentUser = null;
        habits = [];
        rewards = [];
        habitLogs = [];
        userRewards = [];
        
        // Reseta a interface
        document.getElementById('userSection').style.display = 'block';
        document.getElementById('userInfo').style.display = 'none';
        document.getElementById('mainContent').style.display = 'none';
        
        // Limpa os campos de login
        document.getElementById('usernameInput').value = '';
        document.getElementById('passwordInput').value = '';
        
        // Limpa as listas
        document.getElementById('habitsList').innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Carregando hábitos...</div>';
        document.getElementById('rewardsList').innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Carregando recompensas...</div>';
        document.getElementById('activityLog').innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Carregando atividades...</div>';
        document.getElementById('achievementsList').innerHTML = '<div class="empty-state"><i class="fas fa-medal"></i><p>Suas conquistas aparecerão aqui!</p></div>';
        
        showAchievement('Logout realizado com sucesso! Até logo! 👋');
    }
}

async function loginUser() {
    const username = document.getElementById('usernameInput').value.trim();
    const password = document.getElementById('passwordInput').value.trim();

    if (!username || !password) {
        showMessage('userSectionMessage', 'Por favor, digite username e senha!', 'error');
        return;
    }

    if (username.length < 3) {
        showMessage('userSectionMessage', 'Username deve ter pelo menos 3 caracteres!', 'error');
        return;
    }

    if (password.length < 6) {
        showMessage('userSectionMessage', 'Senha deve ter pelo menos 6 caracteres!', 'error');
        return;
    }

    try {
        const user = await apiRequest(API_ENDPOINTS.users + "/login", {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });

        currentUser = user;
        updateApiStatus(true);

        document.getElementById('userSection').style.display = 'none';
        document.getElementById('userInfo').style.display = 'block';
        document.getElementById('mainContent').style.display = 'block';
        document.getElementById('welcomeUser').textContent = `Bem-vindo, ${username}!`;
        
        // Carrega dados do usuário
        await loadUserData();
        
        // Verifica se precisa fazer reset diário
        checkDailyReset();
        
        // Inicia o agendamento de verificação de reset
        scheduleResetCheck();
        
        updateUserStats();
        showAchievement('Bem-vindo ao TrackerHabit! 👋');
        
    } catch (error) {
        console.error('Erro no login:', error);
        showMessage('userSectionMessage', `Erro no login: ${error.message}`, 'error');
    }
}

async function registerUser() {
    const username = document.getElementById('usernameInput').value.trim();
    const password = document.getElementById('passwordInput').value.trim();

    if (!username || !password) {
        showMessage('userSectionMessage', 'Por favor, digite username e senha!', 'error');
        return;
    }

    if (username.length < 3) {
        showMessage('userSectionMessage', 'Username deve ter pelo menos 3 caracteres!', 'error');
        return;
    }

    if (password.length < 6) {
        showMessage('userSectionMessage', 'Senha deve ter pelo menos 6 caracteres!', 'error');
        return;
    }

    try {
        const user = await apiRequest(API_ENDPOINTS.users + "/register", {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });

        showMessage('userSectionMessage', `Usuário "${username}" criado com sucesso! Agora faça login.`, 'success');
        
        // Limpa os campos
        document.getElementById('usernameInput').value = '';
        document.getElementById('passwordInput').value = '';
        
    } catch (error) {
        console.error('Erro no registro:', error);
        showMessage('userSectionMessage', `Erro no registro: ${error.message}`, 'error');
    }
}

function updateUserStats() {
    if (!currentUser) return;

    document.getElementById('userXP').innerHTML = `
        <div style="font-size: 1rem; color: #666;">Nível ${currentUser.nivel || calculateLevel(currentUser.xpAcumulado)}</div>
        ${currentUser.xpAcumulado}
    `;
    document.getElementById('userStreak').textContent = currentUser.diasOfensiva || 0;
    document.getElementById('totalHabits').textContent = habits.length;

    checkMilestones(currentUser.xpAcumulado, currentUser.diasOfensiva, habits.length);
}

// ===== FUNÇÕES DE CARREGAMENTO =====
async function loadUserData() {
    if (!currentUser) return;

    try {
        // Carrega hábitos do usuário
        await loadHabits();
        // Carrega recompensas
        await loadRewards();
        // Carrega logs de hábitos
        await loadHabitLogs();
        // Carrega recompensas do usuário
        await loadUserRewards();
        // Carrega conquistas
        await loadAchievements();
        // Atualiza displays
        updateActivityLog();
    } catch (error) {
        console.error('Erro ao carregar dados:', error);
    }
}

async function loadHabits() {
    try {
        const loadedHabits = await apiRequest(API_ENDPOINTS.habitsByUser(currentUser.id));
        
        // Preserva o estado local de conclusão se existir
        const today = new Date().toISOString().split('T')[0];
        habits = loadedHabits.map(habit => {
            const existingHabit = habits.find(h => h.id === habit.id);
            
            // Se o hábito já existe localmente e foi marcado como completado hoje, preserva o status
            if (existingHabit && existingHabit.completedToday && existingHabit.lastCompletionDate === today) {
                return { ...habit, completedToday: true, lastCompletionDate: today };
            }
            
            // Caso contrário, usa os dados do backend
            return habit;
        });
        
        updateHabitsDisplay();
        updateUserStats();
    } catch (error) {
        console.error('Erro ao carregar hábitos:', error);
        updateHabitsDisplay([]);
    }
}

async function loadRewards() {
    try {
        rewards = await apiRequest(API_ENDPOINTS.rewards);
        updateRewardsDisplay();
    } catch (error) {
        console.error('Erro ao carregar recompensas:', error);
        updateRewardsDisplay([]);
    }
}

async function loadHabitLogs() {
    try {
        habitLogs = await apiRequest(API_ENDPOINTS.habitLogsByUser(currentUser.id));
    } catch (error) {
        console.error('Erro ao carregar logs:', error);
        habitLogs = [];
    }
}

async function loadUserRewards() {
    try {
        userRewards = await apiRequest(API_ENDPOINTS.userRewardsByUser(currentUser.id));
    } catch (error) {
        console.error('Erro ao carregar recompensas do usuário:', error);
        userRewards = [];
    }
}

// ===== FUNÇÕES DE HÁBITO =====
async function createHabit() {
    const name = document.getElementById('habitName').value.trim();
    const xpValue = parseInt(document.getElementById('habitXP').value);

    if (!name || !xpValue) {
        showMessage('habitFormMessage', 'Por favor, preencha todos os campos!', 'error');
        return;
    }

    try {
        const newHabit = await apiRequest(API_ENDPOINTS.habitsByUser(currentUser.id), {
            method: 'POST',
            body: JSON.stringify({
                name: name,
                xpValue: xpValue
            })
        });

        habits.push(newHabit);
        updateHabitsDisplay();
        updateUserStats();
        // Limpa o formulário
        document.getElementById('habitForm').reset();
        showMessage('habitFormMessage', `Hábito "${name}" criado com sucesso!`, 'success');
        //showAchievement(`Novo hábito "${name}" criado! 🎯`);
        
    } catch (error) {
        console.error('Erro ao criar hábito:', error);
        showMessage('habitFormMessage', `Erro ao criar hábito: ${error.message}`, 'error');
    }
}

async function completeHabit(habitId) {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;

    // Verifica se já foi completado hoje
    const today = new Date().toISOString().split('T')[0];
    const completedToday = habitLogs.some(log => {
        const logHabitId = log.habit ? log.habit.id : log.habitId;
        return logHabitId === habitId && log.completionDate === today;
    }) || habit.completedToday === true;

    if (completedToday) {
        showAchievement('Hábito já foi concluído hoje! ⏰');
        return;
    }

    // Mostra feedback visual imediato
    const habitElement = document.getElementById(`habit-${habitId}`);
    const completeButton = habitElement?.querySelector('button[onclick*="completeHabit"]');
    
    if (completeButton) {
        completeButton.disabled = true;
        completeButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Completando...';
    }

    try {
        const response = await apiRequest(API_ENDPOINTS.completeHabit(currentUser.id, habitId), {
            method: 'POST'
        });

        // A resposta da API é um mapa, extraímos o habitLog
        const newLogEntry = response.habitLog;

        // Adiciona o novo log ao estado local
        habitLogs.push(newLogEntry);

        // Marca o hábito como completado localmente
        const habitIndex = habits.findIndex(h => h.id === habitId);
        if (habitIndex !== -1) {
            habits[habitIndex].completedToday = true;
            habits[habitIndex].lastCompletionDate = today;
        }

        // Recarrega dados do usuário para pegar streak e XP atualizados
        try {
            const updatedUser = await apiRequest(API_ENDPOINTS.userById(currentUser.id));
            currentUser.diasOfensiva = updatedUser.diasOfensiva;
            currentUser.xpAcumulado = updatedUser.xpAcumulado;
        } catch (userError) {
            console.warn('Erro ao recarregar dados do usuário:', userError);
            // Fallback: atualiza XP localmente
            currentUser.xpAcumulado += habit.xpValue;
        }

        // Atualiza a interface
        updateUserStats();
        updateHabitsDisplay(); // Re-renderiza os hábitos para mostrar como completado
        updateActivityLog(); // Mostra a nova atividade
        
        showAchievement(`Parabéns! +${habit.xpValue} XP ganhos! 🎉`);
        
    } catch (error) {
        console.error('Erro ao completar hábito:', error);
        
        // Reverte o feedback visual em caso de erro
        if (completeButton) {
            completeButton.disabled = false;
            completeButton.innerHTML = '<i class="fas fa-check"></i> Completar';
        }
        
        showAchievement(`Erro ao completar hábito: ${error.message}`, 'error');
    }
}

async function buyReward(rewardId) {
    const reward = rewards.find(r => r.id === rewardId);
    if (!reward || currentUser.xpAcumulado < reward.xpCost) return;

    if (confirm(`Deseja resgatar "${reward.name}" por ${reward.xpCost} XP?`)) {
        try {
            const response = await apiRequest(API_ENDPOINTS.purchaseReward(currentUser.id, rewardId), {
                method: 'POST'
            });

            // Atualiza o XP do usuário localmente
            currentUser.xpAcumulado -= reward.xpCost;

            // Adiciona a recompensa às recompensas do usuário
            const newUserReward = response.userReward;
            userRewards.push(newUserReward);

            // Recarrega dados do usuário para sincronizar
            try {
                const updatedUser = await apiRequest(API_ENDPOINTS.userById(currentUser.id));
                currentUser.xpAcumulado = updatedUser.xpAcumulado;
            } catch (userError) {
                console.warn('Erro ao recarregar dados do usuário:', userError);
            }

            // Recarrega as recompensas do usuário
            await loadUserRewards();

            updateUserStats();
            updateRewardsDisplay();
            await updateActivityLog(); // Agora é async
            
            showAchievement(`Recompensa "${reward.name}" resgatada! 🏆`);
            
        } catch (error) {
            console.error('Erro ao resgatar recompensa:', error);
            showAchievement(`Erro ao resgatar recompensa: ${error.message}`, 'error');
        }
    }
}

function editHabit(habitId) {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;

    editingItem = habit;
    editingType = 'habit';
    
    document.getElementById('modalTitle').textContent = 'Editar Hábito';
    document.getElementById('editName').value = habit.name;
    document.getElementById('editXP').value = habit.xpValue;
    document.getElementById('editDescGroup').style.display = 'none';
    
    document.getElementById('editModal').style.display = 'block';
}

function editReward(rewardId) {
    const reward = rewards.find(r => r.id === rewardId);
    if (!reward) return;

    editingItem = reward;
    editingType = 'reward';
    
    document.getElementById('modalTitle').textContent = 'Editar Recompensa';
    document.getElementById('editName').value = reward.name;
    document.getElementById('editXP').value = reward.xpCost;
    document.getElementById('editDescription').value = reward.description;
    document.getElementById('editDescGroup').style.display = 'block';
    
    document.getElementById('editModal').style.display = 'block';
}

async function saveEdit() {
    if (!editingItem) return;

    const name = document.getElementById('editName').value.trim();
    const xp = parseInt(document.getElementById('editXP').value);

    if (!name || !xp) {
        showMessage('editFormMessage', 'Por favor, preencha todos os campos!', 'error');
        return;
    }

    try {
        if (editingType === 'habit') {
            // Atualizar hábito via API
            const updatedHabit = await apiRequest(API_ENDPOINTS.habitById(editingItem.id), {
                method: 'PUT',
                body: JSON.stringify({
                    name: name,
                    xpValue: xp
                })
            });

            // Atualiza o item local
            editingItem.name = name;
            editingItem.xpValue = xp;
            
            // Recarrega os hábitos para sincronizar
            await loadHabits();
            
        } else if (editingType === 'reward') {
            // Atualizar recompensa via API
            const description = document.getElementById('editDescription').value.trim();
            const updatedReward = await apiRequest(API_ENDPOINTS.rewardById(editingItem.id), {
                method: 'PUT',
                body: JSON.stringify({
                    name: name,
                    xpCost: xp,
                    description: description
                })
            });

            // Atualiza o item local
            editingItem.name = name;
            editingItem.xpCost = xp;
            editingItem.description = description;
            
            // Recarrega as recompensas para sincronizar
            await loadRewards();
        }

        closeModal();
        showAchievement(`Item "${name}" atualizado com sucesso! ✏️`);
        
    } catch (error) {
        console.error('Erro ao atualizar item:', error);
        showMessage('editFormMessage', `Erro ao atualizar: ${error.message}`, 'error');
    }
}

function deleteHabit(habitId) {
    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;

    if (confirm(`Deseja excluir o hábito "${habit.name}"?`)) {
        habits = habits.filter(h => h.id !== habitId);
        updateHabitsDisplay();
        updateUserStats();
        showAchievement(`Hábito "${habit.name}" excluído! 🗑️`);
    }
}

function deleteReward(rewardId) {
    const reward = rewards.find(r => r.id === rewardId);
    if (!reward) return;

    if (confirm(`Deseja excluir a recompensa "${reward.name}"?`)) {
        rewards = rewards.filter(r => r.id !== rewardId);
        updateRewardsDisplay();
        showAchievement(`Recompensa "${reward.name}" excluída! 🗑️`);
    }
}

async function updateActivityLog() {
    const activityLog = document.getElementById('activityLog');
    
    // Combina logs de hábitos e recompensas
    const allActivities = [
        ...habitLogs.map(log => {
            // Agora o backend retorna log.habit.id (objeto habit completo)
            const habitId = log.habit ? log.habit.id : log.habitId;
            const habit = habits.find(h => h.id === habitId) || log.habit;
            return {
                date: log.completionDate,
                type: 'habit',
                message: `Concluiu: ${habit ? habit.name : 'Hábito desconhecido'}`,
                xp: habit ? (habit.xpValue || habit.xp_value) : 0
            };
        }),
        ...userRewards.map(ur => {
            // Tenta encontrar a recompensa de várias formas
            let reward = null;
            
            // 1. Tenta pelo rewardId (novo getter)
            if (ur.rewardId) {
                reward = rewards.find(r => r.id === ur.rewardId);
            }
            
            // 2. Tenta pelo objeto reward aninhado
            if (!reward && ur.reward) {
                reward = ur.reward;
            }
            
            // 3. Fallback: procura por qualquer propriedade que possa ser o ID
            if (!reward && ur.reward_id) {
                reward = rewards.find(r => r.id === ur.reward_id);
            }
            
            return {
                date: ur.acquisitionDate,
                type: 'reward',
                message: `Resgatou: ${reward ? reward.name : 'Recompensa desconhecida'}`,
                xp: -(reward ? reward.xpCost : 0)
            };
        })
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    if (allActivities.length === 0) {
        activityLog.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-clock"></i>
                <p>Seu histórico de atividades aparecerá aqui!</p>
            </div>
        `;
        return;
    }

    activityLog.innerHTML = allActivities.slice(0, 10).map(activity => `
        <div class="habit-item" style="border-left-color: ${activity.type === 'habit' ? '#00b894' : '#fd79a8'};">
            <div class="habit-header">
                <div class="habit-name">
                    <i class="fas fa-${activity.type === 'habit' ? 'check-circle' : 'gift'}"></i>
                    ${activity.message}
                </div>
                <div class="xp-badge" style="background: ${activity.xp > 0 ? 'linear-gradient(135deg, #00b894 0%, #00cec9 100%)' : 'linear-gradient(135deg, #fd79a8 0%, #fdcb6e 100%)'};">
                    ${activity.xp > 0 ? '+' : ''}${activity.xp} XP
                </div>
            </div>
            <small style="color: #666;">${formatDate(activity.date)}</small>
        </div>
    `).join('');
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', { 
        day: '2-digit', 
        month: '2-digit', 
        year: 'numeric' 
    });
}

function closeModal() {
    document.getElementById('editModal').style.display = 'none';
    editingItem = null;
    editingType = null;
    document.getElementById('editForm').reset();
}

function showAchievement(message, save = true) {
    // if (save) {
    //     saveAchievement(message); // Desabilitado temporariamente pois não há backend para conquistas
    // }

    const achievementsList = document.getElementById('achievementsList');
    
    // Remove empty state se existir
    const emptyState = achievementsList.querySelector('.empty-state');
    if (emptyState) {
        emptyState.remove();
    }

    // Cria nova conquista
    const achievement = document.createElement('div');
    achievement.className = 'achievement';
    achievement.innerHTML = `
        <i class="fas fa-star"></i>
        ${message}
    `;
    
    achievementsList.insertBefore(achievement, achievementsList.firstChild);
    
    // Remove conquistas antigas (mantém apenas as 5 mais recentes)
    const achievements = achievementsList.querySelectorAll('.achievement');
    if (achievements.length > 5) {
        achievements[achievements.length - 1].remove();
    }

    // Auto-hide após 5 segundos
    setTimeout(() => {
        if (achievement.parentNode) {
            achievement.style.opacity = '0.5';
        }
    }, 5000);
}

function openTab(tabName) {
    // Remove active class de todos os botões e conteúdos
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    
    // Adiciona active class ao botão e conteúdo selecionado
    event.target.classList.add('active');
    document.getElementById(tabName).classList.add('active');
}

// Reset diário dos hábitos
function resetDailyHabits() {
    const today = new Date().toISOString().split('T')[0];
    
    habits.forEach(habit => {
        // Reseta o status de conclusão
        habit.completedToday = false;
        habit.lastResetDate = today;
    });
    
    updateHabitsDisplay();
    showAchievement('Novo dia começou! Hora de formar bons hábitos! 🌅');
}

// Verifica se precisa resetar hábitos (executado ao fazer login)
function checkDailyReset() {
    if (!currentUser) return;
    
    const today = new Date().toISOString().split('T')[0];
    const lastResetDate = localStorage.getItem(`lastReset_${currentUser.id}`);
    
    if (lastResetDate !== today) {
        // Novo dia detectado - reseta hábitos localmente
        habits.forEach(habit => {
            habit.completedToday = false;
        });
        
        localStorage.setItem(`lastReset_${currentUser.id}`, today);
        console.log('Reset diário aplicado aos hábitos');
    }
}

// Agenda verificação de reset a cada minuto (para detectar mudança de dia)
function scheduleResetCheck() {
    setInterval(() => {
        if (currentUser) {
            checkDailyReset();
        }
    }, 60000); // Verifica a cada minuto
}

// Adiciona algumas conquistas de exemplo quando o usuário faz login
function addSampleAchievements() {
    setTimeout(() => {
        showAchievement('Bem-vindo ao TrackerHabit! 👋');
    }, 1000);
}

// Chama as conquistas de exemplo após login
const originalLoginUser = loginUser;
loginUser = function() {
    originalLoginUser();
    if (currentUser) {
        addSampleAchievements();
    }
};

// Função para calcular nível baseado no XP
function calculateLevel(xp) {
    return Math.floor(xp / 100) + 1;
}

function calculateLevelProgress(xp) {
    const currentLevelXP = xp % 100;
    return (currentLevelXP / 100) * 100;
}

// Atualiza a exibição do usuário com nível
const originalUpdateUserStats = updateUserStats;
updateUserStats = function() {
    originalUpdateUserStats();
    
    if (!currentUser) return;
    
    const level = calculateLevel(currentUser.xpAcumulado);
    const progress = calculateLevelProgress(currentUser.xpAcumulado);
    
    // Adiciona indicador de nível
    const xpElement = document.getElementById('userXP');
    if (xpElement) {
        xpElement.innerHTML = `
            <div style="font-size: 1rem; color: #666;">Nível ${level}</div>
            ${currentUser.xpAcumulado}
        `;
    }
};

// Sistema de conquistas por marcos
function checkMilestones(xp, streak, habitsCount) {
    const milestones = [
        { xp: 100, message: 'Primeiro Centenário! 100 XP alcançados! 💯' },
        { xp: 500, message: 'Meio Milhar! 500 XP conquistados! 🎯' },
        { xp: 1000, message: 'Mestre dos Mil! 1000 XP dominados! 🏆' },
        { streak: 7, message: 'Semana Completa! 7 dias consecutivos! 🔥' },
        { streak: 30, message: 'Mês de Dedicação! 30 dias seguidos! 🌟' },
        { habitsCount: 5, message: 'Colecionador! 5 hábitos diferentes! 📚' },
        { habitsCount: 10, message: 'Especialista! 10 hábitos ativos! 🎖️' }
    ];

    milestones.forEach(milestone => {
        let achieved = false;
        if (milestone.xp && xp >= milestone.xp) achieved = true;
        if (milestone.streak && streak >= milestone.streak) achieved = true;
        if (milestone.habitsCount && habitsCount >= milestone.habitsCount) achieved = true;

        if (achieved && !currentUser.achievedMilestones) {
            currentUser.achievedMilestones = [];
        }
        
        if (achieved && currentUser.achievedMilestones && !currentUser.achievedMilestones.includes(milestone.message)) {
            currentUser.achievedMilestones.push(milestone.message);
            showAchievement(milestone.message);
        }
    });
}

// Integra verificação de marcos
const originalCompleteHabit = completeHabit;
completeHabit = function(habitId) {
    originalCompleteHabit(habitId);
    if (currentUser) {
        checkMilestones(currentUser.xpAcumulado, currentUser.diasOfensiva, habits.length);
    }
};

const originalCreateHabit = createHabit;
createHabit = function() {
    originalCreateHabit();
    if (currentUser) {
        checkMilestones(currentUser.xpAcumulado, currentUser.diasOfensiva, habits.length);
    }
};

// Função para exportar dados (bonus)
function exportData() {
    if (!currentUser) return;
    
    const data = {
        user: currentUser,
        habits: habits,
        rewards: rewards,
        habitLogs: habitLogs,
        userRewards: userRewards,
        exportDate: new Date().toISOString()
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `trackerhabit_${currentUser.username}_${new Date().toISOString().split('T')[0]}.json`;
    link.click();
}

// Adiciona botão de exportar no header (opcional)
setTimeout(() => {
    const userInfo = document.getElementById('userInfo');
    if (userInfo && currentUser) {
        const exportBtn = document.createElement('button');
        exportBtn.className = 'btn btn-small';
        exportBtn.innerHTML = '<i class="fas fa-download"></i> Exportar Dados';
        exportBtn.onclick = exportData;
        exportBtn.style.marginTop = '10px';
        userInfo.appendChild(exportBtn);
    }
}, 2000);

// Easter egg: Konami code
let konamiCode = [];
const konami = [38, 38, 40, 40, 37, 39, 37, 39, 66, 65];

document.addEventListener('keydown', function(e) {
    konamiCode.push(e.keyCode);
    if (konamiCode.length > konami.length) {
        konamiCode.shift();
    }
    if (konamiCode.join(',') === konami.join(',')) {
        if (currentUser) {
            currentUser.xpAcumulado += 1000;
            updateUserStats();
            showAchievement('🎮 KONAMI CODE! +1000 XP de bônus! 🎮');
        }
        konamiCode = [];
    }
});
// ===== INICIALIZAÇÃO =====
document.addEventListener('DOMContentLoaded', () => {
    // Verifica a saúde da API ao carregar a página
    checkApiHealth();

    // Adiciona listeners aos formulários
    const loginForm = document.getElementById('userSection'); // O form está dentro da userSection
    const habitForm = document.getElementById('habitForm');
    const rewardForm = document.getElementById('rewardForm');
    const editForm = document.getElementById('editForm');
    const closeModalBtn = document.querySelector('.modal .close');

    if(loginForm) {
        // Previne o comportamento padrão do botão de login que está dentro de um form implícito
        const loginButton = loginForm.querySelector('button');
        loginButton.addEventListener('click', (e) => {
            e.preventDefault();
            loginUser();
        });
    }

    if (habitForm) {
        habitForm.addEventListener('submit', (e) => {
            e.preventDefault();
            createHabit();
        });
    }

    if (rewardForm) {
        rewardForm.addEventListener('submit', (e) => {
            e.preventDefault();
            createReward();
        });
    }
    
    if (editForm) {
        editForm.addEventListener('submit', (e) => {
            e.preventDefault();
            saveEdit();
        });
    }

    if(closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
    }

    // Fecha o modal se clicar fora do conteúdo
    window.addEventListener('click', (e) => {
        const modal = document.getElementById('editModal');
        if (e.target == modal) {
            closeModal();
        }
    });
});
// ===== FUNÇÕES DE DISPLAY =====
    function updateHabitsDisplay() {
        const habitsList = document.getElementById('habitsList');
        if (!habitsList) return;

        if (habits.length === 0) {
            habitsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-sad-tear"></i>
                    <p>Você ainda não tem hábitos. Crie um!</p>
                </div>
            `;
            return;
        }

        habitsList.innerHTML = habits.map(habit => {
            const today = new Date().toISOString().split('T')[0];
            
            // Verifica se foi completado hoje usando múltiplas fontes
            const completedViaLogs = habitLogs.some(log => {
                const habitId = log.habit ? log.habit.id : log.habitId;
                return habitId === habit.id && log.completionDate === today;
            });
            const completedViaStatus = habit.completedToday === true;
            const completedToday = completedViaLogs || completedViaStatus;
            
            const ofensiva = habit.ofensiva || 0;
            
            return `
                <div class="habit-item ${completedToday ? 'completed' : ''}" id="habit-${habit.id}">
                    <div class="habit-header">
                        <div class="habit-name">
                            ${completedToday ? '<i class="fas fa-check-circle" style="color: #00b894; margin-right: 8px;"></i>' : ''}
                            ${habit.name}
                        </div>
                        <div class="habit-badges">
                            <div class="xp-badge ${completedToday ? 'earned' : ''}">
                                ${completedToday ? '✓ ' : '+'}${habit.xpValue} XP
                            </div>
                            ${ofensiva > 0 ? `<div class="streak-badge" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">⚔️ ${ofensiva}</div>` : ''}
                        </div>
                    </div>
                    <div class="habit-actions">
                        <button class="btn btn-small btn-success" onclick="completeHabit(${habit.id})" ${completedToday ? 'disabled' : ''}>
                            <i class="fas fa-${completedToday ? 'check' : 'check'}"></i> 
                            ${completedToday ? 'Concluído Hoje' : 'Completar'}
                        </button>
                        <button class="btn btn-small" onclick="editHabit(${habit.id})">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="btn btn-small btn-danger" onclick="deleteHabit(${habit.id})">
                            <i class="fas fa-trash"></i> Excluir
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

function updateRewardsDisplay() {
    const rewardsList = document.getElementById('rewardsList');
    if (!rewardsList) return;

    if (rewards.length === 0) {
        rewardsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-store-slash"></i>
                <p>Nenhuma recompensa disponível na loja.</p>
            </div>
        `;
        return;
    }

    rewardsList.innerHTML = rewards.map(reward => {
        const owned = userRewards.some(ur => ur.rewardId === reward.id);
        const canAfford = currentUser && currentUser.xpAcumulado >= reward.xpCost;

        return `
            <div class="reward-item ${owned ? 'owned' : ''}" id="reward-${reward.id}">
                <div class="habit-header">
                    <div class="habit-name">${reward.name}</div>
                    <div class="xp-badge">${reward.xpCost} XP</div>
                </div>
                <p>${reward.description}</p>
                <div class="habit-actions">
                    <button class="btn btn-small" onclick="buyReward(${reward.id})" ${owned || !canAfford ? 'disabled' : ''}>
                        <i class="fas fa-shopping-cart"></i> ${owned ? 'Adquirido' : 'Comprar'}
                    </button>
                </div>
            </div>
        `;
    }).join('');
}
async function createReward() {
    const name = document.getElementById('rewardName').value.trim();
    const cost = parseInt(document.getElementById('rewardCost').value);
    const description = document.getElementById('rewardDescription').value.trim();

    if (!name || !cost || !description) {
        showMessage('rewardFormMessage', 'Por favor, preencha todos os campos!', 'error');
        return;
    }

    try {
        const newReward = await apiRequest(API_ENDPOINTS.rewards, {
            method: 'POST',
            body: JSON.stringify({
                name: name,
                xpCost: cost,
                description: description
            })
        });

        rewards.push(newReward);
        updateRewardsDisplay();
        
        document.getElementById('rewardForm').reset();
        showMessage('rewardFormMessage', `Recompensa "${name}" criada com sucesso!`, 'success');
        
    } catch (error) {
        console.error('Erro ao criar recompensa:', error);
        showMessage('rewardFormMessage', `Erro ao criar recompensa: ${error.message}`, 'error');
    }
}
async function loadAchievements() {
    if (!currentUser) return;
    try {
        const achievements = await apiRequest(API_ENDPOINTS.achievementsByUser(currentUser.id));
        // Limpa a lista de conquistas para não duplicar
        const achievementsList = document.getElementById('achievementsList');
        const emptyState = achievementsList.querySelector('.empty-state');
        if (emptyState) {
            emptyState.remove();
        }
        achievementsList.innerHTML = '';

        if (achievements.length === 0) {
            achievementsList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-medal"></i>
                    <p>Suas conquistas aparecerão aqui!</p>
                </div>
            `;
        } else {
            achievements.forEach(ach => showAchievement(ach.message, false)); // false para não salvar de novo
        }
    } catch (error) {
        console.error('Erro ao carregar conquistas:', error);
        const achievementsList = document.getElementById('achievementsList');
        achievementsList.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-medal"></i>
                <p>Suas conquistas aparecerão aqui!</p>
            </div>
        `;
    }
}

async function saveAchievement(message) {
    if (!currentUser) return;
    try {
        await apiRequest(API_ENDPOINTS.createAchievement(currentUser.id), {
            method: 'POST',
            body: JSON.stringify({ message: message })
        });
    } catch (error) {
        console.error('Erro ao salvar conquista:', error);
    }
}