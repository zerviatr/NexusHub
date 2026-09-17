fn main() {
    #[cfg(windows)]
    {
        let target = std::env::var("TARGET").unwrap_or_default();
        if target.contains("gnu") {
            use embed_manifest::{embed_manifest, new_manifest};
            let _ = embed_manifest(new_manifest("ZenDev"));
            if let Ok(out_dir) = std::env::var("OUT_DIR") {
                let obj = std::path::Path::new(&out_dir).join("embed-manifest.o");
                if obj.exists() {
                    println!("cargo:rustc-link-arg={}", obj.display());
                }
            }
        }
    }
    tauri_build::build();
}