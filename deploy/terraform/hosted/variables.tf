variable "project_id" {
  description = "GCP project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
  default     = "us-central1"
}

variable "environment" {
  description = "Deployment environment label (e.g. staging, prod)"
  type        = string
  default     = "staging"
}

variable "backend_image" {
  description = "Container image for the NestJS backend"
  type        = string
  default     = "gcr.io/cloudrun/hello"
}

variable "gateway_image" {
  description = "Container image for the API gateway"
  type        = string
  default     = "gcr.io/cloudrun/hello"
}
