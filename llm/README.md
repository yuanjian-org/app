# How to run

The environment was configured based on AWS Conda environment pytorch_p39.

Install extra packages if needed 
pycurl==7.45.1
transformers==4.31.0

To execute the script, set env var INTEGRATION_AUTH_TOKEN and run:

    python3 summarize.py

In order to run LLM models, we need to create the right AWS SageMaker Notebook Instance (with at least one GPU, and need to be compatible with the platform identifier).
ml.p3.2xlarge is such instance with the lowest cost.
See https://docs.aws.amazon.com/sagemaker/latest/dg/notebooks-available-instance-types.html for more instance information and https://aws.amazon.com/sagemaker/pricing/ for cost information.
Make sure to request for AWS quota when choosing ml.p3.2xlarge if you are asked to do so.
