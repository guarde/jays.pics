<h1 align="center">jays.pics</h1>
<p align="center">
<img src="https://img.shields.io/badge/remix-%23000.svg?style=for-the-badge&logo=remix&logoColor=white">
<img src="https://img.shields.io/badge/Amazon%20S3-FF9900?style=for-the-badge&logo=amazons3&logoColor=white">
<img src="https://img.shields.io/badge/Postgres-%23316192.svg?logo=postgresql&logoColor=white&style=for-the-badge">
<img src="https://img.shields.io/badge/Docker-2088FF.svg?logo=docker&logoColor=white&style=for-the-badge">
<img src="https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white">
</p>

---

## Table of Contents

- [Introduction](#introduction)
- [Development](#development)
- [Contributing](#contributing)
- [License](#license)

---

## Introduction

[jays.pics](https://jays.pics) is a online image host that allows users to store their images with tags, and access and share them across multiple domains, donated by users.

---

## Development

### Prerequisites

This README assumes you have Docker installed. If you do not, please read [this](https://docs.docker.com/engine/install/) manual, based on your operating system. It will cover setting up and testing your very own Docker instance (lucky you!)

### Requirements

- Node `20.0.0`
- Docker: `27.3.1`

### Steps

#### Cloning and initial setup

1. Clone the repository with
   ```bash
   git clone https://github.com/guarde/jays.pics.git
   ```
2. Enter the cloned repository locally, typically with
   ```bash
   cd jays.pics
   ```
3. Install all dependencies with
   ```bash
   npm i
   ```

#### Setting up the database

1. Ensure your Docker instance is started by running
   ```bash
   docker info
   ```
2. Compose the containers
   ```bash
   docker compose up -d
   ```

#### Creating the environment

1. Create a new `.env` file at the root of the project
2. Refer to the `example.env` file, replacing values where required

#### Migration and Seeding

1. Run all of the migrations by executing
   ```bash
   npx prisma migrate dev
   ```
2. Seed the database with
   ```bash
   npx prisma db seed
   ```
3. You can check the database is migrated and seeded by running
   ```bash
   npx prisma studio
   ```

#### Running the application

1. You can start the development server with
   ```
   npm run dev
   ```

## Contributing

Contributions are welcome

1. Fork the repository.
2. Create a new branch for your feature or bugfix.
3. Commit your changes with a clear message.
4. Open a pull request describing your work.

## License

MIT © [guarde](https://github.com/guarde)

---

<p align="center">Made with <img height="14" src="https://emoji.lgbt/assets/svg/gay-heart.svg"/> by guarde</p>
