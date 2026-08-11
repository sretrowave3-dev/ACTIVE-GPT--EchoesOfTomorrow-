#pragma once

#include "Types.hpp"
#include "ConfigManager.hpp"
#include "EventCoalescer.hpp"
#include "MetadataCache.hpp"
#include "HashCache.hpp"
#include "CopyEngine.hpp"
#include "PathFilter.hpp"
#include <memory>
#include <thread>
#include <atomic>
#include <mutex>
#include <deque>
#include <chrono>
#include <unordered_set>

namespace EchoSync {

class SyncEngine {
public:
    SyncEngine(ConfigManager& configMgr, EventCoalescer& coalescer, MetadataCache& metaCache, HashCache& hashCache);
    ~SyncEngine();

    bool Start();
    void Stop();

    void Pause();
    void Resume();
    bool IsPaused() const { return m_paused; }
    bool IsSafetyPaused() const { return m_safetyPaused; }

    // Performs manual scan of active vs passive directory tree for a pair
    bool PerformManualScan(const std::string& pairId, bool forceFullSync = false);

    SyncStats GetStats() const;

private:
    void WorkerLoop();
    void ProcessEvent(const FileSystemEvent& event);

    bool ExecuteCopyAction(const SyncPairConfig& pair, const std::wstring& activeRelPath);
    bool ExecuteDeleteAction(const SyncPairConfig& pair, const std::wstring& activeRelPath);
    bool ExecuteRenameAction(const SyncPairConfig& pair, const std::wstring& oldRelPath, const std::wstring& newRelPath);

    ConfigManager& m_configMgr;
    EventCoalescer& m_coalescer;
    MetadataCache& m_metaCache;
    HashCache& m_hashCache;

    CopyEngine m_copyEngine;
    std::jthread m_workerThread;
    std::atomic<bool> m_running{false};
    std::atomic<bool> m_paused{false};

    mutable std::mutex m_statsMutex;
    SyncStats m_stats;
    // SmartSafety state (protected by m_statsMutex)
    std::deque<std::chrono::steady_clock::time_point> m_deleteTimes;
    std::deque<std::chrono::steady_clock::time_point> m_renameTimes;
    const size_t kDeleteThreshold = 20;
    const size_t kRenameThreshold = 20;
    const std::chrono::seconds kWindow = std::chrono::seconds(10);
    const std::unordered_set<std::wstring> kSuspiciousExts = {
        L".locked", L".encrypted", L".crypt", L".enc", L".lock"
    };
    bool m_safetyPaused{false};

    // Helper for copy verification
    bool VerifyCopy(const std::wstring& src, const std::wstring& dst);
};

} // namespace EchoSync
