resource "aws_sqs_queue" "upward_queue" {
  name                      = "UpwardQueue"
  message_retention_seconds = 345600
  visibility_timeout_seconds = 30
  receive_wait_time_seconds  = 10
  sqs_managed_sse_enabled    = true
}

resource "aws_sqs_queue" "downward_queue" {
  name                      = "DownwardQueue"
  message_retention_seconds = 345600
  visibility_timeout_seconds = 30
  receive_wait_time_seconds  = 0
  sqs_managed_sse_enabled    = true
}