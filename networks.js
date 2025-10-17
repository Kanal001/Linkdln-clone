// networks.js
document.addEventListener('DOMContentLoaded', function() {
    const connectionsList = document.querySelector('.connections-list');

    // Sample connections data with proper profile links and images
    const connectionsData = [
        {
            name: "Michael Chen",
            title: "Senior Software Engineer",
            company: "Google",
            img: "https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/04513847-d56e-451a-850e-369d6b7261fa.png",
            profileLink: "profile-michael.html",
            mutualConnections: 15,
            location: "San Francisco, CA"
        },
        {
            name: "Emily Rodriguez",
            title: "Product Manager",
            company: "StartupX",
            img: "https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/23749e71-2981-4934-a062-bbfee7fa8845.png",
            profileLink: "profile-emily.html",
            mutualConnections: 8,
            location: "New York, NY"
        },
        {
            name: "David Kim",
            title: "UX Design Lead",
            company: "CreativeLabs",
            img: "https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/7fe414b5-451f-4a9f-92ee-8947779982c0.png",
            profileLink: "profile-david.html",
            mutualConnections: 22,
            location: "Austin, TX"
        },
        {
            name: "Sarah Lee",
            title: "Data Scientist",
            company: "DataCorp",
            img: "https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/3166fb72-9238-407d-aa11-8a1711bab584.png",
            profileLink: "profile-sarah.html",
            mutualConnections: 12,
            location: "Seattle, WA"
        },
        {
            name: "Alex Johnson",
            title: "Marketing Director",
            company: "TechGrowth",
            img: "https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/e6662dd6-0f76-4260-a025-d67ce7e2e9bf.png",
            profileLink: "profile-alex.html",
            mutualConnections: 18,
            location: "Chicago, IL"
        },
        {
            name: "Maria Garcia",
            title: "Frontend Developer",
            company: "WebSolutions",
            img: "https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/273893e1-cb31-46c5-b38f-54cd8b4e1dc6.png",
            profileLink: "profile-maria.html",
            mutualConnections: 7,
            location: "Boston, MA"
        },
        {
            name: "James Wilson",
            title: "DevOps Engineer",
            company: "CloudTech",
            img: "https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/48ee80b4-ba05-40f9-b8f5-d15ba3e3b66a.png",
            profileLink: "profile-james.html",
            mutualConnections: 25,
            location: "Denver, CO"
        },
        {
            name: "Lisa Brown",
            title: "Product Designer",
            company: "DesignStudio",
            img: "https://storage.googleapis.com/workspace-0f70711f-8b4e-4d94-86f1-2a93ccde5887/image/7e2b8a08-5e5a-4e79-8343-28e42dc0afa0.png",
            profileLink: "profile-lisa.html",
            mutualConnections: 14,
            location: "Portland, OR"
        }
    ];

    // Load connections
    connectionsData.forEach(connection => {
        const connectionLink = document.createElement('a');
        connectionLink.className = 'connection';
        connectionLink.href = connection.profileLink;
        connectionLink.target = "_blank"; // Open in new tab
        
        const img = document.createElement('img');
        img.src = connection.img;
        img.alt = `${connection.name} - ${connection.title} at ${connection.company}`;
        
        const connectionInfo = document.createElement('div');
        connectionInfo.className = 'connection-info';
        
        const name = document.createElement('h4');
        name.textContent = connection.name;
        
        const title = document.createElement('p');
        title.className = 'connection-title';
        title.textContent = connection.title;
        
        const company = document.createElement('p');
        company.className = 'connection-company';
        company.textContent = connection.company;
        
        const location = document.createElement('p');
        location.className = 'connection-company';
        location.textContent = connection.location;
        
        const mutual = document.createElement('p');
        mutual.className = 'connection-mutual';
        mutual.textContent = `${connection.mutualConnections} mutual connections`;
        
        const actions = document.createElement('div');
        actions.className = 'connection-actions';
        
        const messageBtn = document.createElement('button');
        messageBtn.className = 'connection-btn';
        messageBtn.textContent = 'Message';
        messageBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            window.location.href = 'messages.html'; // Redirect to messages page
        };
        
        const connectBtn = document.createElement('button');
        connectBtn.className = 'connection-btn';
        connectBtn.textContent = 'Connect';
        connectBtn.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            alert(`Connect with ${connection.name}`);
        };
        
        connectionInfo.appendChild(name);
        connectionInfo.appendChild(title);
        connectionInfo.appendChild(company);
        connectionInfo.appendChild(location);
        connectionInfo.appendChild(mutual);
        
        actions.appendChild(messageBtn);
        actions.appendChild(connectBtn);
        connectionInfo.appendChild(actions);
        
        connectionLink.appendChild(img);
        connectionLink.appendChild(connectionInfo);
        
        connectionsList.appendChild(connectionLink);
    });

    // Add search functionality
    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.placeholder = 'Search connections...';
    searchInput.style.margin = '1rem';
    searchInput.style.padding = '0.8rem';
    searchInput.style.border = '1px solid #e0d9c7';
    searchInput.style.borderRadius = '25px';
    searchInput.style.width = 'calc(100% - 2rem)';
    
    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase();
        const connections = document.querySelectorAll('.connection');
        
        connections.forEach(connection => {
            const name = connection.querySelector('h4').textContent.toLowerCase();
            const title = connection.querySelector('.connection-title').textContent.toLowerCase();
            const company = connection.querySelector('.connection-company').textContent.toLowerCase();
            
            if (name.includes(searchTerm) || title.includes(searchTerm) || company.includes(searchTerm)) {
                connection.style.display = 'flex';
            } else {
                connection.style.display = 'none';
            }
        });
    });
    
    // Insert search at the top
    connectionsList.insertBefore(searchInput, connectionsList.firstChild);
});
