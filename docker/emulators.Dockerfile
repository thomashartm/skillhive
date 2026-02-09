FROM node:22-slim

# Install prerequisites (ca-certificates needed for HTTPS)
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget ca-certificates gpg curl \
    && rm -rf /var/lib/apt/lists/*

# Add Adoptium repo for Java 21
RUN wget -qO - https://packages.adoptium.net/artifactory/api/gpg/key/public \
    | gpg --dearmor -o /usr/share/keyrings/adoptium.gpg \
    && echo "deb [signed-by=/usr/share/keyrings/adoptium.gpg] https://packages.adoptium.net/artifactory/deb bookworm main" \
    > /etc/apt/sources.list.d/adoptium.list

# Install Java 21
RUN apt-get update && apt-get install -y --no-install-recommends \
    temurin-21-jre \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g firebase-tools@15

WORKDIR /app

COPY firebase.json .firebaserc firestore.rules firestore.indexes.json ./

EXPOSE 4000 8181 9099 5050

CMD ["firebase", "emulators:start", "--project", "skillhive"]
