// --- NEW: This will now be our in-memory cache of persistent IDs ---
let processedIdsSet = new Set();

// --- NEW: Function to load already-processed IDs from persistent storage ---
function loadProcessedIds() {
    chrome.storage.local.get(['savedMemoryMessageIds'], (result) => {
        if (result.savedMemoryMessageIds && Array.isArray(result.savedMemoryMessageIds)) {
            processedIdsSet = new Set(result.savedMemoryMessageIds);
            console.log(`ChatGPT Memory Ext: Loaded ${processedIdsSet.size} previously processed message IDs.`);
        }
    });
}


// --- Main Listener for commands from the popup (no changes) ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'generateMemory' || request.action === 'remind') {
        sendPromptToChatGPT(request.prompt);
    }
});


// --- Function to send prompt to the ChatGPT UI (no changes) ---
function sendPromptToChatGPT(prompt) {
    const inputDiv = document.getElementById('prompt-textarea');
    if (!inputDiv) {
        console.error("ChatGPT Memory Ext: Could not find the chat input box.");
        return;
    }

    inputDiv.textContent = prompt;
    inputDiv.dispatchEvent(new Event('input', { bubbles: true }));

    setTimeout(() => {
        const sendButton = document.querySelector('button[data-testid="send-button"]');
        if (!sendButton) {
            console.error("ChatGPT Memory Ext: Could not find the send button.");
            return;
        }

        if (sendButton.disabled) {
            console.error("ChatGPT Memory Ext: Send button is still disabled after a delay.");
        } else {
            sendButton.click();
        }
    }, 250);
}


// --- Observer to watch for AI responses (no major changes to observer itself) ---
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
        if (mutation.type === 'attributes' && mutation.target.matches('.markdown')) {
            const assistantMessageNode = mutation.target.closest('div[data-message-author-role="assistant"]');
            if (assistantMessageNode) {
                processMessage(assistantMessageNode);
            }
        }
    });
});


// --- Function to process a potential message (MAJOR CHANGES HERE) ---
function processMessage(messageNode) {
    const messageId = messageNode.getAttribute('data-message-id');

    // --- FIX: Check against our now-persistent set of IDs ---
    if (!messageId || processedIdsSet.has(messageId)) {
        return;
    }

    const messageDiv = messageNode.querySelector('.markdown');
    if (!messageDiv) return;

    const messageText = messageDiv.innerText || "";

    if (messageText.includes('[START_MEMORY]') && messageText.includes('[END_MEMORY]')) {
        if (messageText.includes('[CONTEXT_UPDATE]')) {
            return;
        }
        
        // --- FIX: We add the ID to our in-memory set immediately to prevent race conditions ---
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
                url: window.location.href
            };

            // --- FIX: Save both the memory AND the message ID to persistent storage ---
            chrome.storage.local.get(['memories', 'savedMemoryMessageIds'], (result) => {
                const memories = result.memories || [];
                // Use the in-memory set to create the new array to be saved.
                const savedIds = Array.from(processedIdsSet);

                memories.push(newMemory);

                chrome.storage.local.set({ 
                    memories: memories, 
                    savedMemoryMessageIds: savedIds // Persist the updated list of IDs
                }, () => {
                    console.log('Successfully saved memory and its ID:', messageId);
                    chrome.runtime.sendMessage({ action: 'memory_created' });
                    chrome.notifications.create({
                        type: 'basic',
                        iconUrl: 'icons/icon48.png',
                        title: 'ChatGPT Memory Saved!',
                        message: `The memory "${newMemory.title}" has been added.`
                    });
                });
            });
        }
    }
}


// --- Function to start the observer ---
function startObserver() {
    const mainContent = document.querySelector('main');
    if (mainContent) {
        observer.observe(mainContent, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class']
        });
        console.log("ChatGPT Memory Ext: Robust observer started.");
    } else {
        setTimeout(startObserver, 1000);
    }
}

// --- NEW: On script start, load the IDs first, then start observing ---
loadProcessedIds();
startObserver();