FROM nginx:alpine

COPY index.html /usr/share/nginx/html/index.html

EXPOSE 3000

# Custom nginx config to run on port 3000
RUN echo 'server { listen 3000; location / { root /usr/share/nginx/html; index index.html; } }' > /etc/nginx/conf.d/default.conf

CMD ["nginx", "-g", "daemon off;"]
