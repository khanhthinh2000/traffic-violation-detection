import { RekognitionClient, DetectTextCommand } from "@aws-sdk/client-rekognition";
import { S3Client, HeadObjectCommand } from "@aws-sdk/client-s3";
import { SQSClient, SendMessageCommand } from "@aws-sdk/client-sqs";
import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";

// Initialize AWS clients
const rekognition = new RekognitionClient({ region: "us-east-1" });
const s3 = new S3Client({ region: "us-east-1" });
const sqs = new SQSClient({ region: "us-east-1" });
const dynamodb = new DynamoDBClient({ region: "us-east-1" });

const DOWNWARD_QUEUE_URL = "https://sqs.us-east-1.amazonaws.com/940482450672/DownwardQueue";
const OUT_OF_STATE_TABLE = "OutOfStateViolations";

// ✅ Function to Retrieve Metadata from S3
const getS3Metadata = async (bucket, key) => {
    try {
        console.log(`🛠 Fetching Metadata from S3 for: ${key}`);

        const response = await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
        console.log("✅ Raw Metadata Response:", response.Metadata);

        // AWS stores metadata keys in lowercase
        return {
            dateTime: response.Metadata["datetime"] || "Unknown",
            location: response.Metadata["location"] || "Unknown",
            violationType: response.Metadata["type"] || "Unknown",
            fineAmount: response.Metadata["fineamount"] || "Unknown"
        };
    } catch (err) {
        console.error("❌ Error Retrieving Metadata from S3:", err.message);
        return {
            dateTime: "Unknown",
            location: "Unknown",
            violationType: "Unknown",
            fineAmount: "Unknown"
        };
    }
};

// ✅ Function to Generate Unique Plate ID if Plate is Not Detected
const generateUniquePlateID = () => {
    const now = new Date();
    return `UNKNOWN-${now.toISOString().replace(/[-T:.Z]/g, "")}`;
};

// ✅ Function to Extract Plate Number from Detected Text
const extractPlateNumber = (textDetections) => {
    if (!textDetections || textDetections.length === 0) {
        console.log("🚫 No detected text found.");
        return { plate: null, state: null };
    }

    // ✅ Identify if a state name is detected
    const stateName = textDetections.find(d => /CALIFORNIA|NEW YORK|TEXAS|FLORIDA|MICHIGAN|ILLINOIS|GEORGIA|OREGON/i.test(d.DetectedText));
    let detectedState = stateName ? stateName.DetectedText.toUpperCase() : null;

    // ✅ Identify possible plates (Common formats: ABC 1234, 1ABC234, ABC123, ABC-123)
    let possiblePlates = textDetections
        .filter(d => /^[A-Z0-9-]{4,8}$/.test(d.DetectedText)) // Support 4-8 character plates
        .map(d => ({
            text: d.DetectedText,
            confidence: d.Confidence,
            size: d.Geometry?.BoundingBox?.Width * d.Geometry?.BoundingBox?.Height || 0
        }));

    if (possiblePlates.length === 0) {
        console.log("🚫 No valid license plate pattern found.");
        return { plate: null, state: detectedState };
    }

    // ✅ Prioritize California plates first (1ABC234 format)
    let californiaPlate = possiblePlates.find(p => /^[1-9][A-Z]{3}[0-9]{3}$/.test(p.text));
    if (californiaPlate) {
        console.log(`✅ Detected California Plate: ${californiaPlate.text}`);
        return { plate: californiaPlate.text, state: "CALIFORNIA" };
    }

    // ✅ If not California, select the largest & most confident plate
    let bestPlate = possiblePlates.reduce((prev, curr) =>
        (curr.size > prev.size || (curr.size === prev.size && curr.confidence > prev.confidence)) ? curr : prev
    );

    console.log(`✅ Detected Out-of-State Plate: ${bestPlate.text}`);
    return { plate: bestPlate.text, state: detectedState };
};

export async function handler(event) {
    try {
        // ✅ Extract bucket and key from S3 event
        const record = event.Records[0];
        const bucket = record.s3.bucket.name;
        const key = record.s3.object.key;
        console.log(`📷 Processing Image: ${key} from Bucket: ${bucket}`);

        // ✅ Detect text using Rekognition
        const rekognitionParams = { Image: { S3Object: { Bucket: bucket, Name: key } } };
        const command = new DetectTextCommand(rekognitionParams);
        const rekognitionResponse = await rekognition.send(command);

        // ✅ Extract detected text
        const detectedTextArray = rekognitionResponse.TextDetections || [];
        const detectedText = detectedTextArray.map(d => d.DetectedText).join(" ");
        console.log(`🔍 Detected Text: ${detectedText}`);

        // ✅ Extract the most likely plate number and state
        let { plate: extractedPlate, state: detectedState } = extractPlateNumber(detectedTextArray);
        if (!extractedPlate) {
            extractedPlate = generateUniquePlateID();
        }

        console.log(`📌 Final Extracted Plate: ${extractedPlate} | State: ${detectedState || "UNKNOWN"}`);

        // ✅ Fetch S3 Metadata
        const metadata = await getS3Metadata(bucket, key);

        // ✅ Construct message body
        const messageBody = {
            plate: extractedPlate,
            state: detectedState || "UNKNOWN",
            dateTime: metadata.dateTime,
            location: metadata.location,
            violationType: metadata.violationType,
            fineAmount: metadata.fineAmount,
            image: key
        };

        console.log("🚀 Prepared Message for DownwardQueue:", JSON.stringify(messageBody, null, 2));

        if (detectedState === "CALIFORNIA") {
            console.log(`✅ California plate detected: ${extractedPlate}, sending to DownwardQueue.`);
            await sqs.send(new SendMessageCommand({
                QueueUrl: DOWNWARD_QUEUE_URL,
                MessageBody: JSON.stringify(messageBody)
            }));
            console.log("✅ Successfully Sent to DownwardQueue");
        } else {
            console.log(`🚫 Out-of-state plate detected, storing in OutOfStateViolations.`);
            await dynamodb.send(new PutItemCommand({
                TableName: OUT_OF_STATE_TABLE,
                Item: {
                    plate: { S: extractedPlate },
                    state: { S: detectedState || "UNKNOWN" },
                    detectedText: { S: detectedText },
                    dateTime: { S: metadata.dateTime },
                    location: { S: metadata.location },
                    violationType: { S: metadata.violationType },
                    fineAmount: { S: metadata.fineAmount },
                    timestamp: { S: new Date().toISOString() }
                }
            }));
        }

        return { statusCode: 200, body: "Processing completed!" };
    } catch (err) {
        console.error("❌ Error in PlateReaderFunction:", err);
        return { statusCode: 500, body: JSON.stringify({ error: err.message }) };
    }
}
