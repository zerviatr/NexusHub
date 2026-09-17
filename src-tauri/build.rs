fn main() {
    #[cfg(windows)]
    {
        use embed_manifest::{embed_manifest, new_manifest};
        embed_manifest(new_manifest("ZenDev")).expect("failed to embed manifest");
        if let Ok(out_dir) = std::env::var("OUT_DIR") {
            let obj = std::path::Path::new(&out_dir).join("embed-manifest.o");
            println!("cargo:rustc-link-arg={}", obj.display());
        }
    }
    tauri_build::build();
}
