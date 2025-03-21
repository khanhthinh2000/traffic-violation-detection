import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const sns = new SNSClient({ region: "us-east-1" });
const TOPIC_ARN = "arn:aws:sns:us-east-1:940482450672:TrafficViolationEmails";

export const handler = async (event) => {
    try {
        console.log("🚀 Received Event:", JSON.stringify(event, null, 2));

        // ✅ Process each record from DynamoDB Stream
        for (const record of event.Records) {
            if (record.eventName !== "INSERT") {
                console.log("🔍 Skipping non-insert event.");
                continue;
            }

            // ✅ Extract new data from DynamoDB Stream
            const newItem = record.dynamodb.NewImage;
            if (!newItem) {
                console.error("🚫 No new data found.");
                continue;
            }

            // ✅ Extract required fields
            const data = {
                date: newItem.date.S || "Unknown",
                location: newItem.location.S || "Unknown",
                vehicle: newItem.vehicle.S || "Unknown",
                plate: newItem.plate.S || "Unknown",
                violationType: newItem.violationType.S || "Unknown",
                fineAmount: newItem.fineAmount.S || "Unknown",
                owner: newItem.owner.S || "Unknown",
                email: newItem.email.S || "Unknown"
            };

            // ✅ Construct email message
            const emailMessage = `
Your vehicle was involved in a traffic violation. Please pay the specified fine amount within 30 days.

Date: ${data.date}
Violation Address: ${data.location}
Vehicle: ${data.vehicle}
License Plate: ${data.plate}
Violation Type: ${data.violationType}
Ticket Amount: ${data.fineAmount}

For any inquiries, please contact the DMV.
            `;

            console.log("📧 Sending Email Notification:", emailMessage);

            // ✅ Send email via SNS
            await sns.send(new PublishCommand({
                TopicArn: TOPIC_ARN,
                Message: emailMessage,
                Subject: "Traffic Violation Notice",
            }));

            console.log("✅ Email Sent Successfully.");
        }

    } catch (error) {
        console.error("❌ Error Sending Email Notification:", error.message);
    }
};
