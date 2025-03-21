resource "aws_dynamodb_table" "california_violations" {
  name         = "CaliforniaViolations"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "plate"

  attribute {
    name = "plate"
    type = "S"
  }
}

resource "aws_dynamodb_table" "out_of_state_violations" {
  name         = "OutOfStateViolations"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "plate"

  attribute {
    name = "plate"
    type = "S"
  }
}
