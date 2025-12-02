FROM node:18-alpine

WORKDIR /app

COPY package.json .

RUN npm install

COPY . .

# Set env variable
ARG REACT_APP_API
ENV REACT_APP_API=$REACT_APP_API

ARG REACT_APP_TAG
ENV REACT_APP_TAG=$REACT_APP_TAG

RUN npm run build

EXPOSE 5173

CMD [ "npm", "run", "preview" ]
