#include "../include/Win32IOCPWatcher.hpp"
#include "../include/Logger.hpp"
#include "../include/DiagnosticsManager.hpp"
#include "../include/EventCoalescer.hpp"

namespace EchoSync {

constexpr DWORD BUFFER_SIZE = 64 * 1024; // 64 KB kernel I/O buffer

Win32IOCPWatcher::Win32IOCPWatcher(EventCoalescer& coalescer)
    : m_coalescer(coalescer), m_lastHealthCheck(std::chrono::steady_clock::now()) {}

Win32IOCPWatcher::~Win32IOCPWatcher() {
    Shutdown();
}

bool Win32IOCPWatcher::Init() {
    std::lock_guard<std::mutex> lock(m_mutex);
    if (m_running) return true;

    m_hIOCP = CreateIoCompletionPort(INVALID_HANDLE_VALUE, NULL, 0, 1);
    if (!m_hIOCP) {
        Logger::Instance().Error("IOCPWatcher", "CreateIoCompletionPort failed. Error: " + std::to_string(GetLastError()));
        return false;
    }

    m_running = true;
    m_workerThread = std::jthread([this]() { WorkerThreadLoop(); });
    Logger::Instance().Info("IOCPWatcher", "Initialized Windows IOCP Watcher engine successfully.");
    return true;
}

void Win32IOCPWatcher::Shutdown() {
    {
        std::lock_guard<std::mutex> lock(m_mutex);
        if (!m_running) return;
        m_running = false;

        RemoveAllWatches();

        if (m_hIOCP) {
            PostQueuedCompletionStatus(m_hIOCP, 0, 0, NULL);
        }
    }

    if (m_workerThread.joinable()) {
        m_workerThread.join();
    }

    if (m_hIOCP) {
        CloseHandle(m_hIOCP);
        m_hIOCP = NULL;
    }

    Logger::Instance().Info("IOCPWatcher", "Win32 IOCP Watcher engine shut down.");
}

bool Win32IOCPWatcher::AddWatch(const std::string& pairId, const std::wstring& activeDirectoryPath) {
    std::lock_guard<std::mutex> lock(m_mutex);
    if (!m_running || !m_hIOCP) return false;

    if (m_watches.find(pairId) != m_watches.end()) {
        Logger::Instance().Warning("IOCPWatcher", "Watch already exists for pair: " + pairId);
        return true;
    }

    HANDLE hDir = CreateFileW(
        activeDirectoryPath.c_str(),
        FILE_LIST_DIRECTORY,
        FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE,
        NULL,
        OPEN_EXISTING,
        FILE_FLAG_BACKUP_SEMANTICS | FILE_FLAG_OVERLAPPED,
        NULL
    );

    if (hDir == INVALID_HANDLE_VALUE) {
        DWORD err = GetLastError();
        Logger::Instance().Error("IOCPWatcher", "Failed to open directory handle for watching. Path: " +
            WStringToString(activeDirectoryPath) + ". Error: " + std::to_string(err));
        return false;
    }

    DirectoryWatchContext* pContext = new DirectoryWatchContext();
    pContext->hDirectory = hDir;
    pContext->pairId = pairId;
    pContext->directoryPath = activeDirectoryPath;
    pContext->buffer.resize(BUFFER_SIZE);
    ZeroMemory(&pContext->overlapped, sizeof(OVERLAPPED));

    HANDLE hAssignedIOCP = CreateIoCompletionPort(hDir, m_hIOCP, reinterpret_cast<ULONG_PTR>(pContext), 0);
    if (!hAssignedIOCP) {
        Logger::Instance().Error("IOCPWatcher", "Failed to associate directory handle with IOCP. Error: " + std::to_string(GetLastError()));
        CloseHandle(hDir);
        delete pContext;
        return false;
    }

    m_watches[pairId] = pContext;

    if (!IssueReadDirectoryChanges(pContext)) {
        m_watches.erase(pairId);
        CloseHandle(hDir);
        delete pContext;
        return false;
    }

    Logger::Instance().Info("IOCPWatcher", "Successfully watching active path: " +
        WStringToString(activeDirectoryPath) + " [Pair: " + pairId + "]");
    return true;
}

bool Win32IOCPWatcher::RemoveWatch(const std::string& pairId) {
    std::lock_guard<std::mutex> lock(m_mutex);
    auto it = m_watches.find(pairId);
    if (it == m_watches.end()) return false;

    DirectoryWatchContext* pContext = it->second;
    m_watches.erase(it);

    if (pContext->hDirectory != INVALID_HANDLE_VALUE) {
        CancelIoEx(pContext->hDirectory, &pContext->overlapped);
        CloseHandle(pContext->hDirectory);
        pContext->hDirectory = INVALID_HANDLE_VALUE;
    }

    delete pContext;
    Logger::Instance().Info("IOCPWatcher", "Removed watch for pair: " + pairId);
    return true;
}

void Win32IOCPWatcher::RemoveAllWatches() {
    for (auto& [pairId, pContext] : m_watches) {
        if (pContext->hDirectory != INVALID_HANDLE_VALUE) {
            CancelIoEx(pContext->hDirectory, &pContext->overlapped);
            CloseHandle(pContext->hDirectory);
            pContext->hDirectory = INVALID_HANDLE_VALUE;
        }
        delete pContext;
    }
    m_watches.clear();
}

bool Win32IOCPWatcher::IssueReadDirectoryChanges(DirectoryWatchContext* pContext) {
    if (!pContext || pContext->hDirectory == INVALID_HANDLE_VALUE) return false;

    ZeroMemory(&pContext->overlapped, sizeof(OVERLAPPED));

    DWORD notifyFilter = FILE_NOTIFY_CHANGE_FILE_NAME |
                         FILE_NOTIFY_CHANGE_DIR_NAME |
                         FILE_NOTIFY_CHANGE_LAST_WRITE |
                         FILE_NOTIFY_CHANGE_CREATION |
                         FILE_NOTIFY_CHANGE_SIZE |
                         FILE_NOTIFY_CHANGE_ATTRIBUTES;

    BOOL success = ReadDirectoryChangesW(
        pContext->hDirectory,
        pContext->buffer.data(),
        static_cast<DWORD>(pContext->buffer.size()),
        TRUE, // Recursive watch
        notifyFilter,
        &pContext->bytesReturned,
        &pContext->overlapped,
        NULL
    );

    if (!success) {
        DWORD err = GetLastError();
        if (err != ERROR_IO_PENDING) {
            Logger::Instance().Error("IOCPWatcher", "ReadDirectoryChangesW failed. Error: " + std::to_string(err));
            return false;
        }
    }
    return true;
}

void Win32IOCPWatcher::WorkerThreadLoop() {
    DWORD bytesTransferred = 0;
    ULONG_PTR completionKey = 0;
    LPOVERLAPPED pOverlapped = NULL;

    while (m_running) {
        // Sleep state until OS posts IOCP completion event. Zero CPU!
        BOOL result = GetQueuedCompletionStatus(
            m_hIOCP,
            &bytesTransferred,
            &completionKey,
            &pOverlapped,
            INFINITE
        );

        if (!m_running) break;

        if (!result) {
            DWORD err = GetLastError();
            if (err == ERROR_ABANDONED_WAIT_0 || err == ERROR_INVALID_HANDLE) {
                break;
            }
            continue;
        }

        if (completionKey == 0 || pOverlapped == NULL) {
            continue; // Wake up signal
        }

        DirectoryWatchContext* pContext = reinterpret_cast<DirectoryWatchContext*>(completionKey);
        if (!pContext || bytesTransferred == 0) {
            IssueReadDirectoryChanges(pContext);
            continue;
        }

        // Process FILE_NOTIFY_INFORMATION buffer entries
        uint8_t* pBuffer = pContext->buffer.data();
        FILE_NOTIFY_INFORMATION* pNotify = nullptr;
        DWORD offset = 0;
        do {
            pNotify = reinterpret_cast<FILE_NOTIFY_INFORMATION*>(pBuffer + offset);

            std::wstring relPath(pNotify->FileName, pNotify->FileNameLength / sizeof(wchar_t));

            FileSystemEvent fsEvent{
                .pairId = pContext->pairId,
                .action = FileAction::Modify,
                .activeRelPath = relPath,
                .oldActiveRelPath = L"",
                .timestamp = std::chrono::system_clock::now(),
                .isDirectory = false,
                .fileSize = 0
            };
            DiagnosticsManager::Instance().RecordWatcherEvent(fsEvent);

            switch (pNotify->Action) {
                case FILE_ACTION_ADDED:
                    fsEvent.action = FileAction::Create;
                    break;
                case FILE_ACTION_REMOVED:
                    fsEvent.action = FileAction::Delete;
                    break;
                case FILE_ACTION_MODIFIED:
                    fsEvent.action = FileAction::Modify;
                    break;
                case FILE_ACTION_RENAMED_OLD_NAME:
                    fsEvent.action = FileAction::Rename;
                    m_lastRenameOldPath = relPath;
                    break;
                case FILE_ACTION_RENAMED_NEW_NAME:
                    fsEvent.action = FileAction::Move;
                    fsEvent.oldActiveRelPath = m_lastRenameOldPath;
                    m_lastRenameOldPath.clear();
                    break;
                default:
                    fsEvent.action = FileAction::Modify;
                    break;
            }

            // Push to EventCoalescer
            m_coalescer.PushRawEvent(fsEvent);

            offset += pNotify->NextEntryOffset;
        } while (offset > 0 && pNotify && pNotify->NextEntryOffset != 0);

        // Re-issue ReadDirectoryChangesW for continuous monitoring
        IssueReadDirectoryChanges(pContext);

        // Periodic health check
        auto now = std::chrono::steady_clock::now();
        if (now - m_lastHealthCheck >= kHealthCheckInterval) {
            PerformHealthCheck();
            m_lastHealthCheck = now;
        }
    }
}

#include <filesystem>

// Perform periodic health check on all watches
void Win32IOCPWatcher::PerformHealthCheck() {
    std::lock_guard<std::mutex> lock(m_mutex);
    for (auto& [pairId, ctx] : m_watches) {
        if (!ctx->IsHealthy()) {
            Logger::Instance().Warning("IOCPWatcher", "Watch " + pairId + " unhealthy, attempting recovery.");
            TryRecover(WatchState::Recovering, pairId);
        }
    }
}

// Attempt recovery based on reason and optional pairId
bool Win32IOCPWatcher::TryRecover(WatchState reason, const std::string& pairId) {
    // Simple per‑watch recovery tiered logic
    auto it = m_watches.find(pairId);
    if (it == m_watches.end()) return false;
    DirectoryWatchContext* ctx = it->second;
    ++ctx->failureCount;
    if (ctx->failureCount >= kMaxRecoveryAttempts) {
        Logger::Instance().Error("IOCPWatcher", "Watch " + pairId + " exceeded max recovery attempts. Disabling.");
        ctx->state = WatchState::Disabled;
        return false;
    }
    // Try to restart the read operation
    RestartReadDirectoryChanges(pairId);
    ctx->state = WatchState::Active;
    return true;
}

// Validate path and produce canonical absolute path
bool Win32IOCPWatcher::ValidateAndCanonicalize(const std::wstring& raw, std::wstring& outCanonical) {
    if (raw.empty()) return false;
    wchar_t buffer[MAX_PATH];
    DWORD len = GetFullPathNameW(raw.c_str(), MAX_PATH, buffer, nullptr);
    if (len == 0 || len >= MAX_PATH) return false;
    outCanonical.assign(buffer, len);
    // Verify that the path exists and is a directory
    if (!std::filesystem::exists(outCanonical) || !std::filesystem::is_directory(outCanonical)) {
        return false;
    }
    return true;
}

void Win32IOCPWatcher::RestartReadDirectoryChanges(const std::string& pairId) {
    std::lock_guard<std::mutex> lock(m_mutex);
    auto it = m_watches.find(pairId);
    if (it == m_watches.end()) return;
    IssueReadDirectoryChanges(it->second);
}

void Win32IOCPWatcher::ReopenDirectoryHandle(const std::string& pairId) {
    std::lock_guard<std::mutex> lock(m_mutex);
    auto it = m_watches.find(pairId);
    if (it == m_watches.end()) return;
    DirectoryWatchContext* ctx = it->second;
    // Close existing handle if open
    if (ctx->hDirectory != INVALID_HANDLE_VALUE) {
        CloseHandle(ctx->hDirectory);
    }
    // Open new handle
    HANDLE hDir = CreateFileW(
        ctx->directoryPath.c_str(),
        FILE_LIST_DIRECTORY,
        FILE_SHARE_READ | FILE_SHARE_WRITE | FILE_SHARE_DELETE,
        nullptr,
        OPEN_EXISTING,
        FILE_FLAG_BACKUP_SEMANTICS | FILE_FLAG_OVERLAPPED,
        nullptr);
    if (hDir == INVALID_HANDLE_VALUE) {
        Logger::Instance().Error("IOCPWatcher", "Failed to reopen directory handle for watch " + ctx->pairId);
        ctx->state = WatchState::Missing;
        return;
    }
    ctx->hDirectory = hDir;
    // Re‑associate with IOCP
    HANDLE hAssigned = CreateIoCompletionPort(hDir, m_hIOCP, reinterpret_cast<ULONG_PTR>(ctx), 0);
    if (!hAssigned) {
        Logger::Instance().Error("IOCPWatcher", "Failed to re‑associate handle with IOCP for watch " + ctx->pairId);
        ctx->state = WatchState::Missing;
        return;
    }
    ctx->state = WatchState::Active;
    IssueReadDirectoryChanges(ctx);
}

void Win32IOCPWatcher::MarkWatchMissing(const std::string& pairId) {
    std::lock_guard<std::mutex> lock(m_mutex);
    auto it = m_watches.find(pairId);
    if (it == m_watches.end()) return;
    it->second->state = WatchState::Missing;
}

void Win32IOCPWatcher::AttemptWatchReenable(const std::string& pairId) {
    std::lock_guard<std::mutex> lock(m_mutex);
    auto it = m_watches.find(pairId);
    if (it == m_watches.end()) return;
    DirectoryWatchContext* ctx = it->second;
    // If path now exists, try to reopen
    if (std::filesystem::exists(ctx->directoryPath) && std::filesystem::is_directory(ctx->directoryPath)) {
        ReopenDirectoryHandle(pairId);
    }
}

void Win32IOCPWatcher::RecreateIOCP() {
    std::lock_guard<std::mutex> lock(m_mutex);
    if (m_hIOCP) {
        CloseHandle(m_hIOCP);
        m_hIOCP = nullptr;
    }
    m_hIOCP = CreateIoCompletionPort(INVALID_HANDLE_VALUE, NULL, 0, 1);
    // Re‑associate all watches
    for (auto& [pairId, ctx] : m_watches) {
        if (ctx->hDirectory != INVALID_HANDLE_VALUE) {
            CreateIoCompletionPort(ctx->hDirectory, m_hIOCP, reinterpret_cast<ULONG_PTR>(ctx), 0);
        }
    }
    Logger::Instance().Info("IOCPWatcher", "IOCP recreated and watches re‑associated.");
}

void Win32IOCPWatcher::FullWatcherRebuild() {
    // Full teardown and reinitialisation – safe sequence
    Shutdown();
    Init();
    // Re‑add watches (state is kept in m_watches, but handles are reopened)
    for (auto& [pairId, ctx] : m_watches) {
        ReopenDirectoryHandle(pairId);
    }
    Logger::Instance().Info("IOCPWatcher", "Full watcher rebuild completed.");
}

bool Win32IOCPWatcher::EnableWatch(const std::string& pairId, bool enable) {
    std::lock_guard<std::mutex> lock(m_mutex);
    auto it = m_watches.find(pairId);
    if (it == m_watches.end()) return false;
    DirectoryWatchContext* ctx = it->second;
    ctx->state = enable ? WatchState::Active : WatchState::Paused;
    return true;
}

bool Win32IOCPWatcher::UpdateWatchPath(const std::string& pairId, const std::wstring& newPath) {
    std::wstring canonical;
    if (!ValidateAndCanonicalize(newPath, canonical)) {
        Logger::Instance().Error("IOCPWatcher", "Invalid new watch path for pair " + pairId);
        return false;
    }
    std::lock_guard<std::mutex> lock(m_mutex);
    auto it = m_watches.find(pairId);
    if (it == m_watches.end()) return false;
    DirectoryWatchContext* ctx = it->second;
    ctx->directoryPath = canonical;
    ReopenDirectoryHandle(pairId);
    return true;
}

} // namespace EchoSync
