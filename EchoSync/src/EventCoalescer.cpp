#include "../include/EventCoalescer.hpp"
#include "../include/Logger.hpp"

namespace EchoSync {

EventCoalescer::EventCoalescer(std::chrono::milliseconds coalesceWindow)
    : m_coalesceWindow(coalesceWindow) {}

void EventCoalescer::PushRawEvent(const FileSystemEvent& rawEvent) {
    std::lock_guard<std::mutex> lock(m_mutex);

    // Handle Rename pairing: OLD_NAME + NEW_NAME
    if (rawEvent.action == FileAction::Rename && rawEvent.oldActiveRelPath.empty()) {
        // Step 1 of Rename: storing OLD name
        m_pendingRenameOld = rawEvent;
        return;
    }

    FileSystemEvent eventToProcess = rawEvent;
    if (eventToProcess.action == FileAction::Rename && !eventToProcess.oldActiveRelPath.empty()) {
        // Step 2 of Rename: paired with NEW name
        m_pendingRenameOld.reset();
    } else if (m_pendingRenameOld.has_value() && eventToProcess.action == FileAction::Move) {
        // Paired rename step
        eventToProcess.oldActiveRelPath = m_pendingRenameOld->activeRelPath;
        m_pendingRenameOld.reset();
    }

    std::wstring keyW = std::wstring(eventToProcess.pairId.begin(), eventToProcess.pairId.end()) + L":" + eventToProcess.activeRelPath;
    uint64_t key = HashPath(keyW);
    auto now = std::chrono::system_clock::now();

    auto it = m_pendingMap.find(key);
    if (it != m_pendingMap.end()) {
        // Coalesce rules
        auto& existing = it->second.event;
        
        if (existing.action == FileAction::Create && eventToProcess.action == FileAction::Modify) {
            // CREATE + MODIFY -> CREATE
            it->second.lastSeen = now;
        } else if (existing.action == FileAction::Create && eventToProcess.action == FileAction::Delete) {
            // CREATE + DELETE -> Net Zero NOP! Erase pending.
            m_pendingMap.erase(it);
            return;
        } else {
            // MODIFY + MODIFY -> Update timestamp
            existing.action = eventToProcess.action;
            it->second.lastSeen = now;
        }
    } else {
        m_pendingMap[key] = PendingEventEntry{
            .event = eventToProcess,
            .firstSeen = now,
            .lastSeen = now
        };
    }

    // Move mature entries from pending map to ready queue
    for (auto mapIt = m_pendingMap.begin(); mapIt != m_pendingMap.end(); ) {
        if (now - mapIt->second.lastSeen >= m_coalesceWindow || mapIt->second.event.action == FileAction::Delete || mapIt->second.event.action == FileAction::Rename) {
            m_readyQueue.push(mapIt->second.event);
            mapIt = m_pendingMap.erase(mapIt);
        } else {
            ++mapIt;
        }
    }

    m_cv.notify_one();
}

std::optional<FileSystemEvent> EventCoalescer::PopCoalescedEvent(std::chrono::milliseconds timeout) {
    std::unique_lock<std::mutex> lock(m_mutex);

    // Flush any pending entries if window elapsed
    auto now = std::chrono::system_clock::now();
    for (auto mapIt = m_pendingMap.begin(); mapIt != m_pendingMap.end(); ) {
        if (now - mapIt->second.lastSeen >= m_coalesceWindow) {
            m_readyQueue.push(mapIt->second.event);
            mapIt = m_pendingMap.erase(mapIt);
        } else {
            ++mapIt;
        }
    }

    if (m_readyQueue.empty()) {
        m_cv.wait_for(lock, timeout, [this]() {
            return !m_readyQueue.empty() || !m_pendingMap.empty();
        });

        // Check again after wait
        now = std::chrono::system_clock::now();
        for (auto mapIt = m_pendingMap.begin(); mapIt != m_pendingMap.end(); ) {
            if (now - mapIt->second.lastSeen >= m_coalesceWindow || !m_readyQueue.empty()) {
                m_readyQueue.push(mapIt->second.event);
                mapIt = m_pendingMap.erase(mapIt);
            } else {
                ++mapIt;
            }
        }
    }

    if (m_readyQueue.empty()) {
        return std::nullopt;
    }

    FileSystemEvent event = m_readyQueue.front();
    m_readyQueue.pop();
    return event;
}

void EventCoalescer::Clear() {
    std::lock_guard<std::mutex> lock(m_mutex);
    m_pendingMap.clear();
    while (!m_readyQueue.empty()) m_readyQueue.pop();
    m_pendingRenameOld.reset();
}

size_t EventCoalescer::PendingCount() const {
    std::lock_guard<std::mutex> lock(m_mutex);
    return m_pendingMap.size() + m_readyQueue.size();
}

} // namespace EchoSync
