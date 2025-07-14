// --- In-memory cache of persistent IDs ---
let processedIdsSet = new Set();

// --- Function to load already-processed IDs from persistent storage ---
function loadProcessedIds() {
    chrome.storage.local.get(['savedMemoryMessageIds'], (result) => {
        if (result.savedMemoryMessageIds && Array.isArray(result.savedMemoryMessageIds)) {
            processedIdsSet = new Set(result.savedMemoryMessageIds);
        }
    });
}

// --- Listener for commands from the popup ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'generateMemory' || request.action === 'remind') {
        sendPromptToChatGPT(request.prompt);
    } else if (request.action === 'updateMemory' && request.memoryId) {
        window.__memoryUpdateTargetId = request.memoryId;
        sendPromptToChatGPT(request.prompt);
    }
});

// --- Function to send prompt to the ChatGPT UI ---
function sendPromptToChatGPT(prompt) {
    const inputDiv = document.getElementById('prompt-textarea');
    if (!inputDiv) {
        console.error("ChatGPT Memory Ext: Could not find the chat input box.");
        return;
    }
    inputDiv.textContent = prompt; // Use .textContent for div
    inputDiv.dispatchEvent(new Event('input', { bubbles: true }));

    setTimeout(() => {
        const sendButton = document.querySelector('button[data-testid="send-button"]');
        if (!sendButton || sendButton.disabled) {
            console.error("ChatGPT Memory Ext: Could not find enabled send button.");
            return;
        }
        sendButton.click();
    }, 250);
}

// --- Simplified message processing function ---
// This function will be called with messageText and messageId from external detection

// --- Function to process a potential message ---
function processMessage(messageText, messageId) {
    console.log('[MemoryExt] processMessage called', { messageId, processed: processedIdsSet.has(messageId) });
    if (!messageId || processedIdsSet.has(messageId)) return;

    // Handle [START_MEMORY_EDIT] for updates
    if (messageText.includes('[START_MEMORY_EDIT]') && (messageText.includes('[END_MEMORY_EDIT]'))) {
        console.log('[MemoryExt] Detected memory edit block', { messageId });
        const memoryContent = messageText.substring(
            messageText.indexOf('[START_MEMORY_EDIT]') + '[START_MEMORY_EDIT]'.length,
            messageText.indexOf('[END_MEMORY_EDIT]')
        ).trim();
        const idMatch = memoryContent.match(/Id:\s*(.*)/);
        const titleMatch = memoryContent.match(/Title:\s*(.*)/);
        const infoMatch = memoryContent.match(/Info:\s*([\s\S]*)/);
        if (idMatch && titleMatch && infoMatch) {
            const memoryObj = {
                id: idMatch[1].trim(),
                title: titleMatch[1].trim(),
                info: memoryContent.substring(infoMatch.index + 'Info:'.length).trim(),
                url: window.location.href,
            };
            chrome.storage.local.get(['memories', 'savedMemoryMessageIds'], (result) => {
                let memories = result.memories || [];
                const savedIds = Array.from(processedIdsSet);
                const idx = memories.findIndex(m => m.id === memoryObj.id);
                if (idx !== -1) {
                    memories[idx] = { ...memories[idx], ...memoryObj };
                    chrome.storage.local.set({ memories, savedMemoryMessageIds: savedIds }, () => {
                        chrome.runtime.sendMessage({ action: 'memory_updated' });
                    });
                }
            });
        }
        return;
    }
    
    // Handle [START_MEMORY] for new memories (or legacy update)
    if (messageText.includes('[START_MEMORY]') && messageText.includes('[END_MEMORY]')) {
        console.log('[MemoryExt] Detected new memory block', { messageId });
        if (messageText.includes('[CONTEXT_UPDATE]')) return;
        processedIdsSet.add(messageId);

        const memoryContent = messageText.substring(
            messageText.indexOf('[START_MEMORY]') + '[START_MEMORY]'.length,
            messageText.indexOf('[END_MEMORY]')
        ).trim();

        const titleMatch = memoryContent.match(/Title:\s*(.*)/);
        const infoMatch = memoryContent.match(/Info:\s*([\s\S]*)/);
        if (titleMatch && infoMatch) {
            const memoryObj = {
                title: titleMatch[1].trim(),
                info: memoryContent.substring(infoMatch.index + 'Info:'.length).trim(),
                url: window.location.href,
            };
            chrome.storage.local.get(['memories', 'savedMemoryMessageIds'], (result) => {
                let memories = result.memories || [];
                const savedIds = Array.from(processedIdsSet);
                if (window.__memoryUpdateTargetId) {
                    // Update existing memory (legacy)
                    const idx = memories.findIndex(m => m.id === window.__memoryUpdateTargetId);
                    if (idx !== -1) {
                        memories[idx] = { ...memories[idx], ...memoryObj };
                        chrome.storage.local.set({ memories, savedMemoryMessageIds: savedIds }, () => {
                            chrome.runtime.sendMessage({ action: 'memory_updated' });
                        });
                    }
                    window.__memoryUpdateTargetId = null;
                } else {
                    // Add new memory
                    const newMemory = { id: new Date().toISOString(), ...memoryObj };
                    memories.push(newMemory);
                    chrome.storage.local.set({ memories, savedMemoryMessageIds: savedIds }, () => {
                        chrome.runtime.sendMessage({ action: 'memory_created' });
                    });
                }
            });
        }
    }
}

// --- On-Page UI Injection and Logic ---

function getMemoriesForCategory(categoryName, callback) {
    chrome.storage.local.get(['memories'], (result) => {
        const allMemories = result.memories || [];
        const categoryMemories = allMemories.filter(m => m.categories && m.categories.includes(categoryName));
        callback(categoryMemories);
    });
}

// --- Debounced multi-category reminder logic ---
let selectedCategories = new Set();
let remindDebounceTimer = null;
let remindDebounceSession = 0;

function remindForCategory(categoryName) {
    selectedCategories.add(categoryName);
    if (remindDebounceTimer) {
        clearTimeout(remindDebounceTimer);
    }
    remindDebounceSession++;
    const thisSession = remindDebounceSession;
    // Wait for the text input to appear before running reminder logic
    function runReminderWhenInputReady() {
        const inputDiv = document.getElementById('prompt-textarea');
        if (!inputDiv) {
            setTimeout(runReminderWhenInputReady, 50);
            return;
        }
        // Gather all memories for all selected categories
        const categoriesToRemind = Array.from(selectedCategories);
        let allMemories = [];
        let categoriesProcessed = 0;
        if (categoriesToRemind.length === 0) {
            remindDebounceTimer = null;
            return;
        }
        categoriesToRemind.forEach(cat => {
            getMemoriesForCategory(cat, (memoriesToRemind) => {
                // If a new session started, ignore this callback
                if (thisSession !== remindDebounceSession) return;
                if (memoriesToRemind.length > 0) {
                    allMemories.push({
                        category: cat,
                        memories: memoriesToRemind
                    });
                }
                categoriesProcessed++;
                if (categoriesProcessed === categoriesToRemind.length) {
                    // All categories processed, now send the combined reminder
                    if (allMemories.length > 0) {
                        let memoryText = allMemories.map(group => {
                            return `Category: ${group.category}\n` + group.memories.map(m => `Title: ${m.title}\nInfo: ${m.info}`).join('\n\n---\n\n');
                        }).join('\n\n====================\n\n');
                        const remindPrompt = `[CONTEXT_UPDATE]\nThe following are memories of our previous conversations under the categories: ${categoriesToRemind.join(", ")}. I am providing them to restore your context. Read and internalize them. Do not treat this as a question or a task.\n\nOnce you have processed this information, your ONLY response should be: "How can I help you today?"\n\n--- START MEMORIES ---\n\n${memoryText}\n\n--- END MEMORIES ---\n\nNow, provide only the confirmation message and await my next real prompt.`;
                        sendPromptToChatGPT(remindPrompt);
                    }
                    selectedCategories.clear();
                    remindDebounceTimer = null;
                }
            });
        });
    }
    remindDebounceTimer = setTimeout(runReminderWhenInputReady, 0);
}

function injectCategoryRemindersUI() {
    const widgetId = 'memory-bank-widget-container';
    if (document.getElementById(widgetId)) return;


    chrome.storage.local.get(['memory_categories', 'memories'], result => {
        const allMemories = result.memories || [];
        const categories = (result.memory_categories || ['default'])
            .map(cat => {
                const count = allMemories.filter(m => m.categories && m.categories.includes(cat)).length;
                return { name: cat, count };
            })
            .filter(catObj => catObj.count > 0);
        if (categories.length === 0) return; // No categories with memories

        const mainContainer = document.createElement('div');
        mainContainer.id = widgetId;
        mainContainer.style.position = 'fixed';
        mainContainer.style.top = '50%';
        mainContainer.style.right = '0';
        mainContainer.style.transform = 'translateY(-50%)';
        mainContainer.style.zIndex = '1001';
        mainContainer.style.padding = '10px'; 
        mainContainer.style.display = 'flex';
        mainContainer.style.alignItems = 'center';

        const widgetButton = document.createElement('button');
        widgetButton.innerText = '🧠';
        widgetButton.style.backgroundColor = '#2a2a31';
        widgetButton.style.color = '#ececf1';
        widgetButton.style.border = '1px solid #4a4a58';
        widgetButton.style.borderRadius = '8px';
        widgetButton.style.width = '44px';
        widgetButton.style.height = '44px';
        widgetButton.style.fontSize = '24px';
        widgetButton.style.cursor = 'pointer';
        widgetButton.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';

        const dropdown = document.createElement('div');
        dropdown.className = 'memory-bank-dropdown';
        dropdown.style.display = 'none';
        dropdown.style.marginRight = '10px';
        dropdown.style.backgroundColor = '#2a2a31';
        dropdown.style.border = '1px solid #4a4a58';
        dropdown.style.borderRadius = '8px';
        dropdown.style.padding = '8px';
        dropdown.style.minWidth = '200px';
        dropdown.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';

        // --- ALWAYS VISIBLE: Circular Timer Indicator (smaller, left) ---
        const indicator = document.createElement('div');
        indicator.style.display = 'flex';
        indicator.style.justifyContent = 'center';
        indicator.style.alignItems = 'center';
        indicator.style.marginRight = '12px';
        indicator.style.height = '24px';
        indicator.style.width = '24px';
        indicator.style.flexShrink = '0';
        indicator.style.position = 'absolute';
        indicator.style.left = '-36px';
        indicator.style.top = '12px';
        indicator.style.background = 'none';
        dropdown.style.position = 'relative';
        dropdown.appendChild(indicator);

        // SVG Circular Progress (smaller)
        const svgNS = 'http://www.w3.org/2000/svg';
        const svg = document.createElementNS(svgNS, 'svg');
        svg.setAttribute('width', '24');
        svg.setAttribute('height', '24');
        svg.setAttribute('viewBox', '0 0 24 24');
        svg.style.display = 'none';
        svg.style.margin = '0 auto';
        const bgCircle = document.createElementNS(svgNS, 'circle');
        bgCircle.setAttribute('cx', '12');
        bgCircle.setAttribute('cy', '12');
        bgCircle.setAttribute('r', '10');
        bgCircle.setAttribute('stroke', '#444');
        bgCircle.setAttribute('stroke-width', '3');
        bgCircle.setAttribute('fill', 'none');
        svg.appendChild(bgCircle);
        const fgCircle = document.createElementNS(svgNS, 'circle');
        fgCircle.setAttribute('cx', '12');
        fgCircle.setAttribute('cy', '12');
        fgCircle.setAttribute('r', '10');
        fgCircle.setAttribute('stroke', '#ffe082');
        fgCircle.setAttribute('stroke-width', '3');
        fgCircle.setAttribute('fill', 'none');
        fgCircle.setAttribute('stroke-linecap', 'round');
        fgCircle.setAttribute('transform', 'rotate(-90 12 12)');
        fgCircle.setAttribute('stroke-dasharray', 2 * Math.PI * 10);
        fgCircle.setAttribute('stroke-dashoffset', 0);
        svg.appendChild(fgCircle);
        // Timer text
        const timerText = document.createElementNS(svgNS, 'text');
        timerText.setAttribute('x', '12');
        timerText.setAttribute('y', '16');
        timerText.setAttribute('text-anchor', 'middle');
        timerText.setAttribute('font-size', '9');
        timerText.setAttribute('fill', '#ffe082');
        timerText.textContent = '1.0';
        svg.appendChild(timerText);
        indicator.appendChild(svg);

        // --- Timer update logic ---
        let timerInterval = null;
        let remaining = 1.0;
        function resetIndicator() {
            remaining = 1.0;
            timerText.textContent = remaining.toFixed(1);
            const totalLen = 2 * Math.PI * 10;
            fgCircle.setAttribute('stroke-dasharray', totalLen);
            fgCircle.setAttribute('stroke-dashoffset', 0);
        }
        function startIndicator() {
            resetIndicator();
            svg.style.display = 'block'; // Make SVG visible when selection starts
            if (timerInterval) clearInterval(timerInterval);
            timerInterval = setInterval(() => {
                if (dropdown.style.display === 'none') {
                    clearInterval(timerInterval);
                    svg.style.display = 'none'; // Hide SVG when dropdown closes
                    return;
                }
                remaining -= 0.1;
                if (remaining <= 0) {
                    timerText.textContent = '0.0';
                    fgCircle.setAttribute('stroke-dashoffset', 2 * Math.PI * 10);
                    clearInterval(timerInterval);
                    // Timer finished, send reminders for all selected categories
                    sendAllSelectedCategoryReminders();
                } else {
                    timerText.textContent = remaining.toFixed(1);
                    fgCircle.setAttribute('stroke-dashoffset', (2 * Math.PI * 10) * (1 - remaining / 1.0));
                }
            }, 100);
        }
        // Send reminders for all selected categories together after timer ends
        function sendAllSelectedCategoryReminders() {
            const categoriesToRemind = Array.from(selectedCategories);
            if (categoriesToRemind.length === 0) return;
            let allMemories = [];
            let categoriesProcessed = 0;
            categoriesToRemind.forEach(cat => {
                getMemoriesForCategory(cat, (memoriesToRemind) => {
                    if (memoriesToRemind.length > 0) {
                        allMemories.push({
                            category: cat,
                            memories: memoriesToRemind
                        });
                    }
                    categoriesProcessed++;
                    if (categoriesProcessed === categoriesToRemind.length) {
                        if (allMemories.length > 0) {
                            let memoryText = allMemories.map(group => {
                                return `Category: ${group.category}\n` + group.memories.map(m => `Title: ${m.title}\nInfo: ${m.info}`).join('\n\n---\n\n');
                            }).join('\n\n====================\n\n');
                            const remindPrompt = `[CONTEXT_UPDATE]\nThe following are memories of our previous conversations under the categories: ${categoriesToRemind.join(", ")}. I am providing them to restore your context. Read and internalize them. Do not treat this as a question or a task.\n\nOnce you have processed this information, your ONLY response should be: \"How can I help you today?\"\n\n--- START MEMORIES ---\n\n${memoryText}\n\n--- END MEMORIES ---\n\nNow, provide only the confirmation message and await my next real prompt.`;
                            // Wait for chat input box before sending
                            function trySendPrompt() {
                                const inputDiv = document.getElementById('prompt-textarea');
                                if (!inputDiv) {
                                    setTimeout(trySendPrompt, 100);
                                    return;
                                }
                                sendPromptToChatGPT(remindPrompt);
                            }
                            trySendPrompt();
                        }
                        selectedCategories.clear();
                        updateButtonStyles();
                    }
                });
            });
        }

        // --- Patch remindForCategory to start indicator and update button styles ---
        const origRemindForCategory = remindForCategory;
        remindForCategory = function(categoryName, immediate = false) {
            selectedCategories.add(categoryName);
            resetIndicator();
            updateButtonStyles();
            if (immediate) {
                sendAllSelectedCategoryReminders();
            } else {
                startIndicator();
            }
        };

        // --- Track and style selected buttons ---
        let buttonMap = new Map();
        function updateButtonStyles() {
            buttonMap.forEach((btn, cat) => {
                if (selectedCategories.has(cat)) {
                    btn.style.backgroundColor = '#ffe082';
                    btn.style.color = '#2a2a31';
                    btn.style.fontWeight = 'bold';
                    btn.style.boxShadow = '0 0 0 2px #ffe08255';
                } else {
                    btn.style.backgroundColor = '#393945';
                    btn.style.color = '#fff';
                    btn.style.fontWeight = 'normal';
                    btn.style.boxShadow = 'none';
                }
            });
        }

        // --- Reset selection and indicator on popup open ---
        function resetSelectionAndIndicator() {
            selectedCategories.clear();
            updateButtonStyles();
            resetIndicator();
        }

        // Show timer always, reset on open
        resetIndicator();
        indicator.style.display = 'flex';

        categories.forEach(catObj => {
            const item = document.createElement('div');
            item.style.display = 'flex';
            item.style.justifyContent = 'space-between';
            item.style.alignItems = 'center';
            item.style.padding = '6px';
            item.style.color = '#ececf1';
            const catName = document.createElement('span');
            catName.innerText = `${catObj.name} (${catObj.count})`;
            item.appendChild(catName);
            const remindBtn = document.createElement('button');
            remindBtn.innerText = 'Remind';
            remindBtn.dataset.category = catObj.name;
            remindBtn.style.marginLeft = '12px';
            remindBtn.style.backgroundColor = '#393945';
            remindBtn.style.color = '#fff';
            remindBtn.style.border = 'none';
            remindBtn.style.borderRadius = '6px';
            remindBtn.style.padding = '4px 8px';
            remindBtn.style.cursor = 'pointer';
            remindBtn.onclick = (e) => {
                e.stopPropagation();
                remindForCategory(e.target.dataset.category);
            };
            item.appendChild(remindBtn);
            dropdown.appendChild(item);
            buttonMap.set(catObj.name, remindBtn);
        });

        mainContainer.appendChild(dropdown);
        mainContainer.appendChild(widgetButton);

        mainContainer.onmouseenter = () => {
            dropdown.style.display = 'block';
            resetSelectionAndIndicator();
        };
        mainContainer.onmouseleave = () => {
            dropdown.style.display = 'none';
            if (timerInterval) clearInterval(timerInterval);
        };

        document.body.appendChild(mainContainer);
    });
}

// --- Helper: Check if current URL is root ChatGPT page (no path, only params allowed) ---
function isRootChatGPTUrl() {
    const url = new URL(window.location.href);
    return (
        url.hostname === "chatgpt.com" &&
        (url.pathname === "/" || url.pathname === "") &&
        (
            url.search === "" ||
            url.search === "?model=auto"
        )
    );
}

// --- Helper: Remind for 'default' if any memories exist ---
function remindDefaultIfAny() {
    getMemoriesForCategory('default', (memories) => {
        if (memories && memories.length > 0) {
            remindForCategory('default', true); // Send immediately for default
        }
    });
}

// --- Listen for URL changes (SPA navigation) ---
function setupUrlChangeListener() {
    let lastUrl = window.location.href;
    const checkUrl = () => {
        if (window.location.href !== lastUrl) {
            lastUrl = window.location.href;
            if (isRootChatGPTUrl()) {
                remindDefaultIfAny();
            }
        }
    };
    // Patch pushState/replaceState
    ['pushState', 'replaceState'].forEach(fn => {
        const orig = history[fn];
        history[fn] = function() {
            const ret = orig.apply(this, arguments);
            setTimeout(checkUrl, 100);
            return ret;
        };
    });
    // Listen for popstate and hashchange
    window.addEventListener('popstate', () => setTimeout(checkUrl, 100));
    window.addEventListener('hashchange', () => setTimeout(checkUrl, 100));
    // Also poll as fallback
    setInterval(checkUrl, 1000);
}

// --- Main initialization function ---
function initialize() {
    loadProcessedIds();
    injectCategoryRemindersUI();
    // On first load, check and remind if needed
    if (isRootChatGPTUrl()) {
        remindDefaultIfAny();
    }
    setupUrlChangeListener();
}
// --- Function to detect new messages and process them ---
function detectNewMessages() {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType !== 1) return;
                const assistantMessages = Array.from(node.querySelectorAll('div[data-message-author-role="assistant"]'));
                if (node.matches('div[data-message-author-role="assistant"]')) {
                    assistantMessages.push(node);
                }
                assistantMessages.forEach(msgNode => {
                    const msgId = msgNode.getAttribute('data-message-id');
                    const msgDiv = msgNode.querySelector('.markdown');
                    if (!msgDiv) return;
                    const msgText = msgDiv.innerText || "";
                    console.log('[MemoryExt] Detected message:', { msgId, msgText });
                    processMessage(msgText, msgId);
                });
            });
            if (mutation.type === 'attributes' && mutation.target.matches('.markdown')) {
                const assistantMessageNode = mutation.target.closest('div[data-message-author-role="assistant"]');
                if (assistantMessageNode) {
                    const msgId = assistantMessageNode.getAttribute('data-message-id');
                    const msgDiv = assistantMessageNode.querySelector('.markdown');
                    if (!msgDiv) return;
                    const msgText = msgDiv.innerText || "";
                    console.log('[MemoryExt] Detected message (attribute):', { msgId, msgText });
                    processMessage(msgText, msgId);
                }
            }
        });
    });

    const mainContent = document.querySelector('main');
    if (mainContent) {
        observer.observe(mainContent, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class']
        });
    } else {
        // Try again as soon as possible
        if (document.readyState === 'complete' || document.readyState === 'interactive') {
            setTimeout(detectNewMessages, 100);
        } else {
            window.addEventListener('DOMContentLoaded', detectNewMessages, { once: true });
        }
    }
}
detectNewMessages();
initialize();