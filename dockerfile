FROM node:22-slim

# Cria diretório de trabalho
WORKDIR /app

# Copia apenas package.json inicialmente
COPY package*.json ./

# Instala dependências
RUN npm install

# O restante dos arquivos será montado via volume
CMD ["node", "dist/main.js"]