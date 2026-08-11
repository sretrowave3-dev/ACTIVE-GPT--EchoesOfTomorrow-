#include "../include/Logger.hpp"
#include <iomanip>
#include <sstream>
#include <ctime>

namespace EchoSync {

static std::string LogLevelToString(LogLevel level) {
    switch (level) {
        case LogLevel::Debug:    return "DEBUG";
        case LogLevel::Info:     return "INFO ";
        case LogLevel::Warning:  return "WARN ";
        case LogLevel::Error:    return "ERROR";
        case LogLevel::Critical: return "CRIT ";
    }
    return "UNK  ";
}

void Logger::Init(const std::string& logFilePath, size_t ringBufferSize) {
    std::lock_guard<std::mutex> lock(m_mutex);
    if (m_running) return;

    m_logPath = logFilePath;
    m_capacity = ringBufferSize;
    m_ringBuffer.resize(m_capacity);
    m_writeIndex = 0;
    m_readIndex = 0;
    m_count = 0;

    m_logFile.open(m_logPath, std::ios::out | std::ios::app);
    m_running = true;

    m_workerThread = std::jthread([this]() { WorkerLoop(); });
}

void Logger::Shutdown() {
    {
        std::lock_guard<std::mutex> lock(m_mutex);
        if (!m_running) return;
        m_running = false;
    }
    m_cv.notify_all();

    if (m_workerThread.joinable()) {
        m_workerThread.join();
    }

    if (m_logFile.is_open()) {
        m_logFile.flush();
        m_logFile.close();
    }
}

void Logger::Log(LogLevel level, const std::string& tag, const std::string& message, uint64_t durationMs, const std::string& result) {
    LogEntry entry{
        .timestamp = std::chrono::system_clock::now(),
        .level = level,
        .tag = tag,
        .message = message,
        .durationMs = durationMs,
        .result = result
    };

    {
        std::lock_guard<std::mutex> lock(m_mutex);
        if (!m_running) return;

        m_ringBuffer[m_writeIndex] = entry;
        m_writeIndex = (m_writeIndex + 1) % m_capacity;
        if (m_count < m_capacity) {
            m_count++;
        } else {
            // Buffer full, advance read index (overwrite oldest)
            m_readIndex = (m_readIndex + 1) % m_capacity;
        }
    }
    m_cv.notify_one();
}

std::vector<LogEntry> Logger::GetRecentLogs(size_t maxEntries) {
    std::lock_guard<std::mutex> lock(m_mutex);
    std::vector<LogEntry> result;
    if (m_count == 0) return result;

    size_t fetchCount = std::min(maxEntries, m_count);
    result.reserve(fetchCount);

    size_t start = (m_writeIndex + m_capacity - fetchCount) % m_capacity;
    for (size_t i = 0; i < fetchCount; ++i) {
        size_t idx = (start + i) % m_capacity;
        result.push_back(m_ringBuffer[idx]);
    }
    return result;
}

void Logger::WorkerLoop() {
    while (m_running) {
        std::unique_lock<std::mutex> lock(m_mutex);
        m_cv.wait_for(lock, std::chrono::milliseconds(250), [this]() {
            return m_readIndex != m_writeIndex || !m_running;
        });

        while (m_readIndex != m_writeIndex && m_running) {
            LogEntry entry = m_ringBuffer[m_readIndex];
            m_readIndex = (m_readIndex + 1) % m_capacity;
            lock.unlock();

            // Format log line
            auto timeT = std::chrono::system_clock::to_time_t(entry.timestamp);
            auto ms = std::chrono::duration_cast<std::chrono::milliseconds>(entry.timestamp.time_since_epoch()) % 1000;
            std::tm tmStruct;
            localtime_s(&tmStruct, &timeT);

            std::ostringstream ss;
            ss << "[" << std::put_time(&tmStruct, "%Y-%m-%d %H:%M:%S")
               << "." << std::setfill('0') << std::setw(3) << ms.count() << "] "
               << "[" << LogLevelToString(entry.level) << "] "
               << "[" << entry.tag << "] "
               << entry.message;

            if (entry.durationMs > 0) {
                ss << " (Duration: " << entry.durationMs << "ms)";
            }
            if (!entry.result.empty()) {
                ss << " -> " << entry.result;
            }
            ss << "\n";

            std::string formatted = ss.str();
            if (m_logFile.is_open()) {
                m_logFile << formatted;
                m_logFile.flush();
            }

            lock.lock();
        }
    }
}

} // namespace EchoSync
