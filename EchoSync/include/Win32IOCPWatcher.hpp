#pragma once

#include "Types.hpp"
#include "EventCoalescer.hpp"
#include <windows.h>
#include <cstring>
#include <vector>
#include <unordered_map>
#include <thread>
#include <atomic>
#include <mutex>
#include <chrono>

namespace EchoSync {

constexpr std::chrono::seconds kHealthCheckInterval{45};
constexpr int kMaxRecoveryAttempts = 5;

// Watch lifecycle states
enum class WatchState {
    Active,
    Paused,
    Missing,
    Recovering,
    Disabled,
    Removed
};

struct DirectoryWatchContext {
    HANDLE hDirectory = INVALID_HANDLE_VALUE;
    std::string pairId;
    std::wstring directoryPath; // canonical path used for IOCP
    OVERLAPPED overlapped = {0};
    std::vector<uint8_t> buffer;
    DWORD bytesReturned = 0;

    // runtime state
    std::atomic<WatchState> state{WatchState::Active};
    std::atomic<int> failureCount{0};

    bool IsHealthy() const {
        return state == WatchState::Active && failureCount < kMaxRecoveryAttempts;
    }

    void ResetRecovery() {
        failureCount = 0;
        state = WatchState::Active;
    }
};

class Win32IOCPWatcher {
public:
    explicit Win32IOCPWatcher(EventCoalescer& coalescer);
    ~Win32IOCPWatcher();

    bool Init();
    void Shutdown();

    // API used by AppController
    bool AddWatch(const std::string& pairId, const std::wstring& activeDirectoryPath);
    bool RemoveWatch(const std::string& pairId);
    bool EnableWatch(const std::string& pairId, bool enable);
    bool UpdateWatchPath(const std::string& pairId, const std::wstring& newPath);
    bool IsWatching() const { return m_running; }

private:
    // core loop and health check
    void WorkerThreadLoop();
    void PerformHealthCheck(); // called when idle
    bool TryRecover(WatchState reason, const std::string& pairId = {});

    // per‑watch helpers
    bool ValidateAndCanonicalize(const std::wstring& raw, std::wstring& outCanonical);
    void RestartReadDirectoryChanges(const std::string& pairId);
    void ReopenDirectoryHandle(const std::string& pairId);
    void MarkWatchMissing(const std::string& pairId);
    void AttemptWatchReenable(const std::string& pairId);

    // global recovery helpers
    void RecreateIOCP();
    void FullWatcherRebuild();
    void RemoveAllWatches();
    bool IssueReadDirectoryChanges(DirectoryWatchContext* pContext);


    EventCoalescer& m_coalescer;
    HANDLE m_hIOCP = nullptr;
    std::jthread m_workerThread;
    std::atomic<bool> m_running{false};
    std::chrono::steady_clock::time_point m_lastHealthCheck{std::chrono::steady_clock::now()};

    mutable std::mutex m_mutex;
    std::unordered_map<std::string, DirectoryWatchContext*> m_watches;
    std::wstring m_lastRenameOldPath;
};

} // namespace EchoSync
