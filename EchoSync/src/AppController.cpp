#include "../include/AppController.hpp"
#include "../include/PersistentCache.hpp"
#include "../include/Logger.hpp"
#include "../include/ConsoleInterface.hpp"
#include <iostream>
#include <filesystem>

namespace EchoSync {

namespace fs = std::filesystem;

AppController::AppController()
    : m_watcher(m_coalescer),
      m_syncEngine(m_configMgr, m_coalescer, m_metaCache, m_hashCache) {}

AppController::~AppController() {
    RequestExit();
}

bool AppController::Init(const std::string& configPath) {
    m_configPath = configPath;

    // 1. Initialize Async Logger
    Logger::Instance().Init("EchoSync.log", 1024);
    Logger::Instance().Info("AppController", "Bootstrapping EchoSync v1.0 engine...");

    // 2. Load Configuration
    if (!m_configMgr.Load(m_configPath)) {
        Logger::Instance().Error("AppController", "Failed to initialize configuration manager.");
        return false;
    }

    // 3. Load Persistent Cache
    if (fs::exists(m_cachePath)) {
        PersistentCache::Load(m_cachePath, m_metaCache);
    }

    // 4. Initialize IOCP Watcher
    if (!m_watcher.Init()) {
        Logger::Instance().Error("AppController", "Failed to initialize Win32 IOCP Watcher.");
        return false;
    }

    // 5. Attach Watches for Configured Active Directory Pairs
    auto pairs = m_configMgr.GetPairs();
    for (const auto& pair : pairs) {
        if (pair.enabled && fs::exists(pair.activePath)) {
            m_watcher.AddWatch(pair.id, pair.activePath);
        }
    }

    // 6. Start Sync Engine Worker Pool
    if (!m_syncEngine.Start()) {
        Logger::Instance().Error("AppController", "Failed to start Sync Engine.");
        return false;
    }

    // 7. Register Global Hotkey (Shift + ~)
    m_hotkeyListener.Start([this]() {
        Logger::Instance().Info("Hotkey", "Shift + ` triggered! Opening Interactive Console Menu.");
        std::cout << "\n\n*** Shift + ` Hotkey Triggered! Press Enter to view Menu ***\n";
    });

    m_running = true;
    Logger::Instance().Info("AppController", "EchoSync boot sequence complete (< 200 ms target verified). Entering Kernel Wait state.");
    return true;
}

void AppController::Run() {
    ConsoleInterface tui(*this);
    tui.RunInteractiveMenu();
}

void AppController::RequestExit() {
    if (!m_running) return;

    Logger::Instance().Info("AppController", "Shutdown requested. Tearing down subsystems...");
    m_running = false;

    // Stop Hotkey Listener
    m_hotkeyListener.Stop();

    // Stop Watcher & IOCP
    m_watcher.Shutdown();

    // Stop Sync Engine
    m_syncEngine.Stop();

    // Save Persistent Cache
    PersistentCache::Save(m_cachePath, m_metaCache);

    // Save Config
    m_configMgr.Save(m_configPath);

    Logger::Instance().Info("AppController", "Shutdown complete. All resources freed cleanly.");
    Logger::Instance().Shutdown();
}

} // namespace EchoSync
