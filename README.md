# 🚦 Traffic Violation Detection System

## 📝 Description
This project automates the detection and processing of traffic violations using cloud-based services. When a traffic camera captures an image of a vehicle suspected of violating traffic laws, the system extracts the license plate number and uploads the data to cloud storage. The system then processes the plate information to determine the jurisdiction of the vehicle. If applicable, additional details about the vehicle owner are retrieved from a database. The violation details are then recorded in a cloud-based data store, and a notification is sent to the vehicle owner with details about the violation and necessary actions to be taken. The system utilizes cloud services to ensure scalability, automation, and efficient processing.

## 📌 Features
- 🚗 **License plate detection using AWS Rekognition**
- 📧 **S3 stores traffic violation images**
- 📬 **SQS queues messages for processing**
- 📂 **DynamoDB stores violations**
- ✉ **SNS sends email notifications**

## 🛠 Technologies Used
- **AWS Lambda** (Serverless function processing)
- **AWS S3** (Stores uploaded license plates)
- **AWS Rekognition** (Extracts text from images)
- **AWS SQS** (Manages queue-based processing)
- **AWS DynamoDB** (Stores violation records)
- **AWS SNS** (Sends notifications via email)
- **Database service for vehicle information lookup**
- **Node.js** (Main backend)

## 🚀 How to Run Locally
To run this project locally, follow these steps:

1. **Clone the repository:** Download the project code from GitHub to your local machine.
2. **Install dependencies:** Navigate to the project directory and install required Node.js packages.
3. **Configure AWS credentials:** Ensure your AWS credentials are correctly set up to interact with services like S3, SQS, and DynamoDB.
4. **Set up AWS services:** Ensure AWS Lambda, SQS, DynamoDB, and SNS are correctly configured.
5. **Deploy the infrastructure:** Use Terraform or CloudFormation scripts to set up AWS resources.
6. **Run the CameraApp:** This simulates uploading an image of a vehicle’s license plate to an S3 bucket.
7. **Start the database service:** This service interacts with the vehicle database to verify ownership details.
8. **Monitor logs:** Use AWS CloudWatch to track messages and confirm that violations are processed correctly.

### Example Commands:
```sh
# Clone the repository
git clone https://github.com/khanhthinh2000/traffic-violation-detection.git
cd traffic-violation-detection

# Install dependencies
npm install

# Deploy AWS infrastructure (if using Terraform)
cd infrastructure
terraform init
terraform apply
cd ..

# Run the CameraApp to upload an image
node camera-app/CameraApp.js ../LicencePlates/sample_plate.jpg

# Start the database service
node local-services/app.mjs
```

## 📝 License
This project is open-source under the MIT License.

