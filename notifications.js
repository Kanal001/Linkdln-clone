// notifications.js
document.addEventListener('DOMContentLoaded', function() {
    const notificationsList = document.querySelector('.notifications-list');

    // Sample notifications data
    const notificationsData = [
        {
            title: "Michael Chen liked your post",
            message: "Your recent post on React best practices received a like from Michael.",
            time: "2m ago"
        },
        {
            title: "Emily Rodriguez commented on your post",
            message: "Emily commented: 'Great insights! Thanks for sharing.'",
            time: "15m ago"
        },
        {
            title: "David Kim sent you a connection request",
            message: "David wants to connect with you.",
            time: "1h ago"
        },
        {
            title: "New job opportunity",
            message: "A new job matching your profile has been posted.",
            time: "3h ago"
        },
        {
            title: "You have a new message",
            message: "Michael Chen sent you a message.",
            time: "5h ago"
        }
    ];

    // Load notifications
    notificationsData.forEach(notification => {
        const notificationDiv = document.createElement('div');
        notificationDiv.className = 'notification';
        
        const title = document.createElement('h4');
        title.textContent = notification.title;
        
        const message = document.createElement('p');
        message.textContent = notification.message;
        
        const time = document.createElement('span');
        time.className = 'time';
        time.textContent = notification.time;
        
        notificationDiv.appendChild(title);
        notificationDiv.appendChild(message);
        notificationDiv.appendChild(time);
        
        notificationsList.appendChild(notificationDiv);
        
        // Add click event to show more details (optional)
        notificationDiv.addEventListener('click', function() {
            alert(notification.message); // Replace with a modal or detailed view if needed
        });
    });
});
