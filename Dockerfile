FROM node:20-alpine

RUN apk add --no-cache curl

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY . .

RUN mkdir -p /app/data /app/public/fonts && \
    cd /app/public/fonts && \
    curl -sL -o Montserrat-Light.ttf "https://github.com/JulietaUla/Montserrat/raw/master/fonts/ttf/Montserrat-Light.ttf" && \
    curl -sL -o Montserrat-Regular.ttf "https://github.com/JulietaUla/Montserrat/raw/master/fonts/ttf/Montserrat-Regular.ttf" && \
    curl -sL -o Montserrat-Medium.ttf "https://github.com/JulietaUla/Montserrat/raw/master/fonts/ttf/Montserrat-Medium.ttf" && \
    curl -sL -o Montserrat-SemiBold.ttf "https://github.com/JulietaUla/Montserrat/raw/master/fonts/ttf/Montserrat-SemiBold.ttf" && \
    curl -sL -o Montserrat-Bold.ttf "https://github.com/JulietaUla/Montserrat/raw/master/fonts/ttf/Montserrat-Bold.ttf" && \
    curl -sL -o Montserrat-ExtraBold.ttf "https://github.com/JulietaUla/Montserrat/raw/master/fonts/ttf/Montserrat-ExtraBold.ttf" && \
    curl -sL -o Montserrat-Black.ttf "https://github.com/JulietaUla/Montserrat/raw/master/fonts/ttf/Montserrat-Black.ttf"

EXPOSE 3000

CMD ["node", "server.js"]
