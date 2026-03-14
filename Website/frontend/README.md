To run the frontend code 

# 1) Install NVM (recommended way to get Node + npm)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash

# 2) Reload shell
source ~/.bashrc

# 3) Install latest LTS Node.js (includes npm)
nvm install --lts
nvm use --lts

# 4) Verify
node -v
npm -v


Then

npm install
npm run dev