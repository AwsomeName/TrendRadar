// TrendRadar 管理控制台 JavaScript

// 全局变量
let currentTab = 'dashboard';
let systemStatus = {};

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', function() {
    initializeApp();
});

// 初始化应用
function initializeApp() {
    // 加载系统状态
    loadSystemStatus();
    
    // 加载关键词
    loadKeywords();
    
    // 加载配置
    loadConfig();
    
    // 加载平台配置
    loadPlatforms();
    
    // 加载历史记录
    loadHistory();
    
    // 设置定时刷新
    setInterval(loadSystemStatus, 30000); // 每30秒刷新一次状态
}

// 标签页切换
function showTab(tabName) {
    // 隐藏所有标签页内容
    const tabContents = document.querySelectorAll('.tab-content');
    tabContents.forEach(content => {
        content.classList.remove('active');
    });
    
    // 移除所有标签页的激活状态
    const navTabs = document.querySelectorAll('.nav-tab');
    navTabs.forEach(tab => {
        tab.classList.remove('active');
    });
    
    // 显示选中的标签页
    const selectedTab = document.getElementById(tabName);
    if (selectedTab) {
        selectedTab.classList.add('active');
        selectedTab.classList.add('fade-in');
    }
    
    // 激活对应的导航标签
    const selectedNavTab = document.querySelector(`[onclick="showTab('${tabName}')"]`);
    if (selectedNavTab) {
        selectedNavTab.classList.add('active');
    }
    
    currentTab = tabName;
    
    // 根据标签页加载相应数据
    switch(tabName) {
        case 'dashboard':
            loadSystemStatus();
            break;
        case 'keywords':
            loadKeywords();
            break;
        case 'config':
            loadConfig();
            break;
        case 'history':
            loadHistory();
            break;
    }
}

// 显示警告消息
function showAlert(containerId, message, type = 'info') {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    const alertClass = `alert-${type}`;
    container.innerHTML = `
        <div class="alert ${alertClass}">
            ${message}
        </div>
    `;
    
    // 3秒后自动隐藏
    setTimeout(() => {
        container.innerHTML = '';
    }, 3000);
}

// API 请求封装
async function apiRequest(url, options = {}) {
    try {
        const response = await fetch(url, {
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            },
            ...options
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API请求失败:', error);
        throw error;
    }
}

// 加载系统状态
async function loadSystemStatus() {
    const loadingElement = document.getElementById('status-loading');
    const contentElement = document.getElementById('status-content');
    
    try {
        console.log('正在加载系统状态...');
        if (loadingElement) loadingElement.style.display = 'block';
        if (contentElement) contentElement.style.display = 'none';
        
        const response = await apiRequest('/api/status');
        console.log('API响应:', response);
        if (response.success) {
            systemStatus = response.data;
            
            // 更新状态显示
            console.log('系统状态数据:', response.data);
            updateStatusDisplay(response.data);
        } else {
            throw new Error(response.message || '获取系统状态失败');
        }
        
        if (loadingElement) loadingElement.style.display = 'none';
        if (contentElement) contentElement.style.display = 'block';
        
    } catch (error) {
        console.error('加载系统状态失败:', error);
        if (loadingElement) {
            loadingElement.textContent = '加载系统状态失败: ' + error.message;
        }
    }
}

// 更新状态显示
function updateStatusDisplay(data) {
    // 更新配置文件状态
    const configStatus = document.getElementById('config-status');
    if (configStatus) {
        configStatus.textContent = data.config_exists ? '✅ 正常' : '❌ 缺失';
        configStatus.style.color = data.config_exists ? '#28a745' : '#dc3545';
    }
    
    // 更新关键词文件状态
    const keywordsStatus = document.getElementById('keywords-status');
    if (keywordsStatus) {
        keywordsStatus.textContent = data.keywords_exists ? '✅ 正常' : '❌ 缺失';
        keywordsStatus.style.color = data.keywords_exists ? '#28a745' : '#dc3545';
    }
    
    // 更新今日数据状态
    const todayStatus = document.getElementById('today-status');
    if (todayStatus) {
        todayStatus.textContent = data.today_has_data ? '✅ 有数据' : '⚠️ 无数据';
        todayStatus.style.color = data.today_has_data ? '#28a745' : '#ffc107';
    }
    
    // 更新版本信息
    const versionStatus = document.getElementById('version-status');
    if (versionStatus) {
        versionStatus.textContent = data.version || '未知';
    }
    
    // 更新最新文件信息
    const latestFileInfo = document.getElementById('latest-file-info');
    if (latestFileInfo) {
        if (data.latest_file) {
            latestFileInfo.innerHTML = `
                <strong>文件名:</strong> ${data.latest_file.name}<br>
                <strong>路径:</strong> ${data.latest_file.path}<br>
                <strong>修改时间:</strong> ${data.latest_file.modified}
            `;
        } else {
            latestFileInfo.textContent = '暂无数据';
        }
    }
    
    // 更新当前时间
    const currentTime = document.getElementById('current-time');
    if (currentTime) {
        currentTime.textContent = data.current_time || '获取失败';
    }
}

// 格式化文件大小
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// 加载关键词
async function loadKeywords() {
    const textarea = document.getElementById('keywords-content');
    if (!textarea) return;
    
    try {
        textarea.placeholder = '正在加载关键词配置...';
        const response = await apiRequest('/api/keywords');
        if (response.success) {
            textarea.value = response.data.content || '';
        } else {
            throw new Error(response.message || '获取关键词配置失败');
        }
        textarea.placeholder = '请输入关键词配置，每行一个关键词或关键词组';
    } catch (error) {
        console.error('加载关键词失败:', error);
        showAlert('keywords-alert', '加载关键词失败: ' + error.message, 'error');
        textarea.placeholder = '加载失败，请重试';
    }
}

// 保存关键词
async function saveKeywords() {
    const textarea = document.getElementById('keywords-content');
    if (!textarea) return;
    
    try {
        const content = textarea.value;
        await apiRequest('/api/keywords', {
            method: 'POST',
            body: JSON.stringify({ content })
        });
        
        showAlert('keywords-alert', '关键词保存成功！', 'success');
        
        // 刷新系统状态
        loadSystemStatus();
        
    } catch (error) {
        console.error('保存关键词失败:', error);
        showAlert('keywords-alert', '保存关键词失败: ' + error.message, 'error');
    }
}

// 加载配置
async function loadConfig() {
    const form = document.getElementById('config-form');
    if (!form) return;
    
    try {
        const response = await apiRequest('/api/config');
        
        if (response.success) {
            // 填充表单数据
            populateForm(form, response.data);
        } else {
            throw new Error(response.message || '获取配置失败');
        }
        
    } catch (error) {
        console.error('加载配置失败:', error);
        showAlert('config-alert', '加载配置失败: ' + error.message, 'error');
    }
}

// 填充表单数据
function populateForm(form, data) {
    const inputs = form.querySelectorAll('input, select, textarea');
    
    inputs.forEach(input => {
        const name = input.name;
        if (!name) return;
        
        const keys = name.split('.');
        let value = data;
        
        // 递归获取嵌套对象的值
        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                value = undefined;
                break;
            }
        }
        
        if (value !== undefined) {
            if (input.type === 'checkbox') {
                input.checked = Boolean(value);
            } else {
                input.value = value;
            }
        }
    });
}

// 保存配置
async function saveConfig() {
    const form = document.getElementById('config-form');
    if (!form) return;
    
    try {
        const formData = new FormData(form);
        const config = {};
        
        // 构建配置对象
        for (const [name, value] of formData.entries()) {
            const keys = name.split('.');
            let current = config;
            
            for (let i = 0; i < keys.length - 1; i++) {
                const key = keys[i];
                if (!(key in current)) {
                    current[key] = {};
                }
                current = current[key];
            }
            
            const lastKey = keys[keys.length - 1];
            const input = form.querySelector(`[name="${name}"]`);
            
            if (input.type === 'checkbox') {
                current[lastKey] = input.checked;
            } else if (input.type === 'number') {
                current[lastKey] = parseInt(value) || 0;
            } else {
                current[lastKey] = value;
            }
        }
        
        await apiRequest('/api/config', {
            method: 'POST',
            body: JSON.stringify(config)
        });
        
        showAlert('config-alert', '配置保存成功！', 'success');
        
        // 刷新系统状态
        loadSystemStatus();
        
    } catch (error) {
        console.error('保存配置失败:', error);
        showAlert('config-alert', '保存配置失败: ' + error.message, 'error');
    }
}

// 测试爬取
async function testCrawl() {
    const button = document.querySelector('button[onclick="testCrawl()"]');
    const originalText = button.textContent;
    
    try {
        button.disabled = true;
        button.textContent = '🔄 测试中...';
        
        showAlert('manual-alert', '正在测试数据爬取，请稍候...', 'info');
        
        const data = await apiRequest('/api/test-crawl', {
            method: 'POST'
        });
        
        showAlert('manual-alert', '测试爬取完成！', 'success');
        
        // 显示结果
        const resultDiv = document.getElementById('manual-result');
        const resultContent = document.getElementById('manual-result-content');
        
        if (resultDiv && resultContent) {
            resultContent.innerHTML = `
                <h4>爬取结果</h4>
                <pre>${JSON.stringify(data, null, 2)}</pre>
            `;
            resultDiv.style.display = 'block';
        }
        
    } catch (error) {
        console.error('测试爬取失败:', error);
        showAlert('manual-alert', '测试爬取失败: ' + error.message, 'error');
    } finally {
        button.disabled = false;
        button.textContent = originalText;
    }
}

// 手动推送
async function manualPush() {
    const button = document.querySelector('button[onclick="manualPush()"]');
    const originalText = button.textContent;
    
    try {
        button.disabled = true;
        button.textContent = '🔄 推送中...';
        
        showAlert('manual-alert', '正在执行手动推送，请稍候...', 'info');
        
        const data = await apiRequest('/api/manual-push', {
            method: 'POST'
        });
        
        showAlert('manual-alert', '手动推送完成！', 'success');
        
        // 显示结果
        const resultDiv = document.getElementById('manual-result');
        const resultContent = document.getElementById('manual-result-content');
        
        if (resultDiv && resultContent) {
            resultContent.innerHTML = `
                <h4>推送结果</h4>
                <pre>${JSON.stringify(data, null, 2)}</pre>
            `;
            resultDiv.style.display = 'block';
        }
        
        // 刷新系统状态和历史记录
        loadSystemStatus();
        if (currentTab === 'history') {
            loadHistory();
        }
        
    } catch (error) {
        console.error('手动推送失败:', error);
        showAlert('manual-alert', '手动推送失败: ' + error.message, 'error');
    } finally {
        button.disabled = false;
        button.textContent = originalText;
    }
}

// 显示历史记录子标签
function showHistoryTab(tabName) {
    // 更新导航按钮状态
    document.querySelectorAll('.history-nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // 显示对应的内容
    document.querySelectorAll('.history-tab-content').forEach(content => {
        content.style.display = 'none';
    });
    
    if (tabName === 'files') {
        document.getElementById('history-files').style.display = 'block';
        loadHistory();
    } else if (tabName === 'execution') {
        document.getElementById('history-execution').style.display = 'block';
        loadExecutionHistory();
    }
}

// 加载文件历史记录
async function loadHistory() {
    const loadingElement = document.getElementById('history-loading');
    const contentElement = document.getElementById('history-content');
    
    try {
        if (loadingElement) loadingElement.style.display = 'block';
        if (contentElement) contentElement.innerHTML = '';
        
        const data = await apiRequest('/api/history');
        
        if (loadingElement) loadingElement.style.display = 'none';
        
        if (contentElement) {
            if (data.files && data.files.length > 0) {
                contentElement.innerHTML = renderHistoryFiles(data.files);
            } else {
                contentElement.innerHTML = '<p>暂无历史记录</p>';
            }
        }
        
    } catch (error) {
        console.error('加载历史记录失败:', error);
        if (loadingElement) {
            loadingElement.textContent = '加载历史记录失败: ' + error.message;
        }
    }
}

// 加载推送执行历史
async function loadExecutionHistory() {
    const loadingElement = document.getElementById('execution-loading');
    const contentElement = document.getElementById('execution-content');
    
    try {
        if (loadingElement) loadingElement.style.display = 'block';
        if (contentElement) contentElement.innerHTML = '';
        
        const data = await apiRequest('/api/execution-history');
        
        if (loadingElement) loadingElement.style.display = 'none';
        
        if (contentElement) {
            if (data.data && data.data.length > 0) {
                contentElement.innerHTML = renderExecutionHistory(data.data);
            } else {
                contentElement.innerHTML = '<p>暂无推送历史记录</p>';
            }
        }
        
    } catch (error) {
        console.error('加载推送历史失败:', error);
        if (loadingElement) {
            loadingElement.textContent = '加载推送历史失败: ' + error.message;
        }
    }
}

// 渲染历史文件列表
function renderHistoryFiles(files) {
    let html = '<ul class="file-list">';
    
    files.forEach(file => {
        const isDirectory = file.name.endsWith('/');
        const icon = isDirectory ? '📁' : '📄';
        const size = isDirectory ? '-' : formatFileSize(file.size || 0);
        const date = file.mtime ? new Date(file.mtime * 1000).toLocaleString() : '-';
        
        html += `
            <li class="file-item">
                <div class="file-name">
                    ${icon} ${file.name}
                </div>
                <div class="file-info">
                    <span class="file-size">${size}</span>
                    <span class="file-date">${date}</span>
                    ${!isDirectory ? `<button class="btn btn-primary" onclick="viewFile('${file.path}')">查看</button>` : ''}
                </div>
            </li>
        `;
    });
    
    html += '</ul>';
    return html;
}

// 查看文件
async function viewFile(filePath) {
    try {
        const response = await fetch(`/api/history/${encodeURIComponent(filePath)}`);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const contentType = response.headers.get('content-type');
        
        if (contentType && contentType.includes('text/html')) {
            // HTML文件，在新窗口中打开
            window.open(`/api/history/${encodeURIComponent(filePath)}`, '_blank');
        } else {
            // 其他文件，显示内容
            const content = await response.text();
            
            // 创建模态框显示文件内容
            showFileModal(filePath, content);
        }
        
    } catch (error) {
        console.error('查看文件失败:', error);
        alert('查看文件失败: ' + error.message);
    }
}

// 显示文件内容模态框
function showFileModal(filePath, content) {
    // 创建模态框
    const modal = document.createElement('div');
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    `;
    
    const modalContent = document.createElement('div');
    modalContent.style.cssText = `
        background: white;
        padding: 20px;
        border-radius: 10px;
        max-width: 80%;
        max-height: 80%;
        overflow: auto;
        position: relative;
    `;
    
    modalContent.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
            <h3>📄 ${filePath}</h3>
            <button onclick="this.closest('[style*="position: fixed"]').remove()" style="background: #dc3545; color: white; border: none; padding: 5px 10px; border-radius: 5px; cursor: pointer;">✕</button>
        </div>
        <pre style="background: #f8f9fa; padding: 15px; border-radius: 5px; overflow: auto; max-height: 400px;">${content}</pre>
    `;
    
    modal.appendChild(modalContent);
    document.body.appendChild(modal);
    
    // 点击背景关闭模态框
    modal.addEventListener('click', function(e) {
        if (e.target === modal) {
            modal.remove();
        }
    });
}

// 工具函数：防抖
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// 工具函数：节流
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

// 错误处理
window.addEventListener('error', function(e) {
    console.error('全局错误:', e.error);
});

window.addEventListener('unhandledrejection', function(e) {
    console.error('未处理的Promise拒绝:', e.reason);
});

// 导出函数供全局使用
// 平台管理相关函数
let platformsData = [];
let isAddingNewPlatform = false;

// 加载平台配置
async function loadPlatforms() {
    try {
        showAlert('platforms-alert', '正在加载平台配置...', 'info');
        
        const response = await apiRequest('/api/platforms');
        if (response.success) {
            platformsData = response.data || [];
            renderPlatforms();
            document.getElementById('platforms-loading').style.display = 'none';
            document.getElementById('platforms-content').style.display = 'block';
            showAlert('platforms-alert', '平台配置加载成功', 'success');
        } else {
            throw new Error(response.error || '加载失败');
        }
    } catch (error) {
        console.error('加载平台配置失败:', error);
        showAlert('platforms-alert', `加载平台配置失败: ${error.message}`, 'error');
    }
}

// 渲染平台列表
function renderPlatforms() {
    const grid = document.getElementById('platforms-grid');
    grid.innerHTML = '';
    
    platformsData.forEach((platform, index) => {
        const card = createPlatformCard(platform, index);
        grid.appendChild(card);
    });
    
    // 如果正在添加新平台，显示新平台表单
    if (isAddingNewPlatform) {
        const newCard = createNewPlatformCard();
        grid.appendChild(newCard);
    }
}

// 创建平台卡片
function createPlatformCard(platform, index) {
    const card = document.createElement('div');
    card.className = `platform-card ${platform.enabled ? 'enabled' : 'disabled'}`;
    
    card.innerHTML = `
        <div class="platform-header">
            <h4 class="platform-title">${platform.name || platform.id}</h4>
            <div class="platform-status">
                <label class="status-toggle">
                    <input type="checkbox" ${platform.enabled ? 'checked' : ''} 
                           onchange="togglePlatform(${index})">
                    <span class="toggle-slider"></span>
                </label>
            </div>
        </div>
        
        <div class="platform-info">
            <div class="platform-field">
                <label>平台ID</label>
                <span class="platform-id">${platform.id}</span>
            </div>
            
            <div class="platform-field">
                <label>平台名称</label>
                <input type="text" value="${platform.name || ''}" 
                       onchange="updatePlatformField(${index}, 'name', this.value)">
            </div>
            
            <div class="platform-field">
                <label>权重 (1-10)</label>
                <input type="number" class="weight-input" min="1" max="10" 
                       value="${platform.weight || 5}" 
                       onchange="updatePlatformField(${index}, 'weight', parseInt(this.value))">
            </div>
            
            <div class="platform-field">
                <label>描述</label>
                <textarea onchange="updatePlatformField(${index}, 'description', this.value)" 
                          placeholder="平台描述...">${platform.description || ''}</textarea>
            </div>
        </div>
        
        <div class="platform-actions">
            <button class="btn btn-danger btn-small" onclick="removePlatform(${index})">
                🗑️ 删除
            </button>
        </div>
    `;
    
    return card;
}

// 创建新平台表单
function createNewPlatformCard() {
    const card = document.createElement('div');
    card.className = 'platform-card new-platform-form active';
    
    card.innerHTML = `
        <div class="platform-header">
            <h4 class="platform-title">添加新平台</h4>
        </div>
        
        <div class="platform-info">
            <div class="platform-field">
                <label>平台ID *</label>
                <input type="text" id="new-platform-id" placeholder="例如: custom_news" required>
            </div>
            
            <div class="platform-field">
                <label>平台名称 *</label>
                <input type="text" id="new-platform-name" placeholder="例如: 自定义新闻" required>
            </div>
            
            <div class="platform-field">
                <label>权重 (1-10)</label>
                <input type="number" id="new-platform-weight" class="weight-input" 
                       min="1" max="10" value="5">
            </div>
            
            <div class="platform-field">
                <label>描述</label>
                <textarea id="new-platform-description" placeholder="平台描述..."></textarea>
            </div>
        </div>
        
        <div class="platform-actions">
            <button class="btn btn-primary btn-small" onclick="saveNewPlatform()">
                ✅ 保存
            </button>
            <button class="btn btn-secondary btn-small" onclick="cancelNewPlatform()">
                ❌ 取消
            </button>
        </div>
    `;
    
    return card;
}

// 切换平台启用状态
function togglePlatform(index) {
    platformsData[index].enabled = !platformsData[index].enabled;
    renderPlatforms();
}

// 更新平台字段
function updatePlatformField(index, field, value) {
    platformsData[index][field] = value;
}

// 删除平台
function removePlatform(index) {
    if (confirm('确定要删除这个平台吗？')) {
        platformsData.splice(index, 1);
        renderPlatforms();
        // 立即保存到后端
        savePlatforms();
    }
}

// 添加新平台
function addNewPlatform() {
    isAddingNewPlatform = true;
    renderPlatforms();
}

// 保存新平台
function saveNewPlatform() {
    const id = document.getElementById('new-platform-id').value.trim();
    const name = document.getElementById('new-platform-name').value.trim();
    const weight = parseInt(document.getElementById('new-platform-weight').value) || 5;
    const description = document.getElementById('new-platform-description').value.trim();
    
    if (!id || !name) {
        showAlert('platforms-alert', '平台ID和名称不能为空', 'error');
        return;
    }
    
    // 检查ID是否已存在
    if (platformsData.some(p => p.id === id)) {
        showAlert('platforms-alert', '平台ID已存在，请使用其他ID', 'error');
        return;
    }
    
    const newPlatform = {
        id: id,
        name: name,
        weight: weight,
        description: description,
        enabled: true
    };
    
    platformsData.push(newPlatform);
    isAddingNewPlatform = false;
    renderPlatforms();
    showAlert('platforms-alert', '新平台添加成功', 'success');
}

// 取消添加新平台
function cancelNewPlatform() {
    isAddingNewPlatform = false;
    renderPlatforms();
}

// 保存平台配置
async function savePlatforms() {
    try {
        showAlert('platforms-alert', '正在保存平台配置...', 'info');
        
        const response = await apiRequest('/api/platforms', {
            method: 'POST',
            body: JSON.stringify({ platforms: platformsData })
        });
        
        if (response.success) {
            showAlert('platforms-alert', '平台配置保存成功', 'success');
        } else {
            throw new Error(response.error || '保存失败');
        }
    } catch (error) {
        console.error('保存平台配置失败:', error);
        showAlert('platforms-alert', `保存平台配置失败: ${error.message}`, 'error');
    }
}

// 渲染推送执行历史
function renderExecutionHistory(data) {
    let html = '<div class="execution-history-table">';
    html += `
        <table class="history-table">
            <thead>
                <tr>
                    <th>执行时间</th>
                    <th>模式</th>
                    <th>报告类型</th>
                    <th>推送条数</th>
                    <th>去重后数量</th>
                    <th>通知状态</th>
                    <th>关键词组</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    data.forEach(record => {
        const timestamp = new Date(record.timestamp).toLocaleString();
        const mode = record.mode || '-';
        const reportType = record.report_type || '-';
        const totalPushed = record.total_pushed || 0;
        const actualPushed = record.actual_pushed !== undefined ? record.actual_pushed : totalPushed;
        const notificationSent = record.notification_sent ? '✅ 已发送' : '❌ 未发送';
        const keywordGroups = record.keyword_groups || 0;
        
        html += `
            <tr>
                <td>${timestamp}</td>
                <td>${mode}</td>
                <td>${reportType}</td>
                <td class="number">${totalPushed}</td>
                <td class="number" style="color: #007bff; font-weight: bold;">${actualPushed}</td>
                <td class="status ${record.notification_sent ? 'sent' : 'not-sent'}">${notificationSent}</td>
                <td class="keyword-groups">${keywordGroups}</td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    return html;
}

window.TrendRadarAdmin = {
    showTab,
    showHistoryTab,
    loadSystemStatus,
    loadKeywords,
    saveKeywords,
    loadConfig,
    saveConfig,
    loadPlatforms,
    savePlatforms,
    addNewPlatform,
    testCrawl,
    manualPush,
    loadHistory,
    loadExecutionHistory,
    viewFile
};