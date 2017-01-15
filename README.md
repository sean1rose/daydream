#### Installation

You will need to install packages first and install the Postgres database to run the server. You'll also need to have some environment variables defined in a .env file (which you should NOT commit to the repository).

#### Environment variables

#### Install packages
```
npm install
```
for correct installation of package 'git-validate' it may be necessary
to manually create a pre-commit file in ./.git/hooks directory and change
the rights for it.

#### Create the PostgreSQL and Redis Database
For Macs, you can download Postgres.app and get up and running easily.

http://postgresapp.com/
https://jpadilla.github.io/redisapp/

For Windows, you can download Postgres and Redis here:

https://www.postgresql.org/download/windows/
https://github.com/MSOpenTech/redis

For Linux, you can download Postgres here:

https://www.postgresql.org/download/linux/
https://redis.io/download

You will need to download pgAdmin to view the data in the Postgres database. You can download it here:

https://www.pgadmin.org/download/

You'll want to download a GUI for viewing Redis data (but of course you can also use their command line utilities)

Here's one I recommend for Mac (Medis):
https://github.com/luin/medis/releases

For other platforms, there's Redis Desktop Manager (also available for Mac):
https://redisdesktop.com/

You should run (after you have installed Postgres)
```
npm run create-db
```
to create a database (you should run this script on creation of the database or when you're wiping the database, but not for updating the database).

To migrate the database to a newer version of the model (and to run the migration scripts), we normally use
```
npm run update-db
```

If for some reason you need to downgrade the database model, you can run
```
npm run migrate-db-down
```

#### Running the server
```
npm start
```
The development environment should be at [http://localhost:3000](http://localhost:3000).

##### API Explorer

You can find an API explorer at the server address, with **/explorer** at the end. For example, the development environment will be at [http://localhost:3000/explorer](http://localhost:3000/explorer)﻿.

## Style Guide
Most of our style is handled by [ESLint](http://eslint.org/), but there is some setup required.

You can run the linter anytime and check styles.
```
npm run lint
```
##### Configuration
Various IDEs provide linting plugins. For Sublime Text,

1. [SublimeLinter](http://www.sublimelinter.com/en/latest/)
1. [SublimeLinter-contrib-eslint](https://github.com/roadhump/SublimeLinter-eslint)

For Jetbrains Webstorm, support is built-in, but you will need to enable it in settings after you run
```
npm install
```
to install the necessary dependencies. You will also need to enable it in the **settings panel** for Webstorm for ESLint to be active.

Jetbrains also has a good support document on using ESLint in Webstorm.

[https://www.jetbrains.com/help/webstorm/11.0/using-javascript-code-quality-tools.html#ESLint](https://www.jetbrains.com/help/webstorm/11.0/using-javascript-code-quality-tools.html#ESLint)

#### Require
If there are more than 5 require statements, feel free to add a line break between at any of the break points above so that the requires are easier to digest.

## Tech Used
- [Bluebird](http://bluebirdjs.com/docs/getting-started.html) for promises
- [dotenv](https://github.com/bkeepers/dotenv) for loading environment variables from a .env file
- [ESLint](http://eslint.org/) for linting
- [Express](http://expressjs.com/) for web server
- [Loopback](https://loopback.io/) for API server
- [Passport](http://passportjs.org/) for authentication
- [Socket.io](http://socket.io/) for real time communication features
- [Google APIs](https://console.developers.google.com) for Google APIs
