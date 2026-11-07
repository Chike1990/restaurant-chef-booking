#!/bin/bash
# Runs inside the LocalStack container once S3 is accepting requests.
# `awslocal` is LocalStack's aws CLI wrapper, pre-pointed at the local endpoint.
set -euo pipefail

BUCKET="${S3_BUCKET:-golden-spoon-media}"
REGION="${AWS_DEFAULT_REGION:-eu-west-2}"

if awslocal s3api head-bucket --bucket "$BUCKET" 2>/dev/null; then
  echo "bucket $BUCKET already exists"
else
  awslocal s3api create-bucket \
    --bucket "$BUCKET" \
    --region "$REGION" \
    --create-bucket-configuration "LocationConstraint=$REGION"
  echo "created bucket $BUCKET"
fi

# Dish and event photos are served straight to the browser, so reads are public
# while writes stay credentialed. Production uses CloudFront in front of a
# private bucket instead; this only mirrors the read behaviour.
awslocal s3api put-bucket-policy --bucket "$BUCKET" --policy "{
  \"Version\": \"2012-10-17\",
  \"Statement\": [{
    \"Sid\": \"PublicRead\",
    \"Effect\": \"Allow\",
    \"Principal\": \"*\",
    \"Action\": \"s3:GetObject\",
    \"Resource\": \"arn:aws:s3:::$BUCKET/*\"
  }]
}"

# The admin uploads images from the browser, so the bucket must answer
# cross-origin PUTs from the Vite dev server.
awslocal s3api put-bucket-cors --bucket "$BUCKET" --cors-configuration '{
  "CORSRules": [{
    "AllowedOrigins": ["http://localhost:5173"],
    "AllowedMethods": ["GET", "PUT", "HEAD"],
    "AllowedHeaders": ["*"],
    "MaxAgeSeconds": 3000
  }]
}'

echo "s3 init complete"
