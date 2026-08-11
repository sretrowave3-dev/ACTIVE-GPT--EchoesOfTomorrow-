#pragma once

#include <string>
#include <vector>
#include <mutex>
#include <thread>
#include <atomic>
#include <condition_variable>
#include <fstream>
#include <iostream>
#include <chrono>

namespace EchoSync {

enum class LogLevel {
    Debug,
    Info,
    Warning,
    Error,
    Critical
};

struct LogEntry {
    std::chrono::system_clock::time_point timestamp;
    LogLevel level;
    std::string tag;
    std::string message;
    uint64_t durationMs = 0;
    std::string result;
};

class Logger {
public:
    static Logger& Instance() {
        static Logger instance;
        return instance;
    }

    void Init(const std::string& logFilePath = "EchoSync.log", size_t ringBufferSize = 1024);
    void Shutdown();

    void Log(LogLevel level, const std::string& tag, const std::string& message, uint64_t durationMs = 0, const std::string& result = "");
    void Debug(const std::string& tag, const std::string& message) { Log(LogLevel::Debug, tag, message); }
    void Info(const std::string& tag, const std::string& message) { Log(LogLevel::Info, tag, message); }
    void Warning(const std::string& tag, const std::string& message) { Log(LogLevel::Warning, tag, message); }
    void Error(const std::string& tag, const std::string& message) { Log(LogLevel::Error, tag, message); }
    void Critical(const std::string& tag, const std::string& message) { Log(LogLevel::Critical, tag, message); }

    std::vector<LogEntry> GetRecentLogs(size_t maxEntries = 50);

private:
    Logger() = default;
    ~Logger() { Shutdown(); }

    Logger(const Logger&) = delete;
    Logger& operator=(const Logger&) = delete;

    void WorkerLoop();

    std::vector<LogEntry> m_ringBuffer;
    size_t m_capacity = 1024;
    size_t m_writeIndex = 0;
    size_t m_readIndex = 0;
    size_t m_count = 0;

    std::mutex m_mutex;
    std::condition_variable m_cv;
    std::jthread m_workerThread;
    std::atomic<bool> m_running{false};
    std::ofstream m_logFile;
    std::string m_logPath;
};

} // namespace EchoSync
