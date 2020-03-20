# Meetzee (backend)

Directory sturcture

```bash
.
|-- README.MD                   
|-- acceptRescheduleSolution            <-- source code of accept reschedule solution
|-- approveReschedule                   <-- source code of approving reschedule
|-- clearNotification                   <-- source code of clear notification
|-- createUser                          <-- source code of create user
|-- deleteEvent                         <-- source code of delete event
|-- findSlot                            <-- source code of find slot
|-- getUserData                         <-- source code of get user data
|-- loginUser                           <-- source code of login user
|-- modifyEvent                         <-- source code of modify event
|-- resetLock                           <-- source code of reset lock
|-- setEvent                            <-- source code of set an event
|-- updateFriends                       <-- source code of update friend list
|-- updateSchedule                      <-- source code of update schedule
|-- reschedule_algo                     <-- source code of reschedule algorithm
|-- utilityCode                         <-- utility code such as find shortest path of destination
|-- test_case                           <-- test cases
|-- documentdbConnectionTest            <-- test connection between AWS Lambda and AWS documentDB
|-- firestoreConnectionTest             <-- test connection between AWS Lambda and Firestore
|-- template_sample.yaml                <-- SAM sample template
|-- template.yaml                       <-- SAM template
|-- documentation.md                    <-- Documentation
```

## Overview

This the backend implementation of a rescheduling app (not deployed). It is for hosting on AWS Lambda and the cloud database used is Firestore

### Basic Functionalities
* User creation and login
* Adding friends
* Creating and modifying events
* Find a possible time slot for an event given the schedule of the user
* Suggest reschedule option for the user to fit in a particular event

## Documentation
View [here](documentation.md)

## Requirements

* AWS CLI already configured with Administrator permission
* [NodeJS 10.10+ installed](https://nodejs.org/en/download/releases/)

* [Docker installed](https://www.docker.com/community-edition)

## Setup process

Add Firestore credential to all the source code directory and rename it as serviceAccount.json

### Packaging and deployment

AWS Lambda NodeJS runtime requires a flat folder with all dependencies including the application. SAM will use `CodeUri` property to know where to look up for both application and dependencies:

```yaml
...
    HelloWorldFunction:
        Type: AWS::Serverless::Function
        Properties:
            CodeUri: hello-world/
            ...
```

Firstly, we need a `S3 bucket` where we can upload our Lambda functions packaged as ZIP before we deploy anything - If you don't have a S3 bucket to store code artifacts then this is a good time to create one:

```bash
aws s3 mb s3://BUCKET_NAME
```

Next, run the following command to package our Lambda function to S3:

```bash
sam package \
    --output-template-file packaged.yaml \
    --s3-bucket REPLACE_THIS_WITH_YOUR_S3_BUCKET_NAME
```

Next, the following command will create a Cloudformation Stack and deploy your SAM resources.

```bash
sam deploy \
    --template-file packaged.yaml \
    --stack-name meetzee_lambda \
    --capabilities CAPABILITY_IAM
```

> **See [Serverless Application Model (SAM) HOWTO Guide](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-quick-start.html) for more details in how to get started.**

After deployment is complete you can run the following command to retrieve the API Gateway Endpoint URL:

```bash
aws cloudformation describe-stacks \
    --stack-name meetzee_lambda \
    --query 'Stacks[].Outputs[?OutputKey==`HelloWorldApi`]' \
    --output table
``` 

### Building the project

[AWS Lambda requires a flat folder](https://docs.aws.amazon.com/lambda/latest/dg/nodejs-create-deployment-pkg.html) with the application as well as its dependencies in a node_modules folder. When you make changes to your source code or dependency manifest,
run the following command to build your project local testing and deployment:

```bash
sam build
```

If your dependencies contain native modules that need to be compiled specifically for the operating system running on AWS Lambda, use this command to build inside a Lambda-like Docker container instead:
```bash
sam build --use-container
```

By default, this command writes built artifacts to `.aws-sam/build` folder.