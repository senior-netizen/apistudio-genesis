terraform {
  required_version = ">= 1.4.0"
  required_providers {
    google = {
      source  = "hashicorp/google"
      version = ">= 5.0.0"
    }
    random = {
      source  = "hashicorp/random"
      version = ">= 3.5.0"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

resource "google_project_service" "services" {
  for_each = toset([
    "run.googleapis.com",
    "compute.googleapis.com",
    "sqladmin.googleapis.com",
    "redis.googleapis.com",
    "monitoring.googleapis.com"
  ])
  service = each.value
}

resource "google_compute_network" "squirrel" {
  name                    = "squirrel-${var.environment}-net"
  auto_create_subnetworks = false
}

resource "google_compute_subnetwork" "squirrel" {
  name          = "squirrel-${var.environment}-subnet"
  ip_cidr_range = "10.20.0.0/20"
  region        = var.region
  network       = google_compute_network.squirrel.id
}

resource "random_password" "postgres" {
  length  = 24
  special = true
}

resource "google_sql_database_instance" "postgres" {
  name             = "squirrel-${var.environment}-pg"
  database_version = "POSTGRES_14"
  region           = var.region
  depends_on       = [google_project_service.services]

  settings {
    tier              = "db-custom-1-3840"
    availability_type = "ZONAL"
    ip_configuration {
      ipv4_enabled    = false
      private_network = google_compute_network.squirrel.id
    }
    backup_configuration {
      enabled = true
    }
  }
}

resource "google_sql_user" "squirrel" {
  name     = "squirrel"
  instance = google_sql_database_instance.postgres.name
  password = random_password.postgres.result
}

resource "google_sql_database" "app" {
  name     = "squirrel"
  instance = google_sql_database_instance.postgres.name
}

resource "google_redis_instance" "sync" {
  name           = "squirrel-${var.environment}-redis"
  tier           = "STANDARD_HA"
  memory_size_gb = 4
  region         = var.region
  location_id    = "${var.region}-a"
  authorized_network = google_compute_network.squirrel.id
}

resource "google_cloud_run_service" "backend" {
  name     = "squirrel-backend-${var.environment}"
  location = var.region
  depends_on = [google_project_service.services]

  template {
    spec {
      containers {
        image = var.backend_image
        env {
          name  = "DATABASE_URL"
          value = "postgres://${google_sql_user.squirrel.name}:${random_password.postgres.result}@/${google_sql_database.app.name}?host=/cloudsql/${google_sql_database_instance.postgres.connection_name}"
        }
        env {
          name  = "REDIS_URL"
          value = "redis://${google_redis_instance.sync.host}:6379"
        }
      }
    }
  }
}

resource "google_cloud_run_service" "gateway" {
  name     = "squirrel-gateway-${var.environment}"
  location = var.region
  depends_on = [google_project_service.services]

  template {
    spec {
      containers {
        image = var.gateway_image
        env {
          name  = "BACKEND_URL"
          value = google_cloud_run_service.backend.status[0].url
        }
      }
    }
  }
}

resource "google_monitoring_dashboard" "slo" {
  dashboard_json = <<JSON
{
  "displayName": "Squirrel Hosted SLOs",
  "gridLayout": {
    "columns": 2,
    "widgets": [
      {
        "title": "Backend latency",
        "xyChart": {
          "dataSets": [
            {
              "timeSeriesQuery": {
                "timeSeriesFilter": {
                  "filter": "metric.type=\"run.googleapis.com/request_latencies\" resource.label.\"service_name\"=\"${google_cloud_run_service.backend.name}\""
                }
              }
            }
          ]
        }
      }
    ]
  }
}
JSON
}

output "backend_url" {
  value = google_cloud_run_service.backend.status[0].url
}

output "gateway_url" {
  value = google_cloud_run_service.gateway.status[0].url
}

output "database_connection_name" {
  value = google_sql_database_instance.postgres.connection_name
}
