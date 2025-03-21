import AWS from 'aws-sdk';
import fs from 'fs';
import xml2js from 'xml2js';
import path from 'path';
import { fileURLToPath } from 'url';

// AWS Configuration
AWS.config.update({ region: "us-east-1" });

const sqs = new AWS.SQS();
const DOWNWARD_QUEUE_URL = "https://sqs.us-east-1.amazonaws.com/940482450672/DownwardQueue";
const UPWARD_QUEUE_URL = "https://sqs.us-east-1.amazonaws.com/940482450672/UpwardQueue";

// Get absolute path of current script
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Construct absolute paths for DMV Database files
const jsonFilePath = path.join(__dirname, '../DMVDatabase.json');
const xmlFilePath = path.join(__dirname, '../DMVDatabase.xml');

// Load DMV Database (JSON & XML)
let dmvDatabaseJson = {};
let dmvDatabaseXml = '';

try {
    dmvDatabaseJson = JSON.parse(fs.readFileSync(jsonFilePath, 'utf8'));
    console.log("✅ DMV JSON Database Loaded Successfully");
} catch (err) {
    console.error("❌ Error Loading DMV JSON Database:", err.message);
}

try {
    dmvDatabaseXml = fs.readFileSync(xmlFilePath, 'utf8');
    console.log("✅ DMV XML Database Loaded Successfully");
} catch (err) {
    console.error("❌ Error Loading DMV XML Database:", err.message);
}

// Function to Parse XML
const parseXml = async (xml) => {
    return new Promise((resolve, reject) => {
        xml2js.parseString(xml, (err, result) => {
            if (err) reject(err);
            else resolve(result);
        });
    });
};

// ✅ Function to Find Vehicle in DMV Database
const getVehicleInfo = async (plate) => {
    console.log(`🔍 Searching for plate: ${plate} in DMV database...`);

    // ✅ Check JSON database
    if (dmvDatabaseJson.dmv && dmvDatabaseJson.dmv.vehicle) {
        let vehicle = dmvDatabaseJson.dmv.vehicle.find(v => v._plate === plate);
        if (vehicle) {
            console.log(`✅ Vehicle Found in JSON DB: ${plate}`);
            return {
                plate: vehicle._plate,
                owner: vehicle.owner.name,
                email: vehicle.owner.contact,
                vehicle: `${vehicle.color} ${vehicle.make} ${vehicle.model}`
            };
        }
    }

    // ✅ Check XML database
    if (dmvDatabaseXml) {
        const dmvDataXml = await parseXml(dmvDatabaseXml);
        const vehicles = dmvDataXml?.dmv?.vehicle || [];

        let vehicleXml = vehicles.find(v => v.$.plate === plate);
        if (vehicleXml) {
            console.log(`✅ Vehicle Found in XML DB: ${plate}`);
            return {
                plate: vehicleXml.$.plate,
                owner: vehicleXml.owner[0].name[0],
                email: vehicleXml.owner[0].contact[0],
                vehicle: `${vehicleXml.color[0]} ${vehicleXml.make[0]} ${vehicleXml.model[0]}`
            };
        }
    }

    console.log(`❌ Vehicle Not Found: ${plate}`);
    return {
        plate: plate,
        owner: "Unknown",
        email: "Unknown",
        vehicle: "Unknown"
    };
};

// ✅ Function to Process Messages from DownwardQueue
const processQueue = async () => {
    try {
        const params = { QueueUrl: DOWNWARD_QUEUE_URL, MaxNumberOfMessages: 1, WaitTimeSeconds: 10 };
        const response = await sqs.receiveMessage(params).promise();

        if (!response.Messages || response.Messages.length === 0) {
            return;
        }

        const message = response.Messages[0];
        const messageBody = JSON.parse(message.Body);

        console.log("📩 Received Data from DownwardQueue:", messageBody);

        // ✅ Retrieve vehicle details from DMV database
        const vehicleInfo = await getVehicleInfo(messageBody.plate);

        // ✅ Ensure metadata fields are properly assigned
        const fullViolationData = {
            date: messageBody.dateTime || "Unknown",
            location: messageBody.location || "Unknown",
            vehicle: vehicleInfo.vehicle || "Unknown",
            plate: messageBody.plate || "Unknown",
            violationType: messageBody.violationType || "Unknown",
            fineAmount: messageBody.fineAmount || "Unknown",
            owner: vehicleInfo.owner || "Unknown",
            email: vehicleInfo.email || "Unknown"
        };

        console.log("✅ Sending Full Violation Data to UpwardQueue:", fullViolationData);

        // ✅ Send to UpwardQueue
        try {
            const result = await sqs.sendMessage({
                QueueUrl: UPWARD_QUEUE_URL,
                MessageBody: JSON.stringify(fullViolationData)
            }).promise();
            console.log(`✅ Successfully Sent to UpwardQueue: MessageId ${result.MessageId}`);
        } catch (error) {
            console.error("❌ Error Sending to UpwardQueue:", error.message);
        }

        // ✅ Delete processed message from DownwardQueue
        await sqs.deleteMessage({ QueueUrl: DOWNWARD_QUEUE_URL, ReceiptHandle: message.ReceiptHandle }).promise();
        console.log(`🗑️ Deleted message ${message.MessageId} from DownwardQueue.`);
    } catch (err) {
        console.error("❌ Error Processing SQS Message:", err.message);
    }
};

// ✅ Main Loop to Continuously Check Queue
const main = async () => {
    console.log("🚦 DMVService Running...");
    while (true) {
        await processQueue();
        await new Promise(res => setTimeout(res, 5000));
    }
};

// ✅ Start the service
main();
