const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

// Configure AWS
AWS.config.update({ region: "us-west-1" }); // Change to your AWS region
const s3 = new AWS.S3();
const bucketName = "traffic-violation-bucket-cs455"; // Change to your actual bucket name

// ✅ List of Possible Locations
const locations = [
    "Main St and 116th AVE intersection, Bellevue",
    "5th Ave & Pine St, Seattle",
    "Mission Blvd & G St, San Diego",
    "Broadway & 42nd St, New York City"
];

// ✅ Violation Types & Corresponding Fine Amounts
const violationTypes = [
    { type: "no_stop", fine: "$300.00" },
    { type: "no_full_stop_on_right", fine: "$75.00" },
    { type: "no_right_on_red", fine: "$125.00" }
];

// ✅ Get Random Item from an Array
const getRandomItem = (array) => array[Math.floor(Math.random() * array.length)];

// ✅ Function to Upload Image with Metadata
async function uploadImage(filePath, metadata) {
    try {
        if (!fs.existsSync(filePath)) {
            console.error("❌ Error: File does not exist:", filePath);
            process.exit(1);
        }

        const fileContent = fs.readFileSync(filePath);
        const fileName = path.basename(filePath);

        const params = {
            Bucket: bucketName,
            Key: fileName,
            Body: fileContent,
            Metadata: metadata
        };

        const data = await s3.upload(params).promise();
        console.log("✅ Upload successful:", data.Location);
    } catch (err) {
        console.error("❌ Upload failed:", err);
    }
}

// ✅ Function to Simulate Image Upload
async function simulateUpload() {
    // Get image file from command line argument
    const imageFile = process.argv[2];

    if (!imageFile) {
        console.error("❌ Error: No image file provided.");
        console.error("Usage: node CameraApp.js ../LicencePlates/cal_plate1.jpg");
        process.exit(1);
    }

    const location = getRandomItem(locations);
    const violation = getRandomItem(violationTypes);

    const metadata = {
        Location: location,
        DateTime: new Date().toISOString(), // Auto-generates timestamp
        Type: violation.type,
        FineAmount: violation.fine
    };

    console.log("🚀 Uploading image to S3...");
    console.log(`📸 Image: ${imageFile}`);
    console.log(`📍 Location: ${location}`);
    console.log(`🚦 Violation Type: ${violation.type}`);
    console.log(`💰 Fine Amount: ${violation.fine}`);

    uploadImage(imageFile, metadata);
}

// Run the simulation
simulateUpload();

/*
node CameraApp.js ../LicencePlates/cal_plate1.jpg
node CameraApp.js ../LicencePlates/cal_plate2.jpg
node CameraApp.js ../LicencePlates/cal_plate3.jpg
node CameraApp.js ../LicencePlates/cal_plate4.jpg
node CameraApp.js ../LicencePlates/cal_plate5.jpg
node CameraApp.js ../LicencePlates/michigan_plate6.jpg
node CameraApp.js ../LicencePlates/ny_plate7.jpg
node CameraApp.js ../LicencePlates/oregon_plate8.jpg

*/