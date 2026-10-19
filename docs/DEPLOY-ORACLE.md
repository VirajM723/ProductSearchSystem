# Deploying on Oracle Cloud (free)

This puts the whole store on one Oracle Cloud "Always Free" virtual machine: MongoDB, Elasticsearch, the API and a Caddy web server that handles HTTPS for you. It costs nothing as long as you stay inside the free limits.

What you end up with:

```
Internet ──► Caddy (ports 80/443, HTTPS) ──► API ──► MongoDB
                │                              └──► Elasticsearch
                └─ serves the Angular site
```

Only Caddy can be reached from the internet. MongoDB and Elasticsearch live on a private Docker network with no open ports, and both need a password even from inside it.

Plan for about an hour the first time.

---

## 1. Create an Oracle Cloud account

1. Sign up at [cloud.oracle.com](https://cloud.oracle.com) and pick the free tier.
2. Choose your **home region** carefully, it can't be changed later. Pick one close to your visitors (for India: Mumbai or Hyderabad).
3. Oracle asks for a card to verify you. Always Free resources aren't charged.

> Oracle can reclaim Always Free VMs that sit almost completely idle for a week. A live website usually isn't idle enough for that, but if you want to rule it out you can upgrade the account to "Pay As You Go". Free resources stay free; just set a budget alert (Billing → Budgets) so you'd hear about any charge.

## 2. Create the virtual machine

Go to **Menu → Compute → Instances → Create instance**.

| Setting | Value |
|---|---|
| Name | `store` (anything) |
| Image | **Canonical Ubuntu 24.04** (click "Change image") |
| Shape | **Ampere → VM.Standard.A1.Flex**, 2 OCPUs and 12 GB memory (the free limit is 4 and 24 in total) |
| Networking | Create a new virtual cloud network and public subnet, and tick **Assign a public IPv4 address** |
| SSH keys | **Generate a key pair for me**, then download the private key. You can't download it again later |
| Boot volume | Leave the default (about 47 GB) |

Click **Create**. After a minute or two the instance shows as *Running*. Copy its **Public IP address**.

If you get **"Out of capacity"**, try a different availability domain on the same page, or try again later. Popular regions run out of free ARM machines now and then.

## 3. Open ports 80 and 443 in Oracle's firewall

Oracle blocks everything except SSH by default.

1. On the instance page, click the **subnet** link, then the **Default Security List**.
2. **Add Ingress Rules**, three of them, all with source CIDR `0.0.0.0/0`:
   - IP protocol TCP, destination port `80`
   - IP protocol TCP, destination port `443`
   - IP protocol UDP, destination port `443` (lets browsers use HTTP/3)

Don't open 3000, 9200 or 27017. Nothing outside should talk to those directly.

## 4. Get a domain name

HTTPS needs a domain. Two options:

- **Free:** go to [duckdns.org](https://www.duckdns.org), sign in, create a subdomain such as `commongoods`, and put your VM's public IP in the "current ip" box. Your address is then `commongoods.duckdns.org`.
- **Your own domain:** add an **A record** pointing at the VM's public IP.

Check it from your own computer before going on (it can take a few minutes):

```bash
nslookup commongoods.duckdns.org
```

It should print your VM's IP.

## 5. Connect to the VM

On Mac or Linux:

```bash
chmod 600 ~/Downloads/ssh-key-*.key
ssh -i ~/Downloads/ssh-key-*.key ubuntu@YOUR_PUBLIC_IP
```

On Windows, the same `ssh` command works in PowerShell (use the full path to the key file).

Everything from here on is typed on the VM.

## 6. Prepare the server

Update the system:

```bash
sudo apt update && sudo apt -y upgrade
```

Ubuntu images on Oracle also have their own firewall rules that block web traffic. Allow it and save the rules:

```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo iptables -I INPUT 6 -p udp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

Elasticsearch needs a kernel setting raised:

```bash
echo 'vm.max_map_count=262144' | sudo tee /etc/sysctl.d/99-elasticsearch.conf
sudo sysctl --system
```

Add 2 GB of swap as a safety net:

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

Install Docker:

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
```

Log out (`exit`) and SSH back in so the Docker group takes effect. Check it works:

```bash
docker run --rm hello-world
```

## 7. Get the code

```bash
git clone https://github.com/VirajM723/ProductSearchSystem.git
cd ProductSearchSystem
git checkout security-changes   # or skip this once it's merged into main
```

If the repository is private, GitHub will ask for a password. Use a [personal access token](https://github.com/settings/tokens?type=beta) with read access to this one repository, not your account password.

## 8. Fill in the settings

```bash
cp .env.production.example .env
chmod 600 .env
```

Generate four passwords, one per line:

```bash
for i in 1 2 3 4; do openssl rand -hex 24; done
```

Now create the admin login for the inventory page. Pick a password of at least 12 characters; it's hidden as you type:

```bash
docker run --rm -it -v "$PWD/backend:/app:ro" -w /app node:22-alpine node scripts/hash-password.js
```

It prints `ADMIN_PASSWORD_HASH=...` and `JWT_SECRET=...`. Only the hash is stored, never the password itself, so remember the password.

Open the file and fill everything in:

```bash
nano .env
```

| Setting | What to put |
|---|---|
| `SITE_ADDRESS` | Your domain, e.g. `commongoods.duckdns.org` (no `https://`) |
| `MONGO_ROOT_PASSWORD` | Generated password 1 |
| `MONGO_APP_PASSWORD` | Generated password 2 |
| `ELASTIC_PASSWORD` | Generated password 3 |
| `ES_APP_PASSWORD` | Generated password 4 |
| `ADMIN_USERNAME` | The username you'll sign in with |
| `ADMIN_PASSWORD_HASH` | From the command above |
| `JWT_SECRET` | From the command above |

Save with `Ctrl+O`, `Enter`, then quit with `Ctrl+X`.

Keep a copy of `.env` somewhere safe, like a password manager. Never commit it to git.

## 9. Start everything

```bash
docker compose -f docker-compose.prod.yml up -d --build
```

The first run builds the site and downloads Elasticsearch, so give it 5 to 10 minutes. Then check:

```bash
docker compose -f docker-compose.prod.yml ps
```

You want `mongo` and `elasticsearch` showing *healthy*, `es-setup` *exited (0)*, and `api` and `web` *running*.

Want the 40 sample products? Load them:

```bash
docker compose -f docker-compose.prod.yml exec api node scripts/seed.js
```

## 10. Try it

- Open `https://your-domain` and the shop should load with a valid padlock. Caddy fetched the certificate from Let's Encrypt on its own.
- Go to `https://your-domain/login` (or click **Staff sign in** in the footer) and sign in with your admin username and password.
- The inventory page should show **Search index online**.

---

## Everyday tasks

To save typing, add a shortcut once:

```bash
echo "alias dc='docker compose -f ~/ProductSearchSystem/docker-compose.prod.yml'" >> ~/.bashrc && source ~/.bashrc
```

Then `dc ps`, `dc logs -f api`, and so on.

**Deploy new code**

```bash
cd ~/ProductSearchSystem
git pull
dc up -d --build
```

**Change the admin password**

Run the `hash-password` command from step 8 again, put the new `ADMIN_PASSWORD_HASH` in `.env`, then:

```bash
dc up -d api
```

Every existing session is signed out automatically when the password changes.

**Back up the database**

Products live in MongoDB; Elasticsearch can always be rebuilt from it. This writes a compressed backup to your home folder:

```bash
mkdir -p ~/backups
dc exec -T mongo sh -c 'mongodump --archive --gzip -u root -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin' > ~/backups/mongo-$(date +%F).gz
```

To run it every night at 3am, open `crontab -e` and add:

```
0 3 * * * cd /home/ubuntu/ProductSearchSystem && docker compose -f docker-compose.prod.yml exec -T mongo sh -c 'mongodump --archive --gzip -u root -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin' > /home/ubuntu/backups/mongo-$(date +\%F).gz && find /home/ubuntu/backups -name 'mongo-*.gz' -mtime +14 -delete
```

Copy backups off the server now and then (`scp` from your computer), so a lost VM doesn't take them with it.

**Restore a backup**

```bash
dc exec -T mongo sh -c 'mongorestore --archive --gzip --drop -u root -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin' < ~/backups/mongo-2026-10-19.gz
```

Then sign in, open the inventory and press **Rebuild index** so search matches the restored data.

---

## When something's wrong

| Problem | Check |
|---|---|
| Site doesn't load at all | Ports 80/443 in the Oracle security list (step 3), the iptables rules (step 6), and that DNS points at the right IP |
| Browser warns about the certificate | DNS must point at the VM *before* Caddy starts. Fix DNS, then `dc restart web` and watch `dc logs -f web` |
| `elasticsearch` keeps restarting | Run `sysctl vm.max_map_count`; it should say 262144 (step 6). Also check `free -h` for memory |
| `es-setup` failed | `dc logs es-setup`. Usually Elasticsearch wasn't up yet; run `dc up -d` again |
| Inventory says "Search index offline" | `dc logs api`. The shop still works in the meantime, with search running from MongoDB |
| "Too many sign-in attempts" | 5 wrong passwords lock that IP out for 15 minutes. Wait it out |
| Changed `MONGO_*` or `ELASTIC_PASSWORD` after the first start and now it can't connect | Those are only applied when the data volumes are first created. Put the old values back, or wipe and start fresh with `dc down -v` (**this deletes all data**) |

## What's protected, and how

- **HTTPS everywhere.** Plain http redirects to https, and HSTS tells browsers to stick with it.
- **Admin sign-in** is required for every change to products. The password is stored as a scrypt hash. Sessions live in an http-only, secure, same-site cookie that scripts on the page can't read, and they last 8 hours.
- **Brute force protection:** 5 failed sign-ins per IP every 15 minutes, plus a general limit of 300 API requests per minute per IP.
- **MongoDB** requires a password. The API uses an account that can only read and write the store's own database.
- **Elasticsearch** has security switched on. The API uses an account that can only touch the `products` indices, and can't read users or create other indices.
- **Network:** the databases have no ports on the server and no internet access, so they can't be reached from outside at all.
- **Browser hardening:** Caddy sends a strict Content-Security-Policy, refuses to let the site be framed, and turns off camera, microphone and location access.
