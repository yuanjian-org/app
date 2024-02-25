# How to run

The environment was configured based on AWS Conda environment pytorch_p39.

Install extra packages if needed 
pycurl==7.45.1
transformers==4.31.0

To execute the script, set env var INTEGRATION_AUTH_TOKEN and run:

    python3 summarize.py


### In order to run LLM models, we need to create the right AWS SageMaker Notebook Instance (with at least one GPU, and need to be compatible with the platform identifier).

  ![image](https://github.com/yuanjian-org/app/assets/24776862/52fe0800-dcf3-4a68-9a1b-fdbc6e4b878d)

  ![image](https://github.com/yuanjian-org/app/assets/24776862/98c5bc09-f6de-4ccf-b98b-a8af009a8f75)


### ml.p3.2xlarge is such instance with the lowest cost.

  ![image](https://github.com/yuanjian-org/app/assets/24776862/3f17ce67-7e95-4828-91d4-19c6ed3c5ab4)


### See https://docs.aws.amazon.com/sagemaker/latest/dg/notebooks-available-instance-types.html for more instance information and https://aws.amazon.com/sagemaker/pricing/ for cost information.

Below are the price information for instances with at least 1 GPU.

TODO: Need to make sure ml.p3.2xlarge has the lowest cost that is compatible with the platform after budget is confirmed.

  ![image](https://github.com/yuanjian-org/app/assets/24776862/74aa048a-8406-4d87-ba0a-e9cc8681a111)


### Make sure to request for AWS service quota when choosing ml.p3.2xlarge if you are asked to do so:

  ![image](https://github.com/yuanjian-org/app/assets/24776862/43253871-fb39-48ad-9fb7-cb48046c195b)


### Search for Amazon SageMaker in AWS Services:

  ![image](https://github.com/yuanjian-org/app/assets/24776862/ee29248f-70dc-4f57-8c1e-0fba1bec4fd1)


### Search for the specific quota name "ml.p3.2xlarge for notebook instance usage" and request for increase at account level:

  ![image](https://github.com/yuanjian-org/app/assets/24776862/56f1451f-76dd-4991-9207-7e3d6343c2ad)


### Then you will find your requested quota in recent history page:

  ![image](https://github.com/yuanjian-org/app/assets/24776862/d100d64c-6099-4d29-b7b6-5898441dbb5a)


### Finally create the instance at the bottom, and you will see your instance created after some time of waiting:

  ![image](https://github.com/yuanjian-org/app/assets/24776862/379e5fbd-37c7-4fa0-9ff7-057cc05e62d5)

### Click Open Jupyter or Open JupyterLab under the Actions button, then you will find everything fine.

