# Personal AI Organizer

Your intelligent personal assistant for organizing money, notes, references, bookmarks, knowledge, and files with AI-powered categorization and processing.

## Features

- **💰 Money Organizer**: Track expenses with AI-powered categorization
- **📝 Notes**: Smart note-taking with topic organization and random colors
- **📁 References**: Project-based reference management
- **🔖 Bookmarks**: AI-categorized bookmark collection
- **🧠 Knowledge**: Summarized knowledge base with AI processing
- **📄 Files**: Important file management with AI summarization

## Tech Stack

- **Backend**: Node.js + Express
- **Frontend**: React + Tailwind CSS
- **Database**: SQLite (separate databases per feature)
- **AI**: OpenAI GPT-3.5-turbo
- **Deployment**: Ready for Hostinger VPS

## Quick Start

### Prerequisites

- Node.js 16+ 
- OpenAI API key
- Hostinger VPS (for deployment)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd personal-ai-organizer
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

3. **Configure environment**
   ```bash
   cp env.example .env
   # Edit .env and add your OpenAI API key
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Access the application**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:5007

## Deployment to Hostinger VPS

### 1. Server Setup

```bash
# Connect to your VPS
ssh root@your-vps-ip

# Update system
apt update && apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
apt-get install -y nodejs

# Install PM2 for process management
npm install -g pm2

# Install nginx
apt install nginx -y
```

### 2. Deploy Application

```bash
# Clone your repository
git clone <your-repo-url>
cd personal-ai-organizer

# Install dependencies
npm run install-all

# Build frontend
npm run build

# Create environment file
cp env.example .env
nano .env  # Add your OpenAI API key

# Start with PM2
pm2 start server/index.js --name "ai-organizer"
pm2 save
pm2 startup
```

### 3. Configure Nginx

```bash
# Create nginx configuration
nano /etc/nginx/sites-available/ai-organizer
```

Add this configuration:
```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:5007;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

```bash
# Enable site
ln -s /etc/nginx/sites-available/ai-organizer /etc/nginx/sites-enabled/
nginx -t
systemctl restart nginx
```

### 4. SSL Certificate (Optional)

```bash
# Install Certbot
apt install certbot python3-certbot-nginx -y

# Get SSL certificate
certbot --nginx -d your-domain.com
```

## Usage Examples

### Money Organizer
```
Input: "spent 5$ on coffee"
AI Output: { amount: 5.00, category: "food", description: "coffee", date: "2024-01-15" }
```

### Notes
```
Input: "meeting with john tomorrow about project x"
AI Output: { topic: "meeting", content: "Meeting with John tomorrow about project X", color: "#3B82F6" }
```

### References
```
Input: "add this to my React project: https://example.com/tutorial"
AI Output: { project: "React", name: "Tutorial", url: "https://example.com/tutorial", description: "React tutorial" }
```

### Bookmarks
```
Input: URL + Title
AI Output: { category: "development", tags: "react, tutorial", description: "React hooks tutorial" }
```

## API Endpoints

### Money
- `GET /api/money/transactions` - Get all transactions
- `POST /api/money/add` - Add transaction with AI processing
- `GET /api/money/summary` - Get spending summary

### Notes
- `GET /api/notes` - Get all notes
- `POST /api/notes/add` - Add note with AI processing
- `GET /api/notes/topics` - Get all topics

### References
- `GET /api/references/projects` - Get all projects
- `POST /api/references/add` - Add reference with AI processing

### Bookmarks
- `GET /api/bookmarks` - Get all bookmarks
- `POST /api/bookmarks/add` - Add bookmark with AI processing

### Knowledge
- `GET /api/knowledge` - Get all knowledge items
- `POST /api/knowledge/add` - Add knowledge with AI processing

### Files
- `GET /api/files` - Get all files
- `POST /api/files/add` - Add file with AI processing

## Database Structure

Each feature has its own SQLite database:

- `data/money.db` - Financial transactions and categories
- `data/notes.db` - Notes with topics and colors
- `data/references.db` - Projects and references
- `data/bookmarks.db` - Bookmarks with categories and tags
- `data/knowledge.db` - Knowledge items with summaries
- `data/files.db` - Important files with metadata

## AI Processing

The system uses OpenAI GPT-3.5-turbo for:

- **Natural Language Understanding**: Parse casual text inputs
- **Context-Aware Processing**: Read existing data for consistency
- **Smart Categorization**: Based on existing patterns
- **Content Summarization**: For knowledge and files
- **Intelligent Organization**: Maintain structure across all features

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to use this project for personal or commercial purposes.

## Support

For issues and questions:
- Create an issue in the repository
- Check the documentation
- Review the API endpoints

---

**Built with ❤️ for personal productivity and organization** 