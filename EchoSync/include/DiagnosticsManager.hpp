#pragma once
#include <atomic>
#include <mutex>
#include "Types.hpp"

namespace EchoSync {
class DiagnosticsManager {
public:
    static DiagnosticsManager& Instance();
    void RecordWatcherEvent(const FileSystemEvent& ev);
    void RecordCoalescerEvent(const FileSystemEvent& ev, bool coalesced);
    void RecordSyncEvent(const FileSystemEvent& ev);
    void Dump() const; // writes detailed report to log
private:
    DiagnosticsManager() = default;
    std::atomic_uint64_t m_watcherEvents{0};
    std::atomic_uint64_t m_coalescedEvents{0};
    std::atomic_uint64_t m_syncProcessed{0};
    mutable std::mutex m_logMutex;
};
}
