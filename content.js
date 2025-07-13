// --- In-memory cache of persistent IDs ---
let processedIdsSet = new Set();
let lastUrl = ''; // Initialize as empty to ensure the first check always runs

// --- Function to load already-processed IDs from persistent storage ---
function loadProcessedIds() {
    chrome.storage.local.get(['savedMemoryMessageIds'], (result) => {
        if (result.savedMemoryMessageIds && Array.isArray(result.savedMemoryMessageIds)) {
            processedIdsSet = new Set(result.savedMemoryMessageIds);
            console.log(`ChatGPT Memory Ext: Loaded ${processedIdsSet.size} previously processed message IDs.`);
        }
    });
}

// --- Listener for commands from the popup ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'generateMemory' || request.action === 'remind') {
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

// --- Observer to watch for AI responses (for memory creation) ---
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        const processNode = (node) => {
            if (node.nodeType !== 1) return;
            const assistantMessages = Array.from(node.querySelectorAll('div[data-message-author-role="assistant"]'));
            if (node.matches('div[data-message-author-role="assistant"]')) {
                assistantMessages.push(node);
            }
            assistantMessages.forEach(processMessage);
        };
        mutation.addedNodes.forEach(processNode);
    });
});

// --- Function to process a potential message ---
function processMessage(messageNode) {
    const messageId = messageNode.getAttribute('data-message-id');
    if (!messageId || processedIdsSet.has(messageId)) return;

    const messageDiv = messageNode.querySelector('.markdown');
    if (!messageDiv) return;

    const messageText = messageDiv.innerText || "";

    if (messageText.includes('[START_MEMORY]') && messageText.includes('[END_MEMORY]')) {
        if (messageText.includes('[CONTEXT_UPDATE]')) return;
        
        processedIdsSet.add(messageId);

        const memoryContent = messageText.substring(
            messageText.indexOf('[START_MEMORY]') + '[START_MEMORY]'.length,
            messageText.indexOf('[END_MEMORY]')
        ).trim();

        const titleMatch = memoryContent.match(/Title:\s*(.*)/);
        const infoMatch = memoryContent.match(/Info:\s*([\s\S]*)/);
        
        if (titleMatch && infoMatch) {
            const newMemory = {
                id: new Date().toISOString(),
                title: titleMatch[1].trim(),
                info: memoryContent.substring(infoMatch.index + 'Info:'.length).trim(),
                url: window.location.href,
                categories: ['default'] 
            };

            chrome.storage.local.get(['memories', 'savedMemoryMessageIds'], (result) => {
                const memories = result.memories || [];
                const savedIds = Array.from(processedIdsSet);
                memories.push(newMemory);

                chrome.storage.local.set({ 
                    memories: memories, 
                    savedMemoryMessageIds: savedIds 
                }, () => {
                    console.log('Successfully saved memory and its ID:', messageId);
                    chrome.runtime.sendMessage({ action: 'memory_created' });
                    chrome.notifications.create({
                        type: 'basic',
                        iconUrl: 'icons/icon48.png',
                        title: 'ChatGPT Memory Saved!',
                        message: `Memory "${newMemory.title}" added to 'default' category.`
                    });
                });
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

function remindForCategory(categoryName) {
    getMemoriesForCategory(categoryName, (memoriesToRemind) => {
        if (memoriesToRemind.length > 0) {
            console.log(`Reminding ChatGPT of ${memoriesToRemind.length} memories in '${categoryName}' category.`);
            let memoryText = memoriesToRemind.map(m => `Title: ${m.title}\nInfo: ${m.info}`).join('\n\n---\n\n');
            const remindPrompt = `[CONTEXT_UPDATE]\nThe following are memories of our previous conversations under the category "${categoryName}". I am providing them to restore your context. Read and internalize them. Do not treat this as a question or a task.\n\nOnce you have processed this information, your ONLY response should be: "Understood. My context is updated. Please proceed."\n\n--- START MEMORIES ---\n\n${memoryText}\n\n--- END MEMORIES ---\n\nNow, provide only the confirmation message and await my next real prompt.`;
            sendPromptToChatGPT(remindPrompt);
        } else {
            console.log(`No memories found for category: ${categoryName}`);
        }
    });
}

function injectCategoryRemindersUI() {
    const widgetId = 'memory-bank-widget-container';
    if (document.getElementById(widgetId)) return;

    chrome.storage.local.get(['memory_categories'], result => {
        const categories = result.memory_categories || ['default'];

        // --- CHANGED: Create a main container for positioning and hover ---
        const mainContainer = document.createElement('div');
        mainContainer.id = widgetId;
        mainContainer.style.position = 'fixed';
        mainContainer.style.top = '50%';
        mainContainer.style.right = '0';
        mainContainer.style.transform = 'translateY(-50%)';
        mainContainer.style.zIndex = '1001';
        // --- NEW: This padding creates the gap without being a dead zone ---
        mainContainer.style.padding = '10px'; 
        mainContainer.style.display = 'flex';
        mainContainer.style.alignItems = 'center';

        const widgetButton = document.createElement('button');
        widgetButton.innerText = '🧠';
        widgetButton.title = 'Memory Bank Categories';
        widgetButton.style.backgroundColor = '#2a2a31';
        widgetButton.style.color = '#ececf1';
        widgetButton.style.border = '1px solid #4a4a58';
        widgetButton.style.borderRadius = '8px'; // Can be fully rounded now
        widgetButton.style.width = '44px';
        widgetButton.style.height = '44px';
        widgetButton.style.fontSize = '24px';
        widgetButton.style.cursor = 'pointer';
        widgetButton.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
        
        const dropdown = document.createElement('div');
        dropdown.className = 'memory-bank-dropdown';
        dropdown.style.display = 'none'; // Initially hidden
        // --- CHANGED: No longer needs absolute positioning relative to the page ---
        dropdown.style.marginRight = '10px';
        dropdown.style.backgroundColor = '#2a2a31';
        dropdown.style.border = '1px solid #4a4a58';
        dropdown.style.borderRadius = '8px';
        dropdown.style.padding = '8px';
        dropdown.style.minWidth = '200px';
        dropdown.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
        
        categories.forEach(cat => {
            const item = document.createElement('div');
            item.style.display = 'flex';
            item.style.justifyContent = 'space-between';
            item.style.alignItems = 'center';
            item.style.padding = '6px';
            item.style.color = '#ececf1';
            const catName = document.createElement('span');
            catName.innerText = cat;
            item.appendChild(catName);
            const remindBtn = document.createElement('button');
            remindBtn.innerText = 'Remind';
            remindBtn.dataset.category = cat;
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
        });

        // --- CHANGED: Assemble the widget inside the main container ---
        // Order is reversed for flexbox to place dropdown on the left
        mainContainer.appendChild(dropdown);
        mainContainer.appendChild(widgetButton);
        
        // --- CHANGED: Hover events are now on the main container ---
        mainContainer.onmouseenter = () => { dropdown.style.display = 'block'; };
        mainContainer.onmouseleave = () => { dropdown.style.display = 'none'; };
        
        document.body.appendChild(mainContainer);
        console.log('ChatGPT Memory Ext: On-page widget injected.');
    });
}

// --- NEW: Function to wait for the page to be ready and then remind ---
function scheduleDefaultReminder() {
    console.log("Scheduling reminder for 'default' category. Waiting for input box...");
    
    // Check if input is already there
    if (document.getElementById('prompt-textarea')) {
        console.log("Input box found immediately. Reminding now.");
        remindForCategory('default');
        return;
    }

    // If not, wait for it to appear
    const pageReadyObserver = new MutationObserver((mutations, observer) => {
        if (document.getElementById('prompt-textarea')) {
            console.log("Input box has appeared. Reminding now.");
            remindForCategory('default');
            observer.disconnect(); // Clean up: stop observing once done
        }
    });

    pageReadyObserver.observe(document.body, {
        childList: true,
        subtree: true
    });
}

// --- REVISED: Check for New Chat URL logic ---
function checkForNewChat() {
    const currentUrl = window.location.href;
    if (currentUrl === lastUrl) {
        return; // No change, do nothing.
    }

    try {
        const url = new URL(currentUrl);
        const isCurrentPageNewChat = (url.pathname === '/' || url.pathname.startsWith('/?'));
        
        let shouldTriggerReminder = false;

        if (lastUrl === '') {
            // Initial page load
            if (isCurrentPageNewChat) {
                shouldTriggerReminder = true;
                console.log("ChatGPT Memory Ext: New chat detected on initial load.");
            }
        } else {
            // Navigation
            const oldUrl = new URL(lastUrl);
            const wasPreviousPageChat = oldUrl.pathname.startsWith('/c/');
            if (isCurrentPageNewChat && wasPreviousPageChat) {
                shouldTriggerReminder = true;
                console.log("ChatGPT Memory Ext: New chat detected via navigation.");
            }
        }
        
        if (shouldTriggerReminder) {
            // --- CHANGED: Use the new scheduler instead of setTimeout ---
            scheduleDefaultReminder();
        }
    } catch(e) {
        console.error("URL parsing error", e);
    }
    
    lastUrl = currentUrl;
}

// --- Main initialization function ---
function initialize() {
    loadProcessedIds();
    
    const mainContent = document.querySelector('main');
    if (mainContent) {
        observer.observe(mainContent, { childList: true, subtree: true });
        console.log("ChatGPT Memory Ext: Response observer started.");
        injectCategoryRemindersUI();
    } else {
        setTimeout(initialize, 1000);
        return;
    }

    checkForNewChat(); 
    setInterval(checkForNewChat, 1000);
}

initialize();