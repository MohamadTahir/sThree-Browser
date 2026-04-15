use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::AppHandle;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CredentialConfig {
    pub id: String,
    pub name: String,
    pub access_key: String,
    pub secret_key: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BucketConfig {
    pub nickname: String,
    pub bucket_name: String,
    #[serde(default = "default_region")]
    pub region: String,
    pub endpoint: Option<String>,
    #[serde(default)]
    pub credential_id: String,
    #[serde(default)]
    pub group_id: Option<String>,
    // Legacy: for reading old configs that had embedded credentials
    #[serde(default)]
    pub access_key: Option<String>,
    #[serde(default)]
    pub secret_key: Option<String>,
}

fn default_region() -> String {
    "us-east-1".to_string()
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Group {
    pub id: String,
    pub name: String,
    pub color: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BucketConfigs {
    pub buckets: HashMap<String, BucketConfig>,
    #[serde(default)]
    pub credentials: HashMap<String, CredentialConfig>,
    #[serde(default)]
    pub groups: HashMap<String, Group>,
    pub active_bucket: Option<String>,
}

impl Default for BucketConfigs {
    fn default() -> Self {
        Self {
            buckets: HashMap::new(),
            credentials: HashMap::new(),
            groups: HashMap::new(),
            active_bucket: None,
        }
    }
}

fn migrate_legacy_configs(mut configs: BucketConfigs) -> BucketConfigs {
    for (_bucket_id, bucket) in configs.buckets.iter_mut() {
        let need_migrate = bucket.credential_id.is_empty()
            && bucket.access_key.as_ref().map(|s| !s.is_empty()).unwrap_or(false)
            && bucket.secret_key.as_ref().map(|s| !s.is_empty()).unwrap_or(false);
        if need_migrate {
            let cred_id = format!(
                "cred_{}_{}",
                bucket.nickname.to_lowercase().replace(' ', "_"),
                std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_millis()
            );
            let access_key = bucket.access_key.take().unwrap_or_default();
            let secret_key = bucket.secret_key.take().unwrap_or_default();
            configs.credentials.insert(
                cred_id.clone(),
                CredentialConfig {
                    id: cred_id.clone(),
                    name: format!("{} credentials", bucket.nickname),
                    access_key,
                    secret_key,
                },
            );
            bucket.credential_id = cred_id;
        }
    }
    configs
}

pub async fn load_configs(app: &AppHandle) -> anyhow::Result<BucketConfigs> {
    let store = tauri_plugin_store::StoreBuilder::new(
        app,
        "bucket-configs.json",
    )
    .build()?;

    match store.get("configs") {
        Some(value) => {
            // Try to deserialize; old configs may have buckets with access_key/secret_key and no credentials
            let configs: BucketConfigs = serde_json::from_value(value)?;
            Ok(migrate_legacy_configs(configs))
        }
        None => Ok(BucketConfigs::default()),
    }
}

pub async fn save_configs(app: &AppHandle, configs: &BucketConfigs) -> anyhow::Result<()> {
    let store = tauri_plugin_store::StoreBuilder::new(
        app,
        "bucket-configs.json",
    )
    .build()?;

    let value = serde_json::to_value(configs)?;
    store.set("configs", value);
    store.save()?;
    Ok(())
}
