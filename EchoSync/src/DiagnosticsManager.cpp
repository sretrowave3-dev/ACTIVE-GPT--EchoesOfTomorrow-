#include "DiagnosticsManager.hpp"
#include "Logger.hpp"

namespace EchoSync {

DiagnosticsManager& DiagnosticsManager::Instance() {
    static DiagnosticsManager instance;
    return instance;
}

void DiagnosticsManager::RecordWatcherEvent(const FileSystemEvent& ev) {
    m_watcherEvents.fetch_add(1, std::memory_order_relaxed);
#ifdef ENABLE_DIAGNOSTICS
    Logger::Instance().Debug("Diagnostics", "Watcher event: " + ActionToString(ev.action) + " " + WStringToString(ev.activeRelPath));
#endif
}

void DiagnosticsManager::RecordCoalescerEvent(const FileSystemEvent& ev, bool coalesced) {
    if (coalesced) {
        m_coalescedEvents.fetch_add(1, std::memory_order_relaxed);
    }
#ifdef ENABLE_DIAGNOSTICS
    std::string type = coalesced ? "Coalesced" : "Raw";
    Logger::Instance().Debug("Diagnostics", type + " event: " + ActionToString(ev.action) + " " + WStringToString(ev.activeRelPath));
#endif
}

void DiagnosticsManager::RecordSyncEvent(const FileSystemEvent& ev) {
    m_syncProcessed.fetch_add(1, std::memory_order_relaxed);
#ifdef ENABLE_DIAGNOSTICS
    Logger::Instance().Debug("Diagnostics", "Sync processed: " + ActionToString(ev.action) + " " + WStringToString(ev.activeRelPath));
#endif
}

void DiagnosticsManager::Dump() const {
    std::lock_guard<std::mutex> lock(m_logMutex);
    std::string report = "--- Diagnostics Report ---\n";
    report += "Watcher events: " + std::to_string(m_watcherEvents.load()) + "\n";
    report += "Coalesced events: " + std::to_string(m_coalescedEvents.load()) + "\n";
    report += "Sync processed: " + std::to_string(m_syncProcessed.load()) + "\n";
    Logger::Instance().Info("Diagnostics", report);
}

} // namespace EchoSync
