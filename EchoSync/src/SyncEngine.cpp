#include "../include/SyncEngine.hpp"
#include "../include/Logger.hpp"
#include <filesystem>
#include <iostream>
#include <ctime>

namespace EchoSync {

namespace fs = std::filesystem;

SyncEngine::SyncEngine(ConfigManager& configMgr, EventCoalescer& coalescer, MetadataCache& metaCache, HashCache& hashCache)
    : m_configMgr(configMgr), m_coalescer(coalescer), m_metaCache(metaCache), m_hashCache(hashCache) {}

SyncEngine::~SyncEngine() {
    Stop();
}

bool SyncEngine::Start() {
    if (m_running) return true;

    m_running = true;
    m_paused = false;
    m_workerThread = std::jthread([this]() { WorkerLoop(); });
    Logger::Instance().Info("SyncEngine", "Started Incremental Sync Engine thread.");
    return true;
}

void SyncEngine::Stop() {
    if (!m_running) return;

    m_running = false;
    if (m_workerThread.joinable()) {
        m_workerThread.join();
    }
    Logger::Instance().Info("SyncEngine", "Stopped Incremental Sync Engine.");
}

void SyncEngine::Pause() {
    m_paused = true;
    Logger::Instance().Info("SyncEngine", "Synchronization paused.");
}

void SyncEngine::Resume() {
    m_paused = false;
    Logger::Instance().Info("SyncEngine", "Synchronization resumed.");
}

SyncStats SyncEngine::GetStats() const {
    std::lock_guard<std::mutex> lock(m_statsMutex);
    return m_stats;
}

void SyncEngine::WorkerLoop() {
    while (m_running) {
        if (m_paused || m_safetyPaused) {
            std::this_thread::sleep_for(std::chrono::milliseconds(100));
            continue;
        }

        auto eventOpt = m_coalescer.PopCoalescedEvent(std::chrono::milliseconds(100));
        if (!eventOpt.has_value()) {
            continue;
        }

        const auto& event = eventOpt.value();
        {
            std::lock_guard<std::mutex> lock(m_statsMutex);
            m_stats.totalEventsDetected++;
        }

        ProcessEvent(event);
    }
}

void SyncEngine::ProcessEvent(const FileSystemEvent& event) {
    auto pairOpt = m_configMgr.GetPair(event.pairId);
    if (!pairOpt.has_value() || !pairOpt->enabled) {
        return;
    }

    const auto& pair = pairOpt.value();
    PathFilter filter(pair.filters);

    bool isDirectory = event.isDirectory;
    std::wstring activeFullPath = pair.activePath + L"\\" + event.activeRelPath;
    std::error_code ec;
    if (fs::exists(activeFullPath, ec)) {
        isDirectory = fs::is_directory(activeFullPath, ec);
    } else {
        auto cachedMeta = m_metaCache.GetByPath(event.activeRelPath);
        if (cachedMeta.has_value()) {
            isDirectory = cachedMeta->isDirectory;
        }
    }

    if (!filter.ShouldInclude(event.activeRelPath, isDirectory)) {
        return;
    }

    // SmartSafety checks
    {
        std::lock_guard<std::mutex> lock(m_statsMutex);
        auto now = std::chrono::steady_clock::now();

        // Suspicious extensions detection
        std::wstring ext = fs::path(activeFullPath).extension();
        if (kSuspiciousExts.find(ext) != kSuspiciousExts.end()) {
            m_safetyPaused = true;
            Logger::Instance().Warning("SyncEngine", "Suspicious file extension detected: " + WStringToString(ext));
            return;
        }

        // Protected path delete suppression
        if (event.action == FileAction::Delete) {
            for (const auto& prot : pair.filters.protectedPaths) {
                std::wstring protFull = (fs::path(pair.activePath) / fs::path(prot)).wstring();
                std::error_code ec2;
                auto canonicalProt = fs::weakly_canonical(protFull, ec2);
                auto canonicalEvent = fs::weakly_canonical(activeFullPath, ec2);
                if (!ec2 && canonicalEvent.native().find(canonicalProt.native()) == 0) {
                    Logger::Instance().Info("SyncEngine", "Delete event ignored for protected path: " + WStringToString(event.activeRelPath));
                    return;
                }
            }
        }

        // Mass delete detection
        if (event.action == FileAction::Delete) {
            m_deleteTimes.push_back(now);
            while (!m_deleteTimes.empty() && now - m_deleteTimes.front() > kWindow) m_deleteTimes.pop_front();
            if (m_deleteTimes.size() > kDeleteThreshold) {
                m_safetyPaused = true;
                Logger::Instance().Warning("SyncEngine", "Mass delete detected, pausing sync.");
                return;
            }
        }

        // Mass rename detection
        if (event.action == FileAction::Rename || event.action == FileAction::Move) {
            m_renameTimes.push_back(now);
            while (!m_renameTimes.empty() && now - m_renameTimes.front() > kWindow) m_renameTimes.pop_front();
            if (m_renameTimes.size() > kRenameThreshold) {
                m_safetyPaused = true;
                Logger::Instance().Warning("SyncEngine", "Mass rename detected, pausing sync.");
                return;
            }
        }
    }

    if (pair.policy == SyncPolicy::Manual) {
        Logger::Instance().Info("SyncEngine", "[Manual Policy] Event queued for manual sync: " +
            ActionToString(event.action) + " " + WStringToString(event.activeRelPath));
        return;
    }

    auto start = std::chrono::high_resolution_clock::now();
    bool success = false;

    switch (event.action) {
        case FileAction::Create:
        case FileAction::Modify:
        case FileAction::Replace: {
            success = ExecuteCopyAction(pair, event.activeRelPath);
            break;
        }
        case FileAction::Delete: {
            if (pair.policy == SyncPolicy::Mirror || pair.policy == SyncPolicy::TwoWay) {
                success = ExecuteDeleteAction(pair, event.activeRelPath);
            } else {
                success = true; // One-way / Backup keep deleted files
            }
            break;
        }
        case FileAction::Rename:
        case FileAction::Move: {
            if (!event.oldActiveRelPath.empty()) {
                success = ExecuteRenameAction(pair, event.oldActiveRelPath, event.activeRelPath);
            } else {
                success = ExecuteCopyAction(pair, event.activeRelPath);
            }
            break;
        }
    }

    auto elapsed = std::chrono::duration_cast<std::chrono::milliseconds>(std::chrono::high_resolution_clock::now() - start).count();

    std::lock_guard<std::mutex> lock(m_statsMutex);
    m_stats.totalSyncDurationMs += elapsed;
    if (!success) {
        m_stats.errorCount++;
    }
}

bool SyncEngine::ExecuteCopyAction(const SyncPairConfig& pair, const std::wstring& activeRelPath) {
    std::wstring activeFullPath = pair.activePath + L"\\" + activeRelPath;
    std::wstring passiveFullPath = pair.passivePath + L"\\" + activeRelPath;

    std::error_code ec;
    if (!fs::exists(activeFullPath, ec)) return false;

    if (fs::is_directory(activeFullPath, ec)) {
        return m_copyEngine.EnsureDirectoryExists(passiveFullPath);
    }

    // Check if target replace option policy applies
    if (pair.policy == SyncPolicy::ReplaceExisting && !fs::exists(passiveFullPath, ec)) {
        return true; // Ignore new files if ReplaceExisting policy active
    }

    // Backup policy timestamp suffixing
    if (pair.policy == SyncPolicy::BackupOnly && fs::exists(passiveFullPath, ec)) {
        auto now = std::chrono::system_clock::now();
        auto t = std::chrono::system_clock::to_time_t(now);
        std::tm tmStruct;
        localtime_s(&tmStruct, &t);

        char timeBuf[32];
        std::strftime(timeBuf, sizeof(timeBuf), "_%Y%m%d_%H%M%S", &tmStruct);

        fs::path p(passiveFullPath);
        std::wstring backupPath = p.parent_path().wstring() + L"\\" + p.stem().wstring() + std::wstring(timeBuf, timeBuf + strlen(timeBuf)) + p.extension().wstring();
        passiveFullPath = backupPath;
    }

    uint64_t bytesTransferred = 0;
    bool ok = m_copyEngine.CopyFileChunked(activeFullPath, passiveFullPath, &bytesTransferred);

    if (ok) {
        std::lock_guard<std::mutex> lock(m_statsMutex);
        m_stats.totalFilesCopied++;
        m_stats.totalBytesTransferred += bytesTransferred;

        // Update Metadata Cache
        WIN32_FILE_ATTRIBUTE_DATA attr;
        if (GetFileAttributesExW(activeFullPath.c_str(), GetFileExInfoStandard, &attr)) {
            FileMetadata meta{
                .pathHash = HashPath(activeRelPath),
                .relativePath = activeRelPath,
                .fileSize = (static_cast<uint64_t>(attr.nFileSizeHigh) << 32) | attr.nFileSizeLow,
                .lastWriteTime = attr.ftLastWriteTime,
                .attributes = attr.dwFileAttributes,
                .contentHash = 0,
                .isDirectory = false
            };
            m_metaCache.Put(meta);
        }

        Logger::Instance().Info("SyncEngine", "Synchronized file [" + PolicyToString(pair.policy) + "]: " +
            WStringToString(activeRelPath) + " (" + std::to_string(bytesTransferred) + " bytes)");

        // Verify copy integrity
        if (!VerifyCopy(activeFullPath, passiveFullPath)) {
            std::this_thread::sleep_for(std::chrono::milliseconds(200));
            uint64_t retryBytes = 0;
            bool retryOk = m_copyEngine.CopyFileChunked(activeFullPath, passiveFullPath, &retryBytes);
            if (retryOk) {
                std::lock_guard<std::mutex> lockRetry(m_statsMutex);
                m_stats.totalFilesCopied++;
                m_stats.totalBytesTransferred += retryBytes;
                WIN32_FILE_ATTRIBUTE_DATA attr2;
                if (GetFileAttributesExW(activeFullPath.c_str(), GetFileExInfoStandard, &attr2)) {
                    FileMetadata meta2{
                        .pathHash = HashPath(activeRelPath),
                        .relativePath = activeRelPath,
                        .fileSize = (static_cast<uint64_t>(attr2.nFileSizeHigh) << 32) | attr2.nFileSizeLow,
                        .lastWriteTime = attr2.ftLastWriteTime,
                        .attributes = attr2.dwFileAttributes,
                        .contentHash = 0,
                        .isDirectory = false
                    };
                    m_metaCache.Put(meta2);
                }
                Logger::Instance().Info("SyncEngine", "Retry copy succeeded after verification failure: " + WStringToString(activeRelPath));
            } else {
                Logger::Instance().Error("SyncEngine", "Retry copy failed after verification failure: " + WStringToString(activeRelPath));
            }
        }
    }

    return ok;
}

bool SyncEngine::VerifyCopy(const std::wstring& activePath, const std::wstring& passivePath) {
    WIN32_FILE_ATTRIBUTE_DATA activeData, passiveData;
    if (GetFileAttributesExW(activePath.c_str(), GetFileExInfoStandard, &activeData) &&
        GetFileAttributesExW(passivePath.c_str(), GetFileExInfoStandard, &passiveData)) {
        return (activeData.nFileSizeHigh == passiveData.nFileSizeHigh && activeData.nFileSizeLow == passiveData.nFileSizeLow);
    }
    return false;
}

bool SyncEngine::ExecuteDeleteAction(const SyncPairConfig& pair, const std::wstring& activeRelPath) {
    std::wstring passiveFullPath = pair.passivePath + L"\\" + activeRelPath;
    bool ok = m_copyEngine.DeleteFileOrDir(passiveFullPath);

    if (ok) {
        std::lock_guard<std::mutex> lock(m_statsMutex);
        m_stats.totalFilesDeleted++;
        m_metaCache.RemoveByPath(activeRelPath);

        Logger::Instance().Info("SyncEngine", "Deleted from passive target: " +
            WStringToString(activeRelPath));
    }
    return ok;
}

bool SyncEngine::ExecuteRenameAction(const SyncPairConfig& pair, const std::wstring& oldRelPath, const std::wstring& newRelPath) {
    std::wstring oldPassiveFullPath = pair.passivePath + L"\\" + oldRelPath;
    std::wstring newPassiveFullPath = pair.passivePath + L"\\" + newRelPath;

    bool ok = m_copyEngine.MoveFileOrDir(oldPassiveFullPath, newPassiveFullPath);
    if (!ok) {
        // Fallback to copy new + delete old
        ExecuteCopyAction(pair, newRelPath);
        ExecuteDeleteAction(pair, oldRelPath);
        return true;
    }

    {
        std::lock_guard<std::mutex> lock(m_statsMutex);
        m_stats.totalFilesRenamed++;
        m_metaCache.RemoveByPath(oldRelPath);
    }

    Logger::Instance().Info("SyncEngine", "Renamed on passive target: " +
        WStringToString(oldRelPath) + " -> " +
        WStringToString(newRelPath));
    return true;
}

bool SyncEngine::PerformManualScan(const std::string& pairId, bool forceFullSync) {
    auto pairOpt = m_configMgr.GetPair(pairId);
    if (!pairOpt.has_value()) {
        Logger::Instance().Error("SyncEngine", "Pair ID not found for manual scan: " + pairId);
        return false;
    }

    const auto& pair = pairOpt.value();
    Logger::Instance().Info("SyncEngine", "Starting Manual Scan for Pair [" + pairId + "] (ForceFullSync=" + (forceFullSync ? "true" : "false") + ")");

    std::error_code ec;
    if (!fs::exists(pair.activePath, ec)) {
        Logger::Instance().Error("SyncEngine", "Active path does not exist for manual scan: " +
            WStringToString(pair.activePath));
        return false;
    }

    PathFilter filter(pair.filters);
    uint64_t scannedCount = 0;
    uint64_t syncedCount = 0;

    for (const auto& entry : fs::recursive_directory_iterator(pair.activePath, fs::directory_options::skip_permission_denied, ec)) {
        std::wstring fullPath = entry.path().wstring();
        std::wstring relPath = fullPath.substr(pair.activePath.size());
        if (relPath.starts_with(L'\\') || relPath.starts_with(L'/')) relPath = relPath.substr(1);

        bool isDir = entry.is_directory(ec);
        if (!filter.ShouldInclude(relPath, isDir)) continue;

        scannedCount++;
        std::wstring passiveFullPath = pair.passivePath + L"\\" + relPath;

        bool needsCopy = forceFullSync;
        if (!needsCopy) {
            if (!fs::exists(passiveFullPath, ec)) {
                needsCopy = true;
            } else if (!isDir) {
                // Check metadata
                WIN32_FILE_ATTRIBUTE_DATA activeAttr, passiveAttr;
                if (GetFileAttributesExW(fullPath.c_str(), GetFileExInfoStandard, &activeAttr) &&
                    GetFileAttributesExW(passiveFullPath.c_str(), GetFileExInfoStandard, &passiveAttr)) {
                    
                    uint64_t activeSize = (static_cast<uint64_t>(activeAttr.nFileSizeHigh) << 32) | activeAttr.nFileSizeLow;
                    uint64_t passiveSize = (static_cast<uint64_t>(passiveAttr.nFileSizeHigh) << 32) | passiveAttr.nFileSizeLow;

                    if (activeSize != passiveSize ||
                        activeAttr.ftLastWriteTime.dwLowDateTime != passiveAttr.ftLastWriteTime.dwLowDateTime ||
                        activeAttr.ftLastWriteTime.dwHighDateTime != passiveAttr.ftLastWriteTime.dwHighDateTime) {
                        needsCopy = true;
                    }
                }
            }
        }

        if (needsCopy) {
            if (isDir) {
                m_copyEngine.EnsureDirectoryExists(passiveFullPath);
            } else {
                uint64_t bytes = 0;
                if (m_copyEngine.CopyFileChunked(fullPath, passiveFullPath, &bytes)) {
                    syncedCount++;
                }
            }
        }
    }

    Logger::Instance().Info("SyncEngine", "Manual Scan finished. Scanned: " + std::to_string(scannedCount) +
        " items. Synced: " + std::to_string(syncedCount) + " item(s).");
    return true;
}

} // namespace EchoSync
