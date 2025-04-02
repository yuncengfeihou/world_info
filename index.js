// public/extensions/third-party/world-info-history/index.js

// 严格按照官方示例导入所需模块
import {
    eventSource,
    event_types,
} from '../../../../script.js'; // 从 script.js 导入事件相关工具

import {
    extension_settings, // 用于存储插件设置（如果需要持久化历史记录）
    // renderExtensionTemplateAsync, // 如果使用 HTML 模板则需要导入
} from '../../../extensions.js'; // 从 extensions.js 导入

// jQuery ($) 通常是全局可用的，无需显式导入

// --- 插件配置和状态 ---
const extensionName = 'world-info-history'; // 必须和你的插件文件夹名称一致！
const MAX_HISTORY_LENGTH = 3; // 只存储最近 3 次记录

// 这个数组将存储最近几次的 World Info 激活元数据
// 注意：这个变量在页面刷新后会丢失。如果需要持久化，需要存入 extension_settings
let activationHistory = [];

// --- 事件处理函数 ---

/**
 * 当 WORLD_INFO_ACTIVATED 事件触发时调用的函数
 * @param {Array<object>} activatedEntries - 包含所有被激活的 World Info 条目对象的数组
 */
function handleWorldInfoActivated(activatedEntries) {
    console.log(`[${extensionName}] 检测到 ${activatedEntries.length} 个 World Info 条目被激活。`);

    // 1. 提取元数据 (排除 'content')
    const metadataList = activatedEntries.map(entry => {
        // 创建一个新对象，只包含我们想要的元数据字段
        // 你可以根据需要增删这里的字段
        const metadata = {
            uid: entry.uid,
            world: entry.world,        // 所属的书名
            key: entry.key,            // 主要关键词 (数组)
            keysecondary: entry.keysecondary, // 次要关键词 (数组)
            comment: entry.comment,    // 条目注释/标题
            order: entry.order,        // 插入顺序
            position: entry.position,  // 插入位置
            depth: entry.depth,        // 插入深度
            constant: entry.constant,  // 是否常驻
            selectiveLogic: entry.selectiveLogic, // 次要关键词逻辑
            hash: entry.hash,          // 内部哈希值
            // ... 其他你感兴趣的非 content 字段 ...

            // --- 关键：确保不包含 entry.content ---
        };
        // 移除值为 undefined 或 null 的字段，让输出更干净（可选）
        Object.keys(metadata).forEach(key => (metadata[key] === undefined || metadata[key] === null) && delete metadata[key]);
        return metadata;
    });

    // 2. 更新历史记录数组
    // 将最新的记录添加到数组的开头
    activationHistory.unshift(metadataList);

    // 3. 保持历史记录的长度限制
    // 如果数组长度超过了最大限制，则移除数组末尾最旧的记录
    if (activationHistory.length > MAX_HISTORY_LENGTH) {
        activationHistory.pop();
    }

    console.log(`[${extensionName}] 已记录最新的 World Info 元数据。当前历史记录 (${activationHistory.length}条):`, activationHistory);

    // 4. (可选) 更新 UI 显示
    // 如果你添加了用于显示历史记录的 HTML 元素，在这里调用更新函数
    updateHistoryDisplay();

    // 5. (可选) 如果需要持久化存储历史记录
    // if (!extension_settings[extensionName]) {
    //     extension_settings[extensionName] = {};
    // }
    // extension_settings[extensionName].history = activationHistory;
    // import { saveSettingsDebounced } from '../../../../script.js'; // 需要额外导入
    // saveSettingsDebounced();
}

// --- UI 更新函数 (示例) ---
// 这个函数将历史记录显示在插件的设置区域

function updateHistoryDisplay() {
    const displayElement = $('#wi-history-display-area'); // 获取我们创建的显示区域
    if (!displayElement.length) return; // 如果元素不存在则退出

    if (activationHistory.length === 0) {
        displayElement.text('尚未记录任何 World Info 激活信息。请发送一条消息。');
    } else {
        // 将历史记录数组格式化为易于阅读的 JSON 字符串
        // null, 2 用于美化 JSON 输出 (缩进 2 个空格)
        const formattedHistory = JSON.stringify(activationHistory, null, 2);
        // 使用 <pre> 标签可以保留格式和换行
        displayElement.html(`<pre>${formattedHistory}</pre>`);
    }
}


// --- 插件初始化 ---
jQuery(async () => {
    console.log(`[${extensionName}] 插件开始加载...`);

    // (可选) 加载持久化的设置，如果实现了步骤 5
    // if (extension_settings[extensionName] && extension_settings[extensionName].history) {
    //     activationHistory = extension_settings[extensionName].history;
    //     console.log(`[${extensionName}] 从设置中加载了 ${activationHistory.length} 条历史记录。`);
    // }

    // 创建用于显示历史记录的 UI 区域 (直接注入 HTML)
    const settingsHtml = `
    <div class="inline-drawer">
        <div class="inline-drawer-toggle inline-drawer-header">
            <b>World Info 激活历史 (最近 ${MAX_HISTORY_LENGTH} 次)</b>
            <div class="inline-drawer-icon fa-solid fa-circle-chevron-down down"></div>
        </div>
        <div class="inline-drawer-content">
            <p>这里显示每次发送消息后激活的 World Info 条目的元数据 (不含内容)。</p>
            <div id="wi-history-display-area" style="white-space: pre-wrap; font-family: monospace; max-height: 400px; overflow-y: auto; border: 1px solid #ccc; padding: 8px; margin-top: 5px; background-color: #f5f5f5;">
                <!-- 历史记录将显示在这里 -->
            </div>
        </div>
    </div>
    `;

    // 将 UI 添加到 SillyTavern 的扩展设置页面
    // 注意：'#extensions_settings' 是常见的注入点，但可能随 ST 版本变化
    $('#extensions_settings').append(settingsHtml);
    console.log(`[${extensionName}] UI 注入到 #extensions_settings`);

    // 注册事件监听器
    // 当 'WORLD_INFO_ACTIVATED' 事件发生时，调用 handleWorldInfoActivated 函数
    eventSource.on(event_types.WORLD_INFO_ACTIVATED, handleWorldInfoActivated);
    console.log(`[${extensionName}] 已注册 WORLD_INFO_ACTIVATED 事件监听器。`);

    // 初始化时更新一次显示区域
    updateHistoryDisplay();

    console.log(`[${extensionName}] 插件加载完成。`);
});
