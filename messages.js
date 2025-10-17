// messages.js
document.addEventListener('DOMContentLoaded', function() {
    // Message data for different conversations
    const conversationsData = {
        michael: {
            name: "Michael Chen",
            title: "Software Engineer at Google",
            messages: [
                { type: "received", text: "Hey Sarah! How's the React project coming along?", time: "2:30 PM" },
                { type: "sent", text: "Going great! Just finished the authentication system. How about your end?", time: "2:32 PM" },
                { type: "received", text: "Awesome! I completed the backend API. Want to sync up tomorrow?", time: "2:35 PM" }
            ]
        },
        emily: {
            name: "Emily Rodriguez",
            title: "Product Manager at StartupX",
            messages: [
                { type: "received", text: "Hi Sarah! I reviewed your proposal - it looks excellent!", time: "10:15 AM" },
                { type: "sent", text: "Thanks Emily! I'm glad you liked it. Any specific feedback?", time: "10:20 AM" },
                { type: "received", text: "The timeline looks good. Let's discuss the budget details.", time: "10:25 AM" }
            ]
        },
        david: {
            name: "David Kim",
            title: "UX Designer at CreativeLabs",
            messages: [
                { type: "received", text: "Hey Sarah! I have some design mockups ready for review.", time: "3:45 PM" },
                { type: "sent", text: "Perfect! Can you share them with me?", time: "3:48 PM" },
                { type: "received", text: "Just sent them over. Let me know your thoughts!", time: "3:50 PM" }
            ]
        }
    };

    let currentConversation = 'michael';
    const messagesList = document.querySelector('.messages-list');
    const messageInput = document.querySelector('.message-input input');
    const sendBtn = document.querySelector('.send-btn');
    const chatUser = document.querySelector('.chat-user');

    // Load conversation messages
    function loadConversation(userId) {
        currentConversation = userId;
        const conversation = conversationsData[userId];
        
        // Update chat header
        chatUser.querySelector('h3').textContent = conversation.name;
        chatUser.querySelector('p').textContent = conversation.title;
        chatUser.querySelector('img').alt = `${conversation.name} - ${conversation.title}`;
        
        // Clear current messages
        messagesList.innerHTML = '';
        
        // Load messages
        conversation.messages.forEach(msg => {
            addMessageToChat(msg.type, msg.text, msg.time, conversation.name);
        });
        
        // Scroll to bottom
        messagesList.scrollTop = messagesList.scrollHeight;
    }

    // Add message to chat
    function addMessageToChat(type, text, time, userName = '') {
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${type}`;
        
        if (type === 'received') {
            const img = document.createElement('img');
            img.src = 'https://placehold.co/40x40';
            img.alt = `${userName} profile picture`;
            messageDiv.appendChild(img);
        }
        
        const messageContent = document.createElement('div');
        messageContent.className = 'message-content';
        
        const messagePara = document.createElement('p');
        messagePara.textContent = text;
        
        const timeSpan = document.createElement('span');
        timeSpan.className = 'time';
        timeSpan.textContent = time;
        
        messageContent.appendChild(messagePara);
        messageContent.appendChild(timeSpan);
        messageDiv.appendChild(messageContent);
        
        messagesList.appendChild(messageDiv);
    }

    // Send message functionality
    function sendMessage() {
        const messageText = messageInput.value.trim();
        if (messageText) {
            const currentTime = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
            
            // Add sent message
            addMessageToChat('sent', messageText, currentTime);
            
            // Save to conversation data
            conversationsData[currentConversation].messages.push({
                type: 'sent',
                text: messageText,
                time: currentTime
            });
            
            messageInput.value = '';
            
            // Scroll to bottom
            messagesList.scrollTop = messagesList.scrollHeight;
            
            // Simulate reply after 1 second
            setTimeout(simulateReply, 1000);
        }
    }

    // Simulate reply
    function simulateReply() {
        const conversation = conversationsData[currentConversation];
        const currentTime = new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        
        const replies = {
            michael: "Sounds good! Looking forward to our meeting tomorrow.",
            emily: "Great! I'll prepare the budget breakdown for our discussion.",
            david: "Perfect! I'll wait for your feedback on the mockups."
        };
        
        const replyText = replies[currentConversation];
        
        // Add received message
        addMessageToChat('received', replyText, currentTime, conversation.name);
        
        // Save to conversation data
        conversation.messages.push({
            type: 'received',
            text: replyText,
            time: currentTime
        });
        
        // Scroll to bottom
        messagesList.scrollTop = messagesList.scrollHeight;
        
        // Update conversation preview
        updateConversationPreview(currentConversation, replyText);
    }

    // Update conversation preview in sidebar
    function updateConversationPreview(userId, lastMessage) {
        const conversation = document.querySelector(`.conversation[data-user="${userId}"]`);
        if (conversation) {
            conversation.querySelector('p').textContent = lastMessage;
            conversation.querySelector('.time').textContent = 'Just now';
        }
    }

    // Conversation selection
    const conversations = document.querySelectorAll('.conversation');
    conversations.forEach(conv => {
        conv.addEventListener('click', function() {
            const userId = this.getAttribute('data-user');
            
            // Update active state
            conversations.forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            
            // Load conversation
            loadConversation(userId);
        });
    });

    // Send message events
    sendBtn.addEventListener('click', sendMessage);
    messageInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            sendMessage();
        }
    });

    // Load initial conversation
    loadConversation('michael');
});
