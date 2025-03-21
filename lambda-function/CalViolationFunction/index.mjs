import { DynamoDBClient, PutItemCommand } from "@aws-sdk/client-dynamodb";

const dynamoDB = new DynamoDBClient({ region: "us-east-1" });

const CALIFORNIA_TABLE = "CaliforniaViolations";

export const handler = async (event) => {
    try {
        console.log("📩 Received messages from UpwardQueue:", JSON.stringify(event, null, 2));

        if (!event.Records || event.Records.length === 0) {
            console.log("🚫 No new messages received.");
            return;
        }

        for (const record of event.Records) {
            try {
                const violation = JSON.parse(record.body);
                console.log("📩 Processing Violation:", violation);

                const { plate, violationType, fineAmount, owner, email, location, date, vehicle } = violation;

                await dynamoDB.send(new PutItemCommand({
                    TableName: CALIFORNIA_TABLE,
                    Item: {
                        plate: { S: plate },
                        violationType: { S: violationType },
                        fineAmount: { S: fineAmount },
                        owner: { S: owner },
                        email: { S: email },
                        location: { S: location },
                        date: { S: date },
                        vehicle: { S: vehicle }
                    }
                }));

                console.log(`✅ Stored in ${CALIFORNIA_TABLE} table.`);

            } catch (err) {
                console.error("❌ Error processing message:", err.message);
            }
        }
    } catch (error) {
        console.error("❌ Error processing event:", error.message);
    }
};
