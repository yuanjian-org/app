# How to create AWS Organization Account and add affiliated accounts

1.	Step 1: Search for and click AWS Organizations in AWS Management Console.

    ![image](https://github.com/yuanjian-org/app/assets/24776862/2b5ddb55-b6f2-457e-9db3-214a0c76a63e)


2.	Click Create AWS Organization:

    ![image](https://github.com/yuanjian-org/app/assets/24776862/77b6ad7f-ce7b-498d-9033-8f248e59fd2b)


3.	Then you can see the created AWS account with Root and the underneath management account (the AWS account you used to create this organization):

    ![image](https://github.com/yuanjian-org/app/assets/24776862/f936a1f5-8082-4180-9ab8-3e3c3920ee8e)


4.	Check the Root, and click the Add Organization Unit (OU) in Actions:

    ![image](https://github.com/yuanjian-org/app/assets/24776862/242acf34-e450-417a-9b1e-788eb39ee509)


5.	For example, if we want to have an OU that investigates on the LLM, we can type LLM in the bar and then create:

    ![image](https://github.com/yuanjian-org/app/assets/24776862/3c6d228d-dae6-4478-904b-c92f816fc6f6)


6.	Now click the “Add an AWS account” button, choose Invite an existing AWS account and type in the account that you would like to let it join:

    ![image](https://github.com/yuanjian-org/app/assets/24776862/d947473a-e52c-4319-a6a2-466b8da31f4a)


7.	Now you will see that the newly invited account has been added under the Root. You then check it and click Move AWS account under the Actions button, and then move it under the Organization Unit you want:

    ![image](https://github.com/yuanjian-org/app/assets/24776862/eee195f2-3030-4d8b-b9b4-16a949b04601)
