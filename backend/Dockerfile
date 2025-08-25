FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
# إنشاء مجلد Uploads/violations/ وتعيين الأذونات
RUN mkdir -p /app/Uploads/violations && chmod -R 755 /app/Uploads
EXPOSE 5000
CMD ["node", "server.js"]
