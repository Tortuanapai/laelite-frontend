// Configuración
const API_URL = 'https://apibot-production-8cbb.up.railway.app';
let currentFilter = 'all';
let statusChart, guildsChart;
let usersData = [];
let guildsData = [];

// Roles a mostrar (id => label)
const ROLE_MAP = {
    '1313924720021737542': 'Altos cargos',
    '1313921807329263688': 'Capo',
    '1313923097748963388': 'Solado',
    '1313923578617528381': 'Recluta',
    '1314399223923347508': 'Reco'
};

// Elementos del DOM
const onlineCount = document.getElementById('online-count');
const idleCount = document.getElementById('idle-count');
const dndCount = document.getElementById('dnd-count');
const offlineCount = document.getElementById('offline-count');
const serversCount = document.getElementById('servers-count');
const totalUsers = document.getElementById('total-users');
const usersTbody = document.getElementById('users-tbody');
const serversGrid = document.getElementById('servers-grid');
const rolesGrid = document.getElementById('roles-grid');
const lastUpdate = document.getElementById('last-update');
const apiStatus = document.getElementById('api-status');
const apiText = document.getElementById('api-text');
const filterButtons = document.querySelectorAll('.filter-btn');

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    initCharts();
    fetchData();
    
    // Actualizar cada 5 segundos
    setInterval(fetchData, 5000);
    
    // Event listeners para filtros
    filterButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterButtons.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentFilter = e.target.dataset.filter;
            renderUsers();
        });
    });
});

// Inicializar gráficos
function initCharts() {
    const ctxStatus = document.getElementById('statusChart').getContext('2d');
    statusChart = new Chart(ctxStatus, {
        type: 'doughnut',
        data: {
            labels: ['Online', 'Inactivo', 'No disponible', 'Offline'],
            datasets: [{
                data: [0, 0, 0, 0],
                backgroundColor: [
                    'rgba(0, 255, 0, 0.7)',
                    'rgba(255, 193, 7, 0.7)',
                    'rgba(255, 87, 34, 0.7)',
                    'rgba(158, 158, 158, 0.7)'
                ],
                borderColor: [
                    '#00ff00',
                    '#ffc107',
                    '#ff5722',
                    '#9e9e9e'
                ],
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    labels: { color: '#e0e0e0' }
                }
            }
        }
    });

    const ctxGuilds = document.getElementById('guildsChart').getContext('2d');
    guildsChart = new Chart(ctxGuilds, {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Usuarios por Servidor',
                data: [],
                backgroundColor: 'rgba(0, 212, 255, 0.5)',
                borderColor: '#00d4ff',
                borderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            indexAxis: 'y',
            plugins: {
                legend: {
                    labels: { color: '#e0e0e0' }
                }
            },
            scales: {
                x: {
                    ticks: { color: '#e0e0e0' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                },
                y: {
                    ticks: { color: '#e0e0e0' },
                    grid: { color: 'rgba(255, 255, 255, 0.1)' }
                }
            }
        }
    });
}

// Obtener datos de la API
async function fetchData() {
    try {
        // Obtener usuarios
        const statusRes = await fetch(`${API_URL}/api/status`);
        const statusData = await statusRes.json();
        
        if (statusData.success) {
            usersData = statusData.users;
            updateStats();
            updateCharts();
            renderUsers();
        }

        // Obtener servidores
        const guildsRes = await fetch(`${API_URL}/api/guilds`);
        const guildsDataRes = await guildsRes.json();
        
        if (guildsDataRes.success) {
            guildsData = guildsDataRes.guilds;
            renderServers();
            renderRoles();
        }

        // Actualizar estado de conexión
        const healthRes = await fetch(`${API_URL}/health`);
        const healthData = await healthRes.json();
        
        if (healthData.success && healthData.botConnected) {
            apiStatus.className = 'status-dot online';
            apiText.textContent = 'API Conectada';
        }
    } catch (error) {
        console.error('Error al obtener datos:', error);
        apiStatus.className = 'status-dot offline';
        apiText.textContent = 'API Desconectada';
    }

    lastUpdate.textContent = new Date().toLocaleTimeString('es-ES');
}

// Actualizar estadísticas
function updateStats() {
    const stats = {
        online: 0,
        idle: 0,
        dnd: 0,
        offline: 0
    };

    usersData.forEach(user => {
        stats[user.status]++;
    });

    onlineCount.textContent = stats.online;
    idleCount.textContent = stats.idle;
    dndCount.textContent = stats.dnd;
    offlineCount.textContent = stats.offline;
    totalUsers.textContent = usersData.length;
    serversCount.textContent = guildsData.length;
}

// Actualizar gráficos
function updateCharts() {
    const stats = {
        online: 0,
        idle: 0,
        dnd: 0,
        offline: 0
    };

    usersData.forEach(user => {
        stats[user.status]++;
    });

    statusChart.data.datasets[0].data = [
        stats.online,
        stats.idle,
        stats.dnd,
        stats.offline
    ];
    statusChart.update();

    // Gráfico de servidores
    const serverLabels = [];
    const serverData = [];

    const guildUserCount = {};
    usersData.forEach(user => {
        const guild = user.guild;
        guildUserCount[guild] = (guildUserCount[guild] || 0) + 1;
    });

    Object.entries(guildUserCount).forEach(([guild, count]) => {
        serverLabels.push(guild);
        serverData.push(count);
    });

    guildsChart.data.labels = serverLabels;
    guildsChart.data.datasets[0].data = serverData;
    guildsChart.update();
}

// Renderizar tabla de usuarios
function renderUsers() {
    let filtered = usersData;

    if (currentFilter !== 'all') {
        filtered = usersData.filter(user => user.status === currentFilter);
    }

    if (filtered.length === 0) {
        usersTbody.innerHTML = '<tr><td colspan="5" class="loading">No hay usuarios con este filtro</td></tr>';
        return;
    }

    usersTbody.innerHTML = filtered.map(user => `
        <tr>
            <td>
                <div class="avatar-user">
                    <img src="${user.avatar}" alt="${user.username}" class="user-avatar">
                    <strong>${user.username}</strong>
                </div>
            </td>
            <td>
                <span class="status-badge ${user.status}">
                    ${capitalizeStatus(user.status)}
                </span>
            </td>
            <td>
                ${user.activities.length > 0 
                    ? user.activities.map(a => `<small>${a.name}</small>`).join('<br>')
                    : '<small style="color: #666;">-</small>'
                }
            </td>
            <td>${user.guild}</td>
            <td><small>${formatTime(user.lastSeen)}</small></td>
        </tr>
    `).join('');
}

// Renderizar servidores
function renderServers() {
    if (guildsData.length === 0) {
        serversGrid.innerHTML = '<div class="loading">No hay servidores</div>';
        return;
    }

    serversGrid.innerHTML = guildsData.map(guild => `
        <div class="server-card">
            ${guild.icon ? `<img src="${guild.icon}" alt="${guild.name}" class="server-icon">` : '<div class="server-icon" style="font-size: 2em;">🏢</div>'}
            <h3>${guild.name}</h3>
            <div class="server-info">👥 ${guild.memberCount} miembros</div>
            <div class="server-info">#️⃣ ${guild.channels} canales</div>
            <div class="server-info">🏷️ ${guild.roles} roles</div>
        </div>
    `).join('');
}

// Utilidades
function capitalizeStatus(status) {
    const statuses = {
        'online': '🟢 Online',
        'idle': '🟡 Inactivo',
        'dnd': '🔴 No disponible',
        'offline': '⚫ Offline'
    };
    return statuses[status] || status;
}

function formatTime(isoString) {
    const date = new Date(isoString);
    return date.toLocaleString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

// Renderizar usuarios por roles especificados en ROLE_MAP
function renderRoles() {
    if (!rolesGrid) return;
    const roleIds = Object.keys(ROLE_MAP);
    const html = roleIds.map(roleId => {
        const label = ROLE_MAP[roleId];
        const users = usersData.filter(u => Array.isArray(u.roleIds) && u.roleIds.includes(roleId));
        if (users.length === 0) {
            return `
            <div class="server-card">
                <h3>${label}</h3>
                <div class="loading">No hay usuarios con este rol</div>
            </div>`;
        }

        const usersList = users.map(u => `
            <div style="display:flex;align-items:center;gap:10px;margin:8px 0;">
                <img src="${u.avatar}" alt="${u.username}" style="width:30px;height:30px;border-radius:50%;border:2px solid #00d4ff;">
                <div>
                    <strong>${u.username}</strong><br>
                    <small style="color:#999">${capitalizeStatus(u.status)}</small>
                </div>
            </div>
        `).join('');

        return `
        <div class="server-card">
            <h3>${label}</h3>
            <div style="text-align:left;padding-top:8px;">${usersList}</div>
        </div>`;
    }).join('');

    rolesGrid.innerHTML = html;
}
