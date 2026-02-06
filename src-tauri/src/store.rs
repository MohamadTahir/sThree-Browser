use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use tauri::AppHandle;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BucketConfig {
    pub nickname: String,
    pub bucket_name: String,
    pub access_key: String,
    pub secret_key: String,
    pub region: String,
    pub endpoint: Option<String>,
    #[serde(default)]
    pub group_id: Option<String>,
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
    pub groups: HashMap<String, Group>,
    pub active_bucket: Option<String>,
}

impl Default for BucketConfigs {
    fn default() -> Self {
        Self {
            buckets: HashMap::new(),
            groups: HashMap::new(),
            active_bucket: None,
        }
    }
}

pub async fn load_configs(app: &AppHandle) -> anyhow::Result<BucketConfigs> {
    let store = tauri_plugin_store::StoreBuilder::new(
        app,
        "bucket-configs.json",
    )
    .build()?;

    match store.get("configs") {
        Some(value) => {
            let configs: BucketConfigs = serde_json::from_value(value)?;
            Ok(configs)
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
