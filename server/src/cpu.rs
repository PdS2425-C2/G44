use sysinfo::System;
use tokio::time::{sleep, Duration};
use std::fs::OpenOptions;
use std::io::Write;
use chrono::Utc;

pub fn start_cpu_logger() {
    tokio::spawn(async move {
        let mut sys = System::new();
        let pid = sysinfo::get_current_pid().unwrap();

        let mut file = OpenOptions::new()
            .create(true)
            .append(true)
            .open("cpu_log.txt")
            .expect("Cannot open log file");

        loop {
            sys.refresh_cpu();        
            sys.refresh_process(pid);

            if let Some(process) = sys.process(pid) {
                let cpu_usage = process.cpu_usage();

                let _ = writeln!(
                    file,
                    "[{}] CPU usage: {:.2}%",
                    Utc::now(),
                    cpu_usage
                );
            }

            sleep(Duration::from_secs(120)).await;
        }
    });
}