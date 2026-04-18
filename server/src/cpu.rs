use chrono::Utc;
use std::{fs::OpenOptions, io::Write};
use sysinfo::System;
use tokio::time::{Duration, sleep};

/// Spawns a background task that appends the process CPU usage to `cpu_log.txt`
/// every two minutes.
pub fn start_cpu_logger() {
    tokio::spawn(async move {
        let mut sys = System::new();
        let pid = sysinfo::get_current_pid().unwrap();

        let mut file = OpenOptions::new()
            .create(true)
            .append(true)
            .open("cpu_log.txt")
            .expect("cannot open cpu_log.txt");

        loop {
            sys.refresh_cpu();
            sys.refresh_process(pid);

            if let Some(process) = sys.process(pid) {
                let _ = writeln!(
                    file,
                    "[{}] CPU usage: {:.2}%",
                    Utc::now(),
                    process.cpu_usage()
                );
            }

            sleep(Duration::from_secs(120)).await;
        }
    });
}
