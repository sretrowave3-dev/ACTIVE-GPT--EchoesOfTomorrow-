#pragma once

#include "Types.hpp"
#include "ConfigManager.hpp"
#include "MetadataCache.hpp"
#include "HashCache.hpp"
#include "EventCoalescer.hpp"
#include "Win32IOCPWatcher.hpp"
#include "SyncEngine.hpp"
#include "HotkeyListener.hpp"

namespace EchoSync {

class AppController {
public:
    AppController();
    ~AppController();

    bool Init(const std::string& configPath = "EchoSync.json");
    void Run();
    void RequestExit();

    ConfigManager& GetConfigManager() { return m_configMgr; }
    MetadataCache& GetMetadataCache() { return m_metaCache; }
    HashCache& GetHashCache() { return m_hashCache; }
    SyncEngine& GetSyncEngine() { return m_syncEngine; }
    EventCoalescer& GetEventCoalescer() { return m_coalescer; }

    bool IsRunning() const { return m_running; }

private:
    ConfigManager m_configMgr;
    MetadataCache m_metaCache;
    HashCache m_hashCache;
    EventCoalescer m_coalescer;
    Win32IOCPWatcher m_watcher;
    SyncEngine m_syncEngine;
    HotkeyListener m_hotkeyListener;

    std::atomic<bool> m_running{false};
    std::string m_configPath = "EchoSync.json";
    std::string m_cachePath = "EchoSync.cache";
};

} // namespace EchoSync
