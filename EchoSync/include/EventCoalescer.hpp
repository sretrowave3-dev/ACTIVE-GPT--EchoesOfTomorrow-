#pragma once

#include "Types.hpp"
#include <vector>
#include <queue>
#include <unordered_map>
#include <mutex>
#include <condition_variable>
#include <chrono>

namespace EchoSync {

class EventCoalescer {
public:
    explicit EventCoalescer(std::chrono::milliseconds coalesceWindow = std::chrono::milliseconds(100));
    ~EventCoalescer() = default;

    void PushRawEvent(const FileSystemEvent& event);
    std::optional<FileSystemEvent> PopCoalescedEvent(std::chrono::milliseconds timeout = std::chrono::milliseconds(50));

    void Clear();
    size_t PendingCount() const;

private:
    struct PendingEventEntry {
        FileSystemEvent event;
        std::chrono::system_clock::time_point firstSeen;
        std::chrono::system_clock::time_point lastSeen;
    };

    std::chrono::milliseconds m_coalesceWindow;
    mutable std::mutex m_mutex;
    std::condition_variable m_cv;

    // Track pending events by pairId + pathHash
    std::unordered_map<uint64_t, PendingEventEntry> m_pendingMap;
    std::queue<FileSystemEvent> m_readyQueue;

    // Pending rename holding structure
    std::optional<FileSystemEvent> m_pendingRenameOld;
};

} // namespace EchoSync
