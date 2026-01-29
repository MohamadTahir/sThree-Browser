use crate::store::{load_configs, save_configs, BucketConfig, BucketConfigs};
use aws_config::{BehaviorVersion, Region, SdkConfig};
use aws_credential_types::Credentials;
use aws_sdk_s3::primitives::DateTime;
use aws_sdk_s3::Client as S3Client;
use aws_types::sdk_config::SharedCredentialsProvider;
use base64::{engine::general_purpose, Engine as _};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use tauri::AppHandle;

#[derive(Debug, Serialize, Deserialize)]
pub struct S3Object {
    pub key: String,
    pub size: i64,
    pub last_modified: Option<String>,
    pub is_folder: bool,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ListObjectsResponse {
    pub objects: Vec<S3Object>,
    pub prefix: String,
    pub common_prefixes: Vec<String>,
    pub next_continuation_token: Option<String>,
    pub is_truncated: bool,
    pub max_keys: i32,
}

// Global state to cache S3 clients
static S3_CLIENTS: Mutex<Option<HashMap<String, S3Client>>> = Mutex::new(None);

async fn get_or_create_client(
    app: &AppHandle,
    bucket_id: &str,
) -> Result<S3Client, String> {
    // Check if client exists first (release guard before await)
    {
        let clients_guard = S3_CLIENTS.lock().map_err(|e| format!("Failed to lock clients: {}", e))?;

        if let Some(clients) = clients_guard.as_ref() {
            if let Some(client) = clients.get(bucket_id) {
                return Ok(client.clone());
            }
        }
    }

    // Load configs and create new client (no guard held during await)
    let configs = load_configs(app).await.map_err(|e| e.to_string())?;

    let bucket_config = configs
        .buckets
        .get(bucket_id)
        .ok_or_else(|| format!("Bucket config not found: {}", bucket_id))?;

    let region = Region::new(bucket_config.region.clone());

    let credentials = Credentials::from_keys(
        &bucket_config.access_key,
        &bucket_config.secret_key,
        None,
    );

    // Create a static credentials provider
    #[derive(Debug)]
    struct StaticCredentialsProvider {
        credentials: Credentials,
    }

    impl aws_credential_types::provider::ProvideCredentials for StaticCredentialsProvider {
        fn provide_credentials<'a>(
            &'a self,
        ) -> aws_credential_types::provider::future::ProvideCredentials<'a>
        where
            Self: 'a,
        {
            aws_credential_types::provider::future::ProvideCredentials::ready(
                Ok(self.credentials.clone()),
            )
        }
    }

    let provider: Arc<dyn aws_credential_types::provider::ProvideCredentials> = Arc::new(StaticCredentialsProvider {
        credentials,
    });
    let credentials_provider: SharedCredentialsProvider = provider.into();

    let mut config_builder = SdkConfig::builder()
        .behavior_version(BehaviorVersion::latest())
        .region(region.clone())
        .credentials_provider(credentials_provider);

    // Only set endpoint URL if explicitly provided and valid (for S3-compatible storage like MinIO/R2)
    // For AWS S3, DO NOT set endpoint_url - the SDK will automatically construct it from the region
    // IMPORTANT: Never set an empty endpoint URL as it causes DNS resolution errors
    let mut use_custom_endpoint = false;
    if let Some(endpoint) = &bucket_config.endpoint {
        let trimmed = endpoint.trim();
        eprintln!("Raw endpoint from config: '{}'", trimmed);
        if !trimmed.is_empty() && trimmed != "null" && trimmed != "undefined" {
            // Normalize endpoint URL: add https:// if no protocol specified
            let clean_endpoint = trimmed.trim_end_matches('/').trim();

            // Parse and validate the endpoint URL
            let final_endpoint = if clean_endpoint.starts_with("http://") || clean_endpoint.starts_with("https://") {
                // Already has protocol - use as-is but ensure it's clean
                let url = clean_endpoint.trim_start_matches("http://").trim_start_matches("https://");
                if url.is_empty() {
                    eprintln!("ERROR: Endpoint URL has protocol but no hostname!");
                    return Err(format!("Invalid endpoint URL: '{}'", clean_endpoint));
                }
                clean_endpoint.to_string()
            } else {
                // No protocol - add https://
                if clean_endpoint.is_empty() {
                    eprintln!("ERROR: Endpoint is empty after trimming!");
                    return Err("Invalid endpoint: empty value".to_string());
                }
                format!("https://{}", clean_endpoint)
            };

            eprintln!("Normalized endpoint: '{}'", final_endpoint);
            eprintln!("Setting endpoint_url to: '{}'", final_endpoint);

            // Validate the URL format
            if !final_endpoint.starts_with("http://") && !final_endpoint.starts_with("https://") {
                return Err(format!("Invalid endpoint URL format: '{}'", final_endpoint));
            }

            config_builder = config_builder.endpoint_url(&final_endpoint);
            use_custom_endpoint = true;
        } else {
            eprintln!("Endpoint '{}' is invalid, skipping (will use AWS S3 default for region: {})", trimmed, bucket_config.region);
        }
    } else {
        eprintln!("No endpoint provided, SDK will use AWS S3 default for region: {}", bucket_config.region);
    }

    let config = config_builder.build();
    eprintln!("S3 Config built - Region: {:?}", config.region());
    if let Some(endpoint) = config.endpoint_url() {
        eprintln!("  Endpoint URL: {}", endpoint);
    } else {
        eprintln!("  Endpoint URL: (will be auto-constructed by SDK)");
    }

    // For S3-compatible storage (MinIO, etc.), use path-style addressing
    // AWS S3 uses virtual-hosted-style by default, but MinIO requires path-style
    let mut client_config_builder = aws_sdk_s3::config::Builder::from(&config);

    // Enable path-style addressing if using a custom endpoint (MinIO/R2)
    if use_custom_endpoint {
        eprintln!("  Enabling path-style addressing for S3-compatible storage");
        client_config_builder = client_config_builder.force_path_style(true);
    }

    let client = S3Client::from_conf(client_config_builder.build());

    // Re-acquire lock to store the client
    {
        let mut clients_guard = S3_CLIENTS.lock().map_err(|e| format!("Failed to lock clients: {}", e))?;

        if clients_guard.is_none() {
            *clients_guard = Some(HashMap::new());
        }

        let clients = clients_guard.as_mut().unwrap();
        clients.insert(bucket_id.to_string(), client.clone());
    }

    Ok(client)
}

#[tauri::command]
pub async fn list_buckets(app: AppHandle, bucket_id: String) -> Result<Vec<String>, String> {
    let client = get_or_create_client(&app, &bucket_id).await?;

    let response = client
        .list_buckets()
        .send()
        .await
        .map_err(|e| format!("Failed to list buckets: {}", e))?;

    let buckets: Vec<String> = response
        .buckets()
        .iter()
        .filter_map(|b: &aws_sdk_s3::types::Bucket| b.name().map(|s: &str| s.to_string()))
        .collect();

    Ok(buckets)
}

#[tauri::command]
pub async fn list_objects(
    app: AppHandle,
    bucket_id: String,
    bucket_name: String,
    prefix: Option<String>,
    max_keys: Option<i32>,
    continuation_token: Option<String>,
) -> Result<ListObjectsResponse, String> {
    eprintln!("list_objects called - bucket_id: {}, bucket_name: {}", bucket_id, bucket_name);

    // Debug: Check what config we have
    let configs = load_configs(&app).await.map_err(|e| e.to_string())?;
    if let Some(config) = configs.buckets.get(&bucket_id) {
        eprintln!("Config endpoint: {:?}", config.endpoint);
    }

    let client = get_or_create_client(&app, &bucket_id).await?;

    let prefix = prefix.unwrap_or_default();
    let page_size = max_keys.unwrap_or(100); // Default to 100 items per page
    eprintln!("Listing objects in bucket '{}' with prefix '{}', max_keys: {}", bucket_name, prefix, page_size);

    let mut request = client
        .list_objects_v2()
        .bucket(&bucket_name)
        .delimiter("/")
        .max_keys(page_size);

    if !prefix.is_empty() {
        request = request.prefix(&prefix);
    }

    if let Some(token) = continuation_token {
        request = request.continuation_token(&token);
    }

    let response = request
        .send()
        .await
        .map_err(|e| {
            let error_msg = format!("Failed to list objects: {:?}", e);
            eprintln!("S3 Error details: {}", error_msg);
            error_msg
        })?;

    let mut objects = Vec::new();
    let mut common_prefixes = Vec::new();

    // Process common prefixes (folders)
    for prefix_obj in response.common_prefixes() {
        if let Some(prefix_str) = prefix_obj.prefix() {
            common_prefixes.push(prefix_str.to_string());
            objects.push(S3Object {
                key: prefix_str.to_string(),
                size: 0,
                last_modified: None,
                is_folder: true,
            });
        }
    }

    // Process objects
    for obj in response.contents() {
        if let Some(key) = obj.key() {
            // Skip if this is already included as a common prefix
            if !key.ends_with('/') {
                objects.push(S3Object {
                    key: key.to_string(),
                    size: obj.size().unwrap_or(0),
                    last_modified: obj
                        .last_modified()
                        .map(|dt: &DateTime| dt.to_string()),
                    is_folder: false,
                });
            }
        }
    }

    Ok(ListObjectsResponse {
        objects,
        prefix: prefix.clone(),
        common_prefixes,
        next_continuation_token: response.next_continuation_token().map(|s| s.to_string()),
        is_truncated: response.is_truncated().unwrap_or(false),
        max_keys: page_size,
    })
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ObjectContentResponse {
    pub data: String, // Base64 encoded
    pub size: usize,
}

#[tauri::command]
pub async fn get_object_content(
    app: AppHandle,
    bucket_id: String,
    bucket_name: String,
    key: String,
) -> Result<ObjectContentResponse, String> {
    eprintln!("get_object_content called - bucket_id: {}, bucket_name: {}, key: {}", bucket_id, bucket_name, key);

    let client = get_or_create_client(&app, &bucket_id).await?;

    let response = client
        .get_object()
        .bucket(&bucket_name)
        .key(&key)
        .send()
        .await
        .map_err(|e| format!("Failed to get object: {}", e))?;

    eprintln!("Got response, collecting body...");

    // Collect the body into a Vec<u8>
    let body_bytes = response
        .body
        .collect()
        .await
        .map_err(|e| {
            let err_msg = format!("Failed to read stream: {}", e);
            eprintln!("Stream error: {}", err_msg);
            err_msg
        })?
        .into_bytes();

    eprintln!("Collected {} bytes", body_bytes.len());

    // Encode as base64 for reliable transmission
    let base64_data = general_purpose::STANDARD.encode(&body_bytes);

    Ok(ObjectContentResponse {
        data: base64_data,
        size: body_bytes.len(),
    })
}

#[tauri::command]
pub async fn add_bucket_config(
    app: AppHandle,
    nickname: String,
    bucket_name: String,
    access_key: String,
    secret_key: String,
    region: String,
    endpoint: Option<String>,
) -> Result<String, String> {
    let mut configs = load_configs(&app).await.map_err(|e| e.to_string())?;

    let bucket_id = format!("bucket_{}", nickname.to_lowercase().replace(' ', "_"));

    let config = BucketConfig {
        nickname: nickname.clone(),
        bucket_name,
        access_key,
        secret_key,
        region,
        endpoint,
    };

    configs.buckets.insert(bucket_id.clone(), config);

    // Set as active if it's the first bucket
    if configs.active_bucket.is_none() {
        configs.active_bucket = Some(bucket_id.clone());
    }

    save_configs(&app, &configs).await.map_err(|e| e.to_string())?;

    // Clear cached client for this bucket
    if let Ok(mut clients_guard) = S3_CLIENTS.lock() {
        if let Some(clients) = clients_guard.as_mut() {
            clients.remove(&bucket_id);
        }
    }

    Ok(bucket_id)
}

#[tauri::command]
pub async fn get_bucket_configs(app: AppHandle) -> Result<BucketConfigs, String> {
    load_configs(&app).await.map_err(|e| e.to_string())
}

#[tauri::command]
pub async fn delete_bucket_config(app: AppHandle, bucket_id: String) -> Result<(), String> {
    let mut configs = load_configs(&app).await.map_err(|e| e.to_string())?;

    configs.buckets.remove(&bucket_id);

    if configs.active_bucket.as_ref() == Some(&bucket_id) {
        configs.active_bucket = configs.buckets.keys().next().cloned();
    }

    save_configs(&app, &configs).await.map_err(|e| e.to_string())?;

    // Clear cached client
    if let Ok(mut clients_guard) = S3_CLIENTS.lock() {
        if let Some(clients) = clients_guard.as_mut() {
            clients.remove(&bucket_id);
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn update_bucket_config(
    app: AppHandle,
    bucket_id: String,
    nickname: String,
    bucket_name: String,
    access_key: String,
    secret_key: String,
    region: String,
    endpoint: Option<String>,
) -> Result<(), String> {
    let mut configs = load_configs(&app).await.map_err(|e| e.to_string())?;

    if !configs.buckets.contains_key(&bucket_id) {
        return Err(format!("Bucket config not found: {}", bucket_id));
    }

    let config = BucketConfig {
        nickname: nickname.clone(),
        bucket_name,
        access_key,
        secret_key,
        region,
        endpoint,
    };

    configs.buckets.insert(bucket_id.clone(), config);
    save_configs(&app, &configs).await.map_err(|e| e.to_string())?;

    // Clear cached client for this bucket to force recreation with new credentials
    if let Ok(mut clients_guard) = S3_CLIENTS.lock() {
        if let Some(clients) = clients_guard.as_mut() {
            clients.remove(&bucket_id);
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn set_active_bucket(app: AppHandle, bucket_id: String) -> Result<(), String> {
    let mut configs = load_configs(&app).await.map_err(|e| e.to_string())?;

    if !configs.buckets.contains_key(&bucket_id) {
        return Err(format!("Bucket config not found: {}", bucket_id));
    }

    configs.active_bucket = Some(bucket_id);
    save_configs(&app, &configs).await.map_err(|e| e.to_string())?;

    Ok(())
}
