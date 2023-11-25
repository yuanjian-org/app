## Setup Troubleshoot if using windows

1. Start the Postgres server by opening “service application” in windows, and then search for postgresql to start it.

   ![image](https://github.com/yuanjian-org/app/assets/24776862/c110e623-0af4-4d01-abfa-c0696d409a97)


1. You can either check that the Postgres server was connected successfully by running the psql shell,
	
   ![image](https://github.com/yuanjian-org/app/assets/24776862/56120b3a-c003-4edc-886c-5440ff36f05f)


1. or by checking the pgAdmin dashboard. Make sure you see the host name is localhost if you are running Postgres locally, and port number is 5432 by checking the properties of the running server.

   ![image](https://github.com/yuanjian-org/app/assets/24776862/9995b5eb-e530-4d3b-99f3-83764f25c58b)


1. Otherwise, change the corresponding values in `<path>\postgresql\data\postgresql.conf`.
 
   ![image](https://github.com/yuanjian-org/app/assets/24776862/74afb1e0-1cc7-4104-aff0-60267e5a903e)


1. (Important!!!) Remember to run the yarn commands in windows bash shell (Git Bash, etc), but not Ubuntu or WSL.
   The reason is that the Postgres instance is running on port 5432 of your main Windows operating system, but it was refusing to connect to port 5432 on WSL as there wasn't any Postgres instance listening on that port of WSL.
   You may find Connection refused error like something below when running `yarn sync-database` and `yarn dev`. Reference: https://stackoverflow.com/questions/73952961/econnrefused-error-when-attempting-get-on-psql-database-using-node-js-and-node-p/73965640#73965640.

   ![image](https://github.com/yuanjian-org/app/assets/24776862/12dca6fc-07cb-4618-af96-5d8a92d9d956)


1. When running `yarn dev`, if you encounter the “Sentry CLI binary not found” error like below, you may resolve it by running `npm i sharp`.

   ![image](https://github.com/yuanjian-org/app/assets/24776862/3e8ab40c-1813-4478-9fe0-7a2f79321bb3)

