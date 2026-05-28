### Phase 1: Repository Setup (Completed)
*For documentation purposes, here is the setup you successfully completed:*
1. Generated an ED25519 SSH key: `ssh-keygen -t ed25519 -C "knowmyhealth-deploy" -f ~/.ssh/knowmyhealth`
2. Added the public key (`.pub`) to GitHub Deploy Keys.
3. Created `~/.ssh/config` with the `github-knowmyhealth` host alias.
4. Set strict permissions (`600` for private key/config, `644` for public key).
5. Cloned the repository: `git clone git@github-knowmyhealth:KnowMyHealth/knowmyhealthplatform.git`

---

### Phase 2: Install System Dependencies

Run these commands to install Nginx, Certbot, Node.js (for Next.js), PM2 (for keeping apps alive), and `uv` (for Python).

```bash
# 1. Update system packages
sudo apt update && sudo apt upgrade -y

# 2. Install Nginx & Certbot
sudo apt install -y nginx certbot python3-certbot-nginx

# 3. Install Node.js (v20) & PM2
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2

# 4. Install Astral's uv (for Python backend)
curl -Lsf https://astral.sh/uv/install.sh | sh
source $HOME/.local/bin/env
```

---

### Phase 3: Configure Environment Variables

**1. Backend Environment:**
Create the root `.env` file for FastAPI and Alembic.
```bash
cd ~/knowmyhealthplatform
nano .env
```
Paste your backend variables. **Ensure CORS is strictly set for production**:
```ini
ENVIRONMENT="production"
# Notice the strict JSON array format required by Pydantic
BACKEND_CORS_ORIGINS='["https://knowmyhealth.in", "https://www.knowmyhealth.in"]'
DATABASE_URL="postgresql+asyncpg://user:pass@host:5432/dbname"

# ... add your Supabase, Razorpay, Agora, and Resend keys here ...
```
*(Save and exit: `Ctrl+O`, `Enter`, `Ctrl+X`)*

**2. Frontend Environment:**
Create the `.env.local` file for Next.js.
```bash
cd ~/knowmyhealthplatform/frontend
nano .env.local
```
Paste your frontend variables. **Point the backend URL to your secure API subdomain**:
```ini
NEXT_PUBLIC_BACKEND_URL="https://api.knowmyhealth.in"

# ... add your public Supabase, Razorpay, and Agora keys here ...
```
*(Save and exit: `Ctrl+O`, `Enter`, `Ctrl+X`)*

---

### Phase 4: Build & Start Services

**1. Deploy Backend (FastAPI)**
```bash
cd ~/knowmyhealthplatform/backend

# Install dependencies via uv
uv sync

# Run database migrations (creates tables in Postgres)
uv run alembic upgrade head

# Start backend using PM2 (Bound to 127.0.0.1 for security behind Nginx)
pm2 start "uv run uvicorn app.main:app --host 127.0.0.1 --port 8000" --name "kmh-backend"
```

**2. Deploy Frontend (Next.js)**
```bash
cd ~/knowmyhealthplatform/frontend

# Install dependencies and build static/server files
npm install
npm run build

# Start frontend using PM2
pm2 start npm --name "kmh-frontend" -- start
```

**3. Save PM2 State**
This ensures your apps automatically restart if the VPS reboots.
```bash
pm2 save
pm2 startup
# NOTE: PM2 will output a specific command starting with "sudo env PATH...". 
# Copy that generated command and run it in your terminal.
```

---

### Phase 5: Nginx Reverse Proxy Setup

Nginx will catch public web traffic (ports 80/443) and route it securely to PM2 (ports 3000/8000).

**1. Create the Nginx config file:**
```bash
sudo nano /etc/nginx/sites-available/knowmyhealth
```

**2. Paste this configuration:**
*(Assuming your domain is `knowmyhealth.in`)*

```nginx
# FRONTEND SERVER BLOCK
server {
    listen 80;
    server_name knowmyhealth.in www.knowmyhealth.in;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# BACKEND API SERVER BLOCK
server {
    listen 80;
    server_name api.knowmyhealth.in;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
*(Save and exit)*

**3. Enable the config and restart Nginx:**
```bash
sudo ln -s /etc/nginx/sites-available/knowmyhealth /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

---

### Phase 6: Secure with HTTPS & Firewall (Crucial for Video)

Web browsers block camera/microphone access on `http://`. You must apply an SSL certificate.

**1. Generate SSL Certificates:**
```bash
sudo certbot --nginx -d knowmyhealth.in -d www.knowmyhealth.in -d api.knowmyhealth.in
```
*(When prompted to redirect HTTP to HTTPS, select **Yes / Option 2**).*

**2. Secure the VPS Firewall:**
*If using Hostinger's dashboard firewall, ensure these ports are open there too.*
```bash
sudo ufw allow 22            # SSH
sudo ufw allow 'Nginx Full'  # Port 80 and 443
sudo ufw enable
```

---

### 🚀 Future Updates Workflow

Because of your excellent Git setup, updating your live site in the future is incredibly easy:

```bash
cd ~/knowmyhealthplatform
git pull

# To update the Backend:
cd backend
uv sync
uv run alembic upgrade head
pm2 restart kmh-backend

# To update the Frontend:
cd ../frontend
npm install
npm run build
pm2 restart kmh-frontend
```