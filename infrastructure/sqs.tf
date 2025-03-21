resource "aws_sqs_queue" "upward_queue" {
  name                      = "UpwardQueue"
  message_retention_seconds = 345600
  visibility_timeout_seconds = 30
}
