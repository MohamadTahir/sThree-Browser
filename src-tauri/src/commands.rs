use crate::store::{load_configs, save_configs, BucketConfig, BucketConfigs};
use aws_config::{BehaviorVersion, Region, SdkConfig};
use aws_credential_types::Credentials;
use aws_sdk_s3::primitives::DateTime;
use aws_sdk_s3::{Client as S3Client, presigning::PresigningConfig};
use aws_types::sdk_config::SharedCredentialsProvider;
use base64::{engine::general_purpose, Engine as _};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use std::time::Duration;
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

    // Only set endpoint URL if explicitly provided and valid (for S3-compatible storage)
    // For AWS S3, DO NOT set endpoint_url - the SDK will automatically construct it from the region
    // IMPORTANT: Never set an empty endpoint URL as it causes DNS resolution errors
    let mut use_custom_endpoint = false;
    if let Some(endpoint) = &bucket_config.endpoint {
        if !endpoint.is_empty() {
            config_builder = config_builder.endpoint_url(endpoint);
            use_custom_endpoint = true;
        }
    }

    let config = config_builder.build();

    // For S3-compatible storage, use path-style addressing
    // AWS S3 uses virtual-hosted-style by default, but S3-compatible storage requires path-style
    let mut client_config_builder = aws_sdk_s3::config::Builder::from(&config);

    // Enable path-style addressing if using a custom endpoint (MinIO/R2)
    if use_custom_endpoint {
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
    prefix: String,
    continuation_token: Option<String>,
    page_size: Option<i32>,
) -> Result<ListObjectsResponse, String> {
    let client = get_or_create_client(&app, &bucket_id).await?;

    let max_keys = page_size.unwrap_or(100).min(1000);

    let mut request = client
        .list_objects_v2()
        .bucket(&bucket_name)
        .delimiter("/")
        .max_keys(max_keys);

    if !prefix.is_empty() {
        request = request.prefix(&prefix);
    }

    if let Some(token) = continuation_token {
        request = request.continuation_token(&token);
    }

    let response = request
        .send()
        .await
        .map_err(|e| format!("Failed to list objects: {:?}", e))?;

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
        max_keys,
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
    let client = get_or_create_client(&app, &bucket_id).await?;

    let response = client
        .get_object()
        .bucket(&bucket_name)
        .key(&key)
        .send()
        .await
        .map_err(|e| format!("Failed to get object: {}", e))?;

    // Collect the body into a Vec<u8>
    let body_bytes = response
        .body
        .collect()
        .await
        .map_err(|e| format!("Failed to read stream: {}", e))?
        .into_bytes();

    // Encode as base64 for reliable transmission
    let base64_data = general_purpose::STANDARD.encode(&body_bytes);

    Ok(ObjectContentResponse {
        data: base64_data,
        size: body_bytes.len(),
    })
}

#[tauri::command]
pub fn get_download_dir() -> Result<serde_json::Value, String> {
    let download_dir = dirs::download_dir()
        .ok_or_else(|| "Failed to get download directory".to_string())?;
    Ok(serde_json::json!({
        "path": download_dir.to_string_lossy().to_string()
    }))
}

#[tauri::command]
pub fn get_dirname(path: String) -> Result<serde_json::Value, String> {
    let path_buf = PathBuf::from(&path);
    let dirname = path_buf
        .parent()
        .ok_or_else(|| "Failed to get directory name".to_string())?
        .to_string_lossy()
        .to_string();
    Ok(serde_json::json!({ "dirname": dirname }))
}

#[tauri::command]
pub async fn get_presigned_url(
    app: AppHandle,
    bucket_id: String,
    bucket_name: String,
    key: String,
    expires_in: Option<u64>,
) -> Result<String, String> {
    let client = get_or_create_client(&app, &bucket_id).await?;

    let expires = expires_in.unwrap_or(3600);

    let presigning_config = PresigningConfig::expires_in(Duration::from_secs(expires))
        .map_err(|e| format!("Failed to create presigning config: {}", e))?;

    let request = client
        .get_object()
        .bucket(&bucket_name)
        .key(&key)
        .presigned(presigning_config)
        .await
        .map_err(|e| format!("Failed to generate presigned URL: {}", e))?;

    Ok(request.uri().to_string())
}

#[tauri::command]
pub async fn delete_object(
    app: AppHandle,
    bucket_id: String,
    bucket_name: String,
    key: String,
    delete_all_versions: bool,
) -> Result<(), String> {
    let client = get_or_create_client(&app, &bucket_id).await?;

    if delete_all_versions {
        // List all versions
        let versions_response = client
            .list_object_versions()
            .bucket(&bucket_name)
            .prefix(&key)
            .send()
            .await
            .map_err(|e| format!("Failed to list object versions: {}", e))?;

        let mut objects_to_delete = Vec::new();

        // Add all versions
        for version in versions_response.versions() {
            if let Some(version_key) = version.key() {
                if version_key == key {
                    if let Some(version_id) = version.version_id() {
                        objects_to_delete.push(
                            aws_sdk_s3::types::ObjectIdentifier::builder()
                                .key(key.clone())
                                .version_id(version_id)
                                .build()
                                .map_err(|e| format!("Failed to build object identifier: {}", e))?,
                        );
                    }
                }
            }
        }

        // Add delete markers
        for marker in versions_response.delete_markers() {
            if let Some(marker_key) = marker.key() {
                if marker_key == key {
                    if let Some(version_id) = marker.version_id() {
                        objects_to_delete.push(
                            aws_sdk_s3::types::ObjectIdentifier::builder()
                                .key(key.clone())
                                .version_id(version_id)
                                .build()
                                .map_err(|e| format!("Failed to build object identifier: {}", e))?,
                        );
                    }
                }
            }
        }

        // Delete in batches (S3 allows up to 1000 objects per request)
        if !objects_to_delete.is_empty() {
            let batch_size = 1000;
            for chunk in objects_to_delete.chunks(batch_size) {
                let objects: Vec<aws_sdk_s3::types::ObjectIdentifier> = chunk.to_vec();
                client
                    .delete_objects()
                    .bucket(&bucket_name)
                    .delete(
                        aws_sdk_s3::types::Delete::builder()
                            .set_objects(Some(objects))
                            .quiet(false)
                            .build()
                            .map_err(|e| format!("Failed to build delete request: {}", e))?,
                    )
                    .send()
                    .await
                    .map_err(|e| format!("Failed to delete object versions: {}", e))?;
            }
        }
    } else {
        // Delete only the current version
        client
            .delete_object()
            .bucket(&bucket_name)
            .key(&key)
            .send()
            .await
            .map_err(|e| format!("Failed to delete object: {}", e))?;
    }

    Ok(())
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

    // Check for duplicate connection names (case-insensitive)
    let nickname_lower = nickname.to_lowercase().trim().to_string();
    let existing_bucket = configs.buckets.iter().find(|(_, cfg)| {
        cfg.nickname.to_lowercase().trim() == nickname_lower
    });

    if existing_bucket.is_some() {
        return Err(format!(
            "A connection with the name \"{}\" already exists. Please use a different name.",
            nickname
        ));
    }

    let bucket_id = format!("bucket_{}", nickname.to_lowercase().replace(' ', "_"));

    let config = BucketConfig {
        nickname: nickname.clone(),
        bucket_name,
        access_key,
        secret_key,
        region,
        endpoint,
        group_id: None,
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

    // Check for duplicate connection names (excluding current bucket)
    let nickname_lower = nickname.to_lowercase().trim().to_string();
    let existing_bucket = configs.buckets.iter().find(|(id, cfg)| {
        *id != &bucket_id && cfg.nickname.to_lowercase().trim() == nickname_lower
    });

    if existing_bucket.is_some() {
        return Err(format!(
            "A connection with the name \"{}\" already exists. Please use a different name.",
            nickname
        ));
    }

    // Preserve group_id from existing config
    let existing_group_id = configs.buckets.get(&bucket_id).and_then(|c| c.group_id.clone());

    let config = BucketConfig {
        nickname: nickname.clone(),
        bucket_name,
        access_key,
        secret_key,
        region,
        endpoint,
        group_id: existing_group_id,
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

#[tauri::command]
pub async fn clear_all_configs(app: AppHandle) -> Result<(), String> {
    // Clear all bucket configs by saving empty/default configs
    let empty_configs = BucketConfigs::default();
    save_configs(&app, &empty_configs).await.map_err(|e| e.to_string())?;

    // Clear cached S3 clients
    if let Ok(mut clients_guard) = S3_CLIENTS.lock() {
        if let Some(clients) = clients_guard.as_mut() {
            clients.clear();
        }
    }

    Ok(())
}

#[tauri::command]
pub async fn save_file_to_downloads(
    file_name: String,
    file_data: Vec<u8>,
) -> Result<String, String> {
    let download_dir = dirs::download_dir()
        .ok_or_else(|| "Failed to get download directory".to_string())?;

    let file_path = download_dir.join(&file_name);

    fs::write(&file_path, file_data)
        .map_err(|e| format!("Failed to write file: {}", e))?;

    Ok(file_path.to_string_lossy().to_string())
}

#[tauri::command]
pub async fn open_folder(path: String) -> Result<(), String> {
    use std::process::Command;

    // Get the directory containing the file
    let path_buf = PathBuf::from(&path);

    // Check if it's a file or directory
    let dir_path = if let Ok(metadata) = fs::metadata(&path_buf) {
        if metadata.is_file() {
            // It's a file, get its parent directory
            path_buf.parent()
                .ok_or_else(|| "Failed to get parent directory".to_string())?
                .to_path_buf()
        } else {
            // It's already a directory
            path_buf
        }
    } else {
        // If we can't check metadata, assume it's a file and get parent
        path_buf.parent()
            .ok_or_else(|| "Failed to get parent directory".to_string())?
            .to_path_buf()
    };

    // Canonicalize the path
    let canonical_dir = dir_path.canonicalize()
        .map_err(|e| format!("Failed to canonicalize directory path: {}", e))?;

    let dir_str = canonical_dir.to_string_lossy().to_string();

    #[cfg(target_os = "windows")]
    {
        Command::new("explorer")
            .arg(&dir_str)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&dir_str)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(&dir_str)
            .spawn()
            .map_err(|e| format!("Failed to open folder: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
pub async fn open_file(path: String) -> Result<(), String> {
    use std::process::Command;

    #[cfg(target_os = "windows")]
    {
        Command::new("cmd")
            .args(["/C", "start", "", &path])
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }

    #[cfg(target_os = "macos")]
    {
        Command::new("open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }

    #[cfg(target_os = "linux")]
    {
        Command::new("xdg-open")
            .arg(&path)
            .spawn()
            .map_err(|e| format!("Failed to open file: {}", e))?;
    }

    Ok(())
}

#[tauri::command]
pub async fn create_group(
    app: AppHandle,
    name: String,
    color: Option<String>,
) -> Result<String, String> {
    use crate::store::Group;
    let mut configs = load_configs(&app).await.map_err(|e| e.to_string())?;

    let group_id = format!("group_{}_{}", name.to_lowercase().replace(' ', "_"), std::time::SystemTime::now().duration_since(std::time::UNIX_EPOCH).unwrap().as_millis());

    let group = Group {
        id: group_id.clone(),
        name,
        color,
    };

    configs.groups.insert(group_id.clone(), group);
    save_configs(&app, &configs).await.map_err(|e| e.to_string())?;

    Ok(group_id)
}

#[tauri::command]
pub async fn update_group(
    app: AppHandle,
    group_id: String,
    name: String,
    color: Option<String>,
) -> Result<(), String> {
    let mut configs = load_configs(&app).await.map_err(|e| e.to_string())?;

    if let Some(group) = configs.groups.get_mut(&group_id) {
        group.name = name;
        group.color = color;
        save_configs(&app, &configs).await.map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err(format!("Group not found: {}", group_id))
    }
}

#[tauri::command]
pub async fn delete_group(app: AppHandle, group_id: String) -> Result<(), String> {
    let mut configs = load_configs(&app).await.map_err(|e| e.to_string())?;

    // Remove group
    configs.groups.remove(&group_id);

    // Remove group_id from all buckets in this group
    for bucket_config in configs.buckets.values_mut() {
        if bucket_config.group_id.as_ref() == Some(&group_id) {
            bucket_config.group_id = None;
        }
    }

    save_configs(&app, &configs).await.map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
pub async fn add_bucket_to_group(
    app: AppHandle,
    bucket_id: String,
    group_id: Option<String>,
) -> Result<(), String> {
    let mut configs = load_configs(&app).await.map_err(|e| e.to_string())?;

    if let Some(bucket_config) = configs.buckets.get_mut(&bucket_id) {
        bucket_config.group_id = group_id;
        save_configs(&app, &configs).await.map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err(format!("Bucket config not found: {}", bucket_id))
    }
}
