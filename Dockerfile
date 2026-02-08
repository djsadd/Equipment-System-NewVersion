FROM node:20-alpine AS deps
WORKDIR /app
COPY apps/web/package*.json ./
RUN npm install

FROM deps AS dev
WORKDIR /app
COPY apps/web ./
EXPOSE 5173
CMD ["npm", "run", "dev"]

FROM deps AS build
WORKDIR /app
COPY apps/web ./
RUN npm run build

FROM nginx:1.27-alpine AS prod
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
