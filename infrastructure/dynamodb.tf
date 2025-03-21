resource "aws_dynamodb_table" "california_violations" {
  name           = "CaliforniaViolations"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "plate"

  attribute {
    name = "plate"
    type = "S"
  }
}
