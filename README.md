# RunBook: Deployment and Testing of Designed Solution

## Overview
This RunBook outlines the steps required to deploy your cloud solution into a Kubernetes cluster and test the deployment. Follow these steps to ensure a smooth and correct deployment of the application.

## Prerequisites
Before proceeding with the deployment, ensure you have the following tools and services ready:

- **Kubernetes Cluster**: Ensure access to the Kubernetes cluster.
- **AWS ECR**: Docker images are stored in Amazon Elastic Container Registry (ECR).
- **Kubernetes CLI (`kubectl`)**: Installed and configured to access the cluster.
- **AWS CLI**: Installed and configured with proper AWS credentials.
- **GitHub Actions**: Set up for CI/CD pipeline (if applicable).
- **Docker**: Installed and authenticated with ECR for building and pushing Docker images.

---

## Deployment Steps

### 1. Authenticate Docker with ECR
Before deploying the application, Docker must be authenticated with Amazon ECR to push and pull images.

```sh
aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <your-account-id>.dkr.ecr.us-east-1.amazonaws.com
```
### 2. Build and Push Docker Images
If you have not yet built and pushed your Docker image to ECR, do so now.

```sh
docker build -t <your-account-id>.dkr.ecr.us-east-1.amazonaws.com/<your-repository>:latest .
docker push <your-account-id>.dkr.ecr.us-east-1.amazonaws.com/<your-repository>:latest
```
### 3. Update Kubernetes Configuration
Ensure that your Kubernetes configuration files (`k8s/deployment.yml`,` k8s/service.yml`) are up-to-date, and the correct Docker image tags are used.

Example Deployment Configuration (`k8s/deployment.yml`):

```sh
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app-green
spec:
  replicas: 2
  selector:
    matchLabels:
      app: my-app
      version: green
  template:
    metadata:
      labels:
        app: my-app
        version: green
    spec:
      containers:
        - name: my-app
          image: <your-account-id>.dkr.ecr.us-east-1.amazonaws.com/<your-repository>:latest
          ports:
            - containerPort: 8080
          imagePullPolicy: Always
```
Example Service Configuration (`k8s/service.yml`)**:
```sh
apiVersion: v1
kind: Service
metadata:
  name: my-app-service
spec:
  selector:
    app: my-app
  ports:
    - protocol: TCP
      port: 80
      targetPort: 8080
  type: LoadBalancer
```
## 4. Deploy to Kubernetes
Deploy the configurations to your Kubernetes cluster:
```sh
kubectl apply -f k8s/deployment.yml
kubectl apply -f k8s/service.yml
```

## 5. Update Deployments
To update existing deployments with a new image tag, use the following command:

```sh
kubectl set image deployment/my-app-green my-app=<your-account-id>.dkr.ecr.us-east-1.amazonaws.com/<your-repository>:latest
```
## 2. Check Service
Verify that the service is running and obtain the external IP address to access the application:

```sh
kubectl get services
```

## View Logs
To troubleshoot any issues or review the pod logs, run:

```sh
kubectl logs <pod-name>
```
## CI/CD Integration
To enable Continuous Integration (CI) and Continuous Deployment (CD) for your solution, GitHub Actions can be configured to automate build, test, and deployment steps. Below is the breakdown of each step:

## CI Phase: Build, Test, and Push Docker Images
Whenever new code is pushed or a pull request is created, the CI pipeline runs to ensure the code is valid.

```sh
name: CI/CD Pipeline

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
    - name: Checkout code
      uses: actions/checkout@v2

    - name: Set up Docker Buildx
      uses: docker/setup-buildx-action@v1

    - name: Log in to Amazon ECR
      run: |
        aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin <your-account-id>.dkr.ecr.us-east-1.amazonaws.com

    - name: Build and Push Docker Image
      run: |
        docker build -t <your-account-id>.dkr.ecr.us-east-1.amazonaws.com/<your-repository>:latest .
        docker push <your-account-id>.dkr.ecr.us-east-1.amazonaws.com/<your-repository>:latest
```

## CD Phase: Deploy to Kubernetes (Blue-Green Deployment)
Deploying the solution using the Blue-Green Deployment model minimizes downtime and risk by keeping the current (green) version live while deploying the new (blue) version. Once successful, traffic is switched to the new version.

```sh
  deploy:
    runs-on: ubuntu-latest
    needs: build

    steps:
    - name: Install kubectl
      run: |
        curl -LO "https://storage.googleapis.com/kubernetes-release/release/$(curl -s https://storage.googleapis.com/kubernetes-release/release/stable.txt)/bin/linux/amd64/kubectl"
        chmod +x ./kubectl
        sudo mv ./kubectl /usr/local/bin/kubectl

    - name: Deploy to Kubernetes
      run: |
        kubectl apply -f k8s/deployment.yml
        kubectl apply -f k8s/service.yml
        kubectl rollout status deployment/my-app-green
        kubectl set image deployment/my-app-green my-app=<your-account-id>.dkr.ecr.us-east-1.amazonaws.com/<your-repository>:latest
```
## Blue-Green Deployment Process

The Blue-Green Deployment strategy helps to minimize downtime and risk by running two environments, "Blue" and "Green". Here’s a step-by-step guide:

1. **Deploy Blue**: Deploy the new version of your application alongside the existing version. This allows the new version to be tested without disrupting the current live traffic.

2. **Test Blue**: Conduct thorough testing on the Blue environment to ensure the new version functions correctly and meets all requirements. This process ensures that any issues can be addressed without impacting live users.

3. **Switch Traffic**: If the Blue environment passes all tests and is confirmed to be stable, switch the traffic from the Green (current) version to the Blue (new) version. This step effectively makes the new version live.

4. **Remove Green**: Once the Blue version is fully operational and stable, retire the Green version. This step helps in freeing up resources and finalizing the deployment process.

### Notes:
- Always be prepared to rollback to the Green version if the Blue deployment encounters critical issues during testing or in production.
- Continuously monitor live traffic and application performance after switching to ensure the new version is working as expected before removing the Green deployment.

